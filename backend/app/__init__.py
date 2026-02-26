from flask import Flask
from dotenv import load_dotenv

from .config import Settings
from .extensions import cors, mongo
from .routes import register_blueprints
from .utils.errors import register_error_handlers
from .utils.env_validator import check_env_on_startup
from .celery_app import init_celery_with_flask_app

def create_app() -> Flask:
    load_dotenv()
    check_env_on_startup()
    app = Flask(__name__,
                static_folder="public",      # relative to app/ package
                static_url_path="/public"    # URL prefix)
    )
    settings = Settings.from_env()
    app.config.update(settings.to_flask_config())
    cors.init_app(app, resources={r"/api/*": {"origins": settings.cors_origins}})
    mongo.init_app(app)
    register_blueprints(app)
    register_error_handlers(app)
    init_celery_with_flask_app(app)

    return app
