// End-to-End Encryption (E2EE) Module using Web Cryptography API
// Key Agreement: ECDH (P-256)
// Symmetric Encryption: AES-GCM (256-bit) with unique 12-byte IV per payload

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Generate or retrieve persistent user identity keypair
export async function getOrGenerateUserKeyPair(userId) {
  const storageKey = `ping_e2ee_keypair_${userId}`
  const saved = localStorage.getItem(storageKey)

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return parsed
    } catch {
      // Re-generate if corrupt
    }
  }

  // Generate ECDH P-256 keypair
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey)

  const keyData = { publicKey: publicKeyJwk, privateKey: privateKeyJwk }
  localStorage.setItem(storageKey, JSON.stringify(keyData))
  return keyData
}

// Derive shared AES-GCM key from my private key and peer's public key
const derivedKeysCache = new Map()

export async function deriveSharedAesKey(myPrivateKeyJwk, peerPublicKeyJwk) {
  const cacheKey = JSON.stringify(peerPublicKeyJwk)
  if (derivedKeysCache.has(cacheKey)) {
    return derivedKeysCache.get(cacheKey)
  }

  const myPrivateKey = await window.crypto.subtle.importKey(
    'jwk',
    myPrivateKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  )

  const peerPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    peerPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const sharedKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  derivedKeysCache.set(cacheKey, sharedKey)
  return sharedKey
}

// Encrypt plaintext string into AES-GCM ciphertext + IV
export async function encryptText(plaintext, sharedAesKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedAesKey,
    encoded
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv)
  }
}

// Decrypt AES-GCM ciphertext + IV into plaintext
export async function decryptText(ciphertextBase64, ivBase64, sharedAesKey) {
  try {
    const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64)
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64))

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedAesKey,
      ciphertextBuffer
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (err) {
    console.warn('Decryption failed:', err)
    return '[Decryption failed: signature mismatch]'
  }
}

// Generate Safety Numbers / Fingerprint between two users for verification
export async function computeSafetyNumber(myPublicKeyJwk, peerPublicKeyJwk) {
  if (!myPublicKeyJwk || !peerPublicKeyJwk) return '00000 00000 00000 00000'

  const keys = [myPublicKeyJwk.x + myPublicKeyJwk.y, peerPublicKeyJwk.x + peerPublicKeyJwk.y].sort()
  const combined = new TextEncoder().encode(keys.join(':'))
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined)
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // Convert hash bytes into 12 blocks of 5 digits (similar to Signal safety numbers)
  let digits = ''
  for (let i = 0; i < 12; i++) {
    const val = (hashArray[i * 2] << 8) | hashArray[i * 2 + 1]
    const block = String(val % 100000).padStart(5, '0')
    digits += (i > 0 && i % 4 === 0 ? '\n' : ' ') + block
  }

  return digits.trim()
}
