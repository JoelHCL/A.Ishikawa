import { prisma } from "@/lib/db";

export type RecurrenceRow = {
  rootCauseId: string;
  nombre: string;
  categoria: string;
  apariciones: number;
  verificadas: number;
  reincidente: boolean;
  areas: string[]; // áreas responsables distintas ligadas a esta causa raíz
  analyses: { id: string; folio: string; proceso: string; status: string; fecha: Date }[];
  pct: number;
  pctAcumulado: number;
};

/**
 * Cálculo único de recurrencia, usado por el API JSON y por la exportación,
 * para que ambos den EXACTAMENTE los mismos números.
 */
export async function computeRecurrence(min = 2): Promise<{ total: number; rows: RecurrenceRow[] }> {
  const roots = await prisma.rootCause.findMany({
    where: { status: "APROBADA" },
    include: {
      causes: {
        include: {
          area: { select: { nombre: true } },
          analysis: { select: { id: true, folio: true, proceso: true, status: true, fecha: true } },
        },
      },
    },
  });

  const base = roots
    .map((r) => {
      const byAnalysis = new Map<string, (typeof r.causes)[number]["analysis"]>();
      r.causes.forEach((c) => byAnalysis.set(c.analysis.id, c.analysis));
      const analyses = Array.from(byAnalysis.values()).sort(
        (a, b) => +new Date(a.fecha) - +new Date(b.fecha)
      );

      const cerrados = analyses.filter((a) => a.status === "CERRADO");
      const primerCierre = cerrados[0] ? new Date(cerrados[0].fecha) : null;
      const reincidente = !!primerCierre && analyses.some((a) => new Date(a.fecha) > primerCierre);

      const verificadas = r.causes.filter((c) => c.estado === "VERIFICADA").length;
      const areas = Array.from(
        new Set(r.causes.map((c) => c.area?.nombre).filter((n): n is string => !!n))
      );

      return {
        rootCauseId: r.id,
        nombre: r.nombre,
        categoria: r.categoria,
        apariciones: analyses.length,
        verificadas,
        reincidente,
        areas,
        analyses,
      };
    })
    .filter((r) => r.apariciones >= min)
    .sort((a, b) => b.apariciones - a.apariciones);

  const total = base.reduce((s, r) => s + r.apariciones, 0);
  let acc = 0;
  const rows: RecurrenceRow[] = base.map((r) => {
    acc += r.apariciones;
    return {
      ...r,
      pct: total ? Math.round((r.apariciones / total) * 100) : 0,
      pctAcumulado: total ? Math.round((acc / total) * 100) : 0,
    };
  });

  return { total, rows };
}
