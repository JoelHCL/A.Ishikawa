import { prisma } from "@/lib/db";
import { analysisSchema } from "@/lib/validation";
import { requireSession, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    const s = await requireSession();
    // ADMIN y AUDITOR ven todo; ANALYST solo lo suyo.
    const where = s.role === "ANALYST" ? { ownerId: s.userId } : {};
    const analyses = await prisma.analysis.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { name: true } },
        _count: { select: { causes: true } },
        causes: { select: { estado: true } },
      },
    });
    return ok(
      analyses.map((a) => ({
        id: a.id,
        folio: a.folio,
        proceso: a.proceso,
        efecto: a.efecto,
        status: a.status,
        fecha: a.fecha,
        owner: a.owner.name,
        totalCausas: a._count.causes,
        verificadas: a.causes.filter((c) => c.estado === "VERIFICADA").length,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const s = await requireSession();
    if (s.role === "AUDITOR") throw new HttpError(403, "El auditor no captura análisis.");
    const data = analysisSchema.parse(await req.json());

    const dup = await prisma.analysis.findUnique({ where: { folio: data.folio } });
    if (dup) throw new HttpError(409, "Ya existe un análisis con ese folio.");

    const created = await prisma.analysis.create({
      data: {
        folio: data.folio,
        proceso: data.proceso,
        efecto: data.efecto,
        participantes: data.participantes ?? null,
        status: data.status,
        ownerId: s.userId,
        logs: { create: { action: "CREATE_ANALYSIS", userId: s.userId, detail: data.folio } },
      },
    });
    return ok(created, 201);
  } catch (e) {
    return fail(e);
  }
}
