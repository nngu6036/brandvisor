from typing import Any, Literal, Optional
from typing_extensions import TypedDict
from typing import TypedDict, List, Dict, Literal, Any, Optional
from ...domain.enum import InnovationWorkflowState, WorkflowStatus

Segment = Literal["Core", "Aspiration", "Functional"]
Verdict = Literal["keep", "refine", "discard"]


class BaseIdea(TypedDict, total=False):
    category: str
    description: str
    title:str
    source_id: str

class ValidatedIdea(TypedDict):
    title: str
    overview: str
    pillar_integration: Dict[str, List[str]]  # Remix / Creators / Community
    grit_visualization: str
    segment: Segment
    scores: Dict[str, int] 
    verdict: Verdict
    audit: Dict[str, str]   
    source_id: str


class RevisionIdeaState(TypedDict, total=False):

    run_id: str
    project_id: str
    brand_id: str

    state: InnovationWorkflowState 
    status: WorkflowStatus

    brand_name: str
    brand_guideline: str
    visual_guideline: str
    segment_report: str
    cultural_signals: str
    user_query: str
    friction_point: str
    base_ideas: List[BaseIdea]         # output of your existing prompt
    validated_ideas: List[ValidatedIdea] # enriched + audited

    contextual_data: str
    final_output: List[BaseIdea]


class BrainstormIdeaState(TypedDict, total=False):

    run_id: str
    project_id: str
    brand_id: str

    state: InnovationWorkflowState 
    status: WorkflowStatus

    brand_name: str
    brand_guideline: str
    segment_report: str
    cultural_signals: str
    base_ideas: List[BaseIdea]
    brainstorm_count: int
