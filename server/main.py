from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
import auth
import codeforces_importer
from judge import run_test_case
from seed import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

# Auto-migrate missing columns for SQLite
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE contests ADD COLUMN max_participants INTEGER"))
        conn.commit()
    except Exception:
        pass  # Column already exists
    try:
        conn.execute(text("ALTER TABLE contests ADD COLUMN max_team_members INTEGER DEFAULT 3"))
        conn.commit()
    except Exception:
        pass  # Column already exists
    try:
        conn.execute(text("ALTER TABLE contests ADD COLUMN allow_all_members_submit BOOLEAN DEFAULT 1"))
        conn.commit()
    except Exception:
        pass  # Column already exists
    try:
        conn.execute(text("ALTER TABLE contests ADD COLUMN show_checker_logs BOOLEAN DEFAULT 0"))
        conn.commit()
    except Exception:
        pass  # Column already exists

app = FastAPI(title="LeetCompete API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()

# ----------------------------
# Auth Endpoints
# ----------------------------

@app.post("/auth/register", response_model=schemas.Token)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Public self-registration ALWAYS creates participant accounts
    user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=auth.hash_password(user_data.password),
        role="participant"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# ----------------------------
# Admin User Management Endpoints
# ----------------------------

@app.get("/admin/users", response_model=List[schemas.UserDetailResponse])
def list_users(
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@app.post("/admin/users", response_model=schemas.UserDetailResponse)
def create_user_by_admin(
    user_data: schemas.UserAdminCreate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    role = user_data.role if user_data.role in ["organizer", "participant"] else "participant"
    user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=auth.hash_password(user_data.password),
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.put("/admin/users/{user_id}/role", response_model=schemas.UserDetailResponse)
def update_user_role(
    user_id: int,
    role_data: schemas.UserRoleUpdate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if role_data.role not in ["organizer", "participant"]:
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be 'organizer' or 'participant'")

    user.role = role_data.role
    db.commit()
    db.refresh(user)
    return user

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    if user_id == organizer.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own active organizer account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} (ID: {user_id}) deleted successfully"}

# ----------------------------
# Contest Endpoints
# ----------------------------

def get_contest_status(contest: models.Contest) -> str:
    now = datetime.utcnow()
    if now > contest.end_time:
        return "PAST"
    elif contest.is_launched:
        return "LIVE"
    else:
        return "UPCOMING"

def get_registration_status(contest: models.Contest, db: Optional[Session] = None) -> str:
    now = datetime.utcnow()
    reg_start = contest.registration_start_time or (contest.start_time - timedelta(days=7))
    
    # Registration closes automatically when the contest starts
    reg_end = contest.registration_end_time or contest.start_time
    if reg_end > contest.start_time:
        reg_end = contest.start_time

    # Guard against invalid reg_end <= reg_start
    if reg_end <= reg_start:
        reg_end = contest.start_time

    if now < reg_start:
        return "REGISTRATION_NOT_STARTED"
    elif now >= contest.start_time or now >= reg_end:
        return "REGISTRATION_CLOSED"

    # Capacity check if db is provided
    if contest.max_participants and contest.max_participants > 0 and db is not None:
        reg_count = db.query(models.Registration).filter(models.Registration.contest_id == contest.id).count()
        if reg_count >= contest.max_participants:
            return "REGISTRATION_FULL"

    return "REGISTRATION_OPEN"

def get_user_registration(contest_id: int, user: models.User, db: Session):
    # 1. Direct registration by user_id (Team Leader)
    reg = db.query(models.Registration).filter(
        models.Registration.contest_id == contest_id,
        models.Registration.user_id == user.id
    ).first()
    if reg:
        return reg, True

    # 2. Match user name or email in any team's member list (Team Member)
    all_regs = db.query(models.Registration).filter(models.Registration.contest_id == contest_id).all()
    for r in all_regs:
        if r.members:
            members_list = [m.strip().lower() for m in r.members.split(',') if m.strip()]
            if user.name.lower() in members_list or user.email.lower() in members_list:
                return r, False

    return None, False

def check_problem_access(contest_id: Optional[int], user: Optional[models.User], db: Session, problem: Optional[models.Problem] = None):
    # Standalone practice problems (contest_id is None) or explicitly published problems are accessible to everyone
    if contest_id is None or (problem and problem.is_published):
        return

    if not user:
        raise HTTPException(
            status_code=403,
            detail="Registration required. You must log in and register your team for this contest to view problems."
        )
    if user.role == "organizer":
        return

    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    reg, is_leader = get_user_registration(contest_id, user, db)
    if not reg:
        raise HTTPException(
            status_code=403,
            detail="Registration required. You must register your team for this contest to view its problems."
        )

    if not contest.is_launched:
        raise HTTPException(
            status_code=403,
            detail="Contest not launched yet. Problems will become accessible once an organizer launches the contest."
        )

@app.get("/contests", response_model=List[schemas.ContestResponse])
def list_contests(db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(auth.get_optional_user)):
    contests = db.query(models.Contest).order_by(models.Contest.start_time.desc()).all()
    result = []
    for c in contests:
        reg_record = None
        if current_user:
            reg_record = db.query(models.Registration).filter(
                models.Registration.contest_id == c.id,
                models.Registration.user_id == current_user.id
            ).first()
        
        reg_count = db.query(models.Registration).filter(models.Registration.contest_id == c.id).count()
        status_str = get_contest_status(c)
        reg_status = get_registration_status(c, db)

        reg_info = None
        if reg_record:
            reg_info = schemas.RegistrationInfo(
                id=reg_record.id,
                user_id=reg_record.user_id,
                contest_id=reg_record.contest_id,
                team_name=reg_record.team_name,
                members=reg_record.members,
                school=reg_record.school,
                registered_at=reg_record.registered_at
            )

        result.append(schemas.ContestResponse(
            id=c.id,
            title=c.title,
            description=c.description,
            start_time=c.start_time,
            end_time=c.end_time,
            registration_start_time=c.registration_start_time,
            registration_end_time=c.registration_end_time,
            max_participants=c.max_participants,
            max_team_members=getattr(c, 'max_team_members', 3) or 3,
            allow_all_members_submit=getattr(c, 'allow_all_members_submit', True) if getattr(c, 'allow_all_members_submit', None) is not None else True,
            registered_count=reg_count,
            created_by=c.created_by,
            status=status_str,
            is_launched=c.is_launched or False,
            registration_status=reg_status,
            is_registered=reg_record is not None,
            registration_info=reg_info
        ))
    return result

@app.post("/contests", response_model=schemas.ContestResponse)
def create_contest(
    contest_data: schemas.ContestCreate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    reg_start = contest_data.registration_start_time or datetime.utcnow()
    reg_end = contest_data.registration_end_time or contest_data.start_time
    if reg_end > contest_data.start_time:
        reg_end = contest_data.start_time
    if reg_end <= reg_start:
        reg_end = contest_data.start_time

    contest = models.Contest(
        title=contest_data.title,
        description=contest_data.description,
        start_time=contest_data.start_time,
        end_time=contest_data.end_time,
        registration_start_time=reg_start,
        registration_end_time=reg_end,
        max_participants=contest_data.max_participants,
        max_team_members=contest_data.max_team_members if contest_data.max_team_members is not None else 3,
        allow_all_members_submit=contest_data.allow_all_members_submit if contest_data.allow_all_members_submit is not None else True,
        is_launched=False,
        created_by=organizer.id
    )
    db.add(contest)
    db.commit()
    db.refresh(contest)

    return schemas.ContestResponse(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_start_time=contest.registration_start_time,
        registration_end_time=contest.registration_end_time,
        max_participants=contest.max_participants,
        max_team_members=contest.max_team_members or 3,
        allow_all_members_submit=contest.allow_all_members_submit if getattr(contest, 'allow_all_members_submit', None) is not None else True,
        registered_count=0,
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest, db),
        is_registered=False
    )

@app.put("/contests/{contest_id}", response_model=schemas.ContestResponse)
def update_contest(
    contest_id: int,
    contest_data: schemas.ContestUpdate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    if contest_data.title is not None:
        contest.title = contest_data.title
    if contest_data.description is not None:
        contest.description = contest_data.description
    if contest_data.start_time is not None:
        contest.start_time = contest_data.start_time
    if contest_data.end_time is not None:
        contest.end_time = contest_data.end_time
    if contest_data.registration_start_time is not None:
        contest.registration_start_time = contest_data.registration_start_time
    if contest_data.registration_end_time is not None:
        contest.registration_end_time = contest_data.registration_end_time
    if contest_data.max_participants is not None:
        contest.max_participants = contest_data.max_participants
    if contest_data.max_team_members is not None:
        contest.max_team_members = contest_data.max_team_members
    if contest_data.allow_all_members_submit is not None:
        contest.allow_all_members_submit = contest_data.allow_all_members_submit

    if contest.registration_end_time and contest.registration_end_time > contest.start_time:
        contest.registration_end_time = contest.start_time

    db.commit()
    db.refresh(contest)
    reg_count = db.query(models.Registration).filter(models.Registration.contest_id == contest.id).count()

    return schemas.ContestResponse(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_start_time=contest.registration_start_time,
        registration_end_time=contest.registration_end_time,
        max_participants=contest.max_participants,
        max_team_members=contest.max_team_members or 3,
        allow_all_members_submit=contest.allow_all_members_submit if getattr(contest, 'allow_all_members_submit', None) is not None else True,
        registered_count=reg_count,
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest, db),
        is_registered=False
    )


@app.post("/contests/{contest_id}/launch", response_model=schemas.ContestResponse)
def launch_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    contest.is_launched = True
    db.commit()
    db.refresh(contest)
    reg_count = db.query(models.Registration).filter(models.Registration.contest_id == contest.id).count()

    return schemas.ContestResponse(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_start_time=contest.registration_start_time,
        registration_end_time=contest.registration_end_time,
        max_participants=contest.max_participants,
        max_team_members=contest.max_team_members or 3,
        allow_all_members_submit=contest.allow_all_members_submit if getattr(contest, 'allow_all_members_submit', None) is not None else True,
        registered_count=reg_count,
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest, db),
        is_registered=False
    )

@app.get("/contests/{contest_id}", response_model=schemas.ContestDetailResponse)
def get_contest(contest_id: int, db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(auth.get_optional_user)):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    reg_record = None
    if current_user:
        reg_record = db.query(models.Registration).filter(
            models.Registration.contest_id == contest.id,
            models.Registration.user_id == current_user.id
        ).first()

    reg_count = db.query(models.Registration).filter(models.Registration.contest_id == contest.id).count()

    reg_info = None
    if reg_record:
        reg_info = schemas.RegistrationInfo(
            id=reg_record.id,
            user_id=reg_record.user_id,
            contest_id=reg_record.contest_id,
            team_name=reg_record.team_name,
            members=reg_record.members,
            school=reg_record.school,
            registered_at=reg_record.registered_at
        )

    # Only include problem list if user is organizer OR (registered AND contest is launched)!
    is_organizer = (current_user and current_user.role == "organizer")
    has_access = is_organizer or (reg_record is not None and contest.is_launched)
    
    problem_responses = []
    if has_access:
        problems = db.query(models.Problem).filter(models.Problem.contest_id == contest_id).all()
        problem_responses = [
            schemas.ProblemResponse(
                id=p.id,
                contest_id=p.contest_id,
                title=p.title,
                statement=p.statement,
                time_limit_ms=p.time_limit_ms,
                difficulty=p.difficulty
            )
            for p in problems
        ]

    return schemas.ContestDetailResponse(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_start_time=contest.registration_start_time,
        registration_end_time=contest.registration_end_time,
        max_participants=contest.max_participants,
        max_team_members=contest.max_team_members or 3,
        allow_all_members_submit=contest.allow_all_members_submit if getattr(contest, 'allow_all_members_submit', None) is not None else True,
        registered_count=reg_count,
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched or False,
        registration_status=get_registration_status(contest, db),
        is_registered=reg_record is not None,
        registration_info=reg_info,
        problems=problem_responses
    )

@app.delete("/contests/{contest_id}")
def delete_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    db.delete(contest)
    db.commit()
    return {"message": "Contest deleted successfully"}

@app.post("/contests/{contest_id}/register")
def register_for_contest(
    contest_id: int,
    reg_data: schemas.RegistrationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    # Validate max_team_members limit
    max_members = contest.max_team_members or 3
    parsed_members = [m.strip() for m in reg_data.members.split(',') if m.strip()]
    if len(parsed_members) > max_members:
        raise HTTPException(
            status_code=400,
            detail=f"Team size exceeds the maximum limit of {max_members} members per team allowed for this contest."
        )

    existing = db.query(models.Registration).filter(
        models.Registration.contest_id == contest_id,
        models.Registration.user_id == current_user.id
    ).first()

    if existing:
        existing.team_name = reg_data.team_name
        existing.members = reg_data.members
        existing.school = reg_data.school
        db.commit()
        return {"message": "Team registration updated successfully"}

    reg_status = get_registration_status(contest, db)
    if reg_status == "REGISTRATION_NOT_STARTED":
        start_str = contest.registration_start_time.strftime("%Y-%m-%d %H:%M UTC") if contest.registration_start_time else "the scheduled window"
        raise HTTPException(
            status_code=400,
            detail=f"Registration has not opened yet. Registration opens at {start_str}."
        )
    elif reg_status == "REGISTRATION_CLOSED":
        raise HTTPException(
            status_code=400,
            detail="Registration for this contest has closed (registration closes automatically when the contest starts)."
        )
    elif reg_status == "REGISTRATION_FULL":
        raise HTTPException(
            status_code=400,
            detail=f"Registration is full for this contest. Maximum limit of {contest.max_participants} teams reached."
        )

    existing = db.query(models.Registration).filter(
        models.Registration.contest_id == contest_id,
        models.Registration.user_id == current_user.id
    ).first()

    if existing:
        existing.team_name = reg_data.team_name
        existing.members = reg_data.members
        existing.school = reg_data.school
        db.commit()
        return {"message": "Team registration updated successfully"}

    registration = models.Registration(
        user_id=current_user.id,
        contest_id=contest_id,
        team_name=reg_data.team_name,
        members=reg_data.members,
        school=reg_data.school
    )
    db.add(registration)
    db.commit()
    return {"message": "Team registered successfully"}

@app.get("/contests/{contest_id}/registrations", response_model=List[schemas.ContestRegistrationDetail])
def get_contest_registrations(
    contest_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    registrations = db.query(models.Registration).filter(models.Registration.contest_id == contest_id).all()
    results = []
    for r in registrations:
        u = db.query(models.User).filter(models.User.id == r.user_id).first()
        results.append(schemas.ContestRegistrationDetail(
            id=r.id,
            contest_id=r.contest_id,
            user_id=r.user_id,
            user_name=u.name if u else f"User #{r.user_id}",
            user_email=u.email if u else "N/A",
            team_name=r.team_name,
            members=r.members,
            school=r.school,
            registered_at=r.registered_at
        ))
    return results

# ----------------------------
# Problem Endpoints
# ----------------------------

@app.get("/problems", response_model=List[schemas.ProblemWithDetailsResponse])
def list_all_problems(
    difficulty: Optional[str] = Query(None),
    contest_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_user)
):
    query = db.query(models.Problem)
    if difficulty:
        query = query.filter(models.Problem.difficulty == difficulty)
    if contest_id:
        query = query.filter(models.Problem.contest_id == contest_id)
    if search:
        query = query.filter(models.Problem.title.ilike(f"%{search}%"))

    all_problems = query.all()
    results = []

    contests = {c.id: c for c in db.query(models.Contest).all()}
    is_organizer = current_user and current_user.role == "organizer"

    for p in all_problems:
        c = contests.get(p.contest_id) if p.contest_id else None

        # Standard Participant Filter for Problems Section:
        # Standalone problems (contest_id is None) or explicitly published problems or past contest problems are visible.
        # Upcoming or live contest problems that are NOT published MUST NOT be shown to participants in the practice Problems section.
        if not is_organizer:
            if p.contest_id is not None:
                is_contest_past = c and (c.end_time <= datetime.utcnow())
                if not p.is_published and not is_contest_past:
                    continue

        tcs = db.query(models.TestCase).filter(models.TestCase.problem_id == p.id).all()
        sample_cases = [
            schemas.TestCaseResponse(
                id=tc.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_sample=tc.is_sample
            ) for tc in tcs if tc.is_sample
        ]
        all_cases = [
            schemas.TestCaseResponse(
                id=tc.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_sample=tc.is_sample
            ) for tc in tcs
        ] if is_organizer else []

        results.append(schemas.ProblemWithDetailsResponse(
            id=p.id,
            contest_id=p.contest_id,
            contest_title=c.title if c else "Standalone Practice",
            is_published=p.is_published,
            title=p.title,
            statement=p.statement,
            time_limit_ms=p.time_limit_ms,
            difficulty=p.difficulty,
            test_cases_count=len(tcs),
            sample_test_cases=sample_cases,
            all_test_cases=all_cases
        ))

    return results

@app.post("/problems", response_model=schemas.ProblemWithDetailsResponse)
def create_standalone_problem(
    problem_data: schemas.ProblemCreate,
    contest_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    target_contest_id = problem_data.contest_id if problem_data.contest_id is not None else contest_id

    contest = None
    if target_contest_id:
        contest = db.query(models.Contest).filter(models.Contest.id == target_contest_id).first()
        if not contest:
            raise HTTPException(status_code=404, detail="Selected contest not found")

    is_pub = True if target_contest_id is None else (problem_data.is_published if problem_data.is_published is not None else False)

    problem = models.Problem(
        contest_id=target_contest_id,
        is_published=is_pub,
        title=problem_data.title,
        statement=problem_data.statement,
        time_limit_ms=problem_data.time_limit_ms,
        difficulty=problem_data.difficulty
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    test_case_models = []
    for tc in problem_data.test_cases:
        t = models.TestCase(
            problem_id=problem.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        )
        db.add(t)
        test_case_models.append(t)

    db.commit()

    sample_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in test_case_models if tc.is_sample
    ]
    all_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in test_case_models
    ]

    return schemas.ProblemWithDetailsResponse(
        id=problem.id,
        contest_id=problem.contest_id,
        contest_title=contest.title if contest else "Standalone Practice",
        is_published=problem.is_published,
        title=problem.title,
        statement=problem.statement,
        time_limit_ms=problem.time_limit_ms,
        difficulty=problem.difficulty,
        test_cases_count=len(test_case_models),
        sample_test_cases=sample_cases,
        all_test_cases=all_cases
    )

@app.put("/problems/{problem_id}", response_model=schemas.ProblemWithDetailsResponse)
def update_problem(
    problem_id: int,
    problem_data: schemas.ProblemUpdate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if problem_data.title is not None:
        problem.title = problem_data.title
    if problem_data.statement is not None:
        problem.statement = problem_data.statement
    if problem_data.time_limit_ms is not None:
        problem.time_limit_ms = problem_data.time_limit_ms
    if problem_data.difficulty is not None:
        problem.difficulty = problem_data.difficulty
    if problem_data.is_published is not None:
        problem.is_published = problem_data.is_published
    if 'contest_id' in problem_data.__fields_set__:
        if problem_data.contest_id is not None:
            contest = db.query(models.Contest).filter(models.Contest.id == problem_data.contest_id).first()
            if not contest:
                raise HTTPException(status_code=404, detail="Target contest not found")
            problem.contest_id = problem_data.contest_id
        else:
            problem.contest_id = None

    db.commit()

    if problem_data.test_cases is not None:
        db.query(models.TestCase).filter(models.TestCase.problem_id == problem.id).delete()
        db.commit()
        for tc in problem_data.test_cases:
            t = models.TestCase(
                problem_id=problem.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_sample=tc.is_sample
            )
            db.add(t)
        db.commit()

    db.refresh(problem)
    contest = db.query(models.Contest).filter(models.Contest.id == problem.contest_id).first() if problem.contest_id else None
    tcs = db.query(models.TestCase).filter(models.TestCase.problem_id == problem.id).all()

    sample_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in tcs if tc.is_sample
    ]
    all_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in tcs
    ]

    return schemas.ProblemWithDetailsResponse(
        id=problem.id,
        contest_id=problem.contest_id,
        contest_title=contest.title if contest else "Standalone Practice",
        is_published=problem.is_published,
        title=problem.title,
        statement=problem.statement,
        time_limit_ms=problem.time_limit_ms,
        difficulty=problem.difficulty,
        test_cases_count=len(tcs),
        sample_test_cases=sample_cases,
        all_test_cases=all_cases
    )

@app.post("/contests/{contest_id}/publish-problems")
def publish_contest_problems(
    contest_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    problems = db.query(models.Problem).filter(models.Problem.contest_id == contest_id).all()
    for p in problems:
        p.is_published = True
    db.commit()

    return {"message": f"Successfully published {len(problems)} problem(s) from contest #{contest_id} to the general Problems section."}

@app.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    db.delete(problem)
    db.commit()
    return {"message": f"Problem #{problem_id} deleted successfully"}

@app.get("/contests/{contest_id}/problems", response_model=List[schemas.ProblemResponse])
def list_problems(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_user)
):
    check_problem_access(contest_id, current_user, db)
    return db.query(models.Problem).filter(models.Problem.contest_id == contest_id).all()

@app.post("/contests/{contest_id}/problems", response_model=schemas.ProblemDetailResponse)
def create_problem(
    contest_id: int,
    problem_data: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    problem = models.Problem(
        contest_id=contest_id,
        title=problem_data.title,
        statement=problem_data.statement,
        time_limit_ms=problem_data.time_limit_ms,
        difficulty=problem_data.difficulty
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    test_case_models = []
    for tc in problem_data.test_cases:
        t = models.TestCase(
            problem_id=problem.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        )
        db.add(t)
        test_case_models.append(t)

    db.commit()

    sample_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in test_case_models if tc.is_sample
    ]

    return schemas.ProblemDetailResponse(
        id=problem.id,
        contest_id=problem.contest_id,
        title=problem.title,
        statement=problem.statement,
        time_limit_ms=problem.time_limit_ms,
        difficulty=problem.difficulty,
        sample_test_cases=sample_cases
    )

@app.post("/contests/{contest_id}/import-codeforces", response_model=schemas.ProblemDetailResponse)
def import_codeforces_problem(
    contest_id: int,
    import_data: schemas.CodeforcesImportRequest,
    db: Session = Depends(get_db),
    organizer: models.User = Depends(auth.require_organizer)
):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    try:
        cf_data = codeforces_importer.fetch_codeforces_problem(import_data.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    problem = models.Problem(
        contest_id=contest_id,
        title=cf_data["title"],
        statement=cf_data["statement"],
        time_limit_ms=cf_data["time_limit_ms"],
        difficulty=cf_data["difficulty"]
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    test_case_models = []
    for tc in cf_data["sample_tests"]:
        t = models.TestCase(
            problem_id=problem.id,
            input=tc["input"],
            expected_output=tc["expected_output"],
            is_sample=True
        )
        db.add(t)
        test_case_models.append(t)

    db.commit()

    sample_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in test_case_models
    ]

    return schemas.ProblemDetailResponse(
        id=problem.id,
        contest_id=problem.contest_id,
        title=problem.title,
        statement=problem.statement,
        time_limit_ms=problem.time_limit_ms,
        difficulty=problem.difficulty,
        sample_test_cases=sample_cases
    )

import json

def parse_json_test_cases_data(content: str) -> List[dict]:
    try:
        data = json.loads(content)
    except Exception as e:
        raise ValueError(f"Invalid JSON format: {str(e)}")

    test_cases_list = []

    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        if "test_cases" in data and isinstance(data["test_cases"], list):
            items = data["test_cases"]
        elif "tests" in data and isinstance(data["tests"], list):
            items = data["tests"]
        elif "data" in data and isinstance(data["data"], list):
            items = data["data"]
        elif "samples" in data and isinstance(data["samples"], list):
            items = data["samples"]
        else:
            items = [data]
    else:
        raise ValueError("JSON must be an array of test cases or an object containing test cases.")

    for item in items:
        if not isinstance(item, dict):
            continue

        inp = (
            item.get("input")
            if item.get("input") is not None
            else item.get("in")
            if item.get("in") is not None
            else item.get("stdin")
            if item.get("stdin") is not None
            else item.get("input_str")
            if item.get("input_str") is not None
            else ""
        )
        outp = (
            item.get("expected_output")
            if item.get("expected_output") is not None
            else item.get("output")
            if item.get("output") is not None
            else item.get("out")
            if item.get("out") is not None
            else item.get("stdout")
            if item.get("stdout") is not None
            else item.get("expected")
            if item.get("expected") is not None
            else ""
        )
        is_sample = bool(
            item.get("is_sample")
            or item.get("sample")
            or False
        )

        test_cases_list.append({
            "input": str(inp),
            "expected_output": str(outp),
            "is_sample": is_sample
        })

    if not test_cases_list:
        raise ValueError("No valid test cases found in JSON.")

    return test_cases_list

@app.post("/parse-codeforces")
def parse_codeforces_problem_standalone(
    body: schemas.CodeforcesImportRequest,
    organizer: models.User = Depends(auth.require_organizer)
):
    try:
        data = codeforces_importer.fetch_codeforces_problem(body.url)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/parse-test-cases-json")
def parse_test_cases_json_standalone(
    body: schemas.JSONTestCaseParseRequest,
    organizer: models.User = Depends(auth.require_organizer)
):
    try:
        parsed = parse_json_test_cases_data(body.json_content)
        return {"test_cases": parsed, "count": len(parsed)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/problems/{problem_id}", response_model=schemas.ProblemDetailResponse)
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_user)
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    check_problem_access(problem.contest_id, current_user, db)

    sample_tcs = db.query(models.TestCase).filter(
        models.TestCase.problem_id == problem_id,
        models.TestCase.is_sample == True
    ).all()

    sample_cases = [
        schemas.TestCaseResponse(
            id=tc.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_sample=tc.is_sample
        ) for tc in sample_tcs
    ]

    return schemas.ProblemDetailResponse(
        id=problem.id,
        contest_id=problem.contest_id,
        title=problem.title,
        statement=problem.statement,
        time_limit_ms=problem.time_limit_ms,
        difficulty=problem.difficulty,
        sample_test_cases=sample_cases
    )

# ----------------------------
# Submission & Judging Endpoints
# ----------------------------

@app.post("/submissions", response_model=schemas.SubmissionResponse)
def submit_code(
    submission_data: schemas.SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    check_problem_access(submission_data.contest_id, current_user, db)

    reg, is_leader = get_user_registration(submission_data.contest_id, current_user, db)

    # Submission Permission Check (All Team Members vs Leader Only)
    contest = db.query(models.Contest).filter(models.Contest.id == submission_data.contest_id).first()
    if contest and current_user.role != "organizer":
        if getattr(contest, 'allow_all_members_submit', True) is False and not is_leader:
            raise HTTPException(
                status_code=403,
                detail="Submission restricted: Only the team leader is permitted to submit code for this contest."
            )

    if not submission_data.code or not submission_data.code.strip():
        raise HTTPException(
            status_code=400,
            detail="Submission code cannot be empty. Please enter code or upload a valid source file."
        )

    problem = db.query(models.Problem).filter(models.Problem.id == submission_data.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    test_cases = db.query(models.TestCase).filter(models.TestCase.problem_id == problem.id).all()
    if not test_cases:
        test_cases = [models.TestCase(id=0, problem_id=problem.id, input="", expected_output="", is_sample=True)]

    tc_results = []
    overall_verdict = "AC"
    protocol_lines = ["→ Judgement Protocol"]
    for idx, tc in enumerate(test_cases, start=1):
        res = run_test_case(
            code=submission_data.code,
            language=submission_data.language,
            input_str=tc.input,
            expected_output_str=tc.expected_output,
            time_limit_ms=problem.time_limit_ms,
            problem_id=problem.id
        )
        tc_results.append(schemas.TestCaseResult(
            test_case_id=tc.id,
            is_sample=tc.is_sample,
            status=res["status"],
            input_str=tc.input if (tc.is_sample or (contest and contest.show_checker_logs)) else None,
            user_output=res["user_output"],
            expected_output=tc.expected_output if (tc.is_sample or (contest and contest.show_checker_logs)) else None,
            execution_time_ms=res["execution_time_ms"],
            error=res["error"]
        ))
        if res["status"] != "AC" and overall_verdict == "AC":
            overall_verdict = res["status"]

        exec_time = int(res["execution_time_ms"] or 0)
        if res["status"] == "AC":
            protocol_lines.append(f"Test: #{idx}, time: {exec_time} ms., memory: 0 KB, exit code: 0, verdict: OK")
        else:
            overall_verdict = res["status"]
            verdict_str = "WRONG_ANSWER" if res["status"] == "WA" else ("TIME_LIMIT_EXCEEDED" if res["status"] == "TLE" else ("RUNTIME_ERROR" if res["status"] == "RE" else res["status"]))
            protocol_lines.append(f"Test: #{idx}, time: {exec_time} ms., memory: 0 KB, exit code: 1, verdict: {verdict_str}")
            user_out_str = (res["user_output"] or "").strip()
            exp_out_str = (tc.expected_output or "").strip()
            protocol_lines.append("Input\n" + (tc.input if tc.input else ""))
            protocol_lines.append("Output\n" + user_out_str)
            protocol_lines.append("Answer\n" + exp_out_str)
            err_msg = res["error"] or f"wrong answer 1st numbers differ - expected: '{exp_out_str}', found: '{user_out_str}'"
            protocol_lines.append(f"Checker Log\n{err_msg}\n")
            break

    judgement_protocol_text = None
    if overall_verdict != "AC":
        verdict_full_str = "Wrong Answer" if overall_verdict == "WA" else ("Time Limit Exceeded" if overall_verdict == "TLE" else ("Runtime Error" if overall_verdict == "RE" else overall_verdict))
        protocol_lines.append(f"Submission verdict: {verdict_full_str}")
        judgement_protocol_text = "\n".join(protocol_lines)

    score = 100.0 if overall_verdict == "AC" else 0.0

    submission = models.Submission(
        user_id=current_user.id,
        problem_id=submission_data.problem_id,
        contest_id=submission_data.contest_id,
        language=submission_data.language,
        code=submission_data.code,
        verdict=overall_verdict,
        score=score,
        judgement_protocol=judgement_protocol_text
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    team_name = reg.team_name if (reg and reg.team_name) else None

    return schemas.SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        user_name=current_user.name,
        team_name=team_name,
        problem_id=submission.problem_id,
        problem_title=problem.title,
        contest_id=submission.contest_id,
        language=submission.language,
        code=submission.code,
        verdict=submission.verdict,
        score=submission.score,
        submitted_at=submission.submitted_at,
        test_case_results=tc_results,
        judgement_protocol=judgement_protocol_text
    )

@app.get("/submissions", response_model=List[schemas.SubmissionResponse])
def get_submissions(
    contest_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    problem_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Submission)
    if contest_id:
        query = query.filter(models.Submission.contest_id == contest_id)
    if user_id:
        query = query.filter(models.Submission.user_id == user_id)
    if problem_id:
        query = query.filter(models.Submission.problem_id == problem_id)

    submissions = query.order_by(models.Submission.submitted_at.desc()).all()
    results = []
    for s in submissions:
        user = db.query(models.User).filter(models.User.id == s.user_id).first()
        prob = db.query(models.Problem).filter(models.Problem.id == s.problem_id).first()
        reg, _ = get_user_registration(s.contest_id, user, db) if user else (None, False)
        team_name = reg.team_name if (reg and reg.team_name) else None

        results.append(schemas.SubmissionResponse(
            id=s.id,
            user_id=s.user_id,
            user_name=user.name if user else "Unknown User",
            team_name=team_name,
            problem_id=s.problem_id,
            problem_title=prob.title if prob else "Problem",
            contest_id=s.contest_id,
            language=s.language,
            code=s.code,
            verdict=s.verdict,
            score=s.score,
            submitted_at=s.submitted_at,
            judgement_protocol=s.judgement_protocol
        ))
    return results

# ----------------------------
# Leaderboard Endpoint
# ----------------------------

@app.get("/contests/{contest_id}/leaderboard", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(contest_id: int, db: Session = Depends(get_db)):
    contest = db.query(models.Contest).filter(models.Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")

    registrations = db.query(models.Registration).filter(models.Registration.contest_id == contest_id).all()
    reg_map = {r.user_id: r for r in registrations}
    user_ids = set(reg_map.keys())

    submissions = db.query(models.Submission).filter(models.Submission.contest_id == contest_id).all()
    for s in submissions:
        user_ids.add(s.user_id)

    leaderboard = []

    for uid in user_ids:
        user = db.query(models.User).filter(models.User.id == uid).first()
        if not user or user.role == "organizer":
            continue

        reg = reg_map.get(uid)
        user_subs = [s for s in submissions if s.user_id == uid]
        user_subs.sort(key=lambda s: s.submitted_at)

        problem_status = {}
        solved_count = 0
        total_score = 0.0
        total_penalty = 0

        probs = {}
        for s in user_subs:
            probs.setdefault(s.problem_id, []).append(s)

        for pid, psubs in probs.items():
            ac_sub = None
            wrong_attempts = 0
            for sub in psubs:
                if sub.verdict == "AC":
                    ac_sub = sub
                    break
                else:
                    wrong_attempts += 1

            if ac_sub:
                solved_count += 1
                total_score += 100.0
                time_min = max(0, int((ac_sub.submitted_at - contest.start_time).total_seconds() // 60))
                penalty = time_min + (wrong_attempts * 20)
                total_penalty += penalty
                problem_status[str(pid)] = {
                    "verdict": "AC",
                    "attempts": wrong_attempts + 1,
                    "time_min": time_min
                }
            else:
                problem_status[str(pid)] = {
                    "verdict": psubs[-1].verdict if psubs else "WA",
                    "attempts": len(psubs),
                    "time_min": 0
                }

        leaderboard.append({
            "user_id": user.id,
            "user_name": user.name,
            "email": user.email,
            "team_name": reg.team_name if reg else None,
            "members": reg.members if reg else None,
            "school": reg.school if reg else None,
            "problems_solved": solved_count,
            "total_score": total_score,
            "total_penalty_minutes": total_penalty,
            "problem_status": problem_status
        })

    leaderboard.sort(key=lambda x: (-x["problems_solved"], x["total_penalty_minutes"]))

    result = []
    for rank, entry in enumerate(leaderboard, start=1):
        result.append(schemas.LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            user_name=entry["user_name"],
            email=entry["email"],
            team_name=entry["team_name"],
            members=entry["members"],
            school=entry["school"],
            problems_solved=entry["problems_solved"],
            total_score=entry["total_score"],
            total_penalty_minutes=entry["total_penalty_minutes"],
            problem_status=entry["problem_status"]
        ))
    return result
