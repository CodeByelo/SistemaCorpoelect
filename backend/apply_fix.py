import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def run_sql_fix():
    # Use the connection string from environment
    url = os.getenv("SUPABASE_DB_URL") or "postgresql://postgres.vodjntmxirkkylawwgsm:HDHHenry19_10@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require"
    
    print(f"Connecting to: {url.split('@')[-1]} (PgBouncer mode)")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        with open('database/fix_rls_and_schema.sql', 'r') as f:
            lines = f.readlines()
        
        # Simple parser to split by semicolon, ignoring comments
        commands = []
        current_cmd = []
        in_do_block = False
        for line in lines:
            trimmed = line.strip()
            if not trimmed or trimmed.startswith('--'):
                continue
            
            if 'DO $$' in line:
                in_do_block = True
            
            current_cmd.append(line)
            
            if in_do_block:
                if 'END $$;' in line:
                    in_do_block = False
                    commands.append("".join(current_cmd))
                    current_cmd = []
            elif ';' in line:
                commands.append("".join(current_cmd))
                current_cmd = []

        print(f"Executing {len(commands)} SQL commands individually...")
        for i, cmd in enumerate(commands):
            try:
                print(f"Running command {i+1}...")
                await conn.execute(cmd)
                print(f"Command {i+1} SUCCESS.")
            except Exception as cmd_err:
                print(f"Command {i+1} FAILED: {cmd_err}")
                print(f"Failed command content:\n{cmd}")
                # Don't stop, try next
        
        print("SQL Fixes process completed.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_sql_fix())
