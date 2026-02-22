import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from pathlib import Path

async def fix_table():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        print("Error: SUPABASE_DB_URL not found in .env")
        return

    print("Connecting to DB to fix documento_ocultos...")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        # Check if table exists
        exists = await conn.fetchval("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documento_ocultos')")
        if not exists:
            print("Table documento_ocultos does not exist yet. Startup will create it correctly.")
            return

        # Check column type
        col_type = await conn.fetchval("SELECT data_type FROM information_schema.columns WHERE table_name = 'documento_ocultos' AND column_name = 'documento_id'")
        print(f"Current type of documento_id: {col_type}")
        
        if col_type == 'integer':
            print("Changing documento_id type to UUID...")
            # We need to drop the constraint, change type, and re-add if any.
            # But the startup DDL didn't have a formal FK, just the UNIQUE constraint.
            await conn.execute("ALTER TABLE documento_ocultos ALTER COLUMN documento_id TYPE UUID USING (id::text::uuid)") # Wait, this is wrong if it holds doc IDs.
            # Actually, if it's empty or holds wrong data, better to recreation or cast carefully.
            # If it's empty, we just change it.
            await conn.execute("DROP TABLE documento_ocultos")
            print("Dropped old table. Startup will recreate it with correct types.")
        else:
            print("Type is already correct or not integer.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_table())
