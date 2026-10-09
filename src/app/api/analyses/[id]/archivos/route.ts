import { prisma } from "@/lib/db";
import { requireSession, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import {
  cargarAnalisis, detectarMime, nombreSeguro, TIPOS_ARCHIVO, MIMES_POR_TIPO, type TipoArchivo,
} from "@/lib/archivosServidor";
import { MAX_ARCHIVO_BYTES, MAX_ARCHIVO_MB } from "@/lib/archivosCliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sube un archivo a un análisis (multipart: `tipo` + `file`).
 * Solo guarda el archivo y devuelve su referencia; el vínculo con la causa o con
 * el análisis se hace al guardar el análisis (PUT), que valida que el archivo
 * pertenezca a este mismo análisis.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await requireSession();
    await cargarAnalisis(params.id, s, true);

    const form = await req.formData().catch(() => null);
    if (!form) throw new HttpError(400, "Solicitud inválida.");

    const tipo = String(form.get("tipo") ?? "");
    if (!(TIPOS_ARCHIVO as readonly string[]).includes(tipo)) throw new HttpError(422, "Tipo de archivo inválido.");
    const t = tipo as TipoArchivo;

    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(422, "Adjunta un archivo.");
    if (file.size === 0) throw new HttpError(422, "El archivo está vacío.");
    if (file.size > MAX_ARCHIVO_BYTES) throw new HttpError(413, `El archivo excede ${MAX_ARCHIVO_MB} MB.`);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectarMime(buf);
    if (!mime || !MIMES_POR_TIPO[t].includes(mime)) {
      throw new HttpError(
        422,
        t === "NO_CONFORMIDAD" ? "La no conformidad debe ser un PDF." : "La evidencia debe ser PDF, PNG, JPG o WEBP."
      );
    }

    const nombre = nombreSeguro(file.name, mime);
    const archivo = await prisma.archivo.create({
      data: { tipo: t, nombre, mime, tamano: buf.length, datos: buf, analysisId: params.id, subidoPorId: s.userId },
      select: { id: true, nombre: true, mime: true, tamano: true },
    });
    await prisma.auditLog.create({
      data: { analysisId: params.id, userId: s.userId, action: "UPLOAD_FILE", detail: `${t}: ${nombre}` },
    });
    return ok(archivo, 201);
  } catch (e) {
    return fail(e);
  }
}
