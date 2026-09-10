from __future__ import annotations

import secrets
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Global Smile Care Dashboard API"
    environment: Literal["local", "test", "production"] = "local"
    database_url: str = Field(default="sqlite:///../tmp/local_beta.db", repr=False)
    secret_key: str = Field(default="", repr=False)
    session_absolute_minutes: int = Field(default=480, ge=5, le=1440)
    session_idle_minutes: int = Field(default=30, ge=1, le=480)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = Field(default="", repr=False)
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True)

    @model_validator(mode="after")
    def security_configuration(self) -> "Settings":
        if self.session_idle_minutes > self.session_absolute_minutes:
            raise ValueError("SESSION_IDLE_MINUTES mag niet hoger zijn dan SESSION_ABSOLUTE_MINUTES.")
        origins = [urlsplit(origin) for origin in self.cors_origin_list]
        if not origins or any(not origin.netloc or origin.path or origin.query or origin.fragment
                              or origin.username or origin.password for origin in origins):
            raise ValueError("CORS_ORIGINS moet exacte origins zonder pad bevatten.")
        if self.environment == "production":
            if (len(self.secret_key) < 43 or len(set(self.secret_key)) < 16
                    or self.secret_key.lower().startswith(("change", "replace", "example", "default"))):
                raise ValueError("Productie vereist een lange willekeurige SECRET_KEY (minstens 32 random bytes).")
            if any(origin.scheme != "https" or origin.hostname in {"localhost", "127.0.0.1", "::1"}
                   or "*" in origin.netloc for origin in origins):
                raise ValueError("Productie vereist expliciete HTTPS CORS_ORIGINS.")
            database = urlsplit(self.database_url)
            if (database.scheme not in {"postgresql", "postgresql+psycopg"}
                    or not database.username or not database.password
                    or database.username in {"postgres", "root"}
                    or database.password in {database.username, "password", "changeme"}):
                raise ValueError("Productie vereist PostgreSQL met aparte, niet-standaard databasecredentials.")
            if self.bootstrap_admin_email or self.bootstrap_admin_password:
                raise ValueError("Automatische bootstrapaccounts zijn niet toegestaan in productie.")
        else:
            if any(origin.scheme != "http" or origin.hostname not in {"localhost", "127.0.0.1", "::1"}
                   for origin in origins):
                raise ValueError("Lokale configuratie staat alleen HTTP loopback-origins toe; gebruik production voor hosting.")
            if not self.secret_key:
                # Development only: restarting the process invalidates local sessions.
                self.secret_key = secrets.token_urlsafe(48)
        return self

    @property
    def cookie_secure(self) -> bool:
        return self.environment == "production"

    @property
    def session_cookie_name(self) -> str:
        return "__Host-gsc_session" if self.cookie_secure else "gsc_session_local"

    @property
    def csrf_cookie_name(self) -> str:
        return "__Host-gsc_csrf" if self.cookie_secure else "gsc_csrf_local"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
