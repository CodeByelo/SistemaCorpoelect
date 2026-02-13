from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

# --- Roles ---
class Rol(BaseModel):
    id: int
    nombre_rol: str

# --- Gerencias ---
class Gerencia(BaseModel):
    id: int
    nombre: str
    categoria: Optional[str] = None
    siglas: Optional[str] = None

# --- Usuarios ---
class UsuarioBase(BaseModel):
    username: str
    nombre: str
    apellido: str
    email: EmailStr
    gerencia_id: Optional[int] = None
    rol_id: Optional[int] = None
    rol_id: Optional[int] = None
    estado: bool = True

class UsuarioCreate(UsuarioBase):
    password: str
    gerencia_nombre: Optional[str] = None

class UsuarioResponse(UsuarioBase):
    id: UUID
    ultimo_login: Optional[datetime] = Field(None, alias="ultima_conexion")
    rol_nombre: Optional[str] = None
    gerencia_nombre: Optional[str] = None

# --- Logs Seguridad ---
class LogSeguridadCreate(BaseModel):
    usuario_id: UUID
    evento: str
    nivel: str
    ip_origen: str

# --- Documentos ---
class DocumentoBase(BaseModel):
    titulo: str
    correlativo: Optional[str] = None
    tipo_documento: Optional[str] = None
    prioridad: Optional[str] = "media"
    receptor_id: Optional[UUID] = None
    receptor_gerencia_id: Optional[int] = None
    url_archivo: Optional[str] = None

class DocumentoCreate(DocumentoBase):
    pass

class DocumentoUpdateEstado(BaseModel):
    estado: str

class DocumentoResponse(DocumentoBase):
    id: int
    estado: str
    remitente_id: UUID
    fecha_creacion: datetime
    remitente_nombre: Optional[str] = None
    receptor_nombre: Optional[str] = None
    receptor_gerencia_nombre: Optional[str] = None

# --- Tickets ---
class Ticket(BaseModel):
    id: int
    titulo: str
    prioridad: str
    estado: str
    solicitante_id: UUID
    tecnico_id: Optional[UUID] = None
    fecha_creacion: datetime

# --- Configuración Sistema ---
class SistemaConfig(BaseModel):
    id: int
    institucion: str
    siglas_inst: str
    version: str
    banner_alerta: Optional[str] = None
    ultimo_mantenimiento: Optional[datetime] = None
