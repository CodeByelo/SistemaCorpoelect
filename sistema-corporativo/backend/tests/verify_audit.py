import asyncio
import os
import sys
from datetime import datetime, timedelta

# Mock env for testing
os.environ["SUPABASE_DB_URL"] = "postgresql://postgres.vodjntmxirkkylawwgsm:HDHH3nry1910%2A%2A@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require"

# Add path to import database
sys.path.append(os.path.join(os.getcwd(), "backend"))

from database.postgres_connection import get_db_connection

async def verify_workflow():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        print("--- VERIFICACIÓN DE FLUJO DOCUMENTAL ---")
        
        # 1. Verificar registros en gerencias para correlativos
        cur.execute("SELECT * FROM documentos LIMIT 0")
        colnames = [desc[0] for desc in cur.description]
        print(f"Columnas en 'documentos': {colnames}")

        cur.execute("SELECT * FROM gerencias LIMIT 0")
        colnames_g = [desc[0] for desc in cur.description]
        print(f"Columnas en 'gerencias': {colnames_g}")

        cur.execute("SELECT * FROM profiles LIMIT 0")
        colnames_p = [desc[0] for desc in cur.description]
        print(f"Columnas en 'profiles': {colnames_p}")

        cur.execute("SELECT nombre, siglas FROM gerencias WHERE siglas IS NOT NULL")
        gerencias = cur.fetchall()
        print(f"Gerencias configuradas: {len(gerencias)}")
        for g in gerencias:
            print(f" - {g[0]}: {g[1]}")

        # 2. Verificar columnas
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'documentos' 
            AND column_name IN ('fecha_caducidad', 'fecha_ultima_actividad')
        """)
        cols = cur.fetchall()
        if len(cols) >= 2:
            print("✅ Columnas de auditoría detectadas correctamente.")
        else:
            print(f"❌ ERROR: Columnas de auditoría no encontradas. Detectadas: {len(cols)}")

        # 3. Verificar ordenamiento
        print("\nVerificando ordenamiento por caducidad...")
        cur.execute("SELECT titulo, fecha_caducidad FROM documentos ORDER BY fecha_caducidad ASC LIMIT 5")
        docs = cur.fetchall()
        if not docs:
            print(" - (No hay documentos en la tabla para verificar ordenamiento)")
        else:
            for d in docs:
                print(f" - {d[0]}: Expira {d[1]}")

        print("\n--- VERIFICACIÓN COMPLETADA ---")
        cur.close()
        
    except Exception as e:
        print(f"Error en verificación: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(verify_workflow())
