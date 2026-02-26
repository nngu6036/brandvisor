"""
Pydantic models for database entities.
Corresponds to repositories in app/repositories.
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ==================== Brand Models ====================

class Brand(BaseModel):
    """Brand model from brands_repo."""
    id: str = Field(description="MongoDB ObjectId as string")
    name: str = Field(description="Brand name")
    logo_url: str = Field(description="URL to brand logo")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "Red Bull",
                "logo_url": "https://example.com/logo.png"
            }
        }


# ==================== Project Models ====================

class Project(BaseModel):
    """Project model from projects_repo."""
    id: str = Field(description="MongoDB ObjectId as string")
    brand_id: str = Field(description="Reference to brand")
    name: str = Field(description="Project name")
    objective: Optional[str]  = Field(description="Project objective")
    type: str = Field(description="Project type (innovation, strategic_portfolio, etc.)")
    status: str = Field(description="Project status (active, deleted)")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    workflow_run_id: Optional[str] = Field(default=None, description="Current workflow run ID")
    workflow_status: Optional[str] = Field(default=None, description="Workflow status (running, waiting_user, failed, succeeded)")
    workflow_state: Optional[str] = Field(default=None, description="Workflow state (collect_input, generate, etc.)")
    workflow_type: Optional[str] = Field(default=None, description="Workflow type (brainstorm, revision, etc.)")
    published_content_id: Optional[str] = Field(default=None, description="Published content reference")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "brand_id": "507f1f77bcf86cd799439012",
                "name": "Q1 Innovation Campaign",
                "type": "innovation",
                "status": "active",
                "created_at": "2025-01-28T10:00:00Z",
                "updated_at": "2025-01-28T10:00:00Z",
                "workflow_run_id": None,
                "workflow_status": None,
                "workflow_state": None,
                "workflow_type": None,
                "published_content_id": None
            }
        }


class ProjectCreate(BaseModel):
    """Request model for creating a project."""
    brand_id: str = Field(description="Reference to brand")
    name: str = Field(description="Project name")
    type: str = Field(description="Project type")


# ==================== Project Idea Models ====================

class ProjectIdea(BaseModel):
    """Project idea model from project_idea.py."""
    id: str = Field(description="MongoDB ObjectId as string")
    project_id: str = Field(description="Reference to project")
    category: str = Field(description="Idea category")
    title: str = Field(description="Idea title")
    selected: bool = Field(default=False, description="Whether idea is selected")
    score: float = Field(default=0, description="Idea score/rating")
    evaluation: Optional[Dict] = Field(description="Detailed evaluation of the idea", default={})
    content: str = Field(description="Idea content/description")
    mockup_content: Optional[str] = Field(default=None, description="Generated mockup URL or content")
    marketing_brief: Optional[str] = Field(default=None, description="Marketing brief for the idea")
    fetched_at: Optional[datetime] = Field(default=None, description="When idea was fetched/generated")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    deleted_at: Optional[datetime] = Field(default=None, description="Deletion timestamp if deleted")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "project_id": "507f1f77bcf86cd799439013",
                "category": "Product Remix",
                "title": "Energy Drink Remix with Local Fruits",
                "selected": False,
                "score": 85,
                "content": "Create a limited edition remix combining energy drink with local tropical fruits...",
                "mockup_content": None,
                "marketing_brief": None,
                "fetched_at": None,
                "created_at": "2025-01-28T10:00:00Z",
                "updated_at": "2025-01-28T10:00:00Z",
                "deleted_at": None
            }
        }


class ProjectIdeaCreate(BaseModel):
    """Request model for creating a project idea."""
    project_id: str = Field(description="Reference to project")
    title: str = Field(description="Idea title")
    category: str = Field(description="Idea category")
    content: str = Field(description="Idea content/description")


class ProjectIdeaUpdate(BaseModel):
    """Request model for updating a project idea."""
    title: str = Field(description="Idea title")
    category: str = Field(description="Idea category")
    content: str = Field(description="Idea content/description")


# ==================== Project Material Models ====================

class ProjectMaterial(BaseModel):
    """Project material model from project_materials_repo."""
    id: str = Field(description="MongoDB ObjectId as string")
    project_id: str = Field(description="Reference to project")
    category: str = Field(description="Material category (brand_guideline, segmentation_report, cultural_signals)")
    status: str = Field(description="Material status (initial, loaded, failed, deleted)")
    source: str = Field(description="Source/vendor of material (e.g., BrainOS, Perplexity AI)")
    external_id: Optional[str] = Field(default=None, description="External ID from vendor system")
    title: str = Field(description="Material title")
    visual_guideline: Optional[str] = Field(default=None, description="Visual guideline from brand guideline")
    description: str = Field(description="Material description")
    tags: List[str] = Field(default=[], description="Material tags")
    file: Optional[str] = Field(default=None, description="File url)")
    payload: Optional[dict] = Field(default=None, description="Material payload/content")
    fetched_at: Optional[datetime] = Field(default=None, description="When material was fetched")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")
    deleted_at: Optional[datetime] = Field(default=None, description="Deletion timestamp if deleted")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "project_id": "507f1f77bcf86cd799439013",
                "category": "brand_guideline",
                "status": "loaded",
                "source": "BrainOS",
                "external_id": "ext_12345",
                "title": "Red Bull Brand Guideline",
                "description": "Official brand guidelines for Red Bull",
                "tags": ["official", "2025"],
                "file": {
                    "url": "https://example.com/guidelines.pdf",
                    "size": 2048000,
                    "type": "application/pdf"
                },
                "payload": None,
                "fetched_at": "2025-01-28T10:00:00Z",
                "created_at": "2025-01-28T10:00:00Z",
                "updated_at": "2025-01-28T10:00:00Z",
                "deleted_at": None
            }
        }


class ProjectMaterialCreate(BaseModel):
    """Request model for creating a project material."""
    project_id: str = Field(description="Reference to project")
    category: str = Field(description="Material category")
    source: str = Field(description="Material source/vendor")
    title: str = Field(description="Material title")
    description: str = Field(description="Material description")
    tags: List[str] = Field(default=[], description="Material tags")
    file: Optional[dict] = Field(default=None, description="File metadata")
    payload: Optional[dict] = Field(default=None, description="Material payload")


# ==================== Conversation Models ====================

class ConversationTurn(BaseModel):
    """Single conversation turn (user + assistant message)."""
    user: str = Field(description="User message")
    assistant: str = Field(description="Assistant response")


class Conversation(BaseModel):
    """Conversation model from conversations_repo."""
    id: str = Field(description="MongoDB ObjectId as string")
    brand: dict = Field(description="Brand context for conversation")
    turn: ConversationTurn = Field(description="Conversation turn")
    created_at: datetime = Field(description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "brand": {
                    "id": "507f1f77bcf86cd799439012",
                    "name": "Red Bull",
                    "logo_url": "https://example.com/logo.png"
                },
                "turn": {
                    "user": "What innovation ideas do you suggest?",
                    "assistant": "Based on the brand guidelines and market analysis..."
                },
                "created_at": "2025-01-28T10:00:00Z"
            }
        }


class ConversationCreate(BaseModel):
    """Request model for creating a conversation."""
    user_message: str = Field(description="User message")
    assistant_message: str = Field(description="Assistant response")
    brand: dict = Field(description="Brand context")
