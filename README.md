# VERI-ID — Prototipo académico

VERI-ID es un prototipo para registrar y verificar certificados digitales mediante hashes SHA-256 y contratos inteligentes en Stellar Soroban.

El proyecto integra un contrato inteligente desarrollado en Rust, un frontend React con TypeScript y un backend FastAPI para las demostraciones locales.

## Estado del proyecto

- **Contrato Soroban:** desplegado en Stellar Testnet.
- **Frontend:** permite conectar Freighter, registrar certificados y verificar documentos.
- **Registro en blockchain:** se almacena el identificador, el hash del documento, el emisor y la fecha de emisión.
- **Backend:** cuenta con endpoints de demostración local y pruebas automatizadas.
- **Pruebas del backend:** 6 pruebas aprobadas.
- **Red:** Stellar Testnet; se utilizan activos de prueba sin valor monetario real.

## Tecnologías utilizadas

- Rust y Soroban SDK.
- Stellar Testnet y Stellar CLI.
- React, TypeScript y Vite.
- Freighter Wallet.
- Python, FastAPI y SQLite.
- SHA-256 para calcular la huella digital de los documentos.
- Git y GitHub para el control de versiones.

## Identificadores de Stellar Testnet

**ID del contrato:**

`CANH2OHT6CWWAF6CBWMCZSJDRV2AYWULTNNN5GXDS5QHTU5PUVP4YIYZ`

**Transacción de despliegue:**

https://stellar.expert/explorer/testnet/tx/4626905a78f12c3751608586ab1731d629bbde0137261780c0250fad6e03df32

**Transacción de inicialización:**

https://stellar.expert/explorer/testnet/tx/5d347edb6e52642cc13d1843745ff10c21ffbc92be4ef765414ad7061e0acdeb

**Registro de prueba `CERT-002`:**

https://stellar.expert/explorer/testnet/tx/a24f11a505dc84c6a767fecd5140d6186ede5981f8de4bc30b0d82a1ab864dfb

## Requisitos

- Python 3.10 o posterior.
- Node.js 20 o posterior y npm.
- Rust y las herramientas de compilación de contratos Soroban.
- Stellar CLI.
- Extensión Freighter configurada en Testnet.

## Ejecutar el backend local

Desde la carpeta raíz del proyecto:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentación interactiva de la API:

http://127.0.0.1:8000/docs

Para ejecutar las pruebas automatizadas, desde la carpeta `backend`:

```powershell
python -m pytest
```

## Ejecutar el frontend

Abre otra terminal en la carpeta raíz del proyecto:

```powershell
cd frontend
npm install
npm run dev
```

Abre la dirección local que muestre Vite, normalmente:

http://127.0.0.1:5173

## Flujo de registro y verificación

1. Conectar la cartera Freighter configurada en Stellar Testnet.
2. Ingresar un identificador único para el certificado.
3. Seleccionar un archivo PDF.
4. Calcular su hash SHA-256.
5. Autorizar y firmar la transacción mediante Freighter.
6. Registrar el hash en el contrato Soroban.
7. Seleccionar el mismo PDF en la sección de verificación.
8. Comparar el hash calculado con el almacenado en el contrato.

Si ambos hashes coinciden, se muestra un resultado de coincidencia. Si el documento cambia, el hash será diferente y la verificación no coincidirá.

## Funciones del contrato

El contrato ubicado en `contract/src/lib.rs` implementa las siguientes operaciones:

- `initialize(admin)`: inicializa el contrato.
- `authorize_issuer(admin, issuer, authorized)`: autoriza o revoca emisores.
- `register_certificate(issuer, id, document_hash)`: registra un certificado.
- `get_certificate(id)`: consulta un certificado.
- `verify_certificate(id, document_hash)`: compara el hash presentado con el registrado.

## Seguridad y limitaciones

- El PDF no se almacena directamente en el contrato blockchain.
- El hash SHA-256 permite detectar cambios en el contenido del archivo.
- Un hash coincidente no demuestra por sí solo que la institución emisora sea legítima.
- La red Testnet es de pruebas y no representa operaciones con dinero real.
- El backend local utiliza SQLite y debe distinguirse de las operaciones realizadas directamente en Stellar.
- Las claves secretas de las carteras no deben guardarse en el código fuente ni subirse a GitHub.

## Documentación oficial

- https://developers.stellar.org/docs/build/smart-contracts/getting-started
- https://developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk
- https://stellar-sdk.readthedocs.io/en/stable/

## Autoras y autores

Proyecto académico de VERI-ID desarrollado como prototipo de registro y verificación de certificados digitales.

## Pruebas del contrato Soroban

Las pruebas automatizadas del contrato comprueban:

- El registro y la verificación de certificados mediante su hash.
- El rechazo de certificados duplicados.
- El rechazo de hashes inválidos.
- La consulta de certificados inexistentes.

**Resultado actual:** 4 pruebas aprobadas y 0 fallidas mediante `cargo test`.