import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoints():
    print(f"Testing endpoints at {BASE_URL}...")
    
    # Check users
    try:
        r = requests.get(f"{BASE_URL}/usuarios")
        print(f"GET /usuarios: Status {r.status_code}")
        if r.status_code == 200:
            users = r.json()
            print(f"Found {len(users)} users.")
            for u in users:
                print(f" - {u.get('username')} ({u.get('role')})")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Connection error to /usuarios: {e}")

    # Check documents
    try:
        r = requests.get(f"{BASE_URL}/documentos")
        print(f"\nGET /documentos: Status {r.status_code}")
        if r.status_code == 200:
            docs = r.json()
            print(f"Found {len(docs)} documents.")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Connection error to /documentos: {e}")

if __name__ == "__main__":
    test_endpoints()
