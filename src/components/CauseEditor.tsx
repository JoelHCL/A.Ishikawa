"use client";
import { useEffect, useState } from "react";
import { useAnalysisStore, type Cause } from "@/store/useAnalysisStore";
import { api } from "@/lib/api";
import type { RootCauseOption } from "@/app/(app)/analysis/[id]/page";

const MAX_SUBSUB = 5;

type Recurrence = { apariciones: number; reincidente: boolean; analyses: { folio: string }[] };

export default function CauseEditor({
  index, cause, roots,
}: { index: number; cause: Cause; roots: RootCauseOption[] }) {
  const {
    updateCause, removeCause, addSub, updateSub, removeSub,
    addSubSub, updateSubSub, removeSubSub,
  } = useAnalysisStore();

  const [rec, setRec] = useState<Recurrence | null>(null);

  // Al ligar la causa al catálogo, avisamos si ya apareció antes en otros análisis.
  useEffect(() => {
    if (!cause.rootCauseId) return setRec(null);
    api
      .get<{ rows: any[] }>("/api/recurrence?min=1")
      .then((d) => {
        const r = d.rows.find((x) => x.rootCauseId === cause.rootCauseId);
        setRec(r ? { apariciones: r.apariciones, reincidente: r.reincidente, analyses: r.analyses } : null);
      })
      .catch(() => {});
  }, [cause.rootCauseId]);

  const verificada = cause.estado === "VERIFICADA";

  return (
    <div className="mb-3 rounded-lg border border-[#E5DECF] bg-[#FCFBF8] p-3 dark:border-[#2A3136] dark:bg-[#1F252A]">
      <div className="grid gap-2 md:grid-cols-[1.7fr_130px_1.7fr_30px]">
        <textarea className="input min-h-[38px]" placeholder="Causa" value={cause.texto}
          onChange={(e) => updateCause(index, { texto: e.target.value })} />

        <select
          className={`input ${verificada ? "border-[#0F6E56] bg-[#E4F4EE] font-semibold text-[#0F6E56]" : "border-[#A32D2D] bg-[#FBEBEB] font-semibold text-[#A32D2D]"}`}
          value={cause.estado}
          onChange={(e) => updateCause(index, { estado: e.target.value as any })}
        >
          <option value="SUPUESTA">Supuesta</option>
          <option value="VERIFICADA">Verificada</option>
        </select>

        <textarea
          className={`input min-h-[38px] ${verificada && !cause.evidencia?.trim() ? "border-[#A32D2D]" : ""}`}
          placeholder={verificada ? "Evidencia / dato (obligatoria)" : "Evidencia / dato"}
          value={cause.evidencia ?? ""}
          onChange={(e) => updateCause(index, { evidencia: e.target.value })}
        />

        <button className="text-[#8A96A0] hover:text-[#A32D2D]" title="Eliminar causa"
          onClick={() => removeCause(index)}>✕</button>
      </div>

      {verificada && !cause.evidencia?.trim() && (
        <p className="mt-1 text-xs text-[#A32D2D]">
          Una causa verificada requiere evidencia. El servidor va a rechazar el guardado.
        </p>
      )}

      {/* Ligado al catálogo: lo que permite contar repeticiones entre análisis */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-[#51606A]">
          Causa raíz (catálogo)
        </label>
        <select className="input max-w-[280px]" value={cause.rootCauseId ?? ""}
          onChange={(e) => updateCause(index, { rootCauseId: e.target.value || null })}>
          <option value="">— sin ligar —</option>
          {roots.map((r) => (
            <option key={r.id} value={r.id}>{r.nombre} ({r.usos})</option>
          ))}
        </select>

        {rec && rec.apariciones > 1 && (
          <span className="rounded-full bg-[#FBEFD6] px-2 py-1 text-xs font-semibold text-[#B9750F]">
            Ya apareció en {rec.apariciones} análisis
          </span>
        )}
        {rec?.reincidente && (
          <span className="rounded-full bg-[#FBEBEB] px-2 py-1 text-xs font-semibold text-[#A32D2D]">
            REINCIDENTE — se cerró antes y volvió a aparecer
          </span>
        )}
      </div>

      {verificada && (
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input className="input" placeholder="Acción correctiva" value={cause.accion ?? ""}
            onChange={(e) => updateCause(index, { accion: e.target.value })} />
          <input className="input" placeholder="Responsable" value={cause.responsable ?? ""}
            onChange={(e) => updateCause(index, { responsable: e.target.value })} />
          <input className="input" type="date" value={cause.fechaLimite ?? ""}
            onChange={(e) => updateCause(index, { fechaLimite: e.target.value })} />
        </div>
      )}

      {/* Sub-causas y sub-sub-causas */}
      <div className="ml-2 mt-3 border-l-2 border-[#D8D0BF] pl-3">
        {cause.subCauses.map((s, j) => (
          <div key={j} className="mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8A96A0]">↳</span>
              <input className="input" placeholder="Sub-causa (¿por qué de la causa?)" value={s.texto}
                onChange={(e) => updateSub(index, j, e.target.value)} />
              <button className="text-[#8A96A0] hover:text-[#A32D2D]" onClick={() => removeSub(index, j)}>✕</button>
            </div>

            <div className="ml-6 mt-1 border-l-2 border-dotted border-[#D8D0BF] pl-3">
              {s.subSubCauses.map((x, k) => (
                <div key={k} className="mb-1 flex items-center gap-2">
                  <span className="text-xs text-[#8A96A0]">↳</span>
                  <input className="input text-xs" placeholder="Sub-sub-causa" value={x.texto}
                    onChange={(e) => updateSubSub(index, j, k, e.target.value)} />
                  <button className="text-[#8A96A0] hover:text-[#A32D2D]"
                    onClick={() => removeSubSub(index, j, k)}>✕</button>
                </div>
              ))}
              {s.subSubCauses.length < MAX_SUBSUB ? (
                <button className="btn border-dashed py-1 text-xs" onClick={() => addSubSub(index, j)}>
                  + sub-sub-causa
                </button>
              ) : (
                <span className="text-xs italic text-[#8A96A0]">máx. {MAX_SUBSUB} sub-sub-causas</span>
              )}
            </div>
          </div>
        ))}
        <button className="btn border-dashed py-1 text-xs" onClick={() => addSub(index)}>
          + sub-causa
        </button>
      </div>
    </div>
  );
}
