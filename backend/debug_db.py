import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_db():
    url = os.getenv("SUPABASE_DB_URL")
    print(f"Connecting to DB...")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        for table in ['documentos', 'tickets', 'profiles']:
            print(f"\n--- Checking table: {table} ---")
            columns = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", table)
            if columns:
                for c in columns:
                    if c['column_name'] in ['id', 'titulo', 'title', 'leido', 'correlativo', 'permisos']:
                        print(f" - {c['column_name']}: {c['data_type']}")
            else:
                print(f"❌ Table '{table}' not found in information_schema.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(debug_db())
