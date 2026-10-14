from __future__ import annotations
import hashlib
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("VERIID_DB_PATH", str(BASE_DIR / "veriid.db")))
MAX_FILE_BYTES = 10 * 1024 * 1024


def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY, document_hash TEXT NOT NULL, issuer TEXT NOT NULL,
            issued_at TEXT NOT NULL, tx_hash TEXT, network TEXT NOT NULL DEFAULT 'LOCAL_DEMO'
        )""")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="VERI-ID API", version="0.1.0", description="Demo API para registro y verificación de hashes de certificados.", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class VerifyBody(BaseModel):
    certificate_id: str = Field(min_length=1, max_length=80)


def validate_id(value: str) -> str:
    value = value.strip()
    if not value or len(value) > 80:
        raise HTTPException(400, "El identificador debe tener entre 1 y 80 caracteres.")
    return value

async def read_pdf(file: UploadFile) -> bytes:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(415, "Sube un archivo PDF.")
    content = await file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(413, "El archivo supera el límite de 10 MB.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(415, "El archivo no parece ser un PDF válido.")
    return content

@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "LOCAL_DEMO", "network": "LOCAL_DEMO", "blockchain_connected": False,
            "message": "Modo demostración local. No se han enviado transacciones a Stellar."}

@app.post("/api/certificates")
async def register_certificate(certificate_id: Annotated[str, Form()], issuer: Annotated[str, Form()] = "Institución de prueba", file: UploadFile = File(...)):
    certificate_id = validate_id(certificate_id)
    issuer = issuer.strip()[:120] or "Institución de prueba"
    content = await read_pdf(file)
    document_hash = hashlib.sha256(content).hexdigest()
    issued_at = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        try:
            conn.execute("INSERT INTO certificates(id, document_hash, issuer, issued_at, tx_hash, network) VALUES (?, ?, ?, ?, NULL, 'LOCAL_DEMO')",
                         (certificate_id, document_hash, issuer, issued_at))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Ya existe un certificado con ese identificador.")
    return {"certificate_id": certificate_id, "document_hash": document_hash, "issuer": issuer, "issued_at": issued_at,
            "network": "LOCAL_DEMO", "transaction_hash": None, "message": "Registro guardado localmente; no es una transacción blockchain."}

@app.get("/api/certificates/{certificate_id}")
def get_certificate(certificate_id: str):
    certificate_id = validate_id(certificate_id)
    with db_connect() as conn:
        row = conn.execute("SELECT id, document_hash, issuer, issued_at, tx_hash, network FROM certificates WHERE id = ?", (certificate_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Certificado no encontrado.")
    return {"certificate_id": row["id"], "document_hash": row["document_hash"], "issuer": row["issuer"], "issued_at": row["issued_at"],
            "transaction_hash": row["tx_hash"], "network": row["network"]}

@app.post("/api/certificates/verify")
async def verify_certificate(certificate_id: Annotated[str, Form()], file: UploadFile = File(...)):
    certificate_id = validate_id(certificate_id)
    content = await read_pdf(file)
    candidate_hash = hashlib.sha256(content).hexdigest()
    with db_connect() as conn:
        row = conn.execute("SELECT document_hash, issuer, issued_at, network, tx_hash FROM certificates WHERE id = ?", (certificate_id,)).fetchone()
    if row is None:
        return {"status": "NOT_FOUND", "valid": False, "certificate_id": certificate_id, "message": "No existe un registro para este identificador."}
    matches = candidate_hash == row["document_hash"]
    return {"status": "MATCH" if matches else "MISMATCH", "valid": matches, "certificate_id": certificate_id,
            "calculated_hash": candidate_hash, "registered_hash": row["document_hash"], "issuer": row["issuer"],
            "issued_at": row["issued_at"], "network": row["network"], "transaction_hash": row["tx_hash"],
            "message": "El hash coincide con el registro local." if matches else "El hash no coincide: el archivo es diferente del registrado.",
            "warning": "Esto es una demostración local; no constituye una verificación en blockchain."}

@app.get("/api/certificates")
def list_certificates():
    with db_connect() as conn:
        rows = conn.execute("SELECT id, document_hash, issuer, issued_at, tx_hash, network FROM certificates ORDER BY issued_at DESC LIMIT 50").fetchall()
    return [{"certificate_id": r["id"], "document_hash": r["document_hash"], "issuer": r["issuer"], "issued_at": r["issued_at"], "transaction_hash": r["tx_hash"], "network": r["network"]} for r in rows]
