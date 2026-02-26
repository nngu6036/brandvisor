from __future__ import annotations
import json
from enum import Enum
from typing import Any, Dict, List, Optional

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from ..utils.env_validator import EnvValidationError, validate_and_convert_llm_config
from .brand_api import create_mockup
from .prompts import (
    clarify_objective_prompt,
    comment_innovation_idea_prompt,
    extract_visual_assets_prompt,
    extract_visual_guideline_prompt,
    generate_innovation_idea_prompt,
    generate_marketing_brief_prompt,
    refine_objective_prompt,
    score_innovation_idea_prompt,
    score_single_innovation_idea_prompt,
)


class ScoringQuestionCategory(str, Enum):
    ON_BRAND_STRATEGY = "on_brand_strategy"
    RELEVANCE_FOR_AUDIENCE = "relevance_for_audience"
    UNIQYENESS = "uniqueness"
    DIFFERENCIATION = "differentiation"
    SIZE = "size"
    READINESS = "readiness"


SCORING_QUESTIONS = {
    ScoringQuestionCategory.ON_BRAND_STRATEGY.value: [
        "The Audit: Does the idea radiate Dynamism, Determination, Purpose, and Positivity?",
        "The 'Grit' Factor: Does the visual execution reject 'polished perfection'? If the idea looks like a traditional 'clean' TV ad, it scores low. If it embraces real sweat, imperfect skin, and flyaway hair, it's a winner.",
        "Functional Truth: Does it position the brand as the Enabler (giving wings) rather than just a refreshment?",
    ],
    ScoringQuestionCategory.RELEVANCE_FOR_AUDIENCE.value: [
        """The Filter: You must map the idea to the segment report provided. If it does not align with at least one key insight, score 0.:
        - Core (Performance): Is it extreme enough to earn respect from pros?
        - Aspiration (Culture): Is it "cool" enough for creators to want to co-sign?
        - Functional (Utility): Does it solve a real-world energy barrier (e.g., night-shift fatigue)?""",
        "Culture Check: Does it speak the 'unspoken' language of that sub-culture (slang, rituals, local rules)?",
    ],
    ScoringQuestionCategory.UNIQYENESS.value: [
        "The Filter: If you removed the brand logo, could a competitor do this?",
        "The Maverick Leap: Does this idea feel 'impossible' or slightly dangerous to a traditional brand? Is it a 'World-First' or a radical new perspective?",
    ],
    ScoringQuestionCategory.DIFFERENCIATION.value: [
        "The Filter: Are we going deeper than our competitors? For example, instead of just sponsoring an event (Generic), are we creating a unique platform or experience (Brand way)?",
        "Sub-culture Depth: Is our connection to the 'Street-Level Pulse' more authentic than anyone else's?",
    ],
    ScoringQuestionCategory.SIZE.value: [
        "The Filter: Is this a 'one-day stunt' or does it have the potential to become a Community Infrastructure?",
        "Scalability: Can this niche idea be scaled into a global movement?",
    ],
    ScoringQuestionCategory.READINESS.value: [
        "The Filter: Do we have the Catalysts (Authentic Creators) ready to lead this initiative?",
        "Product Fit: Is the 'Product Remix' (healthy/wellness/natural) ready for the market, or is it too early?",
        "Infrastructure: Do we have the 'Sanctuary' or the platform to launch this now?",
    ],
}


SCORING_WEIGHT = {
    ScoringQuestionCategory.ON_BRAND_STRATEGY.value: 0.25,
    ScoringQuestionCategory.RELEVANCE_FOR_AUDIENCE.value: 0.20,
    ScoringQuestionCategory.UNIQYENESS.value: 0.20,
    ScoringQuestionCategory.DIFFERENCIATION.value: 0.15,
    ScoringQuestionCategory.SIZE.value: 0.10,
    ScoringQuestionCategory.READINESS.value: 0.10,
}


class InnovationIdeaSchema(BaseModel):
    """One innovation idea."""

    title: str = Field(description="Title of the idea")
    content: str = Field(description="Content of the idea")
    category: str = Field(description="Category of the idea")


class VisualAssetSchema(BaseModel):
    """One visual asset."""

    url: str = Field(description="Url of the visual asset")
    name: str = Field(description="Name of the asset")


class QuestionSchema(BaseModel):
    """One objective question."""

    type: str = Field(
        description="Type of the objective question, open | single-choice | multiple-choice"
    )
    description: str = Field(description="Content of the objective question")
    options: List[str] = Field(description="Options for the objective question")


class ScoringAnswerSchema(BaseModel):
    """One scoring answer."""

    source_id: Optional[str] = Field(
        description="Unique identifier for the idea being scored"
    )
    question: str = Field(description="Content of the question being answered")
    question_category: str = Field(
        description="Category of the question being answered"
    )
    score: int = Field(ge=1, le=10, description="Score for the question (1-10)")
    justification: str = Field(description="Justification for the score")


class InnovationIdeaLLMOutput(BaseModel):
    """Innovation ideas for a brand."""

    ideas: List[InnovationIdeaSchema] = Field(
        description="A list of innovation ideas for a brand"
    )


class ScoreIdeasLLMOutput(BaseModel):
    """Score innovation ideas for a brand."""

    answers: List[ScoringAnswerSchema] = Field(
        description="A list of scoring answers for the idea"
    )


class VisualAssetsLLMOutput(BaseModel):
    """Visual assets output."""

    assets: List[VisualAssetSchema] = Field(description="A list of visual assets")


class ClarifyObjectiveLLMOutput(BaseModel):
    """Clarify project objective for a brand."""

    questions: List[QuestionSchema] = Field(
        description="A list of clarifying questions for the objective"
    )


class BrandVisor:
    """
    Minimal wrapper for generating structured marketing innovation ideas.
    Reads config from environment variables using centralized validation.
    """

    def __init__(self) -> None:
        try:
            config = validate_and_convert_llm_config()
            self.openai_key: str = config["openai_api_key"]
            self._model_name: str = config["model_name"]
            self._temperature: float = config["temperature"]
            self._timeout: int = config["timeout"]
        except EnvValidationError as e:
            raise RuntimeError(f"BrandVisor initialization failed: {e}") from e

    def _new_llm(self) -> ChatOpenAI:
        return ChatOpenAI(
            temperature=self._temperature,
            model=self._model_name,
            timeout=self._timeout,
            openai_api_key=self.openai_key,
        )

    def _validate_prompt_params(
        self, prompt: Any, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        expected = set(getattr(prompt, "input_variables", []) or [])
        provided = set(params.keys())
        extra = sorted(provided - expected)
        missing = sorted(expected - provided)

        if extra or missing:
            prompt_name = getattr(prompt, "__name__", prompt.__class__.__name__)
            details = []
            if extra:
                details.append(f"extra={extra}")
            if missing:
                details.append(f"missing={missing}")
            raise ValueError(
                f"Prompt parameter mismatch for {prompt_name}: "
                + ", ".join(details)
            )
        return params

    def score_innovation_ideas(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        ideas: List[Dict],
    ) -> ScoreIdeasLLMOutput:
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        structured = llm.with_structured_output(ScoreIdeasLLMOutput)

        scoring_questions = ""
        for key in SCORING_QUESTIONS.keys():
            scoring_questions += f"\nCategory {key}:\n"
            for q in SCORING_QUESTIONS[key]:
                scoring_questions += f"- {q}\n"
            scoring_questions += "\n\n"

      
        params = self._validate_prompt_params(
            score_innovation_idea_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "ideas": json.dumps([{'source_id':idea['source_id'],'content':idea['content']} for idea in ideas]),
                "scoring_questions": scoring_questions,
            },
        )
        resp: ScoreIdeasLLMOutput = (score_innovation_idea_prompt | structured).invoke(
            params
        )

        if not resp.answers:
            raise RuntimeError("LLM did not return any answers.")

        scores: Dict[str, Dict[str, List[int]]] = {}
        for answer in resp.answers:
            if answer.source_id not in scores:
                scores[answer.source_id] = {}
            if answer.question_category not in scores[answer.source_id]:
                scores[answer.source_id][answer.question_category] = []
            scores[answer.source_id][answer.question_category].append(answer.score)

        results: Dict[str, Dict[str, Any]] = {}
        for source_id, categories in scores.items():
            results[source_id] = {"evaluation": {}}
            average_score = 0.0
            for category, scores_list in categories.items():
                score_per_cat = sum(scores_list) / len(scores_list)
                results[source_id]["evaluation"][category] = score_per_cat
                weighted_score_per_cat = score_per_cat * SCORING_WEIGHT[category]
                average_score += weighted_score_per_cat
            results[source_id]["average_score"] = average_score
        return results

    def score_single_innovation_idea(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        idea_content: Dict,
    ) -> ScoreIdeasLLMOutput:
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        structured = llm.with_structured_output(ScoreIdeasLLMOutput)

        scoring_questions = ""
        for key in SCORING_QUESTIONS.keys():
            scoring_questions += f"\nCategory {key}:\n"
            for q in SCORING_QUESTIONS[key]:
                scoring_questions += f"- {q}\n"
            scoring_questions += "\n\n"

        params = self._validate_prompt_params(
            score_single_innovation_idea_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "idea_content": idea_content,
                "scoring_questions": scoring_questions,
            },
        )
        resp: ScoreIdeasLLMOutput = (
            score_single_innovation_idea_prompt | structured
        ).invoke(params)

        if not resp.answers:
            raise RuntimeError("LLM did not return any answers.")

        scores: Dict[str, List[int]] = {}
        for answer in resp.answers:
            if answer.question_category not in scores:
                scores[answer.question_category] = []
            scores[answer.question_category].append(answer.score)

        results: Dict[str, Any] = {"evaluation": {}}
        average_score = 0.0
        for category, scores_list in scores.items():
            score_per_cat = sum(scores_list) / len(scores_list)
            results["evaluation"][category] = score_per_cat
            weighted_score_per_cat = score_per_cat * SCORING_WEIGHT[category]
            average_score += weighted_score_per_cat
        results["average_score"] = average_score
        return results

    def query_idea_mockup(
        self,
        brand_name: str,
        brand_guideline: str,
        visual_guideline: str,
        idea_content: str,
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not visual_guideline:
            raise Exception("Visual guideline is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        assets = self.extract_visual_assets(brand_guideline, idea_content, "")
        prompts = [
            f"Create a marketing mockup for the brand {brand_name} based on the idea: {idea_content}",
            f"Visual guideline: {visual_guideline}",
        ]
        mockup_response = create_mockup(prompts, assets)
        return mockup_response

    def comment_idea_mockup(
        self,
        brand_name: str,
        brand_guideline: str,
        visual_guideline: str,
        idea_content: str,
        comment: str,
        mockup_content: str
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not visual_guideline:
            raise Exception("Visual guideline is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        assets = self.extract_visual_assets(brand_guideline, idea_content, comment)
        assets.append({'url': mockup_content, 'name':'The mockup to be updated'})
        prompts = [
            f"Update a marketing mockup for the brand {brand_name} based on the comment: {comment}",
            f"Visual guideline: {visual_guideline}",
        ]
        mockup_response = create_mockup(prompts, assets)
        return mockup_response

    def query_marketing_brief_innovation_idea(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        idea_content: str,
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        params = self._validate_prompt_params(
            generate_marketing_brief_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "idea_content": idea_content,
            },
        )
        resp: str = (generate_marketing_brief_prompt | llm).invoke(params)
        return resp.content

    def comment_innovation_idea(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        idea_content: str,
        comment: str,
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        params = self._validate_prompt_params(
            comment_innovation_idea_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "idea_content": idea_content,
                "comment": comment,
            },
        )
        resp = (comment_innovation_idea_prompt | llm).invoke(params)
        return resp.content

    def extract_visual_guideline(self, brand_guideline: str):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")

        llm = self._new_llm()
        params = self._validate_prompt_params(
            extract_visual_guideline_prompt,
            {"brand_guideline": brand_guideline},
        )
        resp: str = (extract_visual_guideline_prompt | llm).invoke(params)
        return resp.content

    def extract_visual_assets(self, brand_guideline: str, idea_content: str, comment: str):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")

        llm = self._new_llm()
        structured = llm.with_structured_output(VisualAssetsLLMOutput)
        params = self._validate_prompt_params(
            extract_visual_assets_prompt,
            {"brand_guideline": brand_guideline, "idea_content": idea_content, "comment":comment},
        )
        resp: VisualAssetsLLMOutput = (extract_visual_assets_prompt | structured).invoke(
            params
        )
        return [{"url": asset.url, "name": asset.name} for asset in resp.assets]

    def clarify_project_objective(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        objective: str,
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        structured = llm.with_structured_output(ClarifyObjectiveLLMOutput)
        params = self._validate_prompt_params(
            clarify_objective_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "objective": objective,
            },
        )
        resp: ClarifyObjectiveLLMOutput = (clarify_objective_prompt | structured).invoke(
            params
        )
        return [
            {"type": q.type, "description": q.description, "options": q.options}
            for q in resp.questions
        ]

    def refine_project_objective(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        objective: str,
        contextual_data: str,
    ):
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")

        llm = self._new_llm()
        params = self._validate_prompt_params(
            refine_objective_prompt,
            {
                "brand_name": brand_name,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
                "objective": objective,
                "contextual_data": contextual_data,
            },
        )
        resp: str = (refine_objective_prompt | llm).invoke(params)
        return resp.content

    def query_innovation_ideas(
        self,
        brand_name: str,
        brand_guideline: str,
        segment_report: str,
        cultural_signals: str,
        k: int = 10,
    ) -> InnovationIdeaLLMOutput:
        if not brand_guideline:
            raise Exception("Brand guideline is empty")
        if not segment_report:
            raise Exception("Segment report is empty")
        if not cultural_signals:
            raise Exception("Cultural signals is empty")
        if not brand_name:
            raise Exception("Brand name is empty")
        if not isinstance(k, int) or k <= 0:
            raise ValueError("k must be a positive integer.")

        llm = self._new_llm()
        structured = llm.with_structured_output(InnovationIdeaLLMOutput)
        params = self._validate_prompt_params(
            generate_innovation_idea_prompt,
            {
                "brand_name": brand_name,
                "k": k,
                "brand_guideline": brand_guideline,
                "segment_report": segment_report,
                "cultural_signals": cultural_signals,
            },
        )
        resp: InnovationIdeaLLMOutput = (
            generate_innovation_idea_prompt | structured
        ).invoke(params)

        if resp.ideas is None:
            resp.ideas = []
        if len(resp.ideas) > k:
            resp.ideas = resp.ideas[:k]
        if len(resp.ideas) < k:
            raise RuntimeError(
                f"LLM returned {len(resp.ideas)} ideas but expected {k}. "
                "Consider retrying or relaxing constraints."
            )
        return [
            {
                "title": idea.title,
                "content": idea.content,
                "category": idea.category,
                "score": 0,
            }
            for idea in resp.ideas
        ]
