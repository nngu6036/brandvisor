from ....repositories.projects_repo import ProjectsRepo
from langchain_core.language_models.chat_models import BaseChatModel
import json
from typing import List, Dict, Any
from ....services.brand_visor import BrandVisor
from ..state import RevisionIdeaState, ValidatedIdea
from ..emitter import InnovationWorkflowEventEmitter
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, ProjectMaterialCategory, WorkflowType
from .helpers import _ask, _loads_json_array
from ....repositories.project_materials_repo import ProjectMaterialsRepo



def bind_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        brand_visor = BrandVisor()
        visual_guideline = brand_visor.extract_visual_guideline(state['brand_guideline'])
        materials_repo = ProjectMaterialsRepo()
        materials = materials_repo.list_by_project(state['project_id'], include_deleted=False, limit=500)
        for m in materials:            
            if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                materials_repo.update_fields(m.id, {"visual_guideline": visual_guideline})
        state["visual_guideline"] = visual_guideline
        SYSTEM = (
            f"You are the {state['brand_name']} Creative Consultant (artist-producer, subculture native).\n"
            "Rules:\n"
            "- Reject safe ideas; push to world-first.\n"
            f"- Visual guideline {state['visual_guideline']}.\n"
            "- Every idea must explicitly integrate all 3 pillars: Product Remix, Creators, Community.\n"
            "- Target one segment: Core / Aspiration / Functional.\n"
            "Return ONLY valid JSON."
        )
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.BIND.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Generating maverick bind", "state": InnovationWorkflowState.BIND.value, 'status': WorkflowStatus.RUNNING.value})
        user = f"""
            Friction point:
            {state["friction_point"]}

            We have these base ideas (from strategy consultant). Upgrade them into validated-grade movements.
            Base ideas JSON:
            {json.dumps(state.get("base_ideas", []), ensure_ascii=False)}

            Task:
            For EACH base idea, output a JSON-format validated idea object with:
            - title
            - source_id (from base idea)
            - overview (1-2 sentences)
            - pillar_integration: {{ "Remix":[...], "Creators":[...], "Community":[...] }} (bullets, actionable)
            - grit_visualization (3-5 sentences; 4K cinematic; gritty; real textures; no AI-smooth)
            - segment (Core/Aspiration/Functional)

            Keep the set bold and culturally grounded.
            Return ONLY JSON array.
            """
        raw = _ask(llm, SYSTEM, user)
        mideas = _loads_json_array(raw)
        # Add placeholder audit fields to be filled next
        out: List[ValidatedIdea] = []
        for x in mideas:
            if not isinstance(x, dict):
                continue
            out.append({
                "title": x.get("title", "Untitled"),
                "source_id": x.get("source_id", ""),
                "overview": x.get("overview", ""),
                "pillar_integration": x.get("pillar_integration", {"Remix": [], "Creators": [], "Community": []}),
                "grit_visualization": x.get("grit_visualization", ""),
                "segment": x.get("segment", "Aspiration"),
                "scores": {"goosebumps": 0, "visual guideline": 0, "badge": 0, "worldfirst": 0, "segmentfit": 0},
                "verdict": "refine",
                "audit": {"Goosebumps": "", "Visual Guideline": "", "Segment": "", "Badge": ""}
            })

        state["validated_ideas"] = out
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.BIND.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Completed maverick bind", "state": InnovationWorkflowState.BIND.value, 'status': WorkflowStatus.COMPLETE.value})
        return state

    return _node
