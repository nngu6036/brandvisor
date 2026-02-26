from flask import Blueprint
from app.workflows.innovation_workflow.nodes.helpers import _ask, _loads_json_array
from app.repositories.projects_repo import ProjectsRepo
from app.repositories.brands_repo import BrandsRepo
from app.repositories.project_idea_repo import ProjectIdeasRepo
from app.repositories.project_materials_repo import ProjectMaterialsRepo
from app.domain.enum import InnovationWorkflowState, WorkflowStatus, ProjectMaterialCategory, ProjectMaterialStatus
from app.services.brand_api import fetch_brand_guideline, fetch_segmentation_report, fetch_cultural_signals
from app.services.brand_visor import BrandVisor
from app.utils.env_validator import validate_and_convert_llm_config
from app.workflows.innovation_workflow.nodes.bind import ValidatedIdea

import requests
import json
import httpx
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from langchain_openai import ChatOpenAI   

bp = Blueprint("health", __name__, url_prefix="/api")

@bp.get("/health")
def health():
    return {"status": "ok"}


@bp.get("/version")
def version():
    return {"name": "BrandVisor API", "version": "0.3.0"}
