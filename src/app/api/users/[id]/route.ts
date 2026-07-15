import { prisma } from "@/lib/db";
import { adminUpdateUserSchema } from "@/lib/validation";
import { requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

// Desactivar / reactivar (NO se borra: conserva el historial de sus análisis).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const { active } = adminUpdateUserSchema.parse(await req.json());

    if (params.id === admin.userId && !active)
      throw new HttpError(400, "No puedes desactivar tu propia cuenta de administrador.");

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new HttpError(404, "Usuario no encontrado.");

    await prisma.user.update({ where: { id: params.id }, data: { active } });
    return ok({ id: params.id, active });
  } catch (e) {
    return fail(e);
  }
}
