import json
from flask import current_app, url_for
from typing import List, Dict
import time
import requests

def public_url(relpath: str) -> str:
    base = current_app.config["PUBLIC_BASE_URL"] 
    return f"{base}/{relpath}"

def fetch_brand_guideline(brand_id: str) -> dict:
    # Placeholder implementation
    url = public_url("public/samples/redbull_brand_guideline.json")
    return {"url": url, 'source':'BrainOS'}


def fetch_cultural_signals(brand_id: str) -> dict:
    # Placeholder implementation
    url = public_url("public/samples/redbull_cultural_signal.txt")
    return {"url": url, 'source':'Perplexity AI'}


def fetch_segmentation_report(brand_id: str) -> dict:
    # Placeholder implementation
    url = public_url("public/samples/redbull_segmentation_report.json")
    return {"url": url, 'source':'BrainOS'}

def create_mockup(prompts:List[str], assets: List[Dict]) -> str:
    inputs = [{"type": "TEXT", "value": prompt} for prompt in prompts]
    for assset in (assets or []):
        inputs.append({"type": "IMAGE", "value": assset['url'],'name':assset['name']})
    headers = {
        "Authorization": f"Bearer {current_app.config['CREATIVE_API_TOKEN']}",
        "Content-Type": "application/json",
    }
    print(inputs)
    payload = {"inputs": inputs}
    res = requests.post(current_app.config["CREATIVE_API_URL"], headers=headers, json=payload, timeout=60)
    res.raise_for_status()
    payload = res.json()
    print(payload)
    return payload.get("url", "")