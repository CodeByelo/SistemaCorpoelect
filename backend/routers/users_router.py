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
        permisos = data.get("permisos")  # Esperamos una lista de strings
        
        updates = []
        params = []
        idx = 1
        
        if rol_id is not None:
            updates.append(f"rol_id = ${idx}")
            params.append(rol_id)
            idx += 1
            
        if permisos is not None:
            updates.append(f"permisos = ${idx}")
            params.append(permisos)
            idx += 1
            
        if not updates:
            raise HTTPException(status_code=400, detail="Nada que actualizar")
            
        params.append(user_id)
        query = f"UPDATE profiles SET {', '.join(updates)} WHERE id = ${idx}"
        
        await conn.execute(query, *params)
        return {"message": "Usuario actualizado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
