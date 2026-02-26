from datetime import datetime, timezone
from urllib.parse import urlparse
from pathlib import Path
import requests
from ..state import BrainstormIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....repositories.projects_repo import ProjectsRepo
from ....repositories.brands_repo import BrandsRepo
from ....repositories.project_idea_repo import ProjectIdeasRepo
from ....repositories.project_materials_repo import ProjectMaterialsRepo
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType, ProjectMaterialStatus
from ....services.brand_visor import BrandVisor

def generate_base_ideas_node(state: BrainstormIdeaState) -> BrainstormIdeaState:
    emitter = InnovationWorkflowEventEmitter()
    projects_repo = ProjectsRepo()
    idea_repo = ProjectIdeasRepo()
    brand_visor = BrandVisor()

    project_id = state["project_id"]
    run_id = state["run_id"]
    brainstorm_count = state.get("brainstorm_count")

    projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.GENERATE_BASE_IDEAS.value, type = WorkflowType.IDEA_BRAINSTORM.value)
    emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id,"message":"Generating innovation ideas", "state": InnovationWorkflowState.GENERATE_BASE_IDEAS.value, 'status': WorkflowStatus.RUNNING.value})
    try:
        base_ideas = brand_visor.query_innovation_ideas( state['brand_name'], brand_guideline=state['brand_guideline'], segment_report=state['segment_report'], cultural_signals=state['cultural_signals'],k = brainstorm_count)
        for idea in base_ideas:
            stored = idea_repo.create(
                project_id=project_id,
                title = idea.get('title'),
                content=idea.get('content'),
                score=idea.get('score'),
                category = idea.get('category'),
            )
            idea['source_id'] = str(stored.id)
        emitter.publish(project_id=project_id, data={"type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "state": InnovationWorkflowState.GENERATE_BASE_IDEAS.value, "message":"Innovation ideas generated successfully", 'status': WorkflowStatus.COMPLETE.value})
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.GENERATE_BASE_IDEAS.value, type = WorkflowType.IDEA_BRAINSTORM.value)
    except Exception as e:
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.FAILED.value, state=InnovationWorkflowState.GENERATE_BASE_IDEAS.value, type = WorkflowType.IDEA_BRAINSTORM.value)
        emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "state": InnovationWorkflowState.GENERATE_BASE_IDEAS.value, "message":"Innovation ideas generated failed",'status': WorkflowStatus.FAILED.value})
        raise e

    return {"base_ideas": base_ideas, "state": InnovationWorkflowState.GENERATE_BASE_IDEAS.value,"status": WorkflowStatus.COMPLETE.value,}