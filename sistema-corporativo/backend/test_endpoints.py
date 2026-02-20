import requests
import sys

def test_endpoint(url):
    try:
        response = requests.get(url, timeout=10)
        print(f"Testing {url} -> Status: {response.status_code}")
        return response.status_code
    except Exception as e:
        print(f"Error testing {url}: {e}")
        return None

if __name__ == "__main__":
    base_url = "http://localhost:8000"
    endpoints = [
        "/health",
        "/gerencias",
        "/users/all",
        "/documentos" # Expect 401 if unauthenticated
    ]
    
    for ep in endpoints:
        test_endpoint(base_url + ep)
