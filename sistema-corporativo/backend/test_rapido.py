import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    try:
        url = os.getenv('SUPABASE_DB_URL')
        print(f"Conectando a: {url}")
        conn = await asyncio.wait_for(
            asyncpg.connect(url), 
            timeout=10
        )
        print('\n✅ CONEXION_EXITOSA\n')
        await conn.close()
    except Exception as e:
        print(f'\n❌ ERROR: {type(e).__name__}')
        print(f'Detalle: {e}\n')

asyncio.run(test())