import psycopg2
from psycopg2.extras import RealDictCursor
from config.supabase_config import get_supabase_settings

settings = get_supabase_settings()

def get_db_connection():
    try:
        conn = psycopg2.connect(
            settings.supabase_db_url,
            cursor_factory=RealDictCursor,
            sslmode='require',
            connect_timeout=5
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Error de conexión a la base de datos: {e}")
        return None
