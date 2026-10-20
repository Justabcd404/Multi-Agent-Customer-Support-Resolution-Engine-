import os
import math
import re
from typing import List, Dict, Any

LIBRARY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "library")

def _tokenize(text: str) -> List[str]:
    return [w.lower() for w in re.findall(r'\b\w+\b', text) if len(w) > 2]

def get_kb_sections(kb_files: List[str]) -> List[Dict[str, str]]:
    sections = []
    if not os.path.exists(LIBRARY_DIR):
        return sections

    for file_name in kb_files:
        file_path = os.path.join(LIBRARY_DIR, file_name)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            raw_sections = content.split("\n## ")
            for idx, sec in enumerate(raw_sections):
                title = sec.split("\n")[0].replace("#", "").strip()
                body = sec.strip()
                if not body.startswith("## ") and idx > 0:
                    body = "## " + body
                sections.append({
                    "file": file_name,
                    "title": title,
                    "content": body
                })
    return sections

def retrieve_from_scope(query: str, kb_files: List[str], top_k: int = 3) -> List[Dict[str, Any]]:
    sections = get_kb_sections(kb_files)
    if not sections:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        return sections[:top_k]

    scored_sections = []
    for sec in sections:
        sec_text = f"{sec['title']} {sec['content']}"
        sec_tokens = _tokenize(sec_text)
        score = 0.0

        for qt in query_tokens:
            count = sec_tokens.count(qt)
            if count > 0:
                score += (1 + math.log(count))

        scored_sections.append((score, sec))

    scored_sections.sort(key=lambda x: x[0], reverse=True)
    results = [sec for score, sec in scored_sections if score > 0]
    return results[:top_k] if results else sections[:top_k]
