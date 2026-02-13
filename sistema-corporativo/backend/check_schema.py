from src.database import get_db_connection

def inspect():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT tableowner FROM pg_tables WHERE tablename = 'documentos'")
            owner = cur.fetchone()
            print(f"Owner of 'documentos': {owner['tableowner']}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect()
