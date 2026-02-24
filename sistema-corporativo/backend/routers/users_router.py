from fastapi import APIRouter, Depends, HTTPException
from database.async_db import get_db_connection
from src import schemas
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/all")
async def list_all_users(conn = Depends(get_db_connection)):
    try:
        query = """
            SELECT p.id, p.username, p.nombre, p.apellido, p.email, p.rol_id, r.nombre_rol as role, p.estado
            FROM profiles p
            LEFT JOIN roles r ON p.rol_id = r.id
            ORDER BY p.username
        """
        rows = await conn.fetch(query)
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener usuarios: {str(e)}")

@router.put("/{user_id}/role")
async def update_user_role(user_id: str, data: dict, conn = Depends(get_db_connection)):
    try:
        rol_id = data.get("rol_id")
        if not rol_id:
            raise HTTPException(status_code=400, detail="rol_id es requerido")
            
        await conn.execute(
            "UPDATE profiles SET rol_id = $1 WHERE id = $2",
            rol_id, user_id
        )
        return {"message": "Rol actualizado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
