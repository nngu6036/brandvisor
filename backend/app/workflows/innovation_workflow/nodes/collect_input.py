from datetime import datetime, timezone
from langgraph.types import interrupt

from ..state import BrainstormIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, ProjectMaterialCategory, ProjectMaterialStatus, WorkflowType

from ....repositories.project_materials_repo import ProjectMaterialsRepo
from ....repositories.projects_repo import ProjectsRepo
from ....services.brand_api import fetch_brand_guideline, fetch_segmentation_report, fetch_cultural_signals 

REQUIRED_CATEGORIES = [ProjectMaterialCategory.BRAND_GUIDELINE.value, ProjectMaterialCategory.SEGMENTATION_REPORT.value, ProjectMaterialCategory.CULTURAL_SIGNALS.value]

def collect_input_node(state: BrainstormIdeaState) -> BrainstormIdeaState:
    emitter = InnovationWorkflowEventEmitter()

    materials_repo = ProjectMaterialsRepo()
    projects_repo = ProjectsRepo()
    project_id = state["project_id"]
    brand_id = state["brand_id"]
    run_id = state["run_id"]
    materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)

    projects_repo.update_workflow_progress(project_id, state=InnovationWorkflowState.START.value,type = WorkflowType.IDEA_BRAINSTORM.value)
    emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "message":"Start brainstorming workflow", "state": InnovationWorkflowState.START.value})
    projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.COLLECT_INPUT.value,type = WorkflowType.IDEA_BRAINSTORM.value)
    emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "message":"Collecting project materials", "state": InnovationWorkflowState.COLLECT_INPUT.value, 'status': WorkflowStatus.RUNNING.value})
    # Load existing materials already stored
    existing_cats = [m.category for m in materials]
    missing_cats = []
    for c in REQUIRED_CATEGORIES:
        if c not in existing_cats:
            missing_cats.append(c)

    # Fetch missing categories and store
    for cat in missing_cats:
        try:
            if cat == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                payload = fetch_brand_guideline(brand_id)
            elif cat == ProjectMaterialCategory.SEGMENTATION_REPORT.value:
                payload = fetch_segmentation_report(brand_id)
            elif cat == ProjectMaterialCategory.CULTURAL_SIGNALS.value:
                payload = fetch_cultural_signals(brand_id)
            stored = materials_repo.upsert_from_vendor(
                project_id=project_id,
                category=cat,
                source=payload.get("source"),
                external_id=f"{brand_id}:{cat}",
                title=cat.replace("_", " ").title(),
                description="Fetched from vendor API",
                tags=["auto", "vendor"],
                status=ProjectMaterialStatus.LOADED.value,
                file=payload.get("url"),
                fetched_at=datetime.now(timezone.utc),
            )
            projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.COLLECT_INPUT.value,type = WorkflowType.IDEA_BRAINSTORM.value)
            emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "message":f"Successfully fetched material {cat}", "state": InnovationWorkflowState.COLLECT_INPUT.value, 'status': WorkflowStatus.RUNNING.value})
        except Exception as e:
            print("Error fetching/storing material:", cat, e)
            stored = materials_repo.upsert_from_vendor(
                project_id=project_id,
                category=cat,
                source=None,
                external_id=f"{brand_id}:{cat}",
                title=cat.replace("_", " ").title(),
                description="Fetched from vendor API",
                tags=["auto", "vendor"],
                status=ProjectMaterialStatus.FAILED.value,
                payload=None,
                file=None,
                fetched_at=datetime.now(timezone.utc)
            )
            projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.FAILED.value, state=InnovationWorkflowState.COLLECT_INPUT.value,type = WorkflowType.IDEA_BRAINSTORM.value)
            emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "message":f"Failed to fetch material {cat}", "state": InnovationWorkflowState.COLLECT_INPUT.value, 'status': WorkflowStatus.FAILED.value})
    return {"status": WorkflowStatus.COMPLETE.value, "state": InnovationWorkflowState.COLLECT_INPUT.value}
    
