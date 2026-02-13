from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
import os
import shutil
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, datetime
from typing import Optional
from src.database import get_db_connection
from src.auth import (
    create_access_token, 
    decode_access_token, 
    verify_password,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from src.schemas import UsuarioResponse, LogSeguridadCreate, UsuarioCreate, DocumentoCreate, DocumentoResponse, DocumentoUpdateEstado

app = FastAPI(title="Sistema Corpoelec API")

# Configuración de CORS
origins = [
    "http://localhost:3000", # Frontend Next.js
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG REQ: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"DEBUG RES: {request.method} {request.url.path} -> {response.status_code}")
    return response

# Servido de archivos estáticos (uploads)
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/")
async def root():
    return {"message": "Bienvenido al Sistema Corpoelec Backend (Python)"}

@app.get("/db-check")
async def check_db():
    conn = get_db_connection()
    if conn:
        conn.close()
        return {"status": "success", "message": "Conexión operativa con PostgreSQL."}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error crítico: No se puede conectar a la base de datos."
        )

# Registro de Usuario
@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UsuarioCreate):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a BD")
    
    try:
        with conn.cursor() as cur:
            # 1. Verificar si el usuario ya existe
            cur.execute("SELECT id FROM usuarios WHERE username = %s OR email = %s", (user.username, user.email))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="El usuario o email ya existe")

            # 2. Buscar ID de Gerencia (si se proporcionó nombre)
            gerencia_id = None
            if user.gerencia_nombre:
                cur.execute("SELECT id FROM gerencias WHERE nombre = %s", (user.gerencia_nombre,))
                gerencia_row = cur.fetchone()
                if gerencia_row:
                    gerencia_id = gerencia_row["id"]
            
            # 3. Hashear password
            hashed_password = get_password_hash(user.password)

            # 4. Insertar nuevo usuario
            try:
                cur.execute(
                    """
                    INSERT INTO usuarios (username, nombre, apellido, email, password_hash, gerencia_id, rol_id, estado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user.username, user.nombre, user.apellido, user.email, hashed_password, gerencia_id, user.rol_id or 3, True)
                )
                row = cur.fetchone()
                new_user_id = row["id"]
                conn.commit()
                return {"message": "Usuario registrado exitosamente", "id": str(new_user_id)}
            except Exception as db_err:
                conn.rollback()
                raise HTTPException(status_code=500, detail=f"Error al insertar en DB: {str(db_err)}")
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        error_msg = f"Error DB: {str(e)}"
        print(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_msg
        )
    finally:
        if conn:
            conn.close()

# Login con registro de Log de Seguridad
@app.post("/token")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Error de conexión a BD")
    
    try:
        with conn.cursor() as cur:
            # 1. Buscar usuario con su rol y gerencia
            cur.execute(
                """
                SELECT u.id, u.username, u.nombre, u.apellido, u.email as email_corp, 
                       u.password_hash, u.estado, u.rol_id, u.gerencia_id,
                       g.nombre as gerencia_depto, r.nombre_rol as role
                FROM usuarios u
                LEFT JOIN gerencias g ON u.gerencia_id = g.id
                LEFT JOIN roles r ON u.rol_id = r.id
                WHERE u.username = %s
                """,
                (form_data.username,)
            )
            user = cur.fetchone()
            
            # 2. Validaciones
            if not user or not user["estado"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales inválidas o usuario inactivo",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            if not verify_password(form_data.password, user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Contraseña incorrecta",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # 3. Registrar Log de Seguridad (No bloqueante si falla)
            try:
                client_ip = request.client.host if request.client else "0.0.0.0"
                cur.execute(
                    """
                    INSERT INTO logs_seguridad (usuario_id, evento, nivel, ip_origen, fecha_evento)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user["id"], "Inicio de sesión exitoso", "INFO", client_ip, datetime.now())
                )
                conn.commit()
            except Exception as log_err:
                print(f"⚠️ Error al registrar log de seguridad: {log_err}")
                conn.rollback() # Limpiar la transacción fallida interna si es necesario
            
            # 4. Generar Token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={
                    "sub": user["username"], 
                    "rol_id": user["rol_id"], 
                    "id": str(user["id"]),
                    "gerencia_id": user["gerencia_id"]
                },
                expires_delta=access_token_expires
            )
            
            # 5. Preparar objeto de usuario para el frontend
            # Aseguramos que el rol sea uno de los esperados por el frontend ('CEO', 'Administrativo', 'Usuario', 'Desarrollador')
            raw_role = user["role"]
            frontend_role = "Usuario" # Default seguro

            if raw_role in ["CEO", "Administrativo", "Usuario", "Desarrollador"]:
                frontend_role = raw_role
            elif raw_role == "Administrador":
                frontend_role = "Administrativo"
            elif raw_role == "Admin":
                frontend_role = "CEO"
            elif raw_role == "User":
                frontend_role = "Usuario"
            elif raw_role == "Dev" or raw_role == "Developer":
                frontend_role = "Desarrollador"

            return {
                "access_token": access_token, 
                "token_type": "bearer",
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "nombre": user["nombre"],
                    "apellido": user["apellido"],
                    "email_corp": user["email_corp"],
                    "gerencia_depto": user["gerencia_depto"] or "Sin Gerencia",
                    "role": frontend_role,
                    "permissions": [] # Se inicializan en el frontend según el rol o se traen de BD si rp existe
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        error_msg = f"Error DB Login: {str(e)}"
        print(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=error_msg
        )
    finally:
        if conn:
            conn.close()

# Perfil de Usuario con datos RELACIONADOS (Join coherente)
@app.get("/users/me", response_model=UsuarioResponse)
async def read_users_me(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    username = payload.get("sub")
    conn = get_db_connection()
    if not conn:
         raise HTTPException(status_code=500, detail="Error BD")

    try:
        with conn.cursor() as cur:
            # Query coherente uniendo Tablas: Usuarios + Roles + Gerencias
            query = """
                SELECT 
                    u.id, u.username, u.nombre, u.apellido, u.email, u.estado, 
                    u.gerencia_id, u.rol_id, u.ultima_conexion,
                    r.nombre_rol as rol_nombre,
                    g.nombre as gerencia_nombre
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                LEFT JOIN gerencias g ON u.gerencia_id = g.id
                WHERE u.username = %s
            """
            cur.execute(query, (username,))
            user_data = cur.fetchone()
            
            if user_data is None:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            return user_data
    finally:
        conn.close()

@app.get("/users/all")
async def get_all_users(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.id, u.username, u.nombre, u.apellido, g.nombre as gerencia_nombre
                FROM usuarios u
                LEFT JOIN gerencias g ON u.gerencia_id = g.id
                WHERE u.estado = TRUE
            """)
            return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

@app.get("/gerencias")
async def get_gerencias(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre FROM gerencias ORDER BY nombre ASC")
            return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

# --- GESTIÓN DOCUMENTAL ---

@app.post("/documentos", status_code=status.HTTP_201_CREATED)
async def create_document(
    titulo: str = Form(...),
    correlativo: Optional[str] = Form(None),
    tipo_documento: Optional[str] = Form(None),
    prioridad: Optional[str] = Form("media"),
    receptor_id: Optional[UUID] = Form(None),
    receptor_gerencia_id: Optional[int] = Form(None),
    archivo: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user_id = payload.get("id")
    
    # Guardar archivo físicamente
    file_extension = os.path.splitext(archivo.filename)[1]
    file_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{titulo.replace(' ', '_')}{file_extension}"
    file_path = os.path.join("uploads", file_name)
    
    try:
        if not os.path.exists("uploads"):
            os.makedirs("uploads")
            
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)
        
        url_archivo = f"/uploads/{file_name}"

        conn = get_db_connection()
        with conn.cursor() as cur:
            # 1. Insertar el documento base (sin receptor_gerencia_id porque no existe la columna)
            cur.execute(
                """
                INSERT INTO documentos (titulo, correlativo, tipo_documento, estado, prioridad, remitente_id, receptor_id, url_archivo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (titulo, correlativo, tipo_documento, "pendiente", prioridad, user_id, receptor_id, url_archivo)
            )
            new_id = cur.fetchone()["id"]
            
            # 2. Si hay gerencia, insertar en la tabla sidecar
            if receptor_gerencia_id:
                cur.execute(
                    """
                    INSERT INTO documento_gerencia_receptor (documento_id, gerencia_id)
                    VALUES (%s, %s)
                    ON CONFLICT (documento_id) DO UPDATE SET gerencia_id = EXCLUDED.gerencia_id
                    """,
                    (new_id, receptor_gerencia_id)
                )

            conn.commit()
            return {"message": "Documento registrado", "id": new_id, "url": url_archivo}
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

@app.get("/documentos")
async def list_documents(token: str = Depends(oauth2_scheme)):
    print("DEBUG: list_documents hit")
    payload = decode_access_token(token)
    if not payload:
        print("DEBUG: Payload is None")
        raise HTTPException(status_code=401, detail="Token inválido")
    
    print(f"DEBUG: User payload: {payload}")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            print("DEBUG: Executing documents query with sidecar join")
            cur.execute("""
                SELECT 
                    d.id, d.titulo, d.correlativo, d.tipo_documento, d.estado, d.prioridad, 
                    d.remitente_id, d.receptor_id, d.url_archivo, d.fecha_creacion,
                    u1.nombre || ' ' || u1.apellido as remitente_nombre,
                    u2.nombre || ' ' || u2.apellido as receptor_nombre,
                    dgr.gerencia_id as receptor_gerencia_id,
                    g.nombre as receptor_gerencia_nombre
                FROM documentos d
                LEFT JOIN usuarios u1 ON d.remitente_id = u1.id
                LEFT JOIN usuarios u2 ON d.receptor_id = u2.id
                LEFT JOIN documento_gerencia_receptor dgr ON d.id = dgr.documento_id
                LEFT JOIN gerencias g ON dgr.gerencia_id = g.id
                ORDER BY d.fecha_creacion DESC
            """)
            results = cur.fetchall()
            print(f"DEBUG: Found {len(results)} documents")
            return results
    except Exception as e:
        print(f"DEBUG ERROR in list_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()

@app.put("/documentos/{doc_id}/estado")
async def update_document_status(doc_id: int, status_update: DocumentoUpdateEstado, token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE documentos SET estado = %s WHERE id = %s",
                (status_update.estado, doc_id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Documento no encontrado")
            conn.commit()
            return {"message": "Estado actualizado"}
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn: conn.close()
