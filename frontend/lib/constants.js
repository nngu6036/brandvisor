export const PROJECT_TYPES = [
  { value: "innovation", label: "Innovation GTM" },
  { value: "strategic_portfolio", label: "Strategic Portfolio" } ]

export const SCORING_CATEGORY = {
    "on_brand_strategy": "On Brand Strategy",
    "relevance_for_audience": "Relevance for Audience",
    "uniqueness": "Uniqueness",
    "differentiation": "Differentiation",
    "size": "Size",
    "readiness": "Readiness"
}

export const QUESTION_TYPE = {
    OPEN: "open",
    SINGLE_CHOICE:"single_choice",
    MULTIPLE_CHOICE:"multiple_choice"
};

export const PROJECT_WORKFLOW_TYPE = {
  IDEA_BRAINSTORM: "IDEA_BRAINSTORMING",
  IDEA_REVISION: "IDEA_REVISION",
};

export const PROJECT_WORKFLOW_STATE = {
    COLLECT_INPUT: "COLLECT_INPUT",
    INITIAL:"INITIAL",
    GENERATE_BASE_IDEAS: "GENERATE_BASE_IDEAS",
    ANALYZE_MATERIALS: "ANALYZE_MATERIALS",
    FRICTION: "FRICTION",
    BIND: "BIND",
    AUDIT: "AUDIT",
    REFINE: "REFINE",
    FORMAT: "FORMAT",
    SCORE: "SCORE",
    START: "START",
    FINISH: "FINISH"
};

export const PROJECT_WORKFLOW_STATUS = {
  RUNNING: "RUNNING",
  COMPLETE: "COMPLETE",
  AWAITING_USER: "AWAITING_USER",
};

export const PROJECT_MATERIAL_STATUS = {
  INITIAL: "initial",
  LOADED: "loaded",
  FAILED: "failed"
};