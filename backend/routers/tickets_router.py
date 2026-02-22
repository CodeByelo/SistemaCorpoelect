from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from database.async_db import get_db_connection
from datetime import datetime
import uuid

router = APIRouter(prefix="/tickets", tags=["tickets"])

class TicketBase(BaseModel):
    title: str
    description: str
    area: str
    priority: str
    status: str = "ABIERTO"
    observations: Optional[str] = None

class TicketCreate(TicketBase):
    solicitante_id: str

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tecnico_id: Optional[str] = None
    observations: Optional[str] = None
    priority: Optional[str] = None

class TicketResponse(TicketBase):
    id: int
    solicitante_id: str
    tecnico_id: Optional[str] = None
    fecha_creacion: datetime
    solicitante_nombre: Optional[str] = None

@router.get("", response_model=List[TicketResponse])
async def get_tickets(conn = Depends(get_db_connection)):
    try:
        query = """
            SELECT t.id, t.titulo as title, t.prioridad as priority, t.estado as status,
                   t.solicitante_id, t.tecnico_id, t.fecha_creacion,
                   t.descripcion as description, t.area, t.observaciones as observations,
                   p.nombre || ' ' || p.apellido as solicitante_nombre
            FROM tickets t
            LEFT JOIN profiles p ON t.solicitante_id = p.id
            ORDER BY t.fecha_creacion DESC
        """
        rows = await conn.fetch(query)
        tickets = []
        for row in rows:
            d = dict(row)
            # Asegurar que los campos UUID sean strings para el modelo Pydantic
            d["solicitante_id"] = str(d["solicitante_id"]) if d["solicitante_id"] else None
            d["tecnico_id"] = str(d["tecnico_id"]) if d["tecnico_id"] else None
            tickets.append(d)
        return tickets
    except Exception as e:
        print(f"Error fetching tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate, conn = Depends(get_db_connection)):
    try:
        # Validar solicitante_id
        try:
            sid = uuid.UUID(ticket.solicitante_id)
        except:
            raise HTTPException(status_code=400, detail="ID de solicitante inválido")

        query = """
            INSERT INTO tickets (titulo, prioridad, estado, solicitante_id, area, descripcion, observaciones)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, fecha_creacion
        """
        row = await conn.fetchrow(
            query, 
            ticket.title, ticket.priority, ticket.status, sid, 
            ticket.area, ticket.description, ticket.observations
        )
        
        return {
            **ticket.dict(),
            "id": row['id'],
            "fecha_creacion": row['fecha_creacion']
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{ticket_id}")
async def update_ticket(ticket_id: int, ticket: TicketUpdate, conn = Depends(get_db_connection)):
    try:
        update_data = ticket.dict(exclude_unset=True)
        if not update_data:
            return {"message": "No hay campos para actualizar"}
        
        updates = []
        params = []
        i = 1
        
        # Mapeo de campos API -> DB
        mapping = {
            "title": "titulo",
            "description": "descripcion",
            "status": "estado",
            "priority": "prioridad",
            "observations": "observaciones",
            "tecnico_id": "tecnico_id"
        }
        
        for key, value in update_data.items():
            db_field = mapping.get(key, key)
            updates.append(f"{db_field} = ${i}")
            if key == "tecnico_id" and value:
                params.append(uuid.UUID(value))
            else:
                params.append(value)
            i += 1
        
        query = f"UPDATE tickets SET {', '.join(updates)} WHERE id = ${i}"
        params.append(ticket_id)
        
        result = await conn.execute(query, *params)
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
            
        return {"message": "Ticket actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: int, conn = Depends(get_db_connection)):
    try:
        result = await conn.execute("DELETE FROM tickets WHERE id = $1", ticket_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        return {"message": "Ticket eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))
