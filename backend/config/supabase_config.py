import os
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache

class SupabaseSettings(BaseSettings):
    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_key: str = Field(alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(alias="SUPABASE_SERVICE_ROLE_KEY")

    # DB Fields
    supabase_db_host: str = Field(alias="SUPABASE_DB_HOST")
    supabase_db_port: int = Field(alias="SUPABASE_DB_PORT")
    supabase_db_name: str = Field(alias="SUPABASE_DB_NAME")
    supabase_db_user: str = Field(alias="SUPABASE_DB_USER")
    supabase_db_password: str = Field(alias="SUPABASE_DB_PASSWORD")

    @property
    def supabase_db_url(self) -> str:
        return f"postgresql://{self.supabase_db_user}:{self.supabase_db_password}@{self.supabase_db_host}:{self.supabase_db_port}/{self.supabase_db_name}"

    class Config:
        env_file = "backend/.env" if os.path.exists("backend/.env") else ".env"
        extra = "ignore"

@lru_cache()
def get_supabase_settings():
    return SupabaseSettings()
