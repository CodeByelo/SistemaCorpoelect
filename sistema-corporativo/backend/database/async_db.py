import asyncpg
import asyncio
import logging
import os
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from middleware.context import get_current_tenant_id

logger = logging.getLogger("sistema_corporativo")
init_lock = asyncio.Lock()
pool: asyncpg.Pool = None

async def init_db_pool():
    global pool
    
    async with init_lock:
        if pool is not None:
            return

        db_url = os.getenv("SUPABASE_DB_URL")
        print(f"\n>>> DB_URL: {'EXISTS' if db_url else 'NONE'}")
        
        for attempt in range(5):
            try:
                if not db_url:
                    raise ValueError("SUPABASE_DB_URL no configurada")
                
                logger.info(f"Intento {attempt + 1}/5")
                
                pool = await asyncpg.create_pool(
                    dsn=db_url,
                    min_size=2,
                    max_size=20,
                    statement_cache_size=0,
                    max_inactive_connection_lifetime=60.0,
                    command_timeout=60.0,
                    ssl=False # Revertido para evitar error de certificado auto-firmado
                )
                logger.info("✅ CONEXIÓN EXITOSA - SISTEMA LISTO 🚀")
                return
            except Exception as e:
                logger.error(f"❌ Error: {e}")
                if attempt == 4:
                    raise
                await asyncio.sleep(1) # Reducido a 1s para fallar más rápido si es necesario

@asynccontextmanager
async def db_session():
    """Context manager para uso interno (ej: middlewares)"""
    if pool is None:
        await init_db_pool()
    
    async with pool.acquire() as conn:
        tenant_id = get_current_tenant_id()
        try:
            if tenant_id:
                await conn.execute("SELECT set_config('app.current_tenant_id', $1, true)", str(tenant_id))
            yield conn
        finally:
            try:
                await conn.execute("RESET app.current_tenant_id")
            except:
                pass

async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Generador para dependencias de FastAPI"""
    async with db_session() as conn:
        yield conn