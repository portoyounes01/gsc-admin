from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Global Smile Care Dashboard API"
    environment: str = "local"
    database_url: str = "postgresql+psycopg://gsc:gsc@localhost:5432/gsc_dashboard"
    secret_key: str = "change-me-before-server-beta"
    access_token_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    bootstrap_admin_email: str = "andres@globalsmilecare.be"
    bootstrap_admin_password: str = "0000"
    planning_retention_days: int = 365
    geocoding_outbound_enabled: bool = True
    routing_provider: str = "estimate"
    routing_outbound_enabled: bool = False
    routing_osrm_base_url: str = ""
    routing_google_api_key: str = ""
    routing_google_routing_preference: str = "TRAFFIC_AWARE"
    routing_google_traffic_model: str = "BEST_GUESS"
    routing_google_language_code: str = "nl-BE"
    routing_google_region_code: str = "BE"
    routing_departure_timezone: str = "Europe/Brussels"
    routing_timeout_seconds: float = 8.0
    routing_average_speed_kmh: float = 42.0
    routing_distance_detour_factor: float = 1.25
    routing_matrix_cache_seconds: int = 300
    routing_max_locations: int = 100

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
