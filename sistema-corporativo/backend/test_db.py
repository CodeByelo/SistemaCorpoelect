import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def test_conn():
    try:
        print(f"Connecting to {os.getenv('DB_HOST')}...")
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        print("Connection successful!")
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = cur.fetchall()
        print("Tables in database:")
        for table in tables:
            print(f" - {table[0]}")
        
        # Check if 'usuarios' table has data
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'usuarios'")
        if cur.fetchone()[0] > 0:
            cur.execute("SELECT id, username, password_hash FROM usuarios")
            users = cur.fetchall()
            print(f"Users in 'usuarios' table: {len(users)}")
            for u in users:
                print(f" - ID: {u[0]}, Username: {u[1]}, Hash: {u[2][:20]}...")
        else:
            print("Table 'usuarios' NOT FOUND.")

        # Check 'usuarios_alfa'
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'usuarios_alfa'")
        if cur.fetchone()[0] > 0:
            cur.execute("SELECT count(*) FROM usuarios_alfa")
            print(f"Users in 'usuarios_alfa' table: {cur.fetchone()[0]}")
        else:
            print("Table 'usuarios_alfa' NOT FOUND.")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_conn()
