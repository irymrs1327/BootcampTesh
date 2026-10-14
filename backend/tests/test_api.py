import io
import os
import tempfile
from pathlib import Path

# Use an isolated DB before importing the app.
tmp = tempfile.NamedTemporaryFile(delete=False)
tmp.close()
os.environ["VERIID_DB_PATH"] = tmp.name
from fastapi.testclient import TestClient
from app.main import app

PDF = b"%PDF-1.4\nDemo certificate content\n%%EOF"
client = TestClient(app)

def setup_function():
    with open(os.environ["VERIID_DB_PATH"], "wb") as f:
        pass
    from app.main import init_db
    init_db()

def test_register_and_verify_hash_matches():
    response = client.post("/api/certificates", data={"certificate_id": "TEST-001", "issuer": "Institución Demo"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    assert response.status_code == 200, response.text
    assert len(response.json()["document_hash"]) == 64
    verify = client.post("/api/certificates/verify", data={"certificate_id": "TEST-001"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    assert verify.status_code == 200
    assert verify.json()["status"] == "MATCH"

def test_modified_file_does_not_match():
    client.post("/api/certificates", data={"certificate_id": "TEST-002"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    altered = b"%PDF-1.4\nDifferent certificate content\n%%EOF"
    verify = client.post("/api/certificates/verify", data={"certificate_id": "TEST-002"}, files={"file": ("changed.pdf", altered, "application/pdf")})
    assert verify.json()["status"] == "MISMATCH"

def test_duplicate_id_is_rejected():
    client.post("/api/certificates", data={"certificate_id": "TEST-003"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    response = client.post("/api/certificates", data={"certificate_id": "TEST-003"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    assert response.status_code == 409

def test_unknown_certificate_is_not_found():
    response = client.post("/api/certificates/verify", data={"certificate_id": "MISSING"}, files={"file": ("demo.pdf", PDF, "application/pdf")})
    assert response.json()["status"] == "NOT_FOUND"

def test_empty_certificate_id_is_rejected():
    response = client.post(
        "/api/certificates",
        data={"certificate_id": "", "issuer": "Institución Demo"},
        files={"file": ("demo.pdf", PDF, "application/pdf")},
    )
    assert response.status_code == 422


def test_certificate_id_too_long_is_rejected():
    response = client.post(
        "/api/certificates",
        data={"certificate_id": "A" * 81, "issuer": "Institución Demo"},
        files={"file": ("demo.pdf", PDF, "application/pdf")},
    )
    assert response.status_code == 400
