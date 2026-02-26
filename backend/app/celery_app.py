import os
from celery import Celery
from .extensions import cors, mongo
# Import target for celery CLI / docker-compose:
#  celery -A app.celery_worker.celery worker -l INFO -P solo
celery = Celery("brandvisor")

def configure_celery() -> Celery:
    broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    celery.conf.update(
        broker_url=broker,
        result_backend=backend,
        task_track_started=True,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        include=["app.workflows.tasks"],
    )

def init_celery_with_flask_app(app):
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    celery.Task = ContextTask
    return celery

configure_celery()