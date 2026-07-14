"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CATEGORIA_LABEL } from "@/lib/validation";

type Row = {
  rootCauseId: string; nombre: string; categoria: string;
  apariciones: number; verificadas: number; reincidente: boolean;
  pct: number; pctAcumulado: number;
  analyses: { id: string; folio: string; proceso: string; status: string }[];
};

export default function Recurrentes() {
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ total: number; rows: Row[] }>("/api/recurrence?min=2")
      .then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h2 className="mb-1 text-base font-semibold">Causas raíz recurrentes</h2>
      <p className="mb-4 text-sm text-[#8A96A0]">
        Causas del catálogo que aparecen en 2 o más análisis. Esto es lo que ningún
        Ishikawa individual puede mostrarte: el patrón sistémico.
      </p>

      {error && <p className="text-sm text-[#A32D2D]">{error}</p>}

      {data && !data.rows.length && (
        <div className="card text-sm text-[#8A96A0]">
          Todavía no hay causas raíz repetidas. Liga las causas de tus análisis al
          catálogo para que empiecen a contarse.
        </div>
      )}

      {data?.rows.map((r) => (
        <div key={r.rootCauseId} className="card mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{r.nombre}</h3>
            <span className="rounded-full bg-[#EDE7D8] px-2 py-0.5 text-xs text-[#51606A]">
              {CATEGORIA_LABEL[r.categoria]}
            </span>
            {r.reincidente && (
              <span className="rounded-full bg-[#FBEBEB] px-2 py-0.5 text-xs font-bold text-[#A32D2D]">
                REINCIDENTE — la acción correctiva no funcionó
              </span>
            )}
            <span className="ml-auto text-sm">
              <b>{r.apariciones}</b> análisis · {r.pct}% (acum. {r.pctAcumulado}%)
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded bg-[#EDE7D8]">
            <div className="h-full bg-[#B9750F]" style={{ width: `${r.pct}%` }} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {r.analyses.map((a) => (
              <Link key={a.id} href={`/analysis/${a.id}`}
                className="rounded border border-[#D8D0BF] px-2 py-1 hover:border-[#1C2A33]">
                <span className="font-mono">{a.folio}</span> · {a.proceso}
                {a.status === "CERRADO" && <span className="ml-1 text-[#0F6E56]">✓</span>}
              </Link>
            ))}
          </div>

          {r.verificadas === 0 && (
            <p className="mt-2 text-xs text-[#A32D2D]">
              Se repite, pero nunca se ha verificado con datos. Puede ser una creencia
              compartida, no una causa real.
            </p>
          )}
        </div>
      ))}
    </>
  );
}
