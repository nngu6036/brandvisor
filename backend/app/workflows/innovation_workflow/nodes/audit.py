from ....repositories.projects_repo import ProjectsRepo
from langchain_core.language_models.chat_models import BaseChatModel
import json
from typing import List, Dict, Any

from ..state import RevisionIdeaState, ValidatedIdea
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from .helpers import _ask, _loads_json_array

def audit_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        SYSTEM = (
        "You are the Creative Audit engine.\n"
        "Score hard. No mercy for safe concepts.\n"
        "Scoring 0-5 for: goosebumps, visual guideline, badge, worldfirst, segmentfit.\n"
        "Verdict rules:\n"
        "- keep only if visual guideline>=4 AND worldfirst>=4 AND badge>=4 AND goosebumps>=4.\n"
        "- discard if visual guideline<=2 OR worldfirst<=2 OR badge<=2.\n"
        "- otherwise refine.\n"
        "Return ONLY valid JSON."
    )
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.AUDIT.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Generating maverick audit", "state": InnovationWorkflowState.AUDIT.value, 'status': WorkflowStatus.RUNNING.value})
        user = f"""
            Friction point:
            {state["friction_point"]}

            Ideas to audit JSON:
            {json.dumps(state["validated_ideas"], ensure_ascii=False)}

            Return the SAME array, but fill:
            - scores
            - verdict (keep/refine/discard)
            - audit:
            - Goosebumps: "Yes/No - ..."
            - Visual Guideline: "Yes/No - ..."
            - Segment: "Yes/No - ..."
            - Badge: "Yes/No - ..."
            Return ONLY JSON array.
            """
        raw = _ask(llm, SYSTEM, user)
        audited = _loads_json_array(raw)

        # basic sanity: coerce scores ints
        cleaned: List[ValidatedIdea] = []
        for it in audited:
            if not isinstance(it, dict):
                continue
            scores = it.get("scores", {})
            for k in ["goosebumps", "visual guideline", "badge", "worldfirst", "segmentfit"]:
                try:
                    scores[k] = int(scores.get(k, 0))
                except Exception:
                    scores[k] = 0
            it["scores"] = scores
            cleaned.append(it)  # trust structure
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.AUDIT.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Completed maverick audit", "state": InnovationWorkflowState.AUDIT.value, 'status': WorkflowStatus.COMPLETE.value})
        state["validated_ideas"] = cleaned
        return state

    return _node