# backend/app/repositories/project_materials_repo.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from ..extensions import mongo
from ..domain import ProjectMaterialCategory, ProjectMaterialStatus
from ..models import ProjectMaterial

class ProjectMaterialsRepo:
    """
    ProjectMaterial represents external resources loaded from vendor APIs or manual uploads.

    """

    def __init__(self):
        self.col = mongo.db["project_materials"]


    def _to_public(self, doc: dict) -> dict:
        return {
            "id": str(doc["_id"]),
            "project_id": doc.get("project_id"),
            "category": doc.get("category"),
            "visual_guideline": doc.get("visual_guideline"),
            "status": doc.get("status"),
            "source": doc.get("source"),
            "external_id": doc.get("external_id"),
            "title": doc.get("title", ""),
            "description": doc.get("description", ""),
            "tags": doc.get("tags", []),
            "file": doc.get("file"),
            "payload": doc.get("payload"),
            "fetched_at": doc.get("fetched_at"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
            "deleted_at": doc.get("deleted_at"),
        }
    
    def _to_model(self, doc: dict) -> ProjectMaterial:
        """Convert MongoDB document to ProjectMaterial model."""
        return ProjectMaterial(
            id=str(doc["_id"]),
            project_id=doc.get("project_id"),
            category=doc.get("category"),
            status=doc.get("status", 0),
            source=doc.get("source"),
            visual_guideline=doc.get("visual_guideline"),
            external_id=doc.get("external_id"),
            title=doc.get("title", ""),
            description=doc.get("description"),
            tags=doc.get("tags", []),
            file=doc.get("file"),
            payload=doc.get("payload"),
            fetched_at=doc.get("fetched_at"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
            deleted_at=doc.get("deleted_at"),
        )

    def list_by_project(
        self,
        project_id: str,
        category: Optional[str] = None,
        include_deleted: bool = False,
        limit: int = 200,
    ) -> list[dict]:
        query: dict[str, Any] = {"project_id": project_id}
        if category:
            query["category"] = category
        if not include_deleted:
            query["status"] = {"$ne": ProjectMaterialStatus.DELETED.value}

        cursor = (
            self.col.find(query)
            .sort([("updated_at", -1), ("created_at", -1)])
            .limit(limit)
        )
        return [self._to_model(d) for d in cursor]

    def get_by_id(self, material_id: str) -> Optional[dict]:
        doc = self.col.find_one({"_id": ObjectId(material_id)})
        return self._to_model(doc) if doc else None

    def get_latest_by_category(
        self,
        project_id: str,
        category: str,
        include_deleted: bool = False,
    ) -> Optional[dict]:
        query: dict[str, Any] = {"project_id": project_id, "category": category}
        if not include_deleted:
            query["status"] = {"$ne": ProjectMaterialStatus.DELETED.value}

        doc = self.col.find_one(
            query,
            sort=[("updated_at", -1), ("created_at", -1)],
        )
        return self._to_model(doc) if doc else None

    def upsert_from_vendor(
        self,
        status: ProjectMaterialStatus | str,
        project_id: str,
        category: ProjectMaterialCategory | str,
        source: str,
        external_id: str,
        title: str = "",
        description: str = "",
        tags: Optional[list[str]] = None,
        file: Optional[dict] = None,
        payload: Optional[dict] = None,
        fetched_at: Optional[datetime] = None,
        extra: Optional[dict] = None,
    ) -> dict:
        """
        Upsert a material coming from vendor API. De-dupes by (project_id, vendor, external_id).
        """
        now = datetime.now(timezone.utc)
        if fetched_at is None:
            fetched_at = now
        if tags is None:
            tags = []

        if isinstance(category, ProjectMaterialCategory):
            category_value = category.value
        else:
            category_value = str(category)

        doc_set = {
            "project_id": project_id,
            "category": category_value,
            "status": status,
            "source": source,
            "external_id": external_id,
            "title": title,
            "description": description,
            "tags": tags,
            "file": file,
            "payload": payload,
            "fetched_at": fetched_at,
            "updated_at": now,
        }

        # Allow attaching arbitrary vendor metadata without changing schema every time.
        if extra:
            doc_set["extra"] = extra

        res = self.col.find_one_and_update(
            {"project_id": project_id, "source": source, "external_id": external_id},
            {
                "$set": doc_set,
                "$setOnInsert": {"created_at": now},
                "$unset": {"deleted_at": ""},  # revive if previously soft-deleted
            },
            upsert=True,
            return_document=True,
        )

        # PyMongo returns the document when return_document=True, but in older versions
        # it expects ReturnDocument.AFTER. To be safe, fetch again if needed.
        if not isinstance(res, dict) or "_id" not in res:
            res = self.col.find_one({"project_id": project_id, "source": source, "external_id": external_id})

        return self._to_model(res)

    def create_manual(
        self,
        project_id: str,
        category: ProjectMaterialCategory | str,
        title: str = "",
        description: str = "",
        tags: Optional[list[str]] = None,
        source_url: Optional[str] = None,
        file: Optional[dict] = None,
        payload: Optional[dict] = None,
        extra: Optional[dict] = None,
    ) -> dict:
        """
        Create a material that is not tied to a vendor/external_id (manual upload/entry).
        """
        now = datetime.now(timezone.utc)
        if tags is None:
            tags = []

        if isinstance(category, ProjectMaterialCategory):
            category_value = category.value
        else:
            category_value = str(category)

        doc = {
            "project_id": project_id,
            "category": category_value,
            "status": ProjectMaterialStatus.INITIAL.value,
            "source": None,
            "external_id": None,
            "title": title,
            "description": description,
            "tags": tags,
            "file": file,
            "payload": payload,
            "fetched_at": None,
            "created_at": now,
            "updated_at": now,
        }
        if extra:
            doc["extra"] = extra

        res = self.col.insert_one(doc)
        doc["_id"] = res.inserted_id
        return self._to_model(doc)

    def update_fields(self, material_id: str, fields: dict) -> dict:
        """
        Patch/update mutable fields on a material.
        """
        now = datetime.now(timezone.utc)
        safe_fields = dict(fields or {})
        safe_fields["updated_at"] = now

        self.col.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": safe_fields},
        )
        doc = self.col.find_one({"_id": ObjectId(material_id)})
        return self._to_model(doc) if doc else {"ok": False}

    def soft_delete(self, material_id: str) -> dict:
        now = datetime.now(timezone.utc)
        self.col.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": {"status": ProjectMaterialStatus.DELETED.value, "deleted_at": now, "updated_at": now}},
        )
        return {"ok": True}
