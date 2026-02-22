from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID

class UsuarioBase(BaseModel):
    username: str
    nombre: str
    apellido: str
    email: EmailStr
    rol_id: Optional[int] = 3
    gerencia_nombre: Optional[str] = None
    gerencia_id: Optional[int] = None

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: UUID
    estado: bool
    tenant_id: Optional[UUID]

    class Config:
        from_attributes = True

class SwitchOrgRequest(BaseModel):
    organization_id: UUID