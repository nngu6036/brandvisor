# backend/app/repositories/project_materials_repo.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from ..extensions import mongo
from ..domain import ProjectMaterialCategory, ProjectMaterialStatus
from ..models import ProjectIdea


class ProjectIdeasRepo:
    """
    ProjectIdea represents innovation ideas generated for a project.

    """

    def __init__(self):
        self.col = mongo.db["project_ideas"]


    def _to_public(self, doc: dict) -> dict:
        return {
            "id": str(doc["_id"]),
            "project_id": doc.get("project_id"),
            "category": doc.get("category"),
            "title": doc.get("title", ""),
            "selected": doc.get("selected", False),
            "score": doc.get("score", 0),
            "evaluation": doc.get("evaluation", []),
            "content": doc.get("content"),
            "mockup_content": doc.get("mockup_content"),
            "marketing_brief": doc.get("marketing_brief"),
            "fetched_at": doc.get("fetched_at"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
            "deleted_at": doc.get("deleted_at"),
        }

    def _to_model(self, doc: dict) -> ProjectIdea:
        """Convert MongoDB document to ProjectIdea model."""
        return ProjectIdea(
            id=str(doc["_id"]),
            project_id=doc.get("project_id"),
            category=doc.get("category"),
            title=doc.get("title", ""),
            evaluation=doc.get("evaluation", {}),
            selected=doc.get("selected", False),
            score=doc.get("score", 0),
            content=doc.get("content"),
            mockup_content=doc.get("mockup_content"),
            marketing_brief=doc.get("marketing_brief"),
            fetched_at=doc.get("fetched_at"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
            deleted_at=doc.get("deleted_at"),
        )

    def list_by_project(
        self,
        project_id: str
    ) -> list[dict]:
        query: dict[str, Any] = {"project_id": project_id}
        cursor = (
            self.col.find(query)
            .sort([("updated_at", -1), ("created_at", -1)])
        )
        return [self._to_model(d) for d in cursor]

    def get_by_id(self, idea_id: str) -> ProjectIdea | None:
        doc = self.col.find_one({"_id": ObjectId(idea_id)})
        return self._to_model(doc) if doc else None

    def create(self, project_id: str, title: str, category: str, content:str, score: float) -> ProjectIdea:
        now = datetime.now(timezone.utc)
        doc = {
            "project_id": project_id,
            "title": title,
            "category": category,
            "score": score,
            "content": content,
            "selected": False,
            "created_at": now,
            "updated_at": now,
        }
        res = self.col.insert_one(doc)
        return ProjectIdea(
            id=str(res.inserted_id),
            project_id=project_id,
            title=title,
            category=category,
            score=float(score),
            selected=False,
            content=content,
            created_at=now,
            updated_at=now,
        )
    
    def update_on_comment(
        self,
        idea_id: str,
        content: str,
        fetched_at: Optional[datetime] = None,
        tags: Optional[list[str]] = None,
    ) -> dict:
        """
        Upsert an idea .
        """
        now = datetime.now(timezone.utc)
        if fetched_at is None:
            fetched_at = now
        if tags is None:
            tags = []

        doc_set = {
            "content": content,
            "fetched_at": fetched_at,
            "updated_at": now,
        }
        res = self.col.find_one_and_update(
            {"_id": ObjectId(idea_id)},
            {
                "$set": doc_set,
                "$setOnInsert": {"created_at": now},
                "$unset": {"deleted_at": ""},  # revive if previously soft-deleted
            },
            upsert=True,
            return_document=True,
        )
        return self._to_model(res)
    

    def update_mockup(
        self,
        idea_id: str,
        mockup_content: str,
        fetched_at: Optional[datetime] = None,
        tags: Optional[list[str]] = None,
    ) -> ProjectIdea:
        """
        Upsert an idea .
        """
        now = datetime.now(timezone.utc)
        if fetched_at is None:
            fetched_at = now
        if tags is None:
            tags = []

        doc_set = {
            "mockup_content": mockup_content,
            "fetched_at": fetched_at,
            "updated_at": now,
        }
        res = self.col.find_one_and_update(
            {"_id": ObjectId(idea_id)},
            {
                "$set": doc_set,
                "$setOnInsert": {"created_at": now},
                "$unset": {"deleted_at": ""},  # revive if previously soft-deleted
            },
            upsert=True,
            return_document=True,
        )
        return self._to_model(res)
    

    def update_brief(
        self,
        idea_id: str,
        marketing_brief: str,
        fetched_at: Optional[datetime] = None,
        tags: Optional[list[str]] = None,
    ) -> ProjectIdea:
        """
        Upsert an idea .
        """
        now = datetime.now(timezone.utc)
        if fetched_at is None:
            fetched_at = now
        if tags is None:
            tags = []

        doc_set = {
            "marketing_brief": marketing_brief,
            "fetched_at": fetched_at,
            "updated_at": now,
        }
        res = self.col.find_one_and_update(
            {"_id": ObjectId(idea_id)},
            {
                "$set": doc_set,
                "$setOnInsert": {"created_at": now},
                "$unset": {"deleted_at": ""},  # revive if previously soft-deleted
            },
            upsert=True,
            return_document=True,
        )
        return self._to_model(res)
    
    def update_select(
        self,
        idea_id: str,
        selected: bool,
        fetched_at: Optional[datetime] = None,
        tags: Optional[list[str]] = None,
    ) -> ProjectIdea:
        """
        Upsert an idea .
        """
        now = datetime.now(timezone.utc)
        if fetched_at is None:
            fetched_at = now
        if tags is None:
            tags = []

        doc_set = {
            "selected": selected,
            "fetched_at": fetched_at,
            "updated_at": now,
        }
        res = self.col.find_one_and_update(
            {"_id": ObjectId(idea_id)},
            {
                "$set": doc_set,
                "$setOnInsert": {"created_at": now},
                "$unset": {"deleted_at": ""},  # revive if previously soft-deleted
            },
            upsert=True,
            return_document=True,
        )
        return self._to_model(res)

    def update_fields(self, idea_id: str, fields: dict) -> dict:
        """
        Patch/update mutable fields on a idea.
        """
        now = datetime.now(timezone.utc)
        safe_fields = dict(fields or {})
        safe_fields["updated_at"] = now

        self.col.update_one(
            {"_id": ObjectId(idea_id)},
            {"$set": safe_fields},
        )
        doc = self.col.find_one({"_id": ObjectId(idea_id)})
        return self._to_model(doc) if doc else {"ok": False}
