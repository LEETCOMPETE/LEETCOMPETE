import os
import httpx
from typing import Optional, Dict, Any

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

def get_ai_hint(problem_title: str, problem_statement: str, current_code: Optional[str] = None) -> Dict[str, str]:
    """
    Option A — AI Hint Generator:
    Sends problem statement to an LLM to generate a helpful nudge/hint without giving away the full answer.
    Includes smart fallback logic if LLM keys are not configured.
    """
    code_part = f"User Current Code:\n{current_code}" if current_code else ""
    prompt = f"""You are an expert competitive programming tutor.
Problem Title: {problem_title}
Problem Statement: {problem_statement}
{code_part}

Provide a helpful, encouraging 2-3 sentence hint or nudge on what data structure, approach, or edge case to consider.
DO NOT provide the full solution code. Keep it brief and constructive."""

    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            res = httpx.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}]
            }, timeout=6.0)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "hint": text.strip(),
                    "suggestion": "Try implementing this step by step and test with small inputs!"
                }
        except Exception:
            pass

    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            res = httpx.post(url, json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 150
            }, headers=headers, timeout=6.0)
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"]
                return {
                    "hint": text.strip(),
                    "suggestion": "Double check boundary conditions and test cases."
                }
        except Exception:
            pass

    # Built-in fallback AI tutor heuristics based on problem title keywords
    title_lower = problem_title.lower()
    if "sum" in title_lower or "two sum" in title_lower:
        hint_text = "💡 **AI Nudge:** Consider using a Hash Map (dictionary) to store each number's complement (`target - num`) as you iterate through the array. This reduces time complexity from O(N²) to O(N)."
        suggestion = "Check if duplicate numbers in the array need special handling!"
    elif "parentheses" in title_lower or "bracket" in title_lower:
        hint_text = "💡 **AI Nudge:** A Stack data structure is ideal for tracking open brackets. Push opening brackets `'(', '{', '['` onto the stack and pop them when matching closing brackets are encountered."
        suggestion = "Don't forget to check if the stack is empty at the end!"
    elif "subarray" in title_lower or "maximum" in title_lower:
        hint_text = "💡 **AI Nudge:** Explore Kadane's Algorithm: keep track of the current maximum sum (`curr_sum = max(num, curr_sum + num)`) and update the global maximum sum."
        suggestion = "Handle cases where all elements in the array are negative!"
    else:
        hint_text = f"💡 **AI Nudge for '{problem_title}':** Break down the problem into smaller steps. Identify constraints on input size N: if N ≤ 10⁵, an O(N) or O(N log N) algorithm using two pointers or hashing is expected."
        suggestion = "Test your solution with edge cases like empty inputs or extreme values!"

    return {
        "hint": hint_text,
        "suggestion": suggestion
    }
