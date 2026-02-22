import os
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
from dotenv import load_dotenv
from pathlib import Path

# Cargar .env explícitamente desde la carpeta backend
env_path = Path(__file__).parent / ".env"
print(f"\n🔍 Buscando .env en: {env_path}")
print(f"📁 Existe: {env_path.exists()}\n")

load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Depends, HTTPException, status, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import jwt
from passlib.context import CryptContext
import traceback

# Asegurar que el directorio backend esté en el PYTHONPATH
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# AHORA sí importar módulos que dependen de variables de entorno
from database.async_db import get_db_connection, init_db_pool
from database import async_db
from middleware.tenant import get_tenant_context, trace_id_var
from services.rate_limiter import rate_limiter_middleware
from src import schemas
from routers import auth_router, users_router, gerencias_router, tickets_router

import json

# ===================================================================
# CONFIGURACIÓN DE LOGGING ESTRUCTURADO JSON ENTERPRISE
# ===================================================================
from middleware.context import (
    get_current_tenant_id, 
    get_current_user_id, 
    get_current_trace_id, 
)
import time
import uuid

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "tenant_id": get_current_tenant_id(),
            "user_id": get_current_user_id(),
            "trace_id": get_current_trace_id(),
        }
        if hasattr(record, 'duration_ms'):
            log_entry["duration_ms"] = record.duration_ms
            
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

logger = logging.getLogger("sistema_corporativo")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

app = FastAPI(
    title="Sistema Corporativo API - MultiTenant Edition",
    description="API Enterprise con aislamiento RLS y escalado multi-tenant",
    version="2.0.0"
)

# Middleware de Observabilidad (Trace ID y Duración)
@app.middleware("http")
async def add_observability_context(request: Request, call_next):
    start_time = time.time()
    trace_id = str(uuid.uuid4())
    token = trace_id_var.set(trace_id)
    
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)
        
        logger.info(
            f"HTTP {request.method} {request.url.path} - {response.status_code}",
            extra={"duration_ms": duration_ms}
        )
        return response
    finally:
        trace_id_var.reset(token)

# ===================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ===================================================================
from auth.security import verify_password, get_password_hash, create_access_token

# ===================================================================
# MIDDLEWARES
# ===================================================================
# Configurar CORS para permitir localhost:3000 y otros orígenes comunes
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos para adjuntos
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# INCLUSIÓN DE ROUTERS
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(gerencias_router.router)
app.include_router(tickets_router.router)

async def get_current_user_id_from_request(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    token = auth_header.split(" ")[1]
    secret = os.getenv("JWT_SECRET", "tu_clave_secreta_muy_segura_cambiala_en_produccion")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Usuario no identificado")
        return uuid.UUID(str(sub))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")

@app.on_event("startup")
async def startup():
    try:
        await init_db_pool()
        logger.info("Database Connection Pool Initialized")
        try:
            async with async_db.pool.acquire() as conn:
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
        except Exception as tbl_err:
            logger.warning(f"Tabla documento_ocultos no creada (puede existir ya): {tbl_err}")
    except Exception as e:
        logger.error(f"⚠️ Error inicializando la base de datos: {e}")
        logger.warning("El servidor ha iniciado en modo degradado (sin base de datos).")

# ===================================================================
# UTILIDADES
# ===================================================================
# Security utilities imported from auth.security

# ===================================================================
# GLOBAL EXCEPTION HANDLER
# ===================================================================
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_trace = traceback.format_exc()
    # Print explícito para asegurar que se ve en la terminal
    print(f"\n❌ CRITICAL GLOBAL ERROR: {str(exc)}\n{error_trace}\n")
    logger.error(f"GLOBAL ERROR: {str(exc)}\n{error_trace}")
    
    response_content = {
        "detail": "Internal Server Error",
        "message": str(exc),
        "type": type(exc).__name__
    }
    
    # En desarrollo, enviamos el trace al frontend para diagnóstico rápido
    if os.getenv("DEBUG", "true").lower() == "true":
        response_content["trace"] = error_trace

    response = JSONResponse(
        status_code=500,
        content=response_content
    )
    
    # Inyectar CORS manualmente para evitar bloqueos de navegador en errores 500
    origin = request.headers.get("origin")
    if origin in origins or "*" in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
    return response

# ===================================================================
# ENDPOINTS
# ===================================================================

@app.get("/db-check")
@app.get("/health")
async def health_check(conn = Depends(get_db_connection)):
    try:
        await conn.execute("SELECT 1")
        return {"status": "ok", "message": "Conectado al Backend y Base de Datos (Enterprise Mode)", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e), "database": "error"}

@app.post("/register", response_model=schemas.UsuarioResponse)
async def register_user(
    user: schemas.UsuarioCreate, 
    conn = Depends(get_db_connection)
):
    try:
        existing = await conn.fetchrow(
            "SELECT id FROM profiles WHERE username = $1 OR email = $2", 
            user.username, user.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Usuario o Email ya registrado")

        # Mapear gerencia si viene por nombre
        g_id = user.gerencia_id
        if not g_id and user.gerencia_nombre:
            g_id = await conn.fetchval("SELECT id FROM gerencias WHERE nombre = $1", user.gerencia_nombre)
            if not g_id:
                # Si no existe, crearla dinámicamente
                g_id = await conn.fetchval(
                    "INSERT INTO gerencias (nombre) VALUES ($1) RETURNING id", 
                    user.gerencia_nombre
                )

        hashed_pw = get_password_hash(user.password)

        query = """
            INSERT INTO profiles (username, nombre, apellido, email, password_hash, rol_id, gerencia_id, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, username, nombre, apellido, email, rol_id, gerencia_id, estado, tenant_id
        """
        default_rol = 3
        row = await conn.fetchrow(
            query, 
            user.username, user.nombre, user.apellido, user.email, 
            hashed_pw, user.rol_id or default_rol, g_id, True
        )
        
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno durante el registro: {str(e)}")

@app.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn = Depends(get_db_connection)
):
    query = """
        SELECT p.id, p.username, p.password_hash, p.nombre, p.apellido, p.email, p.rol_id, r.nombre_rol, p.tenant_id,
               p.gerencia_id, g.nombre as gerencia_nombre
        FROM profiles p
        LEFT JOIN roles r ON p.rol_id = r.id
        LEFT JOIN gerencias g ON p.gerencia_id = g.id
        WHERE p.username = $1 AND p.estado = TRUE
    """
    user = await conn.fetchrow(query, form_data.username)

    if not user or not verify_password(form_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    access_token = create_access_token(
        data={
            "sub": str(user['id']), 
            "role": user['nombre_rol'],
            "tenant_id": str(user['tenant_id']) if user['tenant_id'] else None,
            "gerencia_id": user['gerencia_id']
        }
    )

    await conn.execute(
        "UPDATE profiles SET ultima_conexion = $1 WHERE id = $2", 
        datetime.now(), user['id']
    )

    # Registrar en Historial de Accesos
    await conn.execute("""
        INSERT INTO logs_seguridad (usuario_id, evento, nivel, ip_origen)
        VALUES ($1, $2, 'info', $3)
    """, user['id'], "Inicio de Sesión", request.client.host if request.client else "")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user['id']),
            "username": user['username'],
            "role": user['nombre_rol'],
            "tenant_id": user['tenant_id'],
            "gerencia_id": user['gerencia_id'],
            "gerencia_depto": user['gerencia_nombre']
        }
    }

# ===================================================================
# HEALTH CHECKS ENTERPRISE
# ===================================================================

@app.get("/health/live")
async def liveness():
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health/ready")
async def readiness(conn = Depends(get_db_connection)):
    try:
        await conn.execute("SELECT 1")
        return {
            "status": "ready",
            "components": {
                "database": "ok",
                "pool_size": pool.get_size() if pool else 0
            }
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service Not Ready")

# ===================================================================
# ENDPOINTS DE AUTENTICACIÓN Y TENANCY
# ===================================================================

@app.post("/api/auth/switch-organization")
async def switch_organization(
    org_id: schemas.SwitchOrgRequest,
    request: Request,
    conn = Depends(get_db_connection)
):
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    query = """
        SELECT EXISTS(
            SELECT 1 FROM user_organizations 
            WHERE user_id = $1 AND organization_id = $2
        )
    """
    exists = await conn.fetchval(query, user_id, org_id.organization_id)
    
    if not exists:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta organización")
    
    role_row = await conn.fetchrow(
        "SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2",
        user_id, org_id.organization_id
    )

    new_token = create_access_token(
        data={
            "sub": user_id,
            "tenant_id": str(org_id.organization_id),
            "role": role_row['role'] if role_row else 'member'
        }
    )
    
    logger.info(f"User switched to organization {org_id.organization_id}")
    
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "tenant_id": str(org_id.organization_id)
    }

@app.get("/documentos", dependencies=[Depends(get_tenant_context)])
async def list_documentos(conn = Depends(get_db_connection)):
    try:
        # 1. Ejecutar máquina de estados automática
        await conn.execute("""
            UPDATE documentos 
            SET estado = 'pendiente' 
            WHERE estado = 'en-proceso' 
            AND now() - fecha_ultima_actividad > INTERVAL '3 days'
        """)
        
        await conn.execute("""
            UPDATE documentos 
            SET estado = 'omitido' 
            WHERE estado = 'pendiente' 
            AND now() - fecha_ultima_actividad > INTERVAL '6 days'
        """)

        # 2. Query mejorada para sistema de correo con multi-adjuntos
        query = """
            SELECT 
                d.id, 
                COALESCE(d.titulo, d.title, 'Sin Asunto') as name, 
                d.correlativo as idDoc,
                d.tipo_documento as category,
                d.estado as signatureStatus,
                d.prioridad,
                d.remitente_id,
                COALESCE(p_rem.nombre || ' ' || p_rem.apellido, 'Desconocido') as uploadedBy,
                COALESCE(p_rem.nombre || ' ' || p_rem.apellido, 'Desconocido') as remitente_nombre,
                d.receptor_id,
                d.receptor_gerencia_id,
                COALESCE(p_rec.nombre || ' ' || p_rec.apellido, g.nombre, 'Sin Asignar') as receptor_nombre,
                COALESCE(g.nombre, 'Mensaje Personal') as targetDepartment,
                d.url_archivo as fileUrl,
                (SELECT array_agg(da.url_archivo) FROM documento_adjuntos da WHERE da.documento_id = d.id) as archivos,
                d.fecha_creacion,
                TO_CHAR(d.fecha_creacion, 'DD/MM/YYYY') as uploadDate,
                TO_CHAR(d.fecha_creacion, 'HH24:MI') as uploadTime,
                d.fecha_caducidad,
                d.tenant_id,
                d.contenido,
                d.leido
            FROM documentos d
            LEFT JOIN profiles p_rem ON d.remitente_id = p_rem.id
            LEFT JOIN profiles p_rec ON d.receptor_id = p_rec.id
            LEFT JOIN gerencias g ON d.receptor_gerencia_id = g.id
            ORDER BY d.fecha_creacion DESC
        """
        rows = await conn.fetch(query)
        # Convertir record a dict y manejar el campo archivos
        result = []
        for r in rows:
            d = dict(r)
            # Asegurar que archivos no sea None
            if d.get("archivos") is None:
                d["archivos"] = [d["fileUrl"]] if d.get("fileUrl") else []
            result.append(d)
        return result
    except Exception as e:
        logger.error(f"Error listando correos/documentos: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File as FastAPIFile, Form
import shutil

@app.post("/documentos", dependencies=[Depends(get_tenant_context)])
async def create_documento(
    request: Request,
    titulo: str = Form(...),
    correlativo_user: Optional[str] = Form(None, alias="correlativo"),
    tipo_documento: str = Form(...),
    prioridad: str = Form("media"),
    receptor_gerencia_id: Optional[int] = Form(None),
    receptor_id: Optional[uuid.UUID] = Form(None),
    contenido: Optional[str] = Form(None),
    archivos: List[UploadFile] = FastAPIFile(None),
    conn = Depends(get_db_connection)
):
    try:
        # ========== 1. EXTRAER Y VALIDAR TOKEN ==========
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Token no proporcionado")
        
        token = auth_header.split(" ")[1]
        secret_key = os.getenv("JWT_SECRET", "tu_clave_secreta_muy_segura_cambiala_en_produccion")
        
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")
        
        user_id_raw = payload.get("sub")
        tenant_id_raw = payload.get("tenant_id")
        
        if not user_id_raw or user_id_raw == "None":
            raise HTTPException(status_code=401, detail="Usuario no identificado")
        
        user_id = uuid.UUID(str(user_id_raw))
        
        # ========== 2. OBTENER TENANT_ID ==========
        tenant_id = None
        if tenant_id_raw and tenant_id_raw != "None":
            try:
                tenant_id = uuid.UUID(str(tenant_id_raw))
            except:
                pass
        
        if not tenant_id:
            tenant_id_raw = await conn.fetchval("SELECT tenant_id FROM profiles WHERE id = $1", user_id)
            tenant_id = uuid.UUID(str(tenant_id_raw)) if tenant_id_raw else uuid.UUID("00000000-0000-0000-0000-000000000001")
        
        # ========== 3. CORRELATIVO: (Siglas gerencia) (ID editable) (Año) ==========
        try:
            user_info = await conn.fetchrow("""
                SELECT g.siglas FROM profiles p 
                LEFT JOIN gerencias g ON p.gerencia_id = g.id 
                WHERE p.id = $1
            """, user_id)
            siglas = (user_info['siglas'] or 'COR').strip() if user_info else 'COR'
        except Exception:
            siglas = 'COR'
        year = datetime.now().year

        if correlativo_user and str(correlativo_user).strip():
            # Usuario puede editar: aceptar formato "SIGLAS NUM AÑO" o similar
            correlativo_final = str(correlativo_user).strip()
            if len(correlativo_final) < 3:
                correlativo_final = f"{siglas} 001 {year}"
        else:
            count = await conn.fetchval("""
                SELECT COUNT(*) FROM documentos 
                WHERE correlativo LIKE $1 || '%' AND tenant_id = $2 AND EXTRACT(YEAR FROM fecha_creacion) = $3
            """, siglas, tenant_id, year)
            correlativo_final = f"{siglas} {str((count or 0) + 1).zfill(3)} {year}"
        
        # ========== 4. PROCESAR MÚLTIPLES ARCHIVOS ==========
        file_urls = []
        if archivos:
            folder = Path("uploads")
            folder.mkdir(exist_ok=True)
            for archivo in archivos:
                if archivo and archivo.filename:
                    ext = Path(archivo.filename).suffix
                    file_id = f"{uuid.uuid4()}{ext}"
                    filepath = folder / file_id
                    with filepath.open("wb") as buffer:
                        shutil.copyfileobj(archivo.file, buffer)
                    file_urls.append(f"/uploads/{file_id}")

        # Guardamos la primera URL en la tabla principal para compatibilidad legacy
        primary_file_url = file_urls[0] if file_urls else None

        # ========== 5. INSERTAR EN BD ==========
        fecha_creacion = datetime.now()
        fecha_caducidad = fecha_creacion + timedelta(days=6)

        doc_id = await conn.fetchval("""
            INSERT INTO documentos (
                titulo, title, correlativo, tipo_documento, estado, prioridad,
                remitente_id, receptor_id, receptor_gerencia_id, url_archivo,
                contenido, leido, fecha_creacion, fecha_caducidad, 
                fecha_ultima_actividad, tenant_id, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        """, 
            titulo, titulo, correlativo_final, tipo_documento, 'en-proceso', prioridad,
            user_id, receptor_id, receptor_gerencia_id, primary_file_url,
            contenido, False, fecha_creacion, fecha_caducidad, fecha_creacion, tenant_id, user_id
        )

        # ========== 6. INSERTAR ADJUNTOS EN TABLA RELACIONADA ==========
        for url in file_urls:
            await conn.execute("""
                INSERT INTO documento_adjuntos (documento_id, url_archivo)
                VALUES ($1, $2)
            """, doc_id, url)
        
        return {"id": doc_id, "correlativo": correlativo_final, "status": "success"}

    except Exception as e:
        logger.error(f"Error enviando mensaje: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/documentos/{id}/leido")
async def mark_as_read(id: str, conn = Depends(get_db_connection)):
    try:
        # Convert to UUID if it looks like one, otherwise int
        try:
            doc_id = uuid.UUID(id)
        except:
            doc_id = int(id)
            
        await conn.execute("UPDATE documentos SET leido = TRUE WHERE id = $1", doc_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/documentos/{id}/estado")
async def update_doc_status(
    id: str,
    status_data: dict,
    conn = Depends(get_db_connection)
):
    try:
        try:
            doc_id = uuid.UUID(id)
        except:
            doc_id = int(id)
            
        nuevo_estado = status_data.get("estado")
        await conn.execute("""
            UPDATE documentos 
            SET estado = $1, fecha_ultima_actividad = NOW() 
            WHERE id = $2
        """, nuevo_estado, doc_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documentos/{id}")
async def delete_documento(id: str, conn = Depends(get_db_connection)):
    try:
        try:
            doc_id = uuid.UUID(id)
        except:
            doc_id = int(id)
            
        await conn.execute("DELETE FROM documento_adjuntos WHERE documento_id = $1", doc_id)
        await conn.execute("DELETE FROM documento_ocultos WHERE documento_id = $1", doc_id)
        await conn.execute("DELETE FROM documentos WHERE id = $1", doc_id)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error eliminando documento {id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documentos/{id}/ocultar")
async def ocultar_documento_de_bandeja(
    id: str,
    request: Request,
    conn = Depends(get_db_connection),
    user_id: uuid.UUID = Depends(get_current_user_id_from_request),
):
    try:
        try:
            doc_id = uuid.UUID(id)
        except:
            doc_id = int(id)
            
        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        bandeja = body.get("bandeja") if isinstance(body, dict) else None
        if not bandeja or bandeja not in ("inbox", "sent"):
            raise HTTPException(status_code=400, detail="bandeja debe ser 'inbox' o 'sent'")
        await conn.execute(
            """INSERT INTO documento_ocultos (documento_id, user_id, bandeja) VALUES ($1, $2, $3)
               ON CONFLICT (documento_id, user_id, bandeja) DO NOTHING""",
            doc_id, user_id, bandeja
        )
        await conn.execute("""
            INSERT INTO logs_seguridad (usuario_id, evento, nivel, ip_origen)
            VALUES ($1, $2, 'info', $3)
        """, user_id, f"Documento {id} ocultado de bandeja {bandeja}", request.client.host if request.client else "")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ocultando documento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documentos/mis-ocultos")
async def listar_mis_ocultos(
    request: Request,
    conn = Depends(get_db_connection),
    user_id: uuid.UUID = Depends(get_current_user_id_from_request),
):
    try:
        rows = await conn.fetch(
            "SELECT documento_id, bandeja FROM documento_ocultos WHERE user_id = $1",
            user_id
        )
        inbox = [r["documento_id"] for r in rows if r["bandeja"] == "inbox"]
        sent = [r["documento_id"] for r in rows if r["bandeja"] == "sent"]
        return {"inbox": inbox, "sent": sent}
    except Exception as e:
        logger.error(f"Error listando ocultos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gerencias")
async def list_gerencias(conn = Depends(get_db_connection)):
    rows = await conn.fetch("SELECT id, nombre, siglas, categoria FROM gerencias ORDER BY categoria, nombre")
    return [dict(r) for r in rows]

@app.post("/gerencias")
async def create_gerencia(data: dict, conn = Depends(get_db_connection)):
    try:
        nombre = data.get("nombre") or data.get("nombre_gerencia")
        if not nombre:
            raise HTTPException(status_code=400, detail="nombre es requerido")
        siglas = data.get("siglas", "")[:10] if data.get("siglas") else ""
        categoria = data.get("categoria", "General")
        row = await conn.fetchrow(
            "INSERT INTO gerencias (nombre, siglas, categoria) VALUES ($1, $2, $3) RETURNING id, nombre, siglas, categoria",
            nombre, siglas or nombre[:3].upper(), categoria
        )
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando gerencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/gerencias/{id}")
async def update_gerencia(id: int, data: dict, conn = Depends(get_db_connection)):
    try:
        updates = []
        params = []
        i = 1
        if "nombre" in data and data["nombre"]:
            updates.append(f"nombre = ${i}")
            params.append(data["nombre"])
            i += 1
        if "siglas" in data:
            updates.append(f"siglas = ${i}")
            params.append(data.get("siglas") or "")
            i += 1
        if "categoria" in data:
            updates.append(f"categoria = ${i}")
            params.append(data["categoria"])
            i += 1
        if not updates:
            raise HTTPException(status_code=400, detail="Nada que actualizar")
        params.append(id)
        q = "UPDATE gerencias SET " + ", ".join(updates) + f" WHERE id = ${i}"
        await conn.execute(q, *params)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando gerencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/gerencias/{id}")
async def delete_gerencia(id: int, conn = Depends(get_db_connection)):
    try:
        await conn.execute("DELETE FROM gerencias WHERE id = $1", id)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error eliminando gerencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/usuarios")
async def list_usuarios(conn = Depends(get_db_connection)):
    rows = await conn.fetch("""
        SELECT p.id, p.username, p.nombre, p.apellido, p.email, p.gerencia_id, p.rol_id, p.estado, p.permisos,
               COALESCE(g.nombre, '') as gerencia_depto,
               COALESCE(r.nombre_rol, 'Usuario') as role
        FROM profiles p
        LEFT JOIN gerencias g ON p.gerencia_id = g.id
        LEFT JOIN roles r ON p.rol_id = r.id
        ORDER BY p.nombre, p.apellido
    """)
    result = []
    for r in rows:
        d = dict(r)
        d["usuario_corp"] = d.get("username") or ""
        result.append(d)
    return result

@app.get("/users/{user_id}")
async def get_user_by_id(user_id: str, conn = Depends(get_db_connection)):
    try:
        from uuid import UUID
        uid = UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    row = await conn.fetchrow("""
        SELECT p.id, p.username, p.nombre, p.apellido, p.email, p.gerencia_id, p.rol_id, p.estado, p.permisos,
               COALESCE(g.nombre, '') as gerencia_depto,
               COALESCE(r.nombre_rol, 'Usuario') as role
        FROM profiles p
        LEFT JOIN gerencias g ON p.gerencia_id = g.id
        LEFT JOIN roles r ON p.rol_id = r.id
        WHERE p.id = $1
    """, uid)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    d = dict(row)
    d["usuario_corp"] = d.get("username") or ""
    return d

@app.get("/logs-seguridad")
async def list_logs_seguridad(user_id: Optional[str] = None, conn = Depends(get_db_connection)):
    try:
        if user_id:
            query = """
                SELECT l.id, p.username, l.evento, l.evento as detalles,
                       CASE WHEN l.nivel = 'error' THEN 'danger' WHEN l.nivel = 'warn' THEN 'warning' ELSE 'success' END as estado,
                       COALESCE(l.ip_origen, '') as ip_address, l.fecha_registro as fecha_hora
                FROM logs_seguridad l
                JOIN profiles p ON p.id = l.usuario_id
                WHERE l.usuario_id = $1
                ORDER BY l.fecha_registro DESC
            """
            rows = await conn.fetch(query, uuid.UUID(user_id))
        else:
            query = """
                SELECT l.id, p.username, l.evento, l.evento as detalles,
                       CASE WHEN l.nivel = 'error' THEN 'danger' WHEN l.nivel = 'warn' THEN 'warning' ELSE 'success' END as estado,
                       COALESCE(l.ip_origen, '') as ip_address, l.fecha_registro as fecha_hora
                FROM logs_seguridad l
                JOIN profiles p ON p.id = l.usuario_id
                ORDER BY l.fecha_registro DESC
                LIMIT 500
            """
            rows = await conn.fetch(query)
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error listando logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/logs-seguridad")
async def create_log_seguridad(data: dict, request: Request, conn = Depends(get_db_connection)):
    try:
        user_id = data.get("user_id") or data.get("usuario_id")
        evento = data.get("evento", "evento")
        nivel = data.get("nivel", "info")
        ip_origen = data.get("ip_origen") or (request.client.host if request.client else "")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id es requerido")
        await conn.execute("""
            INSERT INTO logs_seguridad (usuario_id, evento, nivel, ip_origen)
            VALUES ($1, $2, $3, $4)
        """, uuid.UUID(str(user_id)), evento, nivel, ip_origen)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/announcement")
async def get_announcement(conn = Depends(get_db_connection)):
    try:
        row = await conn.fetchrow("SELECT banner_alerta FROM sistema_config WHERE id = 1")
        if not row or not row.get("banner_alerta"):
            return None
        import json
        return json.loads(row["banner_alerta"])
    except Exception:
        return None

@app.put("/announcement")
async def put_announcement(data: dict, conn = Depends(get_db_connection)):
    try:
        import json
        payload = json.dumps({
            "badge": data.get("badge", "Comunicado"),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "status": data.get("status", "Activo"),
            "urgency": data.get("urgency", "Media"),
        })
        await conn.execute("""
            INSERT INTO sistema_config (id, institucion, banner_alerta) VALUES (1, 'CORPOELEC', $1)
            ON CONFLICT (id) DO UPDATE SET banner_alerta = EXCLUDED.banner_alerta
        """, payload)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error guardando anuncio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)