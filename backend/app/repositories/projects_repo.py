from datetime import datetime, timezone
from typing import List
from bson import ObjectId
from ..extensions import mongo
from ..domain import ProjectStatus, InnovationWorkflowState, WorkflowStatus
from ..models import Project, ProjectCreate

class ProjectsRepo:
    def __init__(self):
        self.col = mongo.db["projects"]

    def list_by_brand(self, brand_id: str, limit: int = 200) -> list[Project]:
        cursor = (
            self.col.find({"brand_id": brand_id,"status": {"$ne": ProjectStatus.DELETED.value}})
            .sort("created_at", -1)
            .limit(limit)
        )
        return [
            Project(
                id=str(p["_id"]),
                brand_id=p.get("brand_id"),
                objective=p.get("objective", ""),
                name=p.get("name", ""),
                type=p.get("type", ""),
                status=p.get("status", ProjectStatus.ACTIVE.value),
                created_at=p.get("created_at"),
                updated_at=p.get("updated_at"),
                workflow_run_id=p.get("workflow_run_id"),
                workflow_status=p.get("workflow_status"),
                workflow_state=p.get("workflow_state"),
                workflow_type=p.get("workflow_type"),
                published_content_id=p.get("published_content_id"),
            )
            for p in cursor
        ]
    
    def _to_model(self, doc: dict) -> Project:
        """Convert MongoDB document to Project model."""
        return Project(
            id=str(doc["_id"]),
            brand_id=doc.get("brand_id"),
            objective=doc.get("objective", ""),
            name=doc.get("name", ""),
            type=doc.get("type", ""),
            status=doc.get("status", ProjectStatus.ACTIVE.value),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
            workflow_run_id=doc.get("workflow_run_id"),
            workflow_status=doc.get("workflow_status"),
            workflow_state=doc.get("workflow_state"),
            workflow_type=doc.get("workflow_type"),
            published_content_id=doc.get("published_content_id"),
        )

    
    def get_by_id(self, project_id: str) -> Project | None:
        doc = self.col.find_one({"_id": ObjectId(project_id), "status": {"$ne": ProjectStatus.DELETED.value}})
        return self._to_model(doc) if doc else None

    def create(self, brand_id: str, name: str, type: str,objective:str) -> Project:
        now = datetime.now(timezone.utc)
        doc = {
            "brand_id": brand_id,
            "name": name,
            "type": type,
            "objective": objective,
            "status": ProjectStatus.ACTIVE.value,
            "created_at": now,
            "updated_at": now,
            "workflow_run_id": None,
            "workflow_status": None,
            "workflow_state": None,
            "workflow_type": None,
            "published_content_id": None,
        }
        res = self.col.insert_one(doc)
        return Project(
            id=str(res.inserted_id),
            brand_id=brand_id,
            name=name,
            type=type,
            objective=objective,
            status=ProjectStatus.ACTIVE.value,
            created_at=now,
            updated_at=now,
            workflow_run_id=None,
            workflow_status=None,
            workflow_state=None,
            workflow_type=None,
            published_content_id=None,
        )
    
    def delete(self, project_id: str) -> dict:
        now = datetime.now(timezone.utc)
        res = self.col.find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": ProjectStatus.DELETED.value, "deleted_at": now}}
        )
        return {"ok": True}

    def set_workflow_run(self, project_id: str, initial_state: str, run_id: str) -> None:
        now = datetime.now(timezone.utc)
        res = self.col.find_one_and_update(
            {"_id": ObjectId(project_id)},
            {"$set": {"workflow_run_id": run_id, "workflow_status": WorkflowStatus.RUNNING.value, "workflow_state": initial_state, "updated_at": now}}
        )
        return self._to_model(res)

    def update_workflow_progress(
        self,
        project_id: str,
        status: str | None = None,
        state: str | None = None,
        type: str | None = None,
        error: str | None = None,
        published_content_id: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        sets = {"updated_at": now}
        if status is not None:
            sets["workflow_status"] = status
        if state is not None:
            sets["workflow_state"] = state
        if type is not None:
            sets["workflow_type"] = type
        if error is not None:
            sets["workflow_error"] = error
        if published_content_id is not None:
            sets["published_content_id"] = published_content_id
        res = self.col.find_one_and_update({"_id": ObjectId(project_id)}, {"$set": sets})
        return self._to_model(res)

    def update_objective(
        self,
        project_id: str,
        objective: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        sets = {"updated_at": now}
        if objective is not None:
            sets["objective"] = objective
        res = self.col.find_one_and_update({"_id": ObjectId(project_id)}, {"$set": sets})
        return self._to_model(res)