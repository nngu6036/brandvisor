from typing import Dict, List, Any


def validate_score_output(resp: Any) -> List[str]:
    """Validate a ScoreIdeaLLMOutput-like object (Pydantic model or dict-like).

    Returns a list of error messages (empty if valid).
    """
    errors: List[str] = []

    if resp is None:
        errors.append("Response is None")
        return errors

    questions = getattr(resp, "questions", None)
    scores = getattr(resp, "scores", None)

    if not questions:
        errors.append("Missing or empty 'questions' array")
    else:
        # ensure indices are integers and unique
        idxs = [getattr(q, "index", None) for q in questions]
        if any(i is None for i in idxs):
            errors.append("One or more questions are missing 'index'")
        else:
            if len(set(idxs)) != len(idxs):
                errors.append("Duplicate question indices found")

    if not scores:
        errors.append("Missing or empty 'scores' array")
    else:
        for i, s in enumerate(scores):
            if getattr(s, "idea_index", None) is None:
                errors.append(f"Score {i} missing idea_index")
            if getattr(s, "question_index", None) is None:
                errors.append(f"Score {i} missing question_index")
            ans = getattr(s, "answer", None)
            try:
                ai = int(ans)
                if ai < 1 or ai > 5:
                    errors.append(f"Score {i} answer out of range: {ans}")
            except Exception:
                errors.append(f"Score {i} answer is not an integer: {ans}")
            just = getattr(s, "justification", None)
            if just is None or not str(just).strip():
                errors.append(f"Score {i} missing justification")
            elif len(str(just).split()) > 40:
                errors.append(f"Score {i} justification too long (>{40} words)")

    return errors
