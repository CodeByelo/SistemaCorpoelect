import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

async def check_data():
    db_url = os.getenv("SUPABASE_DB_URL")
    print(f"Connecting to DB...")
    try:
        conn = await asyncpg.connect(db_url, ssl='require')
        print("Connected.")
        
        tables = ['organizations', 'profiles', 'documentos', 'gerencias', 'usuarios']
        for table in tables:
            try:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                print(f"Table '{table}': {count} records found.")
            except Exception as e:
                print(f"Table '{table}' error or missing: {e}")
        
        await conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_data())
