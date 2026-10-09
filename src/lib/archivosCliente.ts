// Parte de archivos que es segura para el navegador (sin Buffer, sin auth).
// El servidor importa de aquí la constante del tope para que ambos lados coincidan.

export type TipoArchivo = "EVIDENCIA_CAUSA" | "NO_CONFORMIDAD";
export type ArchivoRef = { id: string; nombre: string; mime: string; tamano: number };

// Tope por archivo. El límite de cuerpo de una función en Vercel es ~4.5 MB.
export const MAX_ARCHIVO_MB = 4;
export const MAX_ARCHIVO_BYTES = MAX_ARCHIVO_MB * 1024 * 1024;

export function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sube un archivo al análisis y devuelve su referencia. No usa lib/api.ts porque ahí el Content-Type es JSON. */
export async function subirArchivo(analysisId: string, tipo: TipoArchivo, file: File): Promise<ArchivoRef> {
  if (file.size > MAX_ARCHIVO_BYTES) throw new Error(`El archivo excede ${MAX_ARCHIVO_MB} MB.`);
  const fd = new FormData();
  fd.append("tipo", tipo);
  fd.append("file", file);
  const res = await fetch(`/api/analyses/${analysisId}/archivos`, { method: "POST", body: fd });
  if (res.status === 413) throw new Error(`El archivo excede ${MAX_ARCHIVO_MB} MB.`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || "No se pudo subir el archivo.");
  return body as ArchivoRef;
}
