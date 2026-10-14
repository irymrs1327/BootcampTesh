
import { useState } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  Search,
  UploadCloud,
  Fingerprint,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Activity,
  Wallet,
} from 'lucide-react';

import {
  connectFreighter,
  registerCertificateOnChain,
  verifyCertificateOnChain,
  CONTRACT_ID,
} from './stellar';

type Result = {
  status: 'MATCH' | 'MISMATCH' | 'REGISTERED';
  document_hash?: string;
  calculated_hash?: string;
  issuer?: string;
  transaction_hash?: string;
  network?: string;
  message: string;
};

async function calculateSHA256(file: File): Promise<string> {
  const contents = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', contents);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function App() {
  const [id, setId] = useState('CERT-002');
  const [issuer, setIssuer] = useState('Institución de prueba');
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<'register' | 'verify'>('register');

  async function handleConnectWallet() {
    console.log('Se ejecutó handleConnectWallet');
    setError('');

    try {
      const address = await connectFreighter();
      setWalletAddress(address);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo conectar Freighter.'
      );
    }
  }

  async function submit(mode: 'register' | 'verify') {
    setError('');
    setResult(null);

    const file = mode === 'register' ? registerFile : verifyFile;

    if (!id.trim()) {
      setError('Escribe un identificador para el certificado.');
      return;
    }

    if (!file) {
      setError('Selecciona el archivo PDF que deseas procesar.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El PDF no debe superar los 10 MB.');
      return;
    }

    if (
      file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Selecciona un archivo PDF válido.');
      return;
    }

    if (mode === 'register' && !issuer.trim()) {
      setError('Escribe el nombre de la institución emisora.');
      return;
    }

    setBusy(true);

    try {
      const address = walletAddress || await connectFreighter();
      setWalletAddress(address);

      const hash = await calculateSHA256(file);

      if (mode === 'register') {
        const registered = await registerCertificateOnChain(
          id.trim(),
          hash
        );

        setResult({
          status: 'REGISTERED',
          document_hash: hash,
          issuer: registered.issuer,
          transaction_hash: registered.transactionHash,
          network: 'Stellar Testnet',
          message:
            'El certificado fue registrado correctamente en Stellar Testnet.',
        });
      } else {
        const valid = await verifyCertificateOnChain(id.trim(), hash);

        setResult({
          status: valid ? 'MATCH' : 'MISMATCH',
          calculated_hash: hash,
          network: 'Stellar Testnet',
          message: valid
            ? 'El hash del PDF coincide con el certificado registrado en el contrato.'
            : 'El hash no coincide con el registro del contrato o el certificado no existe.',
        });
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo completar la operación en Stellar.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <ShieldCheck size={22} />
          </span>
          <span>
            VERI<span className="green">-ID</span>
            <small>VERIFICACIÓN DIGITAL</small>
          </span>
        </a>

        <div className="network">
          <span className={`dot ${walletAddress ? 'live' : ''}`} />
          <span>Stellar Testnet</span>
          <span className="network-tag">
            {walletAddress ? 'CONECTADA' : 'TESTNET'}
          </span>
        </div>

        <button
          className="primary-btn"
          onClick={handleConnectWallet}
          disabled={busy}
        >
          <Wallet size={16} />
          {walletAddress
            ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-5)}`
            : 'Conectar Freighter'}
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <span /> CONFIANZA DIGITAL, SIN FRICCIÓN
          </div>

          <h1>
            Tus documentos.
            <br />
            <span>Verificables.</span>
          </h1>

          <p>
            Registra la huella digital de un certificado y comprueba
            su integridad mediante un contrato inteligente de Stellar.
            El documento PDF no se almacena en la blockchain.
          </p>

          <div className="hero-pills">
            <span><Fingerprint size={15} /> Hash SHA-256</span>
            <span><ShieldCheck size={15} /> Evidencia on-chain</span>
            <span><Activity size={15} /> Stellar Soroban</span>
          </div>
        </section>

        <section className="workspace">
          <div className="section-heading">
            <div>
              <span className="kicker">PLATAFORMA</span>
              <h2>Centro de verificación</h2>
            </div>

            <span className="demo-chip">
              <span className="dot" /> STELLAR TESTNET
            </span>
          </div>

          <div className="tabs">
            <button
              className={active === 'register' ? 'tab active' : 'tab'}
              onClick={() => {
                setActive('register');
                setResult(null);
                setError('');
              }}
            >
              <UploadCloud size={17} /> Registrar certificado
            </button>

            <button
              className={active === 'verify' ? 'tab active' : 'tab'}
              onClick={() => {
                setActive('verify');
                setResult(null);
                setError('');
              }}
            >
              <Search size={17} /> Verificar documento
            </button>
          </div>

          <div className="panel">
            <div className="panel-intro">
              <div className="panel-icon">
                {active === 'register' ? <FileCheck2 /> : <Search />}
              </div>

              <div>
                <h3>
                  {active === 'register'
                    ? 'Registrar una nueva evidencia'
                    : 'Comprobar un certificado'}
                </h3>

                <p>
                  {active === 'register'
                    ? 'Calcula el hash SHA-256 y registra la evidencia en el contrato.'
                    : 'Compara el hash del PDF con el registro de Stellar.'}
                </p>
              </div>
            </div>

            <label className="field-label">
              Identificador del certificado
            </label>

            <input
              className="text-input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Ej. CERT-2026-001"
              maxLength={80}
            />

            {active === 'register' && (
              <>
                <label className="field-label">
                  Institución emisora
                </label>

                <input
                  className="text-input"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="Nombre de la institución"
                  maxLength={120}
                />

                <p className="field-hint">
                  El emisor que se registra en el contrato es la cuenta
                  de Freighter autorizada.
                </p>
              </>
            )}

            <label className="field-label">Archivo PDF</label>

            <label className="upload-box">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;

                  if (active === 'register') {
                    setRegisterFile(file);
                  } else {
                    setVerifyFile(file);
                  }

                  setResult(null);
                  setError('');
                }}
              />

              <span className="upload-icon">
                <UploadCloud size={22} />
              </span>

              <strong>
                {(active === 'register' ? registerFile : verifyFile)?.name
                  || 'Selecciona o arrastra un PDF'}
              </strong>

              <small>PDF · máximo 10 MB</small>
            </label>

            <button
              className="primary-btn"
              disabled={busy}
              onClick={() => submit(active)}
            >
              {busy
                ? 'Procesando…'
                : active === 'register'
                  ? 'Calcular hash y registrar'
                  : 'Verificar certificado'}
              <span>↗</span>
            </button>

            {error && (
              <div className="notice error">
                <XCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div
                className={`result-card ${
                  result.status === 'REGISTERED' || result.status === 'MATCH'
                    ? 'success'
                    : 'danger'
                }`}
              >
                <div className="result-title">
                  {result.status === 'REGISTERED' ? (
                    <><CheckCircle2 /> REGISTRO ENVIADO A STELLAR</>
                  ) : result.status === 'MATCH' ? (
                    <><CheckCircle2 /> HASH COINCIDENTE</>
                  ) : (
                    <><XCircle /> HASH NO COINCIDENTE</>
                  )}
                </div>

                <p>{result.message}</p>

                {result.document_hash && (
                  <div className="hash-block">
                    <small>HASH SHA-256 REGISTRADO</small>
                    <code>{result.document_hash}</code>
                  </div>
                )}

                {result.calculated_hash && (
                  <div className="hash-block">
                    <small>HASH DEL ARCHIVO PRESENTADO</small>
                    <code>{result.calculated_hash}</code>
                  </div>
                )}

                {result.issuer && (
                  <div className="meta-row">
                    <span>Cuenta emisora</span>
                    <strong>{result.issuer}</strong>
                  </div>
                )}

                <div className="meta-row">
                  <span>Red</span>
                  <strong>{result.network}</strong>
                </div>

                {result.transaction_hash && (
                  <div className="meta-row">
                    <span>Transacción</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${result.transaction_hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en explorador <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="disclaimer">
            <AlertTriangle size={16} />
            <p>
              <strong>Importante:</strong> el registro requiere que la
              cuenta conectada esté autorizada como emisor en el contrato.
              Las verificaciones consultan el contrato de Stellar Testnet.
              No se guarda el PDF en la blockchain.
            </p>
          </div>

          <div className="hash-block">
            <small>CONTRATO SOROBAN</small>
            <code>{CONTRACT_ID}</code>
          </div>
        </section>

        <section className="how">
          <div>
            <span className="kicker">CÓMO FUNCIONA</span>
            <h2>Una huella. Una verificación.</h2>
          </div>

          <div className="steps">
            <article>
              <span>01</span>
              <Fingerprint />
              <h3>Generar hash</h3>
              <p>
                SHA-256 convierte el contenido del PDF en una huella digital.
              </p>
            </article>

            <article>
              <span>02</span>
              <ShieldCheck />
              <h3>Registrar evidencia</h3>
              <p>
                El contrato asocia el hash y los datos mínimos a un
                identificador.
              </p>
            </article>

            <article>
              <span>03</span>
              <CheckCircle2 />
              <h3>Verificar coincidencia</h3>
              <p>
                El contrato comprueba si el hash coincide con el registrado.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <span>
          VERI-ID <span className="green">●</span> PROTOTIPO ACADÉMICO
        </span>
        <span>Construido para explorar identidad digital y Soroban.</span>
      </footer>
    </div>
  );
}
