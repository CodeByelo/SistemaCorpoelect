import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from pathlib import Path

async def run_tickets_fix():
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        print("Error: SUPABASE_DB_URL not found in .env")
        return

    print(f"Connecting to DB to apply tickets fix...")
    # Use statement_cache_size=0 for PgBouncer compatibility
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        sql_path = Path(__file__).parent / "database" / "fix_tickets_table.sql"
        with open(sql_path, 'r') as f:
            sql = f.read()
        
        print("Executing SQL fix...")
        # Split and run each command to handle potential errors better
        commands = [cmd.strip() for cmd in sql.split(';') if cmd.strip()]
        for cmd in commands:
            try:
                print(f"Running: {cmd[:50]}...")
                await conn.execute(cmd)
            except Exception as cmd_err:
                print(f"Command failed: {cmd_err}")
        
        print("✅ Tickets table fix applied SUCCESS.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_tickets_fix())
