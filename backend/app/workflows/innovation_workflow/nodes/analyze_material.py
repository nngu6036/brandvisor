from datetime import datetime, timezone
from langgraph.types import interrupt
import requests

from ..state import BrainstormIdeaState
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, ProjectMaterialCategory, WorkflowType
from ....repositories.brands_repo import BrandsRepo
from ....repositories.project_materials_repo import ProjectMaterialsRepo
from ....repositories.projects_repo import ProjectsRepo
from ....services.brand_api import fetch_brand_guideline, fetch_segmentation_report, fetch_cultural_signals 
from ....services.brand_visor import BrandVisor

def analyze_material_node(state: BrainstormIdeaState) -> BrainstormIdeaState:
    emitter = InnovationWorkflowEventEmitter()
    projects_repo = ProjectsRepo()
    materials_repo = ProjectMaterialsRepo()
    project_id = state["project_id"]
    run_id = state["run_id"]

    emitter.publish(project_id=project_id, data={"type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "state": InnovationWorkflowState.ANALYZE_MATERIALS.value, "message":"Start analyzing project materials.","title":"Brainstorming Workflow Update", 'status': WorkflowStatus.RUNNING.value})
    projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.ANALYZE_MATERIALS.value, type = WorkflowType.IDEA_BRAINSTORM.value)
    materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)
    headers = {
                "User-Agent": "python-requests (fetch_url_content)"
            }
    brand_guideline = ""
    segment_report = "" 
    cultural_signals = ""
    for m in materials:            
        try:
            if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                r = requests.get(m.file, headers=headers, timeout = 90)
                r.raise_for_status()
                brand_guideline = r.text
                
            if m.category == ProjectMaterialCategory.SEGMENTATION_REPORT.value:
                r = requests.get(m.file, headers=headers, timeout = 90)
                r.raise_for_status()
                segment_report = r.text
            if m.category == ProjectMaterialCategory.CULTURAL_SIGNALS.value:
                r = requests.get(m.file, headers=headers, timeout = 90)
                r.raise_for_status()
                cultural_signals = r.text
        except Exception as e:
            print("Error fetching/storing material:", m.category, e)
    emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "state": InnovationWorkflowState.ANALYZE_MATERIALS.value, "message":"Analyze project materials successfully", 'status': WorkflowStatus.COMPLETE.value})
    projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.ANALYZE_MATERIALS.value,type = WorkflowType.IDEA_BRAINSTORM.value)
    return {"brand_guideline": brand_guideline, "segment_report": segment_report, "cultural_signals": cultural_signals, "state": InnovationWorkflowState.ANALYZE_MATERIALS.value,"status": WorkflowStatus.COMPLETE.value,}