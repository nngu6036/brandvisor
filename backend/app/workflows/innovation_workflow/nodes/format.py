from __future__ import annotations

from typing import Any, Dict, List, Optional
import json
import re

from langchain_core.language_models.chat_models import BaseChatModel

from ....repositories.projects_repo import ProjectsRepo
from ....repositories.project_idea_repo import ProjectIdeasRepo
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from ..emitter import InnovationWorkflowEventEmitter
from ..state import RevisionIdeaState
from .helpers import _ask, _loads_json_array


def _total_score(x: Dict[str, Any]) -> int:
    s = x.get("scores", {}) or {}
    return int(
        s.get("goosebumps", 0)
        + s.get("visual guideline", 0)
        + s.get("badge", 0)
        + s.get("worldfirst", 0)
        + s.get("segmentfit", 0)
    )


_ALLOWED_CATEGORIES = {"Product Remix", "Creators", "Community"}


def _normalize_category(cat: Any) -> str:
    if not cat:
        return "Product Remix"
    c = str(cat).strip()

    # Strict allowed set (exact spellings)
    if c in _ALLOWED_CATEGORIES:
        return c

    # Soft normalization (common variants)
    lower = c.lower()
    if "remix" in lower or "product" in lower:
        return "Product Remix"
    if "creator" in lower:
        return "Creators"
    if "community" in lower:
        return "Community"

    return "Product Remix"


def _category_from_pillar(pillar: Any) -> Optional[str]:
    """Deterministic mapping based on pillar_integration if present."""
    if not pillar:
        return None
    p = str(pillar).strip().lower()
    if p == "remix":
        return "Product Remix"
    if p == "creators":
        return "Creators"
    if p == "community":
        return "Community"
    return None


def _required_labels_for_category(category: str) -> List[str]:
    if category == "Product Remix":
        return [
            "For segment (For whom):",
            "Moment:",
            "Remix:",
            "Why now:",
            "3-step ritual:",
            "Content hook:",
            "Where it lives:",
            "Proof signal:",
        ]
    if category == "Creators":
        return [
            "For segment (For whom):",
            "Creator x Scene:",
            "Co-create object:",
            "Cultural insight:",
            "Format:",
            "Participation mechanic:",
            "Reward loop:",
            "Distribution:",
            "Proof signal + guardrail:",
        ]
    # Community
    return [
        "For segment (For whom):",
        "Community bet:",
        "Energy moment:",
        "Value to them:",
        "Ritual in one line:",
        "Program shape:",
        "Growth loop:",
        "Proof signal:",
    ]


def _labels_present(content: str, labels: List[str]) -> bool:
    # Require each label to appear at least once; also prevent missing ones.
    for lab in labels:
        if lab not in content:
            return False
    return True


def _word_count(s: str) -> int:
    # Basic word count; good enough for guardrails.
    return len(re.findall(r"\b\w+\b", s or ""))


def format_node(llm: Optional[BaseChatModel] = None, top_k: int = 10):
    """Convert state['validated_ideas'] into state['final_output'].

    - Input: state['validated_ideas'] (list of validated idea objects)
    - Output: state['final_output'] as a list of BaseIdea-like dicts:
        {"title": str, "category": str, "content": str, "source_id": str}

    The conversion is performed via LLM so the output is user-friendly and category-aligned.
    """

    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        project_id = state["project_id"]
        run_id = state["run_id"]
        brand_name = str(state.get("brand_name") or "").strip() or "the brand"

        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()
        ideas_repo = ProjectIdeasRepo()

        projects_repo.update_workflow_progress(
            project_id,
            status=WorkflowStatus.RUNNING.value,
            state=InnovationWorkflowState.FORMAT.value,
            type= WorkflowType.IDEA_REVISION.value
        )
        emitter.publish(
            project_id=project_id,
            data={
                "title":"Revision Workflow Update",
                "type": WorkflowType.IDEA_REVISION,
                "run_id": run_id,
                "message": "Start formatting ideas",
                "state": InnovationWorkflowState.FORMAT.value,
                "status": WorkflowStatus.RUNNING.value,
            },
        )

        ideas: List[Dict[str, Any]] = list(state.get("validated_ideas", []) or [])
        if not ideas:
            state["final_output"] = []
            projects_repo.update_workflow_progress(
                project_id,
                status=WorkflowStatus.COMPLETE.value,
                state=InnovationWorkflowState.FORMAT.value,
                type = WorkflowType.IDEA_REVISION.value
            )
            emitter.publish(
                project_id=project_id,
                data={
                    "title":"Revision Workflow Update",
                    "type": WorkflowType.IDEA_REVISION,
                    "run_id": run_id,
                    "message": "No validated ideas to format",
                    "state": InnovationWorkflowState.FORMAT.value,
                    "status": WorkflowStatus.COMPLETE.value,
                },
            )
            return state

        # Select best ideas first (keepers should already be preferred upstream).
        ideas = sorted(ideas, key=_total_score, reverse=True)[:top_k]

        # System prompt: keep short + role-specific
        system = (
            "You are a senior innovation editor. Rewrite validated creative ideas into clear, "
            "user-friendly innovation ideas for non-expert readers. Be bold but readable. "
            "Do NOT include internal evaluation jargon like 'scores', 'audit', or 'verdict'."
        )

        # Build strict content templates (no f-string braces issues)
        product_remix_template = (
            "For segment (For whom):\n"
            "Moment:\n"
            f"Remix: ({brand_name} + ___ / pairing with ___ / “cleaner” format)\n"
            "Why now:\n"
            "3-step ritual: (A → B → C)\n"
            "Content hook:\n"
            "Where it lives:\n"
            "Proof signal:\n"
        )

        creators_template = (
            "For segment (For whom):\n"
            "Creator x Scene: (who + which scene)\n"
            "Co-create object: (choose one: series / challenge / sound pack / merch / showcase)\n"
            "Cultural insight:\n"
            "Format:\n"
            "Participation mechanic:\n"
            "Reward loop:\n"
            "Distribution:\n"
            "Proof signal + guardrail:\n"
        )

        community_template = (
            "For segment (For whom):\n"
            "Community bet:\n"
            "Energy moment:\n"
            f"Value to them: (what {brand_name} provides beyond sponsorship: spotlight / skills / access / network)\n"
            "Ritual in one line:\n"
            "Program shape:\n"
            "Growth loop:\n"
            "Proof signal:\n"
        )

        user = f"""You will receive a JSON array of validated ideas.

Return a JSON array of the SAME LENGTH and in the SAME ORDER.
Each output item MUST be:
{{"title": string, "category": "Product Remix"|"Creators"|"Community", "content": string, "source_id": string}}

CATEGORY RULES:
- If input item has pillar_integration: Remix->Product Remix, Creators->Creators, Community->Community
- Otherwise infer category from the idea’s primary mechanism.

SOURCE RULE:
- Copy source_id from input item; if missing/empty, set "TBD".

CONTENT RULES (STRICT):
- The "content" field MUST be VALID MARKDOWN (a markdown string).
- Use one field per line.
- Format each label in bold, exactly like: **Label:** value
- Use EXACT labels and EXACT order from the template for the chosen category.
- DO NOT copy any example/hint text from the prompt.
- DO NOT include placeholders like ___ or (A → B → C) or any parentheses from the template.
- If you cannot infer a field, write "TBD".

TEMPLATES (labels only; fill values after each label):

If category == "Product Remix", content MUST be exactly 8 markdown lines in this order:
**For segment (For whom):** <value>
**Moment:** <value>
**Remix:** <value>
**Why now:** <value>
**3-step ritual:** <value>
**Content hook:** <value>
**Where it lives:** <value>
**Proof signal:** <value>

If category == "Creators", content MUST be exactly 9 markdown lines in this order:
**For segment (For whom):** <value>
**Creator x Scene:** <value>
**Co-create object:** <value>
**Cultural insight:** <value>
**Format:** <value>
**Participation mechanic:** <value>
**Reward loop:** <value>
**Distribution:** <value>
**Proof signal + guardrail:** <value>

If category == "Community", content MUST be exactly 8 markdown lines in this order:
**For segment (For whom):** <value>
**Community bet:** <value>
**Energy moment:** <value>
**Value to them:** <value>
**Ritual in one line:** <value>
**Program shape:** <value>
**Growth loop:** <value>
**Proof signal:** <value>

RETURN ONLY valid JSON array. No markdown outside the JSON string values. No commentary.

INPUT JSON:
{json.dumps(ideas, ensure_ascii=False)}
"""


        raw = _ask(llm, system, user)
        final_list = _loads_json_array(raw)

        # Lightweight sanitization + guardrails to guarantee required keys/format
        out: List[Dict[str, Any]] = []
        for idx, item in enumerate(final_list):
            if not isinstance(item, dict):
                continue

            src = item.get("source_id") or ideas[idx].get("source_id") if idx < len(ideas) else None
            src = str(src).strip() if src else "TBD"

            # Deterministic category mapping from pillar_integration if present in input
            forced_cat = None
            if idx < len(ideas):
                forced_cat = _category_from_pillar(ideas[idx].get("pillar_integration"))
            cat = forced_cat or item.get("category")
            cat = _normalize_category(cat)

            content = str(item.get("content") or "").strip()

            # If the model ignored the label structure, we still keep the content,
            # but you can optionally trigger a repair step here.
            labels = _required_labels_for_category(cat)
            if content and not _labels_present(content, labels):
                # Minimal repair heuristic: prepend template if labels missing.
                # (Better: do a second LLM "repair" call, but we keep it simple/stable here.)
                template = (
                    product_remix_template
                    if cat == "Product Remix"
                    else creators_template
                    if cat == "Creators"
                    else community_template
                )
                # Avoid duplicating if some labels exist; only enforce structure.
                content = template.strip() + "\n" + content

            # Optional: clamp word count softly (do not delete info; just keep as-is if outside range)
            # If you want hard enforcement, do a repair LLM call.
            wc = _word_count(content)
            if content and (wc < 80 or wc > 220):
                # No hard failure; leave as-is to avoid losing data.
                pass

            out.append(
                {
                    "title": str(item.get("title") or "Untitled").strip() or "Untitled",
                    "category": cat,
                    "content": content,
                    "source_id": src,
                }
            )

        state["final_output"] = out

        # Persist formatted fields back to DB for known idea IDs
        for idea in out:
            source_id = idea.get("source_id", "TBD")
            if source_id and source_id != "TBD":
                ideas_repo.update_fields(
                    idea_id=source_id,
                    fields={
                        "title": idea["title"],
                        "category": idea["category"],
                        "content": idea["content"],
                    },
                )

        projects_repo.update_workflow_progress(
            project_id,
            status=WorkflowStatus.COMPLETE.value,
            state=InnovationWorkflowState.FORMAT.value,
            type = WorkflowType.IDEA_REVISION.value
        )
        emitter.publish(
            project_id=project_id,
            data={
                "title":"Revision Workflow Update",
                "type": WorkflowType.IDEA_REVISION,
                "run_id": run_id,
                "message": "Complete formatting ideas",
                "state": InnovationWorkflowState.FORMAT.value,
                "status": WorkflowStatus.COMPLETE.value,
            },
        )
        return state

    return _node
