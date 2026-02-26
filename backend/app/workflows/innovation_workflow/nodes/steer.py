from ....repositories.projects_repo import ProjectsRepo
from langchain_core.language_models.chat_models import BaseChatModel

from ..state import RevisionIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....services.brand_visor import BrandVisor
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from .helpers import _ask

def steer_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:

        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()
        brand_visor = BrandVisor()
        projects_repo.update_workflow_progress(project_id, state=InnovationWorkflowState.START.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id, "message":"Start revision workflow", "state": InnovationWorkflowState.START.value})
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.STEER.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Generating steer point", "state": InnovationWorkflowState.STEER.value, 'status': WorkflowStatus.RUNNING.value})
        
        new_objecitve = brand_visor.refine_project_objective(
            brand_name=state["brand_name"],brand_guideline=state["brand_guideline"], segment_report=state["segment_report"], cultural_signals=state["cultural_signals"], objective=state["user_query"], contextual_data=state["contextual_data"])
        projects_repo.update_objective(project_id, new_objecitve)
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.STEER.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Completed steer point", "state": InnovationWorkflowState.STEER.value, 'status': WorkflowStatus.COMPLETE.value})
        state["user_query"] = new_objecitve
        return state

    return _node