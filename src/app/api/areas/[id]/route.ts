import { prisma } from "@/lib/db";
import { requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { z } from "zod";

const patch = z.object({
  nombre: z.string().min(2).optional(),
  activa: z.boolean().optional(),
});

// Renombrar o activar/desactivar un área. Desactivar la oculta del selector
// pero conserva las causas que ya la usaban (no se borra el historial).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const data = patch.parse(await req.json());
    const updated = await prisma.area.update({ where: { id: params.id }, data });
    return ok(updated);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // Las causas ligadas quedan con areaId = null (onDelete: SetNull); no se pierden.
    await prisma.area.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
