from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel

from langgraph.graph import StateGraph, START, END
import json
import re
from typing import List, Any

def _extract_json_array(text: str) -> str:
    """
    Pull the first JSON array from model output, even if surrounded by text.
    """
    # remove code fences if present
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE)
    # find first '[' ... matching last ']'
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON array found in output.")
    return text[start:end+1]

def _ask(llm: BaseChatModel, system: str, user: str) -> str:
    return llm.invoke([SystemMessage(content=system), HumanMessage(content=user)]).content


def _loads_json_array(text: str) -> List[Any]:
    try:
        return json.loads(_extract_json_array(text))
    except Exception as exc:
        print(exc)