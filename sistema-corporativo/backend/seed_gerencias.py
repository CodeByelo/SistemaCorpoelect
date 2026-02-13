import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "sistema_corpoelec")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")

# ORG STRUCTURE FROM FRONTEND (Extracted from page.tsx)
ORG_STRUCTURE = [
  {
    "category": "I. Alta Dirección y Control",
    "items": ["Gerencia General", "Auditoria Interna", "Consultoria Juridica", "Gerencia Nacional de Planificacion y presupuesto"]
  },
  {
    "category": "II. Gestión Administrativa",
    "items": ["Gerencia Nacional de Administracion", "Gerencia Nacional de Gestion Humana", "Gerencia Nacional de Tecnologias de la informacion y la comunicacion", "Gerencia nacional de tecnologias de proyectos"]
  },
  {
    "category": "III. Gestión Operativa y ASHO",
    "items": ["Gerencia Nacional de Adecuaciones y Mejoras", "Gerencia Nacional de Asho", "Gerencia Nacional de Atencion al Ciudadano", "Gerencia de Comercializacion"]
  },
  {
    "category": "IV. Energía y Comunidad",
    "items": ["Gerencia Nacional de energia alternativa y eficiencia energetica", "Gerencia Nacional de gestion comunical"]
  },
  {
    "category": "V. Filiales y Unidades",
    "items": ["Unerven", "Vietven"]
  }
]

def seed_gerencias():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        
        print(" Connected to DB. Seeding Gerencias...")
        
        count = 0
        for group in ORG_STRUCTURE:
            category_name = group["category"]
            # Insert Category as a parent if needed, or just insert items?
            # Based on schema check, we probably just have a flat list of 'gerencias'
            # Let's insert them flat for now, as the frontend groups them by name manually in page.tsx (via logic not DB)
            # Actually, page.tsx has DEFAULT_ORG_STRUCTURE with categories.
            # The DB likely just needs the names to map IDs.
            
            for item in group["items"]:
                # Check if exists
                cur.execute("SELECT id FROM gerencias WHERE nombre = %s", (item,))
                if cur.fetchone():
                    print(f" - Skipped (Exists): {item}")
                else:
                    cur.execute("INSERT INTO gerencias (nombre) VALUES (%s)", (item,))
                    print(f" + Inserted: {item}")
                    count += 1
        
        conn.commit()
        print(f"\nSUCCESS: Added {count} new gerencias.")
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    seed_gerencias()
