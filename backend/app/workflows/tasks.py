from app.celery_app import celery
from .innovation_workflow.engine import InnovationBrainstormEngine, InnovationRevisionEngine


@celery.task(name="workflow.start_innovation_brainstorm_task")
def start_innovation_brainstorm_task(project_id: str, brand_id: str, brainstorm_count: int) -> str:
    engine = InnovationBrainstormEngine()
    run_id = engine.start(project_id=project_id, brand_id=brand_id, brainstorm_count=brainstorm_count)
    return run_id


@celery.task(name="workflow.resume_innovation_brainstorm_task")
def resume_innovation_brainstorm_task(run_id: str, resume_value: dict) -> dict:
    engine = InnovationBrainstormEngine()
    result = engine.resume(run_id=run_id, resume_value=resume_value)
    return dict(result or {})


@celery.task(name="workflow.get_innovation_brainstorm_state")
def get_innovation_brainstorm_state_task(run_id: str) -> dict:
    engine = InnovationBrainstormEngine()
    state = engine.get_state(run_id=run_id)
    # state may be a LangGraph StateSnapshot; convert to dict-like
    try:
        return {
            "values": dict(state.values or {}),
            "next": list(state.next or []),
        }
    except Exception:
        return {"raw": str(state)}



@celery.task(name="workflow.start_innovation_revision_task")
def start_innovation_revision_task(project_id: str, brand_id: str, objective: str, contextual_data:str) -> str:
    engine = InnovationRevisionEngine()
    run_id = engine.start(project_id=project_id, brand_id=brand_id, objective=objective, contextual_data = contextual_data)
    return run_id


@celery.task(name="workflow.resume_innovation_revision_task")
def resume_innovation_revision_task(run_id: str, resume_value: dict) -> dict:
    engine = InnovationRevisionEngine()
    result = engine.resume(run_id=run_id, resume_value=resume_value)
    return dict(result or {})


@celery.task(name="workflow.get_innovation_revision_state")
def get_innovation_revision_state_task(run_id: str) -> dict:
    engine = InnovationRevisionEngine()
    state = engine.get_state(run_id=run_id)
    # state may be a LangGraph StateSnapshot; convert to dict-like
    try:
        return {
            "values": dict(state.values or {}),
            "next": list(state.next or []),
        }
    except Exception:
        return {"raw": str(state)}