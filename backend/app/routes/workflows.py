from flask import Blueprint, request
from ..workflows.tasks import resume_innovation_brainstorm_task, get_innovation_brainstorm_state_task
from ..utils.redis_events import redis_client, project_workflow_channel
from flask import Response, stream_with_context
import time
import json
from redis.exceptions import ConnectionError as RedisConnectionError

bp = Blueprint("workflow", __name__, url_prefix="/api")

@bp.get("/projects/<project_id>/workflow/<run_id>")
def get_workflow_state(project_id: str, run_id: str):
    # Async task (but we can also do sync if you prefer)
    async_result = get_innovation_brainstorm_state_task.delay(run_id=run_id)
    state = async_result.get(timeout=10)  # keep it small; this is a quick read
    return {"run_id": run_id, "state": state}



@bp.get("/projects/<project_id>/workflow/events/stream")
def stream_project_events(project_id: str):
    r = redis_client()
    pubsub = r.pubsub(ignore_subscribe_messages=True)
    channel = project_workflow_channel(project_id)
    pubsub.subscribe(channel)

    def sse(event: str, data: str) -> str:
        # SSE format
        return f"event: {event}\ndata: {data}\n\n"

    def gen():
        # Let client know it connected
        yield sse("status", f"connected project={project_id}")

        last_ping = time.time()

        try:
            while True:
                try:
                    msg = pubsub.get_message(timeout=1.0)
                except RedisConnectionError as e:
                    # Redis connection dropped (e.g. restart/network reset).
                    # End this SSE stream gracefully; client can reconnect.
                    err = {"message": "redis pubsub disconnected", "detail": str(e)}
                    yield sse("error", json.dumps(err))
                    break
                except Exception as e:
                    err = {"message": "sse stream error", "detail": str(e)}
                    yield sse("error", json.dumps(err))
                    break

                # keep-alive ping every ~15s (helps proxies keep stream open)
                now = time.time()
                if now - last_ping > 15:
                    yield sse("ping", "keepalive")
                    last_ping = now

                if not msg:
                    continue

                data = msg.get("data")
                if not data:
                    continue

                # data is JSON from publish_project_event
                payload = None
                try:
                    payload = json.loads(data)
                    event = payload.get("event") or "log"
                except Exception:
                    event = "log"
                payload_data = payload.get("data") if isinstance(payload, dict) else data
                print(f"SSE event={event} data={json.dumps(payload_data)}")
                yield f"event: {event}\n"
                yield f"data: {json.dumps(payload_data)}\n\n"

                # optional: if publisher sends done, we end stream
                if event == "done":
                    break

        finally:
            try:
                pubsub.unsubscribe(channel)
                pubsub.close()
            except Exception:
                pass

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        # If behind nginx later:
        # "X-Accel-Buffering": "no",
    }
    return Response(stream_with_context(gen()), headers=headers)
