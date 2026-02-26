import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    secret_key: str
    mongo_uri: str
    cors_origins: list[str]
    public_base_url: str
    creative_token: str
    creative_uri: str

    @staticmethod
    def from_env() -> "Settings":
        creative_token = os.getenv("CREATIVE_API_TOKEN")
        creative_uri = os.getenv("CREATIVE_API_URL")
        secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/brandvisor")
        public_base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:5000")
        cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        cors_origins = [x.strip() for x in cors_raw.split(",") if x.strip()]
        return Settings(secret_key=secret_key, mongo_uri=mongo_uri, cors_origins=cors_origins, public_base_url=public_base_url, creative_token=creative_token, creative_uri=creative_uri)

    def to_flask_config(self) -> dict:
        return {
            "SECRET_KEY": self.secret_key,
            "MONGO_URI": self.mongo_uri,
            "PUBLIC_BASE_URL": self.public_base_url,
            "CREATIVE_API_TOKEN": self.creative_token,
            "CREATIVE_API_URL": self.creative_uri,
        }
