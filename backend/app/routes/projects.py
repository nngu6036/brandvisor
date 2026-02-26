from app.repositories.brands_repo import BrandsRepo
from app.repositories.project_materials_repo import ProjectMaterialsRepo
from flask import Blueprint, request
from ..repositories.projects_repo import ProjectsRepo
from ..workflows.tasks import start_innovation_brainstorm_task, start_innovation_revision_task
from ..models import ProjectCreate
from ..services.brand_visor import BrandVisor
import requests
from ..domain.enum import ProjectMaterialCategory

bp = Blueprint("projects", __name__, url_prefix="/api")

@bp.get("/brands/<brand_id>/projects")
def list_projects(brand_id: str):
    repo = ProjectsRepo()
    projects = repo.list_by_brand(brand_id)
    return {"projects": [p.model_dump() for p in projects]}

@bp.get("/brands/<brand_id>/projects/<project_id>")
def get_project(brand_id: str, project_id: str):
    repo = ProjectsRepo()
    project = repo.get_by_id(project_id)
    if not project or project.brand_id != brand_id:
        return {"error": "project not found"}, 404
    return {"project": project.model_dump()}

@bp.post("/brands/<brand_id>/projects")
def create_project(brand_id: str):
    payload = request.get_json(force=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name is required"}, 400
    type = (payload.get("type") or "").strip()
    if not type:
        return {"error": "type is required"}, 400
    objective = (payload.get("objective") or "").strip()
    repo = ProjectsRepo()
    project = repo.create(brand_id, name, type, objective)
    brainstorm_count = (payload.get("brainstorm_count") or 10)
    start_innovation_brainstorm_task.delay(project_id=project.id, brand_id=brand_id, brainstorm_count=brainstorm_count)
    return {"project": project.model_dump()}, 201

@bp.delete("/brands/<brand_id>/projects/<project_id>")
def delete_project(brand_id:str,project_id: str):
    repo = ProjectsRepo()
    res = repo.delete(project_id)
    return res

@bp.put("/brands/<brand_id>/projects/<project_id>/objective")
def update_project_objective(brand_id:str,project_id: str):
    payload = request.get_json(force=True) or {}
    objective = (payload.get("objective") or "").strip()
    repo = ProjectsRepo()
    project = repo.update_objective(project_id, objective)
    return project.model_dump()


@bp.post("/brands/<brand_id>/projects/<project_id>/objective/clarify")
def clarify_project_objective(brand_id:str,project_id: str):
    project = ProjectsRepo().get_by_id(project_id)
    materials_repo = ProjectMaterialsRepo()
    brand_repo = BrandsRepo()
    brand = brand_repo.get_by_id(project.brand_id)
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
    brand_visor = BrandVisor()
    questions = brand_visor.clarify_project_objective(brand.name,brand_guideline,segment_report,cultural_signals,project.objective)
    return {"questions": questions}



@bp.post("/brands/<brand_id>/projects/<project_id>/ideas/revise")
def revise_project_ideas(brand_id:str,project_id: str):
    payload = request.get_json(force=True) or {}
    objective = (payload.get("objective") or "").strip()
    repo = ProjectsRepo()
    repo.update_objective(project_id, objective)
    questions = payload.get("questions")
    contextual_data = [f"Question: {item['question']} \n Answer: {item['answer']}" for item in questions]
    start_innovation_revision_task.delay(project_id=project_id, brand_id=brand_id, objective=objective, contextual_data = contextual_data)
    return {"ok": True}