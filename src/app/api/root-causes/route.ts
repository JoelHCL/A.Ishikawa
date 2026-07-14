import { prisma } from "@/lib/db";
import { rootCauseSchema } from "@/lib/validation";
import { requireSession, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

/**
 * Catálogo canónico de causas raíz.
 * Ligar una causa aquí es lo que permite CONTAR repeticiones entre análisis.
 * Sin catálogo, "Falta de capacitación" y "falta de capacitacion" serían
 * dos cosas distintas y el conteo mentiría.
 */
export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "1"; // el admin ve también las PROPUESTA

    const items = await prisma.rootCause.findMany({
      where: all ? {} : { status: "APROBADA" },
      orderBy: { nombre: "asc" },
      include: { _count: { select: { causes: true } } },
    });
    return ok(
      items.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        categoria: r.categoria,
        status: r.status,
        usos: r._count.causes,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}

/**
 * Un ANALYST puede PROPONER una causa raíz nueva; nace como PROPUESTA
 * y no cuenta para recurrencia hasta que el ADMIN la aprueba.
 * Un ADMIN la crea ya APROBADA.
 */
export async function POST(req: Request) {
  try {
    const s = await requireSession();
    if (s.role === "AUDITOR") throw new HttpError(403, "El auditor no propone causas.");
    const data = rootCauseSchema.parse(await req.json());

    const dup = await prisma.rootCause.findUnique({ where: { nombre: data.nombre } });
    if (dup) throw new HttpError(409, "Esa causa raíz ya existe en el catálogo.");

    const created = await prisma.rootCause.create({
      data: {
        ...data,
        descripcion: data.descripcion ?? null,
        status: s.role === "ADMIN" ? "APROBADA" : "PROPUESTA",
        createdById: s.userId,
      },
    });
    return ok(created, 201);
  } catch (e) {
    return fail(e);
  }
}
