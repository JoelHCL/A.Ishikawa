import { authenticator } from "otplib";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * 2FA por TOTP (app autenticadora tipo Google/Microsoft Authenticator).
 * No requiere servidor de correo: el código lo genera el teléfono del usuario.
 *
 * El secreto TOTP se guarda CIFRADO en la base (AES-256-GCM). Si alguien
 * leyera la base, no podría reconstruir los códigos.
 */

const ISSUER = "Ishikawa Petrowax";
authenticator.options = { window: 1 }; // tolera 1 paso (±30s) por desfase de reloj

// Clave de cifrado del secreto. Variable dedicada: NO reutilizar JWT_SECRET,
// porque si rotas el JWT no quieres invalidar todos los 2FA.
function encKey(): Buffer {
  const raw = process.env.TWOFA_ENC_KEY;
  if (!raw) throw new Error("Falta TWOFA_ENC_KEY en las variables de entorno.");
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const [ivB, tagB, dataB] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

export function newSecret(): string {
  return authenticator.generateSecret();
}

/** URL otpauth:// que se convierte en QR para escanear con la app. */
export function otpauthURL(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

/** Valida el código de 6 dígitos contra el secreto. */
export function verifyCode(code: string, secret: string): boolean {
  try {
    return authenticator.check(code.replace(/\s/g, ""), secret);
  } catch {
    return false;
  }
}

// ---- Token intermedio "pre-2FA": prueba que la contraseña ya fue validada ----
// Vive 5 minutos. Es distinto de la sesión real: solo sirve para el paso del código.
const PENDING_COOKIE = "twofa_pending";
const PENDING_TTL = 300; // segundos

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Falta JWT_SECRET.");
  return new TextEncoder().encode(s);
}

export type Pending = { userId: string; stage: "enroll" | "verify" };

export async function signPending(p: Pending): Promise<string> {
  return new SignJWT({ ...p, kind: "twofa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL}s`)
    .sign(secret());
}

export async function verifyPending(token: string | undefined): Promise<Pending | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.kind !== "twofa_pending") return null;
    return { userId: payload.userId as string, stage: payload.stage as Pending["stage"] };
  } catch {
    return null;
  }
}

export function pendingCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PENDING_TTL,
  };
}

export const PENDING_COOKIE_NAME = PENDING_COOKIE;
