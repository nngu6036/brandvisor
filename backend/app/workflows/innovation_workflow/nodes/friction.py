from ....repositories.projects_repo import ProjectsRepo
from langchain_core.language_models.chat_models import BaseChatModel

from ..state import RevisionIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from .helpers import _ask

def friction_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        SYSTEM = (
            f"You are the {state['brand_name']} Creative Consultant's analyst brain.\n"
            "Your job: identify the core 'friction point' in the user's request that can be turned into cultural heat.\n"
            "Be concise, sharp, and specific. No fluff."
        )
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.FRICTION.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Generating friction point", "state": InnovationWorkflowState.FRICTION.value, 'status': WorkflowStatus.RUNNING.value})
        user = f"""
            User query:
            {state["user_query"]}

            Brand guideline (summary allowed):
            {state["brand_guideline"]}

            Segments report (summary allowed):
            {state["segment_report"]}

            Cultural signals (summary allowed):
            {state["cultural_signals"]}

            Return:
            - One sentence describing the friction point.
            - One sentence describing the "Wings injection" (how to elevate beyond ordinary).
            """
        state["friction_point"] = _ask(llm, SYSTEM, user).strip()
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.FRICTION.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Completed friction point", "state": InnovationWorkflowState.FRICTION.value, 'status': WorkflowStatus.COMPLETE.value})
        return state

    return _node