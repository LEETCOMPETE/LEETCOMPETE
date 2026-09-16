import re
import urllib.request
from bs4 import BeautifulSoup

def fetch_codeforces_problem(url: str) -> dict:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    if not url.startswith('http'):
        url = 'https://' + url

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        raise ValueError(f"Failed to fetch Codeforces URL: {str(e)}")

    soup = BeautifulSoup(html, 'html.parser')
    problem_node = soup.find('div', class_='problem-statement')
    if not problem_node:
        raise ValueError("Could not find problem statement on Codeforces page. Please check the URL.")

    # 1. Title
    title_node = problem_node.find('div', class_='title')
    title = title_node.text.strip() if title_node else "Codeforces Problem"

    # 2. Time limit
    time_limit_node = problem_node.find('div', class_='time-limit')
    time_limit_ms = 2000
    if time_limit_node:
        match = re.search(r'(\d+(?:\.\d+)?)\s*second', time_limit_node.text, re.IGNORECASE)
        if match:
            time_limit_ms = int(float(match.group(1)) * 1000)

    # 3. Sample Test Cases
    sample_tests = []
    sample_tests_node = problem_node.find('div', class_='sample-tests')
    if sample_tests_node:
        inputs = sample_tests_node.find_all('div', class_='input')
        outputs = sample_tests_node.find_all('div', class_='output')
        
        for inp, outp in zip(inputs, outputs):
            inp_pre = inp.find('pre')
            outp_pre = outp.find('pre')
            
            def get_pre_text(pre_elem):
                if not pre_elem:
                    return ""
                lines = pre_elem.find_all('div', class_='test-example-line')
                if lines:
                    return "\n".join([line.text for line in lines])
                for br in pre_elem.find_all('br'):
                    br.replace_with('\n')
                return pre_elem.text

            inp_text = get_pre_text(inp_pre)
            outp_text = get_pre_text(outp_pre)
                
            sample_tests.append({
                "input": inp_text.strip(),
                "expected_output": outp_text.strip()
            })

    # 4. Extract Clean Problem HTML Statement
    clone = BeautifulSoup(str(problem_node), 'html.parser')
    p_statement = clone.find('div', class_='problem-statement')
    
    # Remove header (title/time limit info) and sample-tests (rendered separately in contest page)
    header_div = p_statement.find('div', class_='header')
    if header_div:
        header_div.decompose()
        
    samples_div = p_statement.find('div', class_='sample-tests')
    if samples_div:
        samples_div.decompose()

    # Convert relative Codeforces image URLs to absolute URLs
    for img in p_statement.find_all('img'):
        src = img.get('src', '')
        if src.startswith('/'):
            img['src'] = 'https://codeforces.com' + src

    statement_html = str(p_statement)

    # Convert Codeforces $$$ math tags into standard LaTeX inline $ tags
    statement_html = re.sub(r'\$\$\$(.*?)\$\$\$', r'$\1$', statement_html)

    return {
        "title": title,
        "statement": statement_html,
        "time_limit_ms": time_limit_ms,
        "difficulty": "Medium",
        "sample_tests": sample_tests
    }
