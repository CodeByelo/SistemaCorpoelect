import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from pathlib import Path

# Cargar .env desde la raíz del backend
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

async def test_supabase_connection():
    print("Starting Supabase Connection Test...")
    
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("Error: SUPABASE_DB_URL not found in .env")
        return

    print(f"Connecting to: {db_url.split('@')[1]}...")
    user_part = db_url.split('@')[0].split('//')[1]
    user, password = user_part.split(':', 1)
    print(f"User: {user}")
    print(f"Password length: {len(password)}")
    print(f"Password starts with: {password[:3]} and ends with: {password[-2:]}")
    
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        print("CONNECTION SUCCESSFUL!")
        
        # Probar que las tablas existan
        print("Checking public schema...")
        rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [r['table_name'] for r in rows]
        print(f"   Tables found: {tables}")
        
        required = ['organizations', 'profiles', 'user_organizations', 'documentos']
        missing = [t for t in required if t not in tables]
        if missing:
            print(f"Missing critical tables: {missing}")
        else:
            print("All critical tables are present.")
            
        await conn.close()
        print("\nTest finished correctly.")
        
    except Exception as e:
        import traceback
        print(f"CONNECTION ERROR: {type(e).__name__}: {e}")
        print("\nStacktrace:")
        traceback.print_exc()
        print("\nSuggestions:")
        print("1. Verify your IP is allowed in Supabase.")
        print("2. Check that the password in .env is correct.")
        print("3. Ensure you have run the setup_database.sql script in the SQL editor.")

if __name__ == "__main__":
    asyncio.run(test_supabase_connection())
