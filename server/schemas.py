from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr

# Auth Schemas
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "participant"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Registration Schemas
class RegistrationRequest(BaseModel):
    team_name: str
    members: str
    school: str

class RegistrationInfo(BaseModel):
    id: int
    user_id: int
    contest_id: int
    team_name: Optional[str] = None
    members: Optional[str] = None
    school: Optional[str] = None
    registered_at: datetime

    class Config:
        from_attributes = True

# TestCase Schemas
class TestCaseCreate(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = False

class TestCaseResponse(BaseModel):
    id: int
    input: str
    expected_output: str
    is_sample: bool

    class Config:
        from_attributes = True

# Problem Schemas
class ProblemCreate(BaseModel):
    title: str
    statement: str
    time_limit_ms: int = 2000
    difficulty: str = "Medium"
    test_cases: List[TestCaseCreate] = []

class ProblemResponse(BaseModel):
    id: int
    contest_id: int
    title: str
    statement: str
    time_limit_ms: int
    difficulty: str

    class Config:
        from_attributes = True

class ProblemDetailResponse(ProblemResponse):
    sample_test_cases: List[TestCaseResponse] = []

# Contest Schemas
class ContestCreate(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    registration_start_time: Optional[datetime] = None
    registration_end_time: Optional[datetime] = None

class ContestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    registration_start_time: Optional[datetime] = None
    registration_end_time: Optional[datetime] = None


class ContestResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    registration_start_time: Optional[datetime] = None
    registration_end_time: Optional[datetime] = None
    created_by: int
    status: str  # "UPCOMING", "LIVE", "PAST"
    is_launched: bool = False
    registration_status: str = "REGISTRATION_OPEN"  # "REGISTRATION_OPEN", "REGISTRATION_NOT_STARTED", "REGISTRATION_CLOSED"
    is_registered: Optional[bool] = False
    registration_info: Optional[RegistrationInfo] = None

    class Config:
        from_attributes = True

class ContestDetailResponse(ContestResponse):
    problems: List[ProblemResponse] = []

# Submission Schemas
class SubmissionCreate(BaseModel):
    contest_id: int
    problem_id: int
    language: str
    code: str

class TestCaseResult(BaseModel):
    test_case_id: int
    is_sample: bool
    status: str  # AC, WA, TLE, RE
    user_output: Optional[str] = None
    expected_output: Optional[str] = None
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    problem_id: int
    problem_title: Optional[str] = None
    contest_id: int
    language: str
    code: str
    verdict: str
    score: float
    submitted_at: datetime
    test_case_results: Optional[List[TestCaseResult]] = None

    class Config:
        from_attributes = True

# Leaderboard Schemas
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    user_name: str
    email: str
    team_name: Optional[str] = None
    members: Optional[str] = None
    school: Optional[str] = None
    problems_solved: int
    total_score: float
    total_penalty_minutes: int
    problem_status: dict  # problem_id -> {"verdict": "AC", "attempts": 2, "time_min": 15}
