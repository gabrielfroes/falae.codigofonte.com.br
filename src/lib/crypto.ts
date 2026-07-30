import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptografia dos access tokens em repouso (accounts.access_token_encrypted).
// Chave: 32 bytes em hex (openssl rand -hex 32) via TOKEN_ENCRYPTION_KEY.

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("TOKEN_ENCRYPTION_KEY não configurada");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY precisa ter 32 bytes (64 caracteres hex)");
  }
  return key;
}

export function encryptToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Formato inválido de token criptografado");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plainText = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plainText.toString("utf8");
}
