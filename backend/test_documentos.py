import httpx
import asyncio

async def test_documentos():
    url = "http://localhost:8000/documentos"
    headers = {"Authorization": "Bearer dev-bypass-token-2026"}
    
    print(f"📡 Probando {url}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_documentos())
