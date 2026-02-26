from uuid import uuid4
from langgraph.types import Command
import requests

from ...utils import redis_saver
from .graph import build_brainstorm_graph, build_revision_graph
from .state import RevisionIdeaState, BrainstormIdeaState, BaseIdea
from ...domain.enum import InnovationWorkflowState, WorkflowStatus, ProjectMaterialCategory
from ...repositories.project_materials_repo import ProjectMaterialsRepo
from ...repositories.projects_repo import ProjectsRepo
from ...repositories.brands_repo import BrandsRepo
from ...repositories.project_idea_repo import ProjectIdeasRepo

class InnovationBrainstormEngine:
    def __init__(self):
        saver = redis_saver()
        self.graph = build_brainstorm_graph().compile(checkpointer=saver)
        self.projects_repo = ProjectsRepo()

    def start(self, project_id: str, brand_id: str,brainstorm_count: int) -> str:
        run_id = uuid4().hex
        # persist run_id on project so UI can later accept/reject
        self.projects_repo.set_workflow_run(project_id, InnovationWorkflowState.COLLECT_INPUT.value,run_id)
        brand_repo = BrandsRepo()
        brand = brand_repo.get_by_id(brand_id)
        init_state: BrainstormIdeaState = {
            "run_id": run_id,
            "project_id": project_id,
            "brand_id": brand_id,
            "brand_name": brand.name,
            "brainstorm_count": brainstorm_count,
            "state": InnovationWorkflowState.COLLECT_INPUT.value,
            "status": WorkflowStatus.RUNNING.value,
        }
        config = {"configurable": {"thread_id": run_id}}

        try:
            self.graph.invoke(init_state, config=config)
        except Exception as e:
            self.projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.FAILED.value, state=InnovationWorkflowState.COLLECT_INPUT.value, error=str(e))
            raise

        return run_id

    def resume(self, run_id: str, resume_value: dict) -> dict:
        config = {"configurable": {"thread_id": run_id}}
        result = self.graph.invoke(Command(resume=resume_value), config=config)
        return dict(result or {})

    def get_state(self, run_id: str):
        config = {"configurable": {"thread_id": run_id}}
        return self.graph.get_state(config)



class InnovationRevisionEngine:
    def __init__(self):
        saver = redis_saver()
        self.graph = build_revision_graph().compile(checkpointer=saver)
        self.projects_repo = ProjectsRepo()

    def start(self, project_id: str, brand_id: str,objective:str, contextual_data: str) -> str:
        run_id = uuid4().hex
        # persist run_id on project so UI can later accept/reject
        self.projects_repo.set_workflow_run(project_id, InnovationWorkflowState.COLLECT_INPUT.value,run_id)
        brand_repo = BrandsRepo()
        brand = brand_repo.get_by_id(brand_id)
        idea_repo = ProjectIdeasRepo()
        ideas = idea_repo.list_by_project(project_id)
        base_ideas = [BaseIdea(source_id = idea.id,title = idea.title, category = idea.category, description=idea.content) for idea in ideas]
        materials_repo = ProjectMaterialsRepo()
        materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)
        brand_guideline = ""
        segment_report = "" 
        cultural_signals = ""
        for m in materials:
            headers = {
                "User-Agent": "python-requests (fetch_url_content)"
            }
            try:
                r = requests.get(m.file, headers=headers, timeout = 90) if m.file else None
                if r:
                    r.raise_for_status()
                    if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                        brand_guideline = r.text
                    elif m.category == ProjectMaterialCategory.SEGMENTATION_REPORT.value:
                        segment_report = r.text
                    elif m.category == ProjectMaterialCategory.CULTURAL_SIGNALS.value:
                        cultural_signals = r.text
            except Exception as e:
                print("Error fetching/storing material:", m.category, e)
        init_state: RevisionIdeaState = {
            "run_id": run_id,
            "project_id": project_id,
            "brand_id": brand_id,
            "brand_name": brand.name,
            "brand_guideline":brand_guideline,
            "segment_report":segment_report,
            "cultural_signals":cultural_signals,
            "user_query": objective,
            "base_ideas":base_ideas,
            "contextual_data": contextual_data,
            "state": InnovationWorkflowState.STEER.value,
            "status": WorkflowStatus.RUNNING.value,
        }
        config = {"configurable": {"thread_id": run_id}}

        try:
            self.graph.invoke(init_state, config=config)
        except Exception as e:
            self.projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.FAILED.value, state=InnovationWorkflowState.COLLECT_INPUT.value, error=str(e))
            raise

        return run_id

    def resume(self, run_id: str, resume_value: dict) -> dict:
        config = {"configurable": {"thread_id": run_id}}
        result = self.graph.invoke(Command(resume=resume_value), config=config)
        return dict(result or {})

    def get_state(self, run_id: str):
        config = {"configurable": {"thread_id": run_id}}
        return self.graph.get_state(config)