import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { signSession, cookieOptions, COOKIE_NAME, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

/**
 * SEGURIDAD DEL LOGIN
 *
 * 1) Bloqueo por intentos fallidos (anti fuerza bruta).
 *    El contador vive en la BASE DE DATOS, no en memoria: en Vercel cada
 *    petición puede caer en una instancia distinta, así que un contador en
 *    memoria sería inútil.
 *
 * 2) Tiempo de respuesta constante (anti enumeración de usuarios).
 *    Si el correo no existe, igual se ejecuta un bcrypt.compare contra un
 *    hash señuelo. Así un atacante no puede distinguir "correo inexistente"
 *    de "contraseña incorrecta" midiendo cuánto tarda la respuesta.
 */

const MAX_INTENTOS = 5;      // fallos permitidos antes de bloquear
const BLOQUEO_MINUTOS = 15;  // duración del bloqueo

// Hash señuelo (de una cadena aleatoria que nadie conoce). Solo sirve para
// gastar el mismo tiempo de CPU cuando el correo no existe.
const HASH_SENUELO = "$2a$12$QNL4nuzhOhhx33csBxiVKuXdsxXbOAFKPhxtDaOS/2krloQeyExye";

export async function POST(req: Request) {
  try {
    const { email, password } = loginSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });

    // Mensaje idéntico siempre: no revelamos si el correo existe ni si está inactivo.
    const bad = new HttpError(401, "Correo o contraseña incorrectos.");

    // --- Cuenta bloqueada por intentos fallidos ---
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutos = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new HttpError(
        429,
        `Demasiados intentos fallidos. Cuenta bloqueada ${minutos} minuto(s). ` +
          `Si no fuiste tú, avisa al administrador.`
      );
    }

    // Siempre se compara: si no hay usuario, contra el señuelo (tiempo constante).
    const valid = await bcrypt.compare(password, user?.password ?? HASH_SENUELO);

    if (!user || !user.active || !valid) {
      // Solo se cuentan los fallos de cuentas que existen y están activas.
      if (user && user.active) {
        const intentos = user.failedAttempts + 1;
        const debeBloquear = intentos >= MAX_INTENTOS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: debeBloquear ? 0 : intentos,
            lockedUntil: debeBloquear
              ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000)
              : null,
          },
        });
        if (debeBloquear) {
          throw new HttpError(
            429,
            `Demasiados intentos fallidos. Cuenta bloqueada ${BLOQUEO_MINUTOS} minutos.`
          );
        }
      }
      throw bad;
    }

    // --- Login correcto: se limpia el contador ---
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    cookies().set(COOKIE_NAME, token, cookieOptions());

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return fail(e);
  }
}
