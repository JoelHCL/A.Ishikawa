import { requireSession } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { computeRecurrence } from "@/lib/recurrence";

/**
 * MOTOR DE RECURRENCIA — el apartado que justifica esta app.
 * Cuenta, por causa raíz del catálogo, en cuántos análisis distintos aparece,
 * marca reincidencia y desglosa el/las área(s) responsable(s).
 * La lógica vive en src/lib/recurrence.ts (compartida con la exportación).
 */
export async function GET(req: Request) {
  try {
    await requireSession();
    const min = Number(new URL(req.url).searchParams.get("min") ?? 2);
    const data = await computeRecurrence(min);
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}
