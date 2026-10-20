import os
import json
import logging
from typing import Optional, Any, Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("call_llm")

GUARDRAILS_BLOCK = """
CRITICAL SYSTEM DIRECTIVES:
1. You are an AI Support Assistant. Ground all facts in provided context or tool results.
2. DO NOT fabricate information, fake order numbers, or invent policies not in the KB.
3. Output valid JSON when requested. Do not include markdown code block formatting like ```json.
"""

def call_llm(
    prompt: str,
    system_prompt: str = "",
    json_mode: bool = True,
    temperature: float = 0.0
) -> Optional[Any]:
    provider = os.getenv("LLM_PROVIDER", "heuristic").lower()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if provider == "heuristic" or not api_key:
        logger.info("Using deterministic heuristic mode (LLM call skipped)")
        return None

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        chat = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            model_kwargs={"response_format": {"type": "json_object"}} if json_mode else {}
        )

        full_system = f"{GUARDRAILS_BLOCK}\n{system_prompt}".strip()
        messages = [
            SystemMessage(content=full_system),
            HumanMessage(content=prompt)
        ]

        response = chat.invoke(messages)
        content = response.content.strip()

        if json_mode:
            # Strip code fences if present
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
        return content

    except Exception as e:
        logger.warning(f"LLM call failed, falling back to heuristic: {e}")
        return None
