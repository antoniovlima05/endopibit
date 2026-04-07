import os
import time
from pathlib import Path

import requests

API_URL = "http://127.0.0.1:5000/api/exames/upload"
PATIENT_ID = "P002"
IMAGES_DIR = Path(r"C:\Users\apvli\OneDrive\Documentos\basetesteendo")

ALLOWED = {".png", ".jpg", ".jpeg", ".webp"}

def main():
    files = [p for p in IMAGES_DIR.iterdir() if p.suffix.lower() in ALLOWED]

    if not files:
        print("Nenhuma imagem encontrada.")
        return

    print(f"Total de imagens: {len(files)}")
    results = []

    for img_path in files:
        start = time.perf_counter()
        with open(img_path, "rb") as f:
            response = requests.post(
                API_URL,
                data={"paciente_id": PATIENT_ID},
                files={"file": (img_path.name, f, "application/octet-stream")},
                timeout=120,
            )
        elapsed = time.perf_counter() - start

        try:
            payload = response.json()
        except Exception:
            payload = {"raw": response.text}

        results.append({
            "file": img_path.name,
            "http_status": response.status_code,
            "request_time": elapsed,
            "api_payload": payload,
        })

        print(f"{img_path.name} -> status {response.status_code} | tempo request {elapsed:.4f}s")

    valid = [r["request_time"] for r in results if r["http_status"] == 201]
    if valid:
        print("\nResumo:")
        print(f"Tempo mínimo: {min(valid):.4f}s")
        print(f"Tempo médio : {sum(valid)/len(valid):.4f}s")
        print(f"Tempo máximo: {max(valid):.4f}s")
    else:
        print("Nenhum upload foi concluído com sucesso.")

if __name__ == "__main__":
    main()