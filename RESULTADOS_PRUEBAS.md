# VERI-ID — Resultados de pruebas

## 1. Pruebas del contrato Soroban

**Comando ejecutado:**

```powershell
cd contract
cargo test
```

**Resultado:** 1 prueba aprobada y 0 fallidas.

La prueba `register_and_verify_certificate` comprueba el flujo de registro y verificación de certificados en el entorno de pruebas del contrato.

## 2. Pruebas del backend FastAPI

**Comando ejecutado desde la carpeta `backend`:**

```powershell
python -m pytest
```

**Resultado:** 6 pruebas aprobadas y 0 fallidas.

Las pruebas cubren el registro de certificados, la coincidencia y diferencia de hashes, la detección de identificadores duplicados, certificados inexistentes y la validación de identificadores.

Se presentó una advertencia de compatibilidad relacionada con `httpx` y Starlette; no impidió la ejecución correcta de las pruebas.

## 3. Compilación del frontend

**Comando ejecutado desde la carpeta `frontend`:**

```powershell
npm.cmd run build
```

**Resultado:** compilación completada correctamente mediante TypeScript y Vite.

Vite mostró una advertencia sobre el tamaño de uno de los archivos JavaScript generados. Esta advertencia no impidió la compilación.

## 4. Integración con Stellar Testnet

El contrato Soroban fue desplegado en Stellar Testnet y se registró el certificado de prueba `CERT-002` desde la interfaz utilizando Freighter.

La transacción puede consultarse aquí:

https://stellar.expert/explorer/testnet/tx/a24f11a505dc84c6a767fecd5140d6186ede5981f8de4bc30b0d82a1ab864dfb

## 5. Conclusión

Las pruebas locales del contrato y del backend finalizaron correctamente. El frontend también compiló sin errores. Además, existe evidencia de una transacción de registro en Stellar Testnet.

Estos resultados corresponden a las pruebas realizadas y no sustituyen pruebas adicionales de seguridad, rendimiento o despliegue en producción.
