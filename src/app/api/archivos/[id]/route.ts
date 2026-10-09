import { prisma } from "@/lib/db";
import { requireSession, HttpError } from "@/lib/auth";
import { fail } from "@/lib/http";
import { cargarAnalisis } from "@/lib/archivosServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Entrega un archivo solo a quien tenga sesión y acceso de lectura al análisis. `?descargar=1` fuerza descarga. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    const a = await prisma.archivo.findUnique({ where: { id: params.id } });
    if (!a) throw new HttpError(404, "Archivo no encontrado.");
    await cargarAnalisis(a.analysisId, s, false);

    const descargar = new URL(req.url).searchParams.get("descargar") === "1";
    return new Response(new Uint8Array(a.datos), {
      headers: {
        "Content-Type": a.mime, // el validado al subir, no uno que mande el cliente
        "Content-Length": String(a.tamano),
        "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="archivo"; filename*=UTF-8''${encodeURIComponent(a.nombre)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
