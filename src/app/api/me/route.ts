import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation";
import { requireSession, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

// El propio usuario cambia su nombre y/o su contraseña (exige la actual).
export async function PATCH(req: Request) {
  try {
    const s = await requireSession();
    const data = updateProfileSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    if (!user) throw new HttpError(404, "Usuario no encontrado.");

    const patch: { name?: string; password?: string } = {};
    if (data.name) patch.name = data.name;

    if (data.newPassword) {
      const okPass = await bcrypt.compare(data.currentPassword ?? "", user.password);
      if (!okPass) throw new HttpError(401, "La contraseña actual no es correcta.");
      patch.password = await bcrypt.hash(data.newPassword, 12);
    }

    if (Object.keys(patch).length === 0) throw new HttpError(400, "Nada que actualizar.");

    await prisma.user.update({ where: { id: s.userId }, data: patch });
    return ok({ updated: true });
  } catch (e) {
    return fail(e);
  }
}
