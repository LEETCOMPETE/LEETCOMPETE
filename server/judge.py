import os
import sys
import time
import subprocess
import signal
import tempfile
import httpx
from typing import Dict, Any, Tuple, Optional

JUDGE0_URL = os.getenv("JUDGE0_URL", "https://judge0-ce.p.rapidapi.com")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
LEETJUDGE_BIN = os.getenv("LEETJUDGE_BIN", "/home/aeddiba/goinfre/LEETCOMPETE/LEETCONTEST/LeetJudge")

# Judge0 language ID mappings
LANGUAGE_IDS = {
    "python": 71,       # Python (3.8.1)
    "py": 71,
    "python3": 71,
    "cpp": 54,          # C++ (GCC 9.2.0)
    "c++": 54,
    "c": 50,
    "java": 62,         # Java (OpenJDK 13.0.1)
    "javascript": 63,   # JavaScript (Node.js 12.14.0)
    "js": 63,
}

def clean_output(s: str) -> str:
    if not s:
        return ""
    # Normalize newlines and trim trailing whitespace per line
    lines = [line.rstrip() for line in s.strip().splitlines()]
    return "\n".join(lines)

def execute_with_timeout(cmd: list, input_str: str, timeout_sec: float):
    """
    Executes a command in a subprocess with input string and timeout.
    If the command runs longer than timeout_sec, forcibly kills the entire process group
    with SIGKILL and reaps the child process to prevent runaway background processes.
    """
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True  # Creates a new process group for clean termination
    )

    try:
        stdout, stderr = proc.communicate(input=input_str, timeout=timeout_sec)
        return False, stdout, stderr, proc.returncode
    except subprocess.TimeoutExpired:
        # Forcibly kill the entire process group if running after time limit
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        # Reap process to prevent zombie process creation
        try:
            proc.communicate()
        except Exception:
            pass
        return True, "", "Time Limit Exceeded", -1
    except Exception as e:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        return False, "", str(e), -1

def run_leet_judge(user_output: str, input_str: str, expected_ref: str, problem_id: Optional[Any] = None) -> Tuple[str, Optional[str]]:
    """
    Evaluates user output against input and expected reference using LeetSentry's LeetJudge C++ engine.
    Supports dynamic library solvers (LeetSolution.so with LeetSolver_<id>) as well as text output comparison.
    Returns (verdict, error_details).
    """
    if not os.path.exists(LEETJUDGE_BIN):
        u_clean = clean_output(user_output)
        e_clean = clean_output(expected_ref)
        if u_clean == e_clean:
            return "AC", None
        return "WA", None

    with tempfile.TemporaryDirectory() as tmpdir:
        user_out_path = os.path.join(tmpdir, "user.out")
        input_in_path = os.path.join(tmpdir, "input.in")
        ref_out_path = os.path.join(tmpdir, "ref.out")

        with open(user_out_path, "w") as f:
            f.write(user_output or "")
        with open(input_in_path, "w") as f:
            f.write(input_str or "")

        sol_so_path = os.path.join(os.path.dirname(LEETJUDGE_BIN), "LeetSolution.so")

        # Determine reference argument
        if expected_ref and (expected_ref.endswith(".so") or expected_ref.endswith(".dll")):
            ref_arg = expected_ref
        elif os.path.exists(sol_so_path) and problem_id is not None:
            ref_arg = sol_so_path
        else:
            with open(ref_out_path, "w") as f:
                f.write(expected_ref or "")
            ref_arg = ref_out_path

        cmd = [LEETJUDGE_BIN, user_out_path, input_in_path, ref_arg]
        if problem_id is not None:
            cmd.append(str(problem_id))

        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5.0
            )
            stdout = proc.stdout.strip()

            # If ref_arg was LeetSolution.so but solver function was missing, fallback to expected_ref text file
            if "JE: Missing LeetSolver function" in stdout and ref_arg != ref_out_path and expected_ref:
                with open(ref_out_path, "w") as f:
                    f.write(expected_ref or "")
                fallback_cmd = [LEETJUDGE_BIN, user_out_path, input_in_path, ref_out_path]
                if problem_id is not None:
                    fallback_cmd.append(str(problem_id))
                proc = subprocess.run(fallback_cmd, capture_output=True, text=True, timeout=5.0)
                stdout = proc.stdout.strip()

            if proc.returncode == 0 or "AC: Accepted" in stdout:
                return "AC", None
            elif "WA:" in stdout:
                return "WA", stdout
            elif "RE:" in stdout:
                return "RE", stdout
            else:
                return "WA", stdout if stdout else "Judging error"
        except Exception as e:
            return "WA", str(e)

def run_local_fallback(code: str, language: str, input_str: str, expected_output_str: str, time_limit_ms: int, problem_id: Optional[Any] = None) -> Dict[str, Any]:
    """
    Local execution fallback using LeetSentry's LeetJudge C++ engine.
    Executes Python, JavaScript, and C++ locally with strict timeout process killing and LeetJudge evaluation.
    """
    start_time = time.time()
    lang = language.lower()
    timeout_sec = max(0.1, time_limit_ms / 1000.0)

    try:
        if lang in ["python", "python3", "py"]:
            cmd = [sys.executable, "-c", code]
            timed_out, stdout, stderr, returncode = execute_with_timeout(cmd, input_str, timeout_sec)
        
        elif lang in ["javascript", "js"]:
            cmd = ["node", "-e", code]
            timed_out, stdout, stderr, returncode = execute_with_timeout(cmd, input_str, timeout_sec)

        elif lang in ["cpp", "c++", "c"]:
            # Compile C/C++ code locally
            with tempfile.TemporaryDirectory() as tmpdir:
                ext = ".c" if lang == "c" else ".cpp"
                src_path = os.path.join(tmpdir, f"solution{ext}")
                bin_path = os.path.join(tmpdir, "solution")
                
                with open(src_path, "w") as f:
                    f.write(code)

                compiler = "gcc" if lang == "c" else "g++"
                compile_proc = subprocess.run(
                    [compiler, "-O2", src_path, "-o", bin_path],
                    capture_output=True,
                    text=True,
                    timeout=10.0
                )
                
                if compile_proc.returncode != 0:
                    return {
                        "status": "CE",
                        "user_output": "",
                        "expected_output": expected_output_str,
                        "execution_time_ms": 0,
                        "error": compile_proc.stderr
                    }

                cmd = [bin_path]
                timed_out, stdout, stderr, returncode = execute_with_timeout(cmd, input_str, timeout_sec)
        else:
            return {
                "status": "WA",
                "user_output": f"Language local fallback execution unavailable for {language}",
                "expected_output": expected_output_str,
                "execution_time_ms": 0,
                "error": "Language runner not found locally"
            }

        elapsed_ms = (time.time() - start_time) * 1000.0

        if timed_out:
            return {
                "status": "TLE",
                "user_output": "",
                "expected_output": expected_output_str,
                "execution_time_ms": time_limit_ms,
                "error": "Time Limit Exceeded"
            }

        if returncode != 0:
            return {
                "status": "RE",
                "user_output": stdout,
                "expected_output": expected_output_str,
                "execution_time_ms": elapsed_ms,
                "error": stderr
            }

        verdict, judge_error = run_leet_judge(stdout, input_str, expected_output_str, problem_id=problem_id)

        return {
            "status": verdict,
            "user_output": stdout,
            "expected_output": expected_output_str,
            "execution_time_ms": elapsed_ms,
            "error": judge_error if judge_error else stderr
        }

    except Exception as e:
        return {
            "status": "RE",
            "user_output": "",
            "expected_output": expected_output_str,
            "execution_time_ms": 0,
            "error": str(e)
        }

def run_test_case(code: str, language: str, input_str: str, expected_output_str: str, time_limit_ms: int = 2000, problem_id: Optional[Any] = None) -> Dict[str, Any]:
    """
    Runs code using LeetSentry's LeetJudge C++ engine or Judge0 API if configured.
    """
    lang_id = LANGUAGE_IDS.get(language.lower())
    
    # Try Judge0 API if API key is provided
    if JUDGE0_API_KEY and lang_id:
        try:
            headers = {
                "content-type": "application/json",
                "X-RapidAPI-Key": JUDGE0_API_KEY,
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
            }
            payload = {
                "source_code": code,
                "language_id": lang_id,
                "stdin": input_str,
                "expected_output": expected_output_str,
                "cpu_time_limit": max(1, time_limit_ms // 1000)
            }
            res = httpx.post(f"{JUDGE0_URL}/submissions?wait=true", json=payload, headers=headers, timeout=5.0)
            if res.status_code in [200, 201]:
                data = res.json()
                status_id = data.get("status", {}).get("id")
                stdout = data.get("stdout") or ""
                stderr = data.get("stderr") or data.get("compile_output") or ""
                exec_time = float(data.get("time") or 0.0) * 1000.0

                if status_id == 3:
                    verdict = "AC"
                elif status_id == 4:
                    verdict = "WA"
                elif status_id == 5:
                    verdict = "TLE"
                elif status_id == 6:
                    verdict = "CE"
                else:
                    verdict = "RE"

                return {
                    "status": verdict,
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": exec_time,
                    "error": stderr if stderr else None
                }
        except Exception:
            pass

    return run_local_fallback(code, language, input_str, expected_output_str, time_limit_ms, problem_id=problem_id)
