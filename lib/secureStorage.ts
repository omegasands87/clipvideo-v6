'use client';

// Lightweight client-side "at rest" protection for the user's AI API key.
//
// IMPORTANT HONESTY NOTE (read this before assuming it's bulletproof):
// This app is 100% client-side by design — there is no backend to hold
// secrets. That means a sufficiently privileged malicious browser
// extension (one with "read/change all data on all websites" permission)
// can, in principle, always read anything a page can read, including
// values decrypted at runtime. No amount of JS-only crypto can fully
// defeat that threat model, because the decryption key must also live
// somewhere the page can reach it.
//
// What this DOES meaningfully improve:
// - The API key is no longer stored as human-readable plain text in
//   localStorage. A casual "view localStorage" inspection, a lazy
//   extension that just greps localStorage strings, browser sync
//   backups, or a XSS payload that only exfiltrates localStorage
//   (without executing arbitrary JS on the page) will only ever see
//   ciphertext.
// - The AES-GCM key itself is stored in IndexedDB, separate from the
//   ciphertext in localStorage, and is generated with
//   crypto.subtle (non-extractable-friendly, random, per-browser-profile).
// - Encryption uses AES-GCM 256, a real authenticated cipher, not a toy
//   XOR/base64 "obfuscation".
//
// For genuinely sensitive keys, the correct long-term fix is a small
// backend proxy that holds the API key server-side and never ships it
// to the browser at all. That's a bigger architecture change outside
// the scope of this client-only app, but worth knowing.

const DB_NAME = 'cutclip_secure';
const STORE_NAME = 'keys';
const KEY_ID = 'apikey-encryption-key';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDb();
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY_ID);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
  if (existing) return existing;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return key;
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function b64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

/** Encrypts a plaintext string. Returns a payload safe to store in localStorage. */
export async function encryptSecret(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return JSON.stringify({ iv: bufToB64(iv.buffer), data: bufToB64(cipherBuf) });
}

/** Decrypts a payload produced by encryptSecret. Returns '' on any failure. */
export async function decryptSecret(payload: string): Promise<string> {
  if (!payload) return '';
  try {
    const key = await getOrCreateKey();
    const { iv, data } = JSON.parse(payload) as { iv: string; data: string };
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(iv)) },
      key,
      b64ToBuf(data)
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return '';
  }
}
