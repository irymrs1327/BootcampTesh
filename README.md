# VERI-ID — prototipo académico

VERI-ID es un prototipo para demostrar el flujo de registro y verificación de documentos mediante SHA-256. Incluye un contrato inteligente para Stellar Soroban (Rust), un backend FastAPI y un frontend React.

> **Estado importante:** el backend y el frontend tienen un modo demostración local funcional. El contrato Soroban está incluido como código fuente, pero todavía no se ha desplegado ni conectado a Testnet. La interfaz lo indica expresamente y no inventa hashes de transacción. Para confirmar el contrato compilado hace falta instalar Rust y las herramientas de Stellar; este entorno de generación no cuenta con `rustc` ni `cargo`.

## Requisitos
- Python 3.10 o posterior
- Node.js 20 o posterior y npm
- Para contrato: Rust, target WebAssembly para Soroban y Stellar CLI, siguiendo la documentación oficial de Stellar.

## Ejecutar backend (Windows PowerShell)
Desde la carpeta `VERI-ID`:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Swagger estará en http://127.0.0.1:8000/docs.

## Ejecutar frontend
Abre otra terminal en la carpeta raíz del proyecto:

```powershell
cd frontend
npm install
npm run dev
```

Abre la URL que Vite muestre (normalmente http://127.0.0.1:5173).

## Prueba funcional de punta a punta
1. En Registrar certificado, usa `CERT-001` como identificador.
2. Selecciona un PDF de prueba y registra.
3. Cambia a Verificar documento, conserva el identificador y sube el mismo PDF: debe aparecer `HASH COINCIDENTE`.
4. Edita/guarda una copia diferente del PDF y vuelve a verificar: debe aparecer `HASH NO COINCIDENTE`.
5. Intenta registrar de nuevo `CERT-001`: debe responder con conflicto por identificador duplicado.

La prueba local persiste los hashes en SQLite. No es una prueba de blockchain.

## Ejecutar pruebas automatizadas del backend
Desde `backend` con el entorno virtual activado:

```powershell
python -m pytest -q
```

## Contrato Soroban
El contrato de `contract/src/lib.rs` ofrece:
- `initialize(admin)`
- `authorize_issuer(admin, issuer, authorized)`
- `register_certificate(issuer, id, document_hash)`
- `get_certificate(id)`
- `verify_certificate(id, document_hash)`

El contrato almacena el hash, el identificador, la dirección del emisor y el tiempo de ledger. No almacena el PDF. La autorización real debe realizarse mediante las firmas Soroban; nunca coloques una clave secreta en el frontend.

### Estado de la integración Stellar
El contrato y la demostración local están separados deliberadamente para evitar representar un registro SQLite como una transacción on-chain. El siguiente paso técnico es compilar/probar el contrato con Soroban, desplegarlo en Testnet, guardar el contract ID y desarrollar el adaptador de transacciones firmado para que el backend llame al contrato. Para transacciones reales, usa un firmante de servidor seguro o una cartera compatible; no guardes secretos en el repositorio.

Consulta la documentación oficial:
- https://developers.stellar.org/docs/build/smart-contracts/getting-started
- https://developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk
- https://stellar-sdk.readthedocs.io/en/stable/

## Seguridad y límites
- PDF máximo de 10 MB; el backend comprueba la cabecera `%PDF-`.
- El archivo completo no se guarda ni se transmite a blockchain; se calcula su hash.
- Un hash coincidente demuestra que el contenido coincide con el que se registró, no que la institución emisora sea legítima por sí sola.
- La interfaz y el endpoint `/api/health` indican `LOCAL_DEMO` hasta que exista integración on-chain verificada.
