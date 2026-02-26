from flask import Flask
from .health import bp as health_bp
from .brands import bp as brands_bp
from .projects import bp as projects_bp
from .workflows import bp as workflows_bp
from .ideas import bp as ideas_bp
from .materials import bp as project_materials_bp

def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(ideas_bp)
    app.register_blueprint(brands_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(workflows_bp)
    app.register_blueprint(project_materials_bp)    