import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

async def run_init():
    # Load env from .env
    load_dotenv('.env')
    
    from database.async_db import init_db_pool, pool
    import main
    import asyncpg
    
    print("Initializing pool...")
    await init_db_pool()
    
    from database import async_db
    if async_db.pool:
        print("Pool initialized successfully.")
        
        # We need to mock the app objects if we want to run main.startup
        # but main.startup uses app.state.db_pool which might not be set.
        # Let's just run the DDL manually to be safe and clear.
        
        async with async_db.pool.acquire() as conn:
            print("Creating/Checking documento_ocultos...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS documento_ocultos (
                    id SERIAL PRIMARY KEY,
                    documento_id UUID NOT NULL,
                    user_id UUID NOT NULL,
                    bandeja TEXT NOT NULL CHECK (bandeja IN ('inbox', 'sent')),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(documento_id, user_id, bandeja)
                )
            """)
            
            # Check logs_seguridad columns
            print("Checking logs_seguridad columns...")
            cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'logs_seguridad'")
            colnames = [c['column_name'] for c in cols]
            print(f"Columns: {colnames}")
            
            if 'fecha_evento' in colnames and 'fecha_registro' not in colnames:
                print("Renaming fecha_evento to fecha_registro...")
                await conn.execute("ALTER TABLE logs_seguridad RENAME COLUMN fecha_evento TO fecha_registro")
            
            print("Database check complete.")
    else:
        print("Pool initialization failed.")

if __name__ == "__main__":
    asyncio.run(run_init())
