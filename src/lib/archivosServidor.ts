import { prisma } from "@/lib/db";
import { HttpError, type Session } from "@/lib/auth";

export const TIPOS_ARCHIVO = ["EVIDENCIA_CAUSA", "NO_CONFORMIDAD"] as const;
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[number];

export const MIMES_POR_TIPO: Record<TipoArchivo, string[]> = {
  EVIDENCIA_CAUSA: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
  NO_CONFORMIDAD: ["application/pdf"],
};

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Detecta el tipo REAL por los primeros bytes. El Content-Type y la extensión
 * que declara el navegador los controla quien sube el archivo, así que no se usan.
 */
export function detectarMime(buf: Buffer): string | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/** Limpia el nombre y fuerza una extensión que coincida con el tipo detectado. */
export function nombreSeguro(original: string, mime: string): string {
  const limpio = original.replace(/[\u0000-\u001f\u007f"\\/<>:*?|]/g, "_").trim().slice(0, 120);
  const sinExt = limpio.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  return `${sinExt || "archivo"}.${EXT[mime] ?? "bin"}`;
}

/** Mismas reglas de acceso que /api/analyses/[id] (ahí viven dentro del route, que no puede exportarlas). */
export async function cargarAnalisis(id: string, s: Session, write: boolean) {
  const a = await prisma.analysis.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Análisis no encontrado.");
  if (write) {
    if (s.role === "AUDITOR") throw new HttpError(403, "El auditor no puede editar.");
    if (s.role === "ANALYST" && a.ownerId !== s.userId) throw new HttpError(403, "Este análisis no es tuyo.");
    if (a.status === "CERRADO" && s.role !== "ADMIN")
      throw new HttpError(409, "El análisis está cerrado. Solo un administrador puede reabrirlo.");
  }
  return a;
}
