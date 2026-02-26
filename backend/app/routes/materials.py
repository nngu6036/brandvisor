from flask import Blueprint, request
from ..repositories.project_materials_repo import ProjectMaterialsRepo

bp = Blueprint("project_materials", __name__, url_prefix="/api")

@bp.get("/projects/<project_id>/materials")
def list_materials(project_id: str):
    repo = ProjectMaterialsRepo()
    materials = repo.list_by_project(project_id)
    return {"materials": [m.model_dump() for m in materials]}