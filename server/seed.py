from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models
from auth import hash_password

def seed_database(db: Session):
    # Check if database is already seeded
    if db.query(models.User).filter(models.User.email == "organizer@leetcompete.com").first():
        print("Database already seeded.")
        return

    print("Seeding database with demo data...")

    # 1. Create Users
    organizer = models.User(
        name="Elena Rostova (Organizer)",
        email="organizer@leetcompete.com",
        password_hash=hash_password("password123"),
        role="organizer"
    )
    participant1 = models.User(
        name="Alex Chen",
        email="alex@leetcompete.com",
        password_hash=hash_password("password123"),
        role="participant"
    )
    participant2 = models.User(
        name="Sarah Jenkins",
        email="sarah@leetcompete.com",
        password_hash=hash_password("password123"),
        role="participant"
    )

    db.add_all([organizer, participant1, participant2])
    db.commit()
    db.refresh(organizer)
    db.refresh(participant1)
    db.refresh(participant2)

    # 2. Create Contest (Currently LIVE with Active Registration Window)
    now = datetime.utcnow()
    contest = models.Contest(
        title="LeetCompete Fall 2026 Invitational",
        description="Welcome to the flagship competitive programming contest of the season! Solve 3 algorithmic challenges within 3 hours. Good luck!",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=23),
        registration_start_time=now - timedelta(days=7),
        registration_end_time=now + timedelta(hours=12),
        is_launched=True,
        created_by=organizer.id
    )
    db.add(contest)
    db.commit()
    db.refresh(contest)

    # 3. Create Registrations with Team Name, Members, and School
    reg1 = models.Registration(
        user_id=participant1.id,
        contest_id=contest.id,
        team_name="AlgoRiders",
        members="Alex Chen, David Kim, Maya Lin",
        school="Stanford University"
    )
    reg2 = models.Registration(
        user_id=participant2.id,
        contest_id=contest.id,
        team_name="Binary Beasts",
        members="Sarah Jenkins, Liam Vance",
        school="MIT"
    )
    db.add_all([reg1, reg2])

    # 4. Problem 1: Two Sum
    p1 = models.Problem(
        contest_id=contest.id,
        title="Two Sum",
        statement="""Given an array of integers `nums` and an integer `target`, return the 0-indexed positions of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Output the two indices separated by a space (e.g. `0 1`).

### Input Format:
Line 1: Space-separated integers representing `nums`.
Line 2: Single integer `target`.

### Output Format:
Two space-separated 0-indexed indices.
""",
        time_limit_ms=2000,
        difficulty="Easy"
    )
    db.add(p1)
    db.commit()
    db.refresh(p1)

    # Test cases for Problem 1
    tc1_1 = models.TestCase(
        problem_id=p1.id,
        input="2 7 11 15\n9",
        expected_output="0 1",
        is_sample=True
    )
    tc1_2 = models.TestCase(
        problem_id=p1.id,
        input="3 2 4\n6",
        expected_output="1 2",
        is_sample=True
    )
    tc1_3 = models.TestCase(
        problem_id=p1.id,
        input="3 3\n6",
        expected_output="0 1",
        is_sample=False
    )
    db.add_all([tc1_1, tc1_2, tc1_3])

    # 5. Problem 2: Valid Parentheses
    p2 = models.Problem(
        contest_id=contest.id,
        title="Valid Parentheses",
        statement="""Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Input Format:
A single line containing the string `s`.

### Output Format:
Print `true` if valid, or `false` otherwise.
""",
        time_limit_ms=2000,
        difficulty="Easy"
    )
    db.add(p2)
    db.commit()
    db.refresh(p2)

    tc2_1 = models.TestCase(
        problem_id=p2.id,
        input="()[]{}",
        expected_output="true",
        is_sample=True
    )
    tc2_2 = models.TestCase(
        problem_id=p2.id,
        input="(]",
        expected_output="false",
        is_sample=True
    )
    tc2_3 = models.TestCase(
        problem_id=p2.id,
        input="{[]}",
        expected_output="true",
        is_sample=False
    )
    db.add_all([tc2_1, tc2_2, tc2_3])

    # 6. Problem 3: Maximum Subarray
    p3 = models.Problem(
        contest_id=contest.id,
        title="Maximum Subarray",
        statement="""Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.

### Input Format:
A single line of space-separated integers representing `nums`.

### Output Format:
A single integer representing the maximum subarray sum.
""",
        time_limit_ms=2000,
        difficulty="Medium"
    )
    db.add(p3)
    db.commit()
    db.refresh(p3)

    tc3_1 = models.TestCase(
        problem_id=p3.id,
        input="-2 1 -3 4 -1 2 1 -5 4",
        expected_output="6",
        is_sample=True
    )
    tc3_2 = models.TestCase(
        problem_id=p3.id,
        input="1",
        expected_output="1",
        is_sample=True
    )
    tc3_3 = models.TestCase(
        problem_id=p3.id,
        input="5 4 -1 7 8",
        expected_output="23",
        is_sample=False
    )
    db.add_all([tc3_1, tc3_2, tc3_3])

    db.commit()

    # 7. Seed Initial Submissions for Demo Leaderboard
    python_twosum = """import sys

input_data = sys.stdin.read().splitlines()
if len(input_data) >= 2:
    nums = list(map(int, input_data[0].split()))
    target = int(input_data[1])
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {i}")
            break
        seen[num] = i
"""
    sub1 = models.Submission(
        user_id=participant1.id,
        problem_id=p1.id,
        contest_id=contest.id,
        language="python",
        code=python_twosum,
        verdict="AC",
        score=100.0,
        submitted_at=now - timedelta(minutes=45)
    )

    python_valid_parentheses = """import sys

s = sys.stdin.read().strip()
stack = []
mapping = {')': '(', '}': '{', ']': '['}
valid = True
for char in s:
    if char in mapping.values():
        stack.append(char)
    elif char in mapping:
        if not stack or stack.pop() != mapping[char]:
            valid = False
            break

if stack:
    valid = False

print("true" if valid else "false")
"""
    sub2 = models.Submission(
        user_id=participant1.id,
        problem_id=p2.id,
        contest_id=contest.id,
        language="python",
        code=python_valid_parentheses,
        verdict="AC",
        score=100.0,
        submitted_at=now - timedelta(minutes=20)
    )

    sub3 = models.Submission(
        user_id=participant2.id,
        problem_id=p1.id,
        contest_id=contest.id,
        language="python",
        code="print('0 1')",
        verdict="WA",
        score=0.0,
        submitted_at=now - timedelta(minutes=30)
    )

    db.add_all([sub1, sub2, sub3])
    db.commit()
    print("Database seeding completed successfully!")
