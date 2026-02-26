from enum import Enum

class ProjectStatus(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"

class ProjectType(str, Enum):
    INNOVATION = "innovation"
    STRATEGIC_PORTFOLIO = "strategic_portfolio"

class InnovationWorkflowState(str, Enum):
    INITIAL = "initial"
    COLLECT_INPUT = "collect_input"
    GENERATE_BASE_IDEAS = "generate_base_ideas"
    ANALYZE_MATERIALS = "analyze_materials"
    FRICTION = "friction"
    BIND = "bind"
    AUDIT = "audit"
    REFINE = "refine"
    FORMAT = "format"
    SCORE = "score"
    STEER = "steer"
    START = "start"
    FINISH = "finish"

class WorkflowStatus(str, Enum):
    RUNNING = "running"
    COMPLETE = "complete"
    CANCELLED = "cancelled"
    FAILED = "failed"
    WAITING_USER = "waiting_user"

class WorkflowType(str, Enum):
    IDEA_BRAINSTORM = "idea_brainstorming"
    IDEA_REVISION = "idea_revision"

class ProjectMaterialStatus(str, Enum):
    INITIAL = "initial"
    LOADED = "loaded"
    FAILED = "failed"
    DELETED = "deleted"

class ProjectMaterialCategory(str, Enum):
    BRAND_GUIDELINE = "brand_guideline"
    SEGMENTATION_REPORT = "segmentation_report"
    CULTURAL_SIGNALS = "cultural_signals"
