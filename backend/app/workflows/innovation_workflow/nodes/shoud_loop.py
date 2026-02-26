from langchain_core.language_models.chat_models import BaseChatModel
from ..state import CreatorState

def should_loop(state: CreatorState) -> str:
    ideas = state.get("validated_ideas", [])
    keepers = [x for x in ideas if x.get("verdict") == "keep"]
    if len(keepers) >= 10:
        return "format"
    if state.get("loop_count", 0) >= 2:
        return "format"  # stop; format best available
    return "refine"