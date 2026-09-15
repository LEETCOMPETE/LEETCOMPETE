import os
import sys
import time
import subprocess
import httpx
from typing import Dict, Any

JUDGE0_URL = os.getenv("JUDGE0_URL", "https://judge0-ce.p.rapidapi.com")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")

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

def run_local_fallback(code: str, language: str, input_str: str, expected_output_str: str, time_limit_ms: int) -> Dict[str, Any]:
    """
    Local execution fallback in case Judge0 is offline or rate limited.
    Executes Python and JavaScript locally in a subprocess with timeout.
    """
    start_time = time.time()
    lang = language.lower()
    
    timeout_sec = max(1.0, time_limit_ms / 1000.0)

    try:
        if lang in ["python", "python3", "py"]:
            cmd = [sys.executable, "-c", code]
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = proc.communicate(input=input_str, timeout=timeout_sec)
            elapsed_ms = (time.time() - start_time) * 1000.0

            if proc.returncode != 0:
                return {
                    "status": "RE",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": stderr
                }
            
            user_clean = clean_output(stdout)
            expected_clean = clean_output(expected_output_str)

            if user_clean == expected_clean:
                return {
                    "status": "AC",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": None
                }
            else:
                return {
                    "status": "WA",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": None
                }

        elif lang in ["javascript", "js"]:
            cmd = ["node", "-e", code]
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = proc.communicate(input=input_str, timeout=timeout_sec)
            elapsed_ms = (time.time() - start_time) * 1000.0

            if proc.returncode != 0:
                return {
                    "status": "RE",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": stderr
                }
            
            user_clean = clean_output(stdout)
            expected_clean = clean_output(expected_output_str)

            if user_clean == expected_clean:
                return {
                    "status": "AC",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": None
                }
            else:
                return {
                    "status": "WA",
                    "user_output": stdout,
                    "expected_output": expected_output_str,
                    "execution_time_ms": elapsed_ms,
                    "error": None
                }
        else:
            # Fallback for unhandled local binary run (C++/Java without compiled setup): default to python-like evaluation
            return {
                "status": "WA",
                "user_output": "Language local fallback execution unavailable for " + language,
                "expected_output": expected_output_str,
                "execution_time_ms": 0,
                "error": "Compiler not found locally"
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "TLE",
            "user_output": "",
            "expected_output": expected_output_str,
            "execution_time_ms": time_limit_ms,
            "error": "Time Limit Exceeded"
        }
    except Exception as e:
        return {
            "status": "RE",
            "user_output": "",
            "expected_output": expected_output_str,
            "execution_time_ms": 0,
            "error": str(e)
        }

def run_test_case(code: str, language: str, input_str: str, expected_output_str: str, time_limit_ms: int = 2000) -> Dict[str, Any]:
    """
    Runs code against Judge0 API if configured/available, otherwise falls back to local execution.
    """
    lang_id = LANGUAGE_IDS.get(language.lower())
    
    # Try Judge0 API if API key or rapidapi headers are provided or public Judge0 URL configured
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

                # Judge0 status IDs: 3 = Accepted, 4 = Wrong Answer, 5 = TLE, 6 = Compile Error, 7-12 = RE
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
            # Fall back to local judge seamlessly
            pass

    return run_local_fallback(code, language, input_str, expected_output_str, time_limit_ms)
