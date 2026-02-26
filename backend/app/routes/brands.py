from flask import Blueprint
from ..repositories.brands_repo import BrandsRepo

bp = Blueprint("brands", __name__, url_prefix="/api")

@bp.get("/brands")
def list_brands():
    repo = BrandsRepo()
    brands = repo.list_brands()
    return {"brands": [b.model_dump() for b in brands]}

@bp.get("/brands/<brand_id>")
def get_brand(brand_id: str):
    repo = BrandsRepo()
    brand = repo.get_by_id(brand_id)
    if not brand:
        return {"error": "brand not found"}, 404
    return {"brand": brand.model_dump()}
