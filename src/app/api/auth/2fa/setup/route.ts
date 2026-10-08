export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { verifyPending, decryptSecret, otpauthURL, PENDING_COOKIE_NAME } from "@/lib/twofa";

/**
 * Devuelve el QR (y el secreto en texto, por si no pueden escanear) para que
 * el usuario configure su app autenticadora. Solo accesible con la cookie
 * intermedia en etapa "enroll".
 */
export async function GET() {
  try {
    const pending = await verifyPending(cookies().get(PENDING_COOKIE_NAME)?.value);
    if (!pending || pending.stage !== "enroll")
      throw new HttpError(401, "Sesión de configuración no válida. Inicia sesión de nuevo.");

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (!user?.twoFactorSecret) throw new HttpError(400, "No hay secreto pendiente.");

    const secret = decryptSecret(user.twoFactorSecret);
    const url = otpauthURL(user.email, secret);
    const qr = await QRCode.toDataURL(url);
    return ok({ qr, secret }); // secret: para captura manual si el QR falla
  } catch (e) {
    return fail(e);
  }
}
