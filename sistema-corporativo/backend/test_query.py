from src.database import get_db_connection

def test_query():
    conn = get_db_connection()
    if not conn:
        print("Error: No se pudo conectar a la base de datos")
        return
    try:
        with conn.cursor() as cur:
            query = """
                SELECT 
                    d.id, d.titulo, d.correlativo, d.tipo_documento, d.estado, d.prioridad, 
                    d.remitente_id, d.receptor_id, d.url_archivo, d.fecha_creacion,
                    u1.nombre || ' ' || u1.apellido as remitente_nombre,
                    u2.nombre || ' ' || u2.apellido as receptor_nombre
                FROM documentos d
                LEFT JOIN usuarios u1 ON d.remitente_id = u1.id
                LEFT JOIN usuarios u2 ON d.receptor_id = u2.id
                ORDER BY d.fecha_creacion DESC
            """
            cur.execute(query)
            results = cur.fetchall()
            print(f"Éxito: Se obtuvieron {len(results)} documentos.")
            for r in results[:2]:
                print(r)
    except Exception as e:
        print(f"Error en la consulta: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_query()
