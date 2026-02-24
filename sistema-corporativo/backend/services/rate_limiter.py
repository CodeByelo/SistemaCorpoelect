from redis.asyncio import Redis
from fastapi import Request, HTTPException
import time
from middleware.context import get_current_tenant_id
import os

# Configuración Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = Redis.from_url(REDIS_URL)

async def rate_limiter_middleware(request: Request):
    """
    Middleware de Rate Limiting que limita por tenant_id.
    Standard: 100 requests por segundo por empresa.
    """
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        return # Si no hay tenant_id (public endpoints), no limitamos aquí o limitamos por IP
    
    key = f"rate_limit:{tenant_id}"
    limit = 100 # Req/seg
    window = 1 # segundo
    
    current_time = int(time.time())
    
    # Pipeline para asegurar atomicidad
    async with redis_client.pipeline(transaction=True) as pipe:
        try:
            await pipe.incr(key)
            await pipe.expire(key, window)
            results = await pipe.execute()
            count = results[0]
            
            if count > limit:
                raise HTTPException(
                    status_code=429, 
                    detail="Demasiadas solicitudes. Límite excedido para su organización."
                )
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            # Log error pero permitir request si Redis falla (fail-open)
            print(f"Redis Rate Limiter Error: {e}")
