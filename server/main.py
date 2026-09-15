from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
import auth
from judge import run_test_case
from seed import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

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

def get_registration_status(contest: models.Contest) -> str:
    now = datetime.utcnow()
    reg_start = contest.registration_start_time or (contest.start_time - timedelta(days=7))
    reg_end = contest.registration_end_time or contest.end_time or (contest.start_time + timedelta(days=1))

    # Guard against invalid reg_end <= reg_start
    if reg_end <= reg_start:
        reg_end = contest.end_time or (contest.start_time + timedelta(days=1))

    if now < reg_start:
        return "REGISTRATION_NOT_STARTED"
    elif reg_start <= now <= reg_end:
        return "REGISTRATION_OPEN"
    else:
        return "REGISTRATION_CLOSED"

def check_problem_access(contest_id: int, user: Optional[models.User], db: Session):
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

    reg = db.query(models.Registration).filter(
        models.Registration.contest_id == contest_id,
        models.Registration.user_id == user.id
    ).first()
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
        
        status_str = get_contest_status(c)
        reg_status = get_registration_status(c)

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
    reg_end = contest_data.registration_end_time or contest_data.end_time or contest_data.start_time

    if reg_end <= reg_start:
        reg_end = contest_data.end_time or (contest_data.start_time + timedelta(days=1))

    contest = models.Contest(
        title=contest_data.title,
        description=contest_data.description,
        start_time=contest_data.start_time,
        end_time=contest_data.end_time,
        registration_start_time=reg_start,
        registration_end_time=reg_end,
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
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest),
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

    if contest.registration_end_time and contest.registration_start_time and contest.registration_end_time <= contest.registration_start_time:
        contest.registration_end_time = contest.end_time

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
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest),
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

    return schemas.ContestResponse(
        id=contest.id,
        title=contest.title,
        description=contest.description,
        start_time=contest.start_time,
        end_time=contest.end_time,
        registration_start_time=contest.registration_start_time,
        registration_end_time=contest.registration_end_time,
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched,
        registration_status=get_registration_status(contest),
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
        created_by=contest.created_by,
        status=get_contest_status(contest),
        is_launched=contest.is_launched or False,
        registration_status=get_registration_status(contest),
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

    reg_status = get_registration_status(contest)
    if reg_status == "REGISTRATION_NOT_STARTED":
        start_str = contest.registration_start_time.strftime("%Y-%m-%d %H:%M UTC") if contest.registration_start_time else "the scheduled window"
        raise HTTPException(
            status_code=400,
            detail=f"Registration has not opened yet. Registration opens at {start_str}."
        )
    elif reg_status == "REGISTRATION_CLOSED":
        raise HTTPException(
            status_code=400,
            detail="Registration for this contest has closed."
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

# ----------------------------
# Problem Endpoints
# ----------------------------

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
    
    for tc in test_cases:
        res = run_test_case(
            code=submission_data.code,
            language=submission_data.language,
            input_str=tc.input,
            expected_output_str=tc.expected_output,
            time_limit_ms=problem.time_limit_ms
        )
        tc_results.append(schemas.TestCaseResult(
            test_case_id=tc.id,
            is_sample=tc.is_sample,
            status=res["status"],
            user_output=res["user_output"],
            expected_output=res["expected_output"],
            execution_time_ms=res["execution_time_ms"],
            error=res["error"]
        ))
        if res["status"] != "AC" and overall_verdict == "AC":
            overall_verdict = res["status"]

    score = 100.0 if overall_verdict == "AC" else 0.0

    submission = models.Submission(
        user_id=current_user.id,
        problem_id=submission_data.problem_id,
        contest_id=submission_data.contest_id,
        language=submission_data.language,
        code=submission_data.code,
        verdict=overall_verdict,
        score=score
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return schemas.SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        user_name=current_user.name,
        problem_id=submission.problem_id,
        problem_title=problem.title,
        contest_id=submission.contest_id,
        language=submission.language,
        code=submission.code,
        verdict=submission.verdict,
        score=submission.score,
        submitted_at=submission.submitted_at,
        test_case_results=tc_results
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
        results.append(schemas.SubmissionResponse(
            id=s.id,
            user_id=s.user_id,
            user_name=user.name if user else "Unknown User",
            problem_id=s.problem_id,
            problem_title=prob.title if prob else "Problem",
            contest_id=s.contest_id,
            language=s.language,
            code=s.code,
            verdict=s.verdict,
            score=s.score,
            submitted_at=s.submitted_at
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
