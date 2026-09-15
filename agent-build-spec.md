# AI Agent Build Instructions — Competitive Programming Club Platform

Paste this whole document as your first message to the coding agent (Claude Code, Cursor, etc.). It is written as direct instructions to the agent.

---

## Your Role (agent-facing)

You are an autonomous coding agent building a full-stack web app under a **hackathon deadline**. Priorities, in order:
1. Get a working end-to-end demo (auth → create contest → submit code → see verdict → see leaderboard).
2. Cut scope aggressively when time is short — a thin working slice beats a broad broken one.
3. Seed the database with demo data so the app is never shown empty.
4. Don't gold-plate the UI. Functional > beautiful.

---

## 1. Project Summary

A platform for a competitive programming club to organize and run contests. Organizers create contests with problems; members register, solve problems during the contest window, submit code, get an automated verdict, and see a live leaderboard.

## 2. Tech Stack (fixed — do not deviate)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) + SQLAlchemy + Pydantic
- **DB:** SQLite for the hackathon (zero setup cost) — only use Postgres if there's already a Postgres instance ready to go
- **Auth:** JWT, simple hand-rolled (no need for a heavy auth library)
- **Code judging:** [Judge0 API](https://judge0.com/) (free/public instance or RapidAPI free tier) — **do not build a custom sandbox/executor**, there's no time for that
- **Leaderboard updates:** polling every 5–10s from the frontend. Skip websockets unless it's trivial in your stack.

## 3. MVP Scope (must work end-to-end for the demo)

1. **Auth** — register/login. Roles: `organizer`, `participant`.
2. **Contest management** — organizer creates a contest (title, description, start/end time) and adds problems to it.
3. **Problems** — title, statement, sample input/output, hidden testcases, time limit, difficulty.
4. **Participant flow** — browse contests → register → view problems during the contest window → submit code (language dropdown) → see verdict (AC / WA / TLE / RE).
5. **Leaderboard** — score = accepted problems + time penalty, auto-refreshing.

## 4. Explicitly OUT of scope (cut these — no time)

- Custom sandboxed code execution (use Judge0 instead)
- Plagiarism detection (unless you pick it as the AI feature below)
- Team-based contests (individual only)
- Discussion/editorial forum
- Payments/subscriptions
- Full test suite / CI pipeline
- Password reset flows, email verification

## 5. Data Models (minimum viable)

```
User            id, name, email, password_hash, role
Contest         id, title, description, start_time, end_time, created_by
Problem         id, contest_id, title, statement, time_limit_ms, difficulty
TestCase        id, problem_id, input, expected_output, is_sample (bool)
Submission      id, user_id, problem_id, contest_id, language, code, verdict, score, submitted_at
Registration    id, user_id, contest_id
```

## 6. API Endpoints (FastAPI)

```
Auth
  POST /auth/register
  POST /auth/login

Contests
  GET  /contests
  POST /contests                        (organizer only)
  GET  /contests/{id}
  POST /contests/{id}/register          (participant)

Problems
  GET  /contests/{id}/problems
  POST /contests/{id}/problems          (organizer only)
  GET  /problems/{id}

Submissions
  POST /submissions                     (code + language + problem_id -> runs via Judge0 -> returns verdict)
  GET  /submissions?contest_id=&user_id=

Leaderboard
  GET  /contests/{id}/leaderboard
```

## 7. Frontend Pages (Next.js)

```
/                                club landing page
/login, /register
/contests                        list of contests (upcoming/live/past)
/contests/[id]                   problem list + countdown timer + register button
/contests/[id]/problems/[pid]    statement + code editor (Monaco) + submit + verdict
/contests/[id]/leaderboard       auto-refreshing table
/admin/contests/new              organizer form: create contest + add problems
```

## 8. Judging Flow (keep it simple)

1. Participant submits `{code, language, problem_id}` to `POST /submissions`.
2. Backend loops through the problem's testcases, sends each to Judge0 (`source_code`, `language_id`, `stdin`, `expected_output`).
3. Aggregate testcase results into one overall verdict (AC only if all pass; otherwise first failing verdict).
4. Store submission + verdict, recompute that user's leaderboard score.
5. Return verdict to frontend.

## 9. AI Feature (this is an AI hackathon — pick ONE, keep it small and optional)

Judging criteria will likely reward visible AI usage. Wire in exactly one of these via an LLM API, as an **isolated, optional** feature that can never block the core contest flow:

- **Option A — AI hint generator:** participant clicks "Get a hint," backend sends the problem statement (never the hidden testcases) to an LLM, returns a nudge, not the answer.
- **Option B — AI problem generator:** organizer types a topic + difficulty, LLM drafts a statement + sample I/O for the organizer to review/edit before publishing.
- **Option C — AI submission feedback:** after a verdict, LLM gives 1–2 sentences of style/complexity feedback on the submitted code.

Pick whichever is fastest to wire into your stack. Build this **last**, after the core flow works.

## 10. Suggested Build Order

1. **Scaffolding + auth** — Next.js + FastAPI skeletons talking to each other, JWT login/register working.
2. **Contest & problem CRUD** — organizer can create a contest and add problems; participants can list/view them.
3. **Submission + Judge0 integration** — code submission returns a real verdict.
4. **Leaderboard** — computed and polling-refreshed.
5. **Seed data** — 1 demo contest, 3 problems, 2 demo users, a few fake submissions.
6. **AI feature** — bolt on the one chosen option.
7. **Polish** — fix obviously broken UI, add loading states, rehearse the demo click-path.

## 11. Non-negotiables

- Seed the DB on startup so the demo is never empty.
- Every core flow (register → submit → verdict → leaderboard) must work **through the UI**, not just via curl/Postman.
- Commit or checkpoint after each milestone in section 10 — don't let one big-bang change break everything the night before the demo.
- If Judge0's public instance is rate-limited or flaky, have a hardcoded fallback verdict path so the demo doesn't die live.

---

**How to use this:** paste this entire file as your first message to the coding agent. If it asks clarifying questions, answer briefly and tell it to keep moving — time is the constraint, not correctness.
