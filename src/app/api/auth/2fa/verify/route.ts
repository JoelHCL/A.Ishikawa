import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { signSession, cookieOptions, COOKIE_NAME } from "@/lib/auth";
import { verifyPending, decryptSecret, verifyCode, PENDING_COOKIE_NAME } from "@/lib/twofa";
import { z } from "zod";

const schema = z.object({ code: z.string().min(6).max(8) });

/**
 * PASO 2 del login: valida el código de 6 dígitos.
 * Si venía de "enroll", además marca el 2FA como activado.
 * Al pasar, recién aquí se entrega la sesión real.
 */
export async function POST(req: Request) {
  try {
    const pending = await verifyPending(cookies().get(PENDING_COOKIE_NAME)?.value);
    if (!pending) throw new HttpError(401, "El paso de verificación expiró. Inicia sesión de nuevo.");

    const { code } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (!user?.twoFactorSecret || !user.active) throw new HttpError(401, "Usuario no válido.");

    const valido = verifyCode(code, decryptSecret(user.twoFactorSecret));
    if (!valido) throw new HttpError(401, "Código incorrecto o expirado. Intenta con el código actual de tu app.");

    // Enrolamiento: primera confirmación -> activa 2FA.
    if (pending.stage === "enroll" && !user.twoFactorEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Entregar la sesión real y limpiar la cookie intermedia.
    const token = await signSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
    cookies().set(COOKIE_NAME, token, cookieOptions());
    cookies().delete(PENDING_COOKIE_NAME);

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return fail(e);
  }
}
