import asyncpg
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

async def check_schema():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    db_url = os.getenv("SUPABASE_DB_URL")
    
    conn = await asyncpg.connect(db_url)
    try:
        print("📊 Columnas en tabla 'documentos':")
        columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'documentos'
        """)
        for col in columns:
            print(f"- {col['column_name']} ({col['data_type']})")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_schema())
