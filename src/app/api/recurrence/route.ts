import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

/**
 * MOTOR DE RECURRENCIA — el apartado que justifica esta app.
 *
 * Cuenta, POR CAUSA RAÍZ DEL CATÁLOGO, en cuántos análisis distintos aparece.
 * Devuelve además dos señales que ningún Ishikawa individual puede dar:
 *
 *  - `reincidente`: la causa raíz ya apareció en un análisis CERRADO
 *    (o sea: se tomó una acción correctiva) y volvió a aparecer después.
 *    Traducción: la acción no funcionó.
 *  - Pareto acumulado sobre el número de apariciones.
 */
export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const minApariciones = Number(url.searchParams.get("min") ?? 2); // "repetidas" = 2+

    const roots = await prisma.rootCause.findMany({
      where: { status: "APROBADA" },
      include: {
        causes: {
          include: {
            analysis: {
              select: { id: true, folio: true, proceso: true, status: true, fecha: true },
            },
          },
        },
      },
    });

    const rows = roots
      .map((r) => {
        // Un análisis puede mencionar la misma causa raíz en dos categorías: cuenta 1 vez.
        const byAnalysis = new Map<string, (typeof r.causes)[number]["analysis"]>();
        r.causes.forEach((c) => byAnalysis.set(c.analysis.id, c.analysis));
        const analyses = Array.from(byAnalysis.values()).sort(
          (a, b) => +new Date(a.fecha) - +new Date(b.fecha)
        );

        const cerrados = analyses.filter((a) => a.status === "CERRADO");
        const primerCierre = cerrados[0] ? new Date(cerrados[0].fecha) : null;
        // Reincidencia: apareció DESPUÉS de que un análisis previo se cerró.
        const reincidente =
          !!primerCierre && analyses.some((a) => new Date(a.fecha) > primerCierre);

        const verificadas = r.causes.filter((c) => c.estado === "VERIFICADA").length;

        return {
          rootCauseId: r.id,
          nombre: r.nombre,
          categoria: r.categoria,
          apariciones: analyses.length,
          verificadas,
          reincidente,
          analyses: analyses.map((a) => ({
            id: a.id,
            folio: a.folio,
            proceso: a.proceso,
            status: a.status,
            fecha: a.fecha,
          })),
        };
      })
      .filter((r) => r.apariciones >= minApariciones)
      .sort((a, b) => b.apariciones - a.apariciones);

    // Pareto acumulado
    const total = rows.reduce((s, r) => s + r.apariciones, 0);
    let acc = 0;
    const withPareto = rows.map((r) => {
      acc += r.apariciones;
      return {
        ...r,
        pct: total ? Math.round((r.apariciones / total) * 100) : 0,
        pctAcumulado: total ? Math.round((acc / total) * 100) : 0,
      };
    });

    return ok({ total, rows: withPareto });
  } catch (e) {
    return fail(e);
  }
}
