import json
import os
from datetime import datetime, timezone
from typing import Any, Optional
from ...utils.redis_events import redis_client , project_workflow_channel


class InnovationWorkflowEventEmitter:
    def __init__(self):
        self.redis = redis_client()

    def publish(self, project_id: str, data: Optional[dict[str, Any]] = None) -> None:
        channel = project_workflow_channel(project_id)
        payload = {
            "project_id": project_id,
            "event": "workflow",
            "data": data or {},
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        self.redis.publish(f"{channel}", json.dumps(payload))
