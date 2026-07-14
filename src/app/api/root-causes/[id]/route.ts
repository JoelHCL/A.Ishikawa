import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PROPUESTA", "APROBADA", "RECHAZADA"]).optional(),
  nombre: z.string().min(3).optional(),
  descripcion: z.string().nullable().optional(),
});

// Solo el ADMIN aprueba, renombra o rechaza entradas del catálogo.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const data = patchSchema.parse(await req.json());
    const updated = await prisma.rootCause.update({ where: { id: params.id }, data });
    return ok(updated);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // Las causas ligadas quedan con rootCauseId = null (onDelete: SetNull), no se pierde el análisis.
    await prisma.rootCause.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
