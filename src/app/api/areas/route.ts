import { prisma } from "@/lib/db";
import { areaSchema } from "@/lib/validation";
import { requireSession, requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

// Cualquiera autenticado lee el catálogo (para el selector en las causas).
export async function GET(req: Request) {
  try {
    await requireSession();
    const all = new URL(req.url).searchParams.get("all") === "1"; // admin ve inactivas
    const areas = await prisma.area.findMany({
      where: all ? {} : { activa: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { causes: true } } },
    });
    return ok(areas.map((a) => ({ id: a.id, nombre: a.nombre, activa: a.activa, usos: a._count.causes })));
  } catch (e) {
    return fail(e);
  }
}

// Solo el admin da de alta áreas (catálogo cerrado).
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = areaSchema.parse(await req.json());
    const dup = await prisma.area.findUnique({ where: { nombre: data.nombre } });
    if (dup) throw new HttpError(409, "Esa área ya existe en el catálogo.");
    const created = await prisma.area.create({ data });
    return ok(created, 201);
  } catch (e) {
    return fail(e);
  }
}
