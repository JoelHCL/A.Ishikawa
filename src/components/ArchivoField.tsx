"use client";
import { useRef, useState } from "react";
import {
  subirArchivo, formatoTamano, MAX_ARCHIVO_MB,
  type ArchivoRef, type TipoArchivo,
} from "@/lib/archivosCliente";

/**
 * Selector de archivo que sube al instante y devuelve la referencia.
 * La referencia solo queda ligada al análisis cuando se pulsa "Guardar cambios".
 */
export default function ArchivoField({
  analysisId, tipo, accept, valor, onChange, ayuda,
}: {
  analysisId: string;
  tipo: TipoArchivo;
  accept: string;
  valor: ArchivoRef | null | undefined;
  onChange: (a: ArchivoRef | null) => void;
  ayuda?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setSubiendo(true);
    try {
      onChange(await subirArchivo(analysisId, tipo, f));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      {valor ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#51606A]">Adjunto:</span>
          <span className="font-medium">{valor.nombre}</span>
          <span className="text-xs text-[#8A96A0]">({formatoTamano(valor.tamano)})</span>
          <a className="btn py-1 text-xs" href={`/api/archivos/${valor.id}`} target="_blank" rel="noopener noreferrer">Ver</a>
          <a className="btn py-1 text-xs" href={`/api/archivos/${valor.id}?descargar=1`}>Descargar</a>
          <button type="button" className="btn py-1 text-xs hover:border-[#A32D2D] hover:text-[#A32D2D]"
            onClick={() => onChange(null)}>Quitar</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept={accept} disabled={subiendo} className="text-sm"
            onChange={(e) => elegir(e.target.files?.[0])} />
          {subiendo && <span className="text-xs text-[#8A96A0]">Subiendo…</span>}
        </div>
      )}
      <p className="mt-1 text-xs text-[#8A96A0]">{ayuda ?? `Máx. ${MAX_ARCHIVO_MB} MB.`}</p>
      {error && <p className="mt-1 text-xs text-[#A32D2D]">{error}</p>}
    </div>
  );
}
