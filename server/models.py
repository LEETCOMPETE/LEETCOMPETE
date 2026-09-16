from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="participant")  # "organizer" or "participant"
    created_at = Column(DateTime, default=datetime.utcnow)

    contests_created = relationship("Contest", back_populates="creator", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="user", cascade="all, delete-orphan")

class Contest(Base):
    __tablename__ = "contests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=False)
    registration_start_time = Column(DateTime, nullable=True)
    registration_end_time = Column(DateTime, nullable=True)
    max_participants = Column(Integer, nullable=True)  # Nullable: None means unlimited
    max_team_members = Column(Integer, default=3, nullable=True)  # Max team members allowed per team
    allow_all_members_submit = Column(Boolean, default=True)  # True = all members submit, False = leader only
    show_checker_logs = Column(Boolean, default=False)  # True = show detailed checker protocol for failed submissions
    is_launched = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="contests_created")
    problems = relationship("Problem", back_populates="contest", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="contest", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="contest", cascade="all, delete-orphan")

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False)
    title = Column(String(200), nullable=False)
    statement = Column(Text, nullable=False)
    time_limit_ms = Column(Integer, default=2000)
    difficulty = Column(String(20), default="Medium")  # Easy, Medium, Hard

    contest = relationship("Contest", back_populates="problems")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="problem", cascade="all, delete-orphan")

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False)

    problem = relationship("Problem", back_populates="test_cases")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    verdict = Column(String(50), default="Pending")  # AC, WA, TLE, RE, CE, Pending
    score = Column(Float, default=0.0)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem", back_populates="submissions")
    contest = relationship("Contest", back_populates="submissions")

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False)
    team_name = Column(String(100), nullable=True)
    members = Column(Text, nullable=True)
    school = Column(String(150), nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="registrations")
    contest = relationship("Contest", back_populates="registrations")
