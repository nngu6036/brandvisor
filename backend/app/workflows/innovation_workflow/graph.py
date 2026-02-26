from typing import Literal
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
import httpx

from .state import RevisionIdeaState, BrainstormIdeaState
from ...utils.env_validator import validate_and_convert_llm_config

from .nodes.collect_input import collect_input_node
from .nodes.generate_base_ideas import generate_base_ideas_node
from .nodes.analyze_material import analyze_material_node
from .nodes.refine import refine_node
from .nodes.audit import audit_node   
from .nodes.format import format_node
from .nodes.score import score_node, score_validated_node
from .nodes.steer import steer_node
from .nodes.friction import friction_node
from .nodes.bind import bind_node



def build_brainstorm_graph() -> StateGraph:
    config = validate_and_convert_llm_config()
    llm = ChatOpenAI(
            temperature=config["temperature"],
            model=config["model_name"],
            timeout=httpx.Timeout(180.0, connect=10.0, read=180.0, write=180.0, pool=10.0),
            openai_api_key=config["openai_api_key"],
        )
    builder = StateGraph(BrainstormIdeaState)

    builder.add_node("collect_input", collect_input_node)
    builder.add_node("generate_base_ideas", generate_base_ideas_node)
    builder.add_node("analyze_material", analyze_material_node)
    builder.add_node("score", score_node(llm))

    builder.add_edge(START, "collect_input")
    builder.add_edge("collect_input", "analyze_material")
    builder.add_edge("analyze_material", "generate_base_ideas")
    builder.add_edge("generate_base_ideas", "score")
    builder.add_edge("score", END)
    return builder


def build_revision_graph() -> StateGraph:
    config = validate_and_convert_llm_config()
    llm = ChatOpenAI(
            temperature=config["temperature"],
            model=config["model_name"],
            timeout=httpx.Timeout(180.0, connect=10.0, read=180.0, write=180.0, pool=10.0),
            openai_api_key=config["openai_api_key"],
        )
    builder = StateGraph(RevisionIdeaState)

    builder.add_node("steer", steer_node(llm))
    builder.add_node("friction", friction_node(llm))
    builder.add_node("bind", bind_node(llm))
    builder.add_node("audit", audit_node(llm))
    builder.add_node("refine", refine_node(llm))
    builder.add_node("format", format_node(llm))
    builder.add_node("score", score_validated_node(llm))

    builder.add_edge(START, "steer")
    builder.add_edge("steer", "friction")
    builder.add_edge("friction", "bind")
    builder.add_edge("bind", "audit")
    builder.add_edge("audit", "refine")
    builder.add_edge("refine", "format")  
    builder.add_edge("format", 'score')
    builder.add_edge("score", END)
    return builder