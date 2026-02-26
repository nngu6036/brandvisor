from flask import Blueprint, request
from ..repositories.brands_repo import BrandsRepo
from ..repositories.project_idea_repo import ProjectIdeasRepo
from ..repositories.project_materials_repo import ProjectMaterialsRepo
from ..repositories.projects_repo import ProjectsRepo
from ..domain.enum import ProjectMaterialCategory
from ..services.brand_visor import BrandVisor
import requests

bp = Blueprint("project_ideas", __name__, url_prefix="/api")

@bp.get("/projects/<project_id>/ideas")
def list_ideas(project_id: str):
    repo = ProjectIdeasRepo()
    ideas = repo.list_by_project(project_id)
    return {"ideas": [idea.model_dump() for idea in ideas]}


@bp.post("/projects/<project_id>/idea/<idea_id>/comment")
def comment_on_idea(project_id: str, idea_id: str):
    payload = request.get_json(force=True) or {}
    comment = (payload.get("comment") or "").strip()
    if not comment:
        return {"error": "comment is required"}, 400

    repo = ProjectIdeasRepo()
    idea = repo.get_by_id(idea_id)
    if not idea or idea.project_id != project_id:
        return {"error": "idea not found"}, 404

    project = ProjectsRepo().get_by_id(project_id)
    materials_repo = ProjectMaterialsRepo()
    brand_repo = BrandsRepo()
    brand = brand_repo.get_by_id(project.brand_id)
    brand_name = brand
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
    new_idea = brand_visor.comment_innovation_idea(
        brand_name=brand_name,
        brand_guideline=brand_guideline,
        segment_report=segment_report,
        cultural_signals=cultural_signals,
        idea_content=idea.content or "",
        comment=comment
    )
    score_output = brand_visor.score_single_innovation_idea(
                brand_name=brand_name,
                brand_guideline=brand_guideline,
                segment_report=segment_report,
                cultural_signals=cultural_signals,
                idea_content=new_idea)
    updated_idea = repo.update_fields(
        idea_id=idea_id,
        fields = { 'content':new_idea, 'score': score_output['average_score'],'evaluation': score_output['evaluation']}
    )

    return {"idea": updated_idea.model_dump()}


@bp.post("/projects/<project_id>/idea/<idea_id>/mockup")
def generate_mockup_on_idea(project_id: str, idea_id: str):
    bv = BrandVisor()
    repo = ProjectIdeasRepo()
    project = ProjectsRepo().get_by_id(project_id)
    brand_repo = BrandsRepo()
    brand = brand_repo.get_by_id(project.brand_id)
    materials_repo = ProjectMaterialsRepo()
    idea = repo.get_by_id(idea_id)
    brand_name = brand.name
    materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)
    brand_guideline = ""
    visual_guideline = ""
    for m in materials:
        headers = {
            "User-Agent": "python-requests (fetch_url_content)"
        }
        try:
            if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                r = requests.get(m.file, headers=headers, timeout = 90)
                r.raise_for_status()
                brand_guideline = r.text
                if not m.visual_guideline:
                    visual_guideline = bv.extract_visual_guideline(brand_guideline)
                    materials_repo.update_fields(m.id, {"visual_guideline": visual_guideline})
                else:
                    visual_guideline = m.visual_guideline
                mockup_content = bv.query_idea_mockup(
                    brand_name=brand_name,
                    brand_guideline=brand_guideline,
                    visual_guideline= m.visual_guideline,
                    idea_content=idea.content
                )
                updated_idea = repo.update_mockup(
                    idea_id=idea_id,
                    mockup_content=mockup_content,
                )
                return {"idea": updated_idea.model_dump()}
        except Exception as e:
            print("Error fetching/storing material:", m.category, e)


@bp.post("/projects/<project_id>/idea/<idea_id>/mockup/comment")
def comment_mockup_on_idea(project_id: str, idea_id: str):
    payload = request.get_json(force=True) or {}
    comment = (payload.get("comment") or "").strip()
    mockup_content = (payload.get("mockup_content") or "").strip()
    bv = BrandVisor()
    repo = ProjectIdeasRepo()
    project = ProjectsRepo().get_by_id(project_id)
    brand_repo = BrandsRepo()
    brand = brand_repo.get_by_id(project.brand_id)
    materials_repo = ProjectMaterialsRepo()
    idea = repo.get_by_id(idea_id)
    brand_name = brand.name
    materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)
    brand_guideline = ""
    visual_guideline = ""
    for m in materials:
        headers = {
            "User-Agent": "python-requests (fetch_url_content)"
        }
        try:
            if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                r = requests.get(m.file, headers=headers, timeout = 90)
                r.raise_for_status()
                brand_guideline = r.text
                if not m.visual_guideline:
                    visual_guideline = bv.extract_visual_guideline(brand_guideline)
                    materials_repo.update_fields(m.id, {"visual_guideline": visual_guideline})
                else:
                    visual_guideline = m.visual_guideline
                new_mockup_content = bv.comment_idea_mockup(
                    brand_name=brand_name,
                    brand_guideline=brand_guideline,
                    visual_guideline= m.visual_guideline,
                    idea_content=idea.content,
                    comment = comment,
                    mockup_content = mockup_content
                )
                updated_idea = repo.update_mockup(
                    idea_id=idea_id,
                    mockup_content=new_mockup_content,
                )
                return {"idea": updated_idea.model_dump()}
        except Exception as e:
            print("Error fetching/storing material:", m.category, e)


@bp.post("/projects/<project_id>/idea/<idea_id>/brief")
def generate_brief_on_idea(project_id: str, idea_id: str):
    repo = ProjectIdeasRepo()
    project = ProjectsRepo().get_by_id(project_id)
    materials_repo = ProjectMaterialsRepo()
    idea = repo.get_by_id(idea_id)
    brand_name = project.name or "Unknown Brand"
    materials = materials_repo.list_by_project(project_id, include_deleted=False, limit=500)
    brand_guideline = ""
    segment_report = "" 
    cultural_signals = ""
    for m in materials:
        headers = {
            "User-Agent": "python-requests (fetch_url_content)"
        }
        try:
            r = requests.get(m.get('file'), headers=headers, timeout = 90)
            r.raise_for_status()
            if m.category == ProjectMaterialCategory.BRAND_GUIDELINE.value:
                brand_guideline = r.text
            elif m.category== ProjectMaterialCategory.SEGMENTATION_REPORT.value:
                segment_report = r.text
            elif m.category == ProjectMaterialCategory.CULTURAL_SIGNALS.value:
                cultural_signals = r.text
        except Exception as e:
            print("Error fetching/storing material:", m.category, e)

    bv = BrandVisor()
    marketing_brief = bv.query_marketing_brief_innovation_idea(
        brand_name=brand_name,
        brand_guideline=brand_guideline,
        segment_report=segment_report,
        cultural_signals=cultural_signals,
        idea_content=idea.content or "",
    )

    updated_idea = repo.update_brief(
        idea_id=idea_id,
        marketing_brief=marketing_brief,
    )
    return {"idea": updated_idea.model_dump()}


@bp.post("/projects/<project_id>/idea/<idea_id>/select")
def select_idea(project_id: str, idea_id: str):
    repo = ProjectIdeasRepo()
    updated_idea = repo.update_select(
        idea_id=idea_id,
        selected=True,
    )
    return {"idea": updated_idea.model_dump()}


@bp.post("/projects/<project_id>/idea/<idea_id>/unselect")
def unselect_idea(project_id: str, idea_id: str):
    repo = ProjectIdeasRepo()
    updated_idea = repo.update_select(
        idea_id=idea_id,
        selected=False,
    )
    return {"idea": updated_idea.model_dump()}