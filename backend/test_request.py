import requests

url = "http://127.0.0.1:8000/run"
payload = {"code": "x = 0\nfor i in range(3):\n    x += i"}

response = requests.post(url, json=payload)  # use json= not data=
print(response.json())
