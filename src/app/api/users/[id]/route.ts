import { prisma } from "@/lib/db";
import { adminUpdateUserSchema } from "@/lib/validation";
import { requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

/**
 * Admin: desactivar/reactivar y desbloquear cuentas.
 * Desactivar NO borra: conserva el historial de sus análisis.
 * Desbloquear limpia el bloqueo por intentos fallidos (sin esperar los 15 min).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const data = adminUpdateUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new HttpError(404, "Usuario no encontrado.");

    if (params.id === admin.userId && data.active === false)
      throw new HttpError(400, "No puedes desactivar tu propia cuenta de administrador.");

    const patch: Record<string, unknown> = {};
    if (data.active !== undefined) patch.active = data.active;
    if (data.unlock) {
      patch.lockedUntil = null;
      patch.failedAttempts = 0;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: patch,
      select: { id: true, active: true, lockedUntil: true },
    });
    return ok(updated);
  } catch (e) {
    return fail(e);
  }
}
