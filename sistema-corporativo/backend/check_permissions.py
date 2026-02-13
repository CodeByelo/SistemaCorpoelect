from src.database import get_db_connection
import sys

def check_create():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE TABLE IF NOT EXISTS test_perm (id SERIAL PRIMARY KEY)")
            print("CREATE TABLE successful.")
            cur.execute("DROP TABLE test_perm")
            print("DROP TABLE successful.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_create()
