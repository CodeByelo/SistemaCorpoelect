from supabase import create_client, Client
from config.supabase_config import get_supabase_settings

settings = get_supabase_settings()

def get_supabase_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)

def get_supabase_admin_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
