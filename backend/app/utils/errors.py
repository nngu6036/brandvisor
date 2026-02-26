from flask import Flask

def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(_):
        return {"error": "not found"}, 404

    @app.errorhandler(500)
    def server_error(_):
        return {"error": "internal server error"}, 500
