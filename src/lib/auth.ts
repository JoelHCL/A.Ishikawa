import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE = "ishikawa_token";
const ALG = "HS256";
// 8 h: cubre una jornada. Al vencer, se vuelve a iniciar sesión.
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Falta JWT_SECRET en las variables de entorno.");
  return new TextEncoder().encode(s);
}

export type Session = { userId: string; email: string; name: string; role: Role };

export async function signSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

/** Cookie HttpOnly: el token nunca es legible desde JavaScript del cliente. */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export const COOKIE_NAME = COOKIE;

/** Sesión actual en Server Components y route handlers. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Úsala en las rutas de API: lanza 401 si no hay sesión. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "No autenticado.");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== "ADMIN") throw new HttpError(403, "Requiere permisos de administrador.");
  return s;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
