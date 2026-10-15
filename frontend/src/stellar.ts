import * as StellarSdk from '@stellar/stellar-sdk';
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

export const CONTRACT_ID =
  'CANH2OHT6CWWAF6CBWMCZSJDRV2AYWULTNNN5GXDS5QHTU5PUVP4YIYZ';

export const NETWORK_PASSPHRASE =
  'Test SDF Network ; September 2015';

export const RPC_URL =
  'https://soroban-testnet.stellar.org';

const server = new StellarSdk.rpc.Server(RPC_URL);
const contract = new StellarSdk.Contract(CONTRACT_ID);

export async function connectFreighter(): Promise<string> {
  const connection = await isConnected();

  if (!connection.isConnected) {
    throw new Error(
      'Freighter no está disponible. Instala o habilita la extensión.'
    );
  }

  const access = await requestAccess();

  if (access.error) {
    throw new Error('No se pudo autorizar el acceso a Freighter.');
  }

  const address = await getAddress();

  if (!address.address) {
    throw new Error('No se pudo obtener la dirección de Freighter.');
  }

  return address.address;
}

async function prepareContractTransaction(
  address: string,
  operation: StellarSdk.xdr.Operation
): Promise<StellarSdk.Transaction> {
  const account = await server.getAccount(address);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  return server.prepareTransaction(transaction);
}

async function signAndSubmitTransaction(
  transaction: StellarSdk.Transaction
): Promise<string> {
  const response = await signTransaction(transaction.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  if (!response.signedTxXdr) {
    throw new Error('Freighter no devolvió la transacción firmada.');
  }

  const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
    response.signedTxXdr,
    NETWORK_PASSPHRASE
  ) as StellarSdk.Transaction;

  const sent = await server.sendTransaction(signedTransaction);

  if (sent.status === 'ERROR') {
    console.error('Error al enviar la transacción:', sent);
    throw new Error(
      'Stellar rechazó el envío de la transacción. Revisa la consola.'
    );
  }

  if (!sent.hash) {
    throw new Error('No se recibió el identificador de la transacción.');
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    const result = await server.getTransaction(sent.hash);

    if (result.status === 'SUCCESS') {
      return sent.hash;
    }

    if (result.status === 'FAILED') {
      console.error('Detalle del fallo de Stellar:', result);
      throw new Error(
        `La transacción falló en Stellar. Hash: ${sent.hash}`
      );
    }
  }

  throw new Error(
    `La transacción sigue pendiente. Consulta su hash: ${sent.hash}`
  );
}

export async function registerCertificateOnChain(
  id: string,
  documentHash: string
): Promise<{ transactionHash: string; issuer: string }> {
  const address = await connectFreighter();

  const operation = contract.call(
    'register_certificate',
    StellarSdk.nativeToScVal(address, { type: 'address' }),
    StellarSdk.nativeToScVal(id, { type: 'string' }),
    StellarSdk.nativeToScVal(documentHash, { type: 'string' })
  );

  const transaction = await prepareContractTransaction(
    address,
    operation
  );

  const transactionHash = await signAndSubmitTransaction(transaction);

  return {
    transactionHash,
    issuer: address,
  };
}

export async function verifyCertificateOnChain(
  id: string,
  documentHash: string
): Promise<boolean> {
  const address = await connectFreighter();
  const account = await server.getAccount(address);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'verify_certificate',
        StellarSdk.nativeToScVal(id, { type: 'string' }),
        StellarSdk.nativeToScVal(documentHash, { type: 'string' })
      )
    )
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if ('error' in simulation) {
    throw new Error(String(simulation.error));
  }

  if (!simulation.result) {
    throw new Error(
      'No se pudo obtener el resultado de la verificación.'
    );
  }

  return Boolean(
    StellarSdk.scValToNative(simulation.result.retval)
  );
}