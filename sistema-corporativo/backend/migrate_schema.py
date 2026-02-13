from src.database import get_db_connection
import sys

def migrate():
    print("Starting migration...")
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        sys.exit(1)
        
    try:
        with conn.cursor() as cur:
            # Check if column exists first
            print("Checking if column exists...")
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'documentos' AND column_name = 'receptor_gerencia_id'")
            if cur.fetchone():
                print("Column 'receptor_gerencia_id' already exists.")
            else:
                print("Adding column 'receptor_gerencia_id'...")
                # Add column allowing NULLs initially
                cur.execute("ALTER TABLE documentos ADD COLUMN receptor_gerencia_id INTEGER REFERENCES gerencias(id)")
                print("Column added.")
        
        conn.commit()
        print("Migration committed successfully.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
        print("Connection closed.")

if __name__ == "__main__":
    migrate()
