import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';

nacl.setPRNG((x: Uint8Array, n: number) => {
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = randomBytes[i];
});

const DEVICE_KEYPAIR_KEY = 'device_identity_keypair_v2';

interface DeviceKeypair {
  publicKey: string;
  secretKey: string;
}

interface DeviceIdentity {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
}

export interface DeviceSignParams {
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  token?: string;
  nonce: string | null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  return toHex(new Uint8Array(hashBuffer));
}

async function loadKeypair(): Promise<DeviceKeypair | null> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_KEYPAIR_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.publicKey && parsed.secretKey) return parsed as DeviceKeypair;
    return null;
  } catch {
    return null;
  }
}

async function saveKeypair(kp: DeviceKeypair): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_KEYPAIR_KEY, JSON.stringify(kp));
}

async function getOrCreateKeypair(): Promise<DeviceKeypair> {
  const existing = await loadKeypair();
  if (existing) return existing;

  const kp = nacl.sign.keyPair();
  const newKeypair: DeviceKeypair = {
    publicKey: toBase64Url(kp.publicKey),
    secretKey: toBase64Url(kp.secretKey),
  };
  await saveKeypair(newKeypair);
  return newKeypair;
}

export async function getDeviceIdentity(
  params: DeviceSignParams
): Promise<DeviceIdentity> {
  const kp = await getOrCreateKeypair();
  const rawPublicKey = fromBase64Url(kp.publicKey);
  const deviceId = await sha256Hex(rawPublicKey);

  const nonce = params.nonce || '';
  const signedAt = Date.now();

  const payload = [
    'v2',
    deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(signedAt),
    params.token ?? '',
    nonce,
  ].join('|');

  const payloadBytes = new TextEncoder().encode(payload);
  const secretKey = fromBase64Url(kp.secretKey);
  const signature = nacl.sign.detached(payloadBytes, secretKey);

  return {
    id: deviceId,
    publicKey: kp.publicKey,
    signature: toBase64Url(signature),
    signedAt,
    nonce,
  };
}
