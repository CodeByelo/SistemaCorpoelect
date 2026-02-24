from fastapi import APIRouter, Depends, HTTPException
from database.async_db import get_db_connection
from typing import List

router = APIRouter(prefix="/gerencias", tags=["gerencias"])

@router.get("")
async def list_gerencias(conn = Depends(get_db_connection)):
    try:
        rows = await conn.fetch("SELECT id, nombre, siglas, categoria FROM gerencias ORDER BY nombre")
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener gerencias: {str(e)}")
