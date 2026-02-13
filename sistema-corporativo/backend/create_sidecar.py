from src.database import get_db_connection
import sys

def create_sidecar_table():
    print("Creating sidecar table...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS documento_gerencia_receptor (
                    documento_id INTEGER REFERENCES documentos(id) ON DELETE CASCADE,
                    gerencia_id INTEGER REFERENCES gerencias(id) ON DELETE SET NULL,
                    PRIMARY KEY (documento_id)
                )
            """)
            print("Table 'documento_gerencia_receptor' created successfully.")
            
        conn.commit()
    except Exception as e:
        print(f"Error creating table: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_sidecar_table()
