from langchain_core.language_models.chat_models import BaseChatModel
import json
from ....repositories.projects_repo import ProjectsRepo
from ..state import RevisionIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from .helpers import _ask, _loads_json_array

def refine_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        SYSTEM = (
            f"You are the {state['brand_name']} Creative Consultant in refine mode.\n"
            "Upgrade only the 'refine' ideas into 'keep' by:\n"
            "- sharpening world-first mechanism\n"
            "- increasing badge-of-honor gating (earned not given)\n"
            "- enforcing visual guideline gritty realism\n"
            "- making community sanctuary/league explicit\n"
            "Return ONLY valid JSON array of refined ideas (same schema as input)."
        )
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.REFINE.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Start refining ideas", "state": InnovationWorkflowState.REFINE.value, 'status': WorkflowStatus.RUNNING.value})

        state["loop_count"] = state.get("loop_count", 0) + 1

        ideas = state.get("validated_ideas", [])
        keepers = [x for x in ideas if x.get("verdict") == "keep"]
        refinables = [x for x in ideas if x.get("verdict") == "refine"]

        # If already enough keepers, no-op
        if len(keepers) >= 10 or not refinables:
            state["validated_ideas"] = ideas
            return state

        # Refine only as many as needed
        need = max(0, 10 - len(keepers))
        targets = refinables[:need]

        user = f"""
            Friction point:
            {state["friction_point"]}

            Refine these ideas into KEEPERS:
            {json.dumps(targets, ensure_ascii=False)}

            Return refined ideas as JSON array (same schema), aiming for:
            visual guideline>=4, worldfirst>=4, badge>=4, goosebumps>=4.
            """
        raw = _ask(llm, SYSTEM, user)
        refined = _loads_json_array(raw)

        # Merge keepers + refined, then re-audit next
        state["validated_ideas"] = keepers + refined
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.REFINE.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Complete refining ideas", "state": InnovationWorkflowState.REFINE.value, 'status': WorkflowStatus.RUNNING.value})
        return state

    return _node