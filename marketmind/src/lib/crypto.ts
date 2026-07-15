import crypto from "crypto";

/**
 * AES-256-GCM encryption for brokerage provider tokens at rest.
 * Key comes from BROKERAGE_ENCRYPTION_KEY (64 hex chars). In dev, a key is
 * derived from NEXTAUTH_SECRET so the app runs without extra setup — set a
 * dedicated random key in production.
 */
function key(): Buffer {
  const hex = process.env.BROKERAGE_ENCRYPTION_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Set BROKERAGE_ENCRYPTION_KEY (64 hex chars) or NEXTAUTH_SECRET");
  return crypto.createHash("sha256").update(`brokerage:${secret}`).digest();
}

export function encryptJson(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson<T = unknown>(blob: string): T {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}

/** Short-lived signed state for link flows (CSRF protection on callbacks). */
export function signState(payload: Record<string, unknown>, ttlMs = 15 * 60_000): string {
  return encryptJson({ ...payload, exp: Date.now() + ttlMs });
}

export function verifyState<T extends Record<string, unknown>>(state: string): T | null {
  try {
    const data = decryptJson<T & { exp: number }>(state);
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
