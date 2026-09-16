# LEETCOMPETE Judger Roadmap & TODO List

This document outlines the completed features and future development roadmap for the **LeetCompete / LeetContest C++ Judging Engine**.

---

## 🟢 Completed Features (Current Baseline)
- [x] **LeetJudge C++ Core Engine**: Token-by-token output comparison ignoring trailing whitespace and line endings.
- [x] **Dynamic Solver Function Export**: Dynamic symbol lookup (`LeetSolver_<problem_id>`) from `LeetSolution.so` via `dlsym`/`GetProcAddress`.
- [x] **Fallback Reference Support**: Automatic fallback to static database reference outputs if dynamic solver function is missing or unexported.
- [x] **Multi-Language Local Execution**: Local runners for Python 3, Node.js (JavaScript), C, and C++ (`g++ -O2`).
- [x] **Process Group Isolation & Timeout Handling**: SIGKILL process-group termination (`start_new_session=True`) to prevent zombie/runaway processes on Time Limit Exceeded (TLE).
- [x] **Judge0 API Integration**: Built-in support for Judge0 REST API when API key is provided.

---

## 🔴 High Priority: Security & Production Sandboxing
- [ ] **Containerized / Sandboxed Execution**:
  - [ ] Implement `nsjail`, `seccomp` system call filters, or Docker/Podman container isolation to prevent malicious user code execution.
  - [ ] Restrict network access (disable socket creation) for submitted programs.
  - [ ] Restrict filesystem write access (read-only rootfs, isolated ephemeral `/tmp` ramfs per submission).
  - [ ] Enforce process fork limits (`pids.max`) to prevent fork bombs.

---

## 🟡 Medium Priority: Resource Limits & Judge Accuracy
- [ ] **Memory Limit Exceeded (MLE) Enforcement**:
  - [ ] Measure peak Resident Set Size (RSS) memory usage using `/proc/[pid]/statm` or Linux cgroups memory controllers.
  - [ ] Enforce problem-specific memory caps (e.g., 256 MB) and return `MLE` verdict when exceeded.
  - [ ] Replace static `0 KB` memory placeholder in checker logs with actual measured memory usage.
- [ ] **Float Precision & Special Checkers**:
  - [ ] Implement floating-point absolute/relative error tolerance ($|got - expected| \le 10^{-6}$).
  - [ ] Add support for custom Special Judges (SPJ) for problems with multiple valid output formats (e.g., graph paths, floating-point matrices).

---

## 🔵 Low Priority: Language Expansion & Performance
- [ ] **Additional Programming Languages**:
  - [ ] Add Java (`javac` / `java`) local runner.
  - [ ] Add Rust (`rustc`) local runner.
  - [ ] Add Go (`go build` / runner) local runner.
- [ ] **Compilation & Optimization Improvements**:
  - [ ] Upgrade C++ compilation flags to `g++ -O3 -std=c++20`.
  - [ ] Truncate lengthy compilation error (`CE`) messages to prevent database and UI response bloat.
- [ ] **Batch & Parallel Judging**:
  - [ ] Execute independent test cases concurrently using worker pools to increase judging throughput during live contests.
- [ ] **Interactive Problems Support**:
  - [ ] Support two-way IPC communication streams between user solution process and interactive judge process.
