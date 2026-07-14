import { prisma } from "@/lib/db";
import { analysisSchema } from "@/lib/validation";
import { requireSession, HttpError, type Session } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

type Ctx = { params: { id: string } };

async function loadOwned(id: string, s: Session, write: boolean) {
  const a = await prisma.analysis.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Análisis no encontrado.");
  if (write) {
    if (s.role === "AUDITOR") throw new HttpError(403, "El auditor no puede editar.");
    if (s.role === "ANALYST" && a.ownerId !== s.userId)
      throw new HttpError(403, "Este análisis no es tuyo.");
    if (a.status === "CERRADO" && s.role !== "ADMIN")
      throw new HttpError(409, "El análisis está cerrado. Solo un administrador puede reabrirlo.");
  }
  return a;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const s = await requireSession();
    await loadOwned(params.id, s, false);

    const a = await prisma.analysis.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { name: true, email: true } },
        causes: {
          orderBy: { orden: "asc" },
          include: {
            rootCause: { select: { id: true, nombre: true, status: true } },
            subCauses: {
              orderBy: { orden: "asc" },
              include: { subSubCauses: { orderBy: { orden: "asc" } } },
            },
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { name: true } } },
        },
      },
    });
    return ok(a);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Guarda el análisis completo (encabezado + árbol de causas).
 * Estrategia: reemplazo transaccional del árbol. Con 11 usuarios sin concurrencia
 * es correcto y mucho más simple que un diff incremental. Ver README.
 */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const s = await requireSession();
    await loadOwned(params.id, s, true);
    const data = analysisSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      await tx.analysis.update({
        where: { id: params.id },
        data: {
          folio: data.folio,
          proceso: data.proceso,
          efecto: data.efecto,
          participantes: data.participantes ?? null,
          status: data.status,
        },
      });

      // Cascade borra sub y sub-sub automáticamente.
      await tx.cause.deleteMany({ where: { analysisId: params.id } });

      for (let i = 0; i < data.causes.length; i++) {
        const c = data.causes[i];
        await tx.cause.create({
          data: {
            analysisId: params.id,
            categoria: c.categoria,
            texto: c.texto,
            estado: c.estado,
            evidencia: c.evidencia ?? null,
            accion: c.estado === "VERIFICADA" ? c.accion ?? null : null,
            responsable: c.estado === "VERIFICADA" ? c.responsable ?? null : null,
            fechaLimite: c.fechaLimite ? new Date(c.fechaLimite) : null,
            rootCauseId: c.rootCauseId ?? null,
            orden: i,
            subCauses: {
              create: c.subCauses.map((sc: (typeof c.subCauses)[number], j: number) => ({
                texto: sc.texto,
                orden: j,
                subSubCauses: {
                  create: sc.subSubCauses.slice(0, 5).map((ss: { texto: string }, k: number) => ({ texto: ss.texto, orden: k })),
                },
              })),
            },
          },
        });
      }

      const verificadas = data.causes.filter((c) => c.estado === "VERIFICADA").length;
      await tx.auditLog.create({
        data: {
          analysisId: params.id,
          userId: s.userId,
          action: "UPDATE_ANALYSIS",
          detail: `${data.causes.length} causa(s), ${verificadas} verificada(s), estado ${data.status}`,
        },
      });

      return { saved: true };
    });

    return ok(result);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const s = await requireSession();
    await loadOwned(params.id, s, true);
    await prisma.analysis.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
