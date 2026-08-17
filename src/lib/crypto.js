/**
 * Utilities for client-side security, input sanitization, and optional End-to-End Encryption (E2EE)
 * using the browser's native Web Crypto API (AES-GCM 256-bit).
 */

// Basic XSS sanitization helper
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Convert string to array buffer
function str2ab(str) {
  return new TextEncoder().encode(str);
}

// Convert array buffer to string
function ab2str(buf) {
  return new TextDecoder().decode(buf);
}

// Derive a strong 256-bit AES-GCM key from a user passphrase using PBKDF2
export async function deriveKey(passphrase, salt = 'rpg_todo_salt_v1') {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext with AES-GCM
export async function encryptData(plainText, key) {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = str2ab(plainText);
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const cipherArray = new Uint8Array(cipherBuffer);
    // Combine IV + Ciphertext in base64
    const combined = new Uint8Array(iv.length + cipherArray.length);
    combined.set(iv, 0);
    combined.set(cipherArray, iv.length);

    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (err) {
    console.error('Encryption error:', err);
    return plainText;
  }
}

// Decrypt base64 ciphertext with AES-GCM
export async function decryptData(cipherBase64, key) {
  try {
    const binary = atob(cipherBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return ab2str(decryptedBuffer);
  } catch (err) {
    console.error('Decryption error:', err);
    return cipherBase64;
  }
}
