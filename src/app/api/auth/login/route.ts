import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { newSecret, encryptSecret, signPending, pendingCookieOptions, PENDING_COOKIE_NAME } from "@/lib/twofa";

/**
 * PASO 1 del login: valida contraseña + anti fuerza bruta.
 * NO entrega la sesión todavía: siempre exige el segundo factor (2FA/TOTP).
 * - Si el usuario aún no configuró 2FA -> stage "enroll" (mostrará el QR).
 * - Si ya lo tiene            -> stage "verify" (pedirá el código).
 * En ambos casos deja una cookie intermedia de 5 min y el PASO 2 la completa.
 */

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;
const HASH_SENUELO = "$2a$12$QNL4nuzhOhhx33csBxiVKuXdsxXbOAFKPhxtDaOS/2krloQeyExye";

export async function POST(req: Request) {
  try {
    const { email, password } = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    const bad = new HttpError(401, "Correo o contraseña incorrectos.");

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new HttpError(429, `Demasiados intentos fallidos. Cuenta bloqueada ${min} minuto(s).`);
    }

    const valid = await bcrypt.compare(password, user?.password ?? HASH_SENUELO);

    if (!user || !user.active || !valid) {
      if (user && user.active) {
        const intentos = user.failedAttempts + 1;
        const bloquear = intentos >= MAX_INTENTOS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: bloquear ? 0 : intentos,
            lockedUntil: bloquear ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000) : null,
          },
        });
        if (bloquear) throw new HttpError(429, `Demasiados intentos fallidos. Cuenta bloqueada ${BLOQUEO_MINUTOS} minutos.`);
      }
      throw bad;
    }

    // Contraseña correcta -> limpiar contador de intentos.
    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });

    // ¿Ya tiene 2FA configurado?
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      cookies().set(PENDING_COOKIE_NAME, await signPending({ userId: user.id, stage: "verify" }), pendingCookieOptions());
      return ok({ stage: "verify" });
    }

    // Primera vez: generar secreto (cifrado) y pasar a enrolamiento.
    const secret = newSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false },
    });
    cookies().set(PENDING_COOKIE_NAME, await signPending({ userId: user.id, stage: "enroll" }), pendingCookieOptions());
    return ok({ stage: "enroll" });
  } catch (e) {
    return fail(e);
  }
}
