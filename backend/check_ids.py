import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def check_ids():
    load_dotenv('backend/.env')
    url = os.getenv("SUPABASE_DB_URL")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        tables = ['logs_seguridad', 'documento_ocultos', 'documentos']
        print("--- DATABASE DETAILED AUDIT ---")
        for table in tables:
            print(f"\n[{table}] Columns:")
            rows = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
                table
            )
            if not rows:
                print("  (Table not found or no columns)")
            for r in rows:
                print(f"  - {r['column_name']}: {r['data_type']}")
        
        # Test a query on logs_seguridad
        print("\nTesting simple logs_seguridad query...")
        try:
            count = await conn.fetchval("SELECT count(*) FROM logs_seguridad")
            print(f"  Count: {count}")
        except Exception as e:
            print(f"  Query Failed: {e}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_ids())
