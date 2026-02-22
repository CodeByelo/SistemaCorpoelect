import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import uuid

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

async def final_verify():
    load_dotenv('backend/.env')
    from database.async_db import init_db_pool
    print("Initializing pool...")
    await init_db_pool()
    
    from database import async_db
    if not async_db.pool:
        print("FAIL: Pool not initialized.")
        return

    async with async_db.pool.acquire() as conn:
        print("\n--- FINAL VERIFICATION REPORT ---")
        
        # 1. Check logs_seguridad query
        print("Checking /logs-seguridad query...")
        try:
            # Test full query used in main.py
            query = "SELECT l.id, l.fecha_registro FROM logs_seguridad l LIMIT 1"
            row = await conn.fetchrow(query)
            print(f"  SUCCESS: logs_seguridad query works. (Sample ID: {row['id'] if row else 'No logs yet'})")
        except Exception as e:
            print(f"  FAIL: logs_seguridad query failed: {e}")

        # 2. Check documento_ocultos
        print("Checking /documentos/mis-ocultos components...")
        try:
            tbl_exists = await conn.fetchval("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documento_ocultos')")
            if tbl_exists:
                cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documento_ocultos'")
                col_info = {c['column_name']: c['data_type'] for c in cols}
                print(f"  SUCCESS: documento_ocultos exists. Types: doc_id={col_info.get('documento_id')}")
            else:
                print("  FAIL: documento_ocultos table NOT FOUND.")
        except Exception as e:
            print(f"  FAIL: Error checking documento_ocultos: {e}")

        print("\nVerification Complete.")

if __name__ == "__main__":
    asyncio.run(final_verify())
