from ....repositories.projects_repo import ProjectsRepo
from langchain_core.language_models.chat_models import BaseChatModel

from ..state import BrainstormIdeaState, RevisionIdeaState
from ....repositories.project_idea_repo import ProjectIdeasRepo
from ..emitter import InnovationWorkflowEventEmitter
from ....services.brand_visor import BrandVisor
from ....domain.enum import InnovationWorkflowState, WorkflowStatus, WorkflowType
from .helpers import _ask

def score_node(llm: BaseChatModel):
    def _node(state: BrainstormIdeaState) -> BrainstormIdeaState:
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()
        idea_repo = ProjectIdeasRepo()
        brand_visor = BrandVisor()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.SCORE.value, type = WorkflowType.IDEA_BRAINSTORM)
        emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id,"message":"Scoring ideas", "state": InnovationWorkflowState.SCORE.value, 'status': WorkflowStatus.RUNNING.value})
    
        score_output = brand_visor.score_innovation_ideas(
            brand_name=state["brand_name"],
            brand_guideline=state["brand_guideline"],
            segment_report=state["segment_report"],
            cultural_signals=state["cultural_signals"],
            ideas=state.get("base_ideas", [])
        )
        for source_id, ans in score_output.items():
            # Accept float scores from the scoring service and store them directly.
            avg = None
            if isinstance(ans, dict):
                avg = ans.get('average_score')

            float_score = None
            try:
                if avg is not None:
                    float_score = float(avg)
            except Exception:
                float_score = None

            fields = {}
            if isinstance(ans, dict) and 'evaluation' in ans:
                fields['evaluation'] = ans['evaluation']
            if float_score is not None:
                # clamp to 0..10
                float_score = max(0.0, min(10.0, float_score))
                fields['score'] = float_score

            if fields:
                idea_repo.update_fields(idea_id=source_id, fields=fields)
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.SCORE.value, type = WorkflowType.IDEA_BRAINSTORM)
        emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id,"message":"Completed scoring ideas", "state": InnovationWorkflowState.SCORE.value, 'status': WorkflowStatus.COMPLETE.value})
        projects_repo.update_workflow_progress(project_id, state=InnovationWorkflowState.FINISH.value, type = WorkflowType.IDEA_BRAINSTORM.value)
        emitter.publish(project_id=project_id, data={"title":"Brainstorming Workflow Update","type":WorkflowType.IDEA_BRAINSTORM, "run_id": run_id, "message":"Finish brainstorming workflow", "state": InnovationWorkflowState.FINISH.value})
        return state

    return _node



def score_validated_node(llm: BaseChatModel):
    def _node(state: RevisionIdeaState) -> RevisionIdeaState:
        project_id = state["project_id"]        
        run_id = state["run_id"]
        emitter = InnovationWorkflowEventEmitter()
        projects_repo = ProjectsRepo()
        idea_repo = ProjectIdeasRepo()
        brand_visor = BrandVisor()

        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.RUNNING.value, state=InnovationWorkflowState.SCORE.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Scoring ideas", "state": InnovationWorkflowState.SCORE.value, 'status': WorkflowStatus.RUNNING.value})
        if state.get("final_output"):
            score_output = brand_visor.score_innovation_ideas(
                brand_name=state["brand_name"],
                brand_guideline=state["brand_guideline"],
                segment_report=state["segment_report"],
                cultural_signals=state["cultural_signals"],
                ideas=state.get("final_output")
            )
            for source_id, ans in score_output.items():
                # Accept float scores from the scoring service and store them directly.
                avg = None
                if isinstance(ans, dict):
                    avg = ans.get('average_score')

                float_score = None
                try:
                    if avg is not None:
                        float_score = float(avg)
                except Exception:
                    float_score = None

                fields = {}
                if isinstance(ans, dict) and 'evaluation' in ans:
                    fields['evaluation'] = ans['evaluation']
                if float_score is not None:
                    # clamp to 0..10
                    float_score = max(0.0, min(10.0, float_score))
                    fields['score'] = float_score

                if fields:
                    idea_repo.update_fields(idea_id=source_id, fields=fields)
        projects_repo.update_workflow_progress(project_id, status=WorkflowStatus.COMPLETE.value, state=InnovationWorkflowState.SCORE.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id,"message":"Completed scoring ideas", "state": InnovationWorkflowState.SCORE.value, 'status': WorkflowStatus.COMPLETE.value})
        projects_repo.update_workflow_progress(project_id, state=InnovationWorkflowState.FINISH.value, type = WorkflowType.IDEA_REVISION.value)
        emitter.publish(project_id=project_id, data={"title":"Revision Workflow Update","type":WorkflowType.IDEA_REVISION, "run_id": run_id, "message":"Finish revision workflow", "state": InnovationWorkflowState.FINISH.value})
        return state

    return _node