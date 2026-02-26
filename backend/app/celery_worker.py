from app import create_app
from app.celery_app import init_celery_with_flask_app, celery

flask_app = create_app()
init_celery_with_flask_app(flask_app)