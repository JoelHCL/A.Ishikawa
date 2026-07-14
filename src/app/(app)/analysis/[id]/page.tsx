"use client";
import { useEffect, useState } from "react";
import { useAnalysisStore, type Categoria } from "@/store/useAnalysisStore";
import { CATEGORIA_LABEL, CATEGORIAS } from "@/lib/validation";
import Fishbone from "@/components/Fishbone";
import CauseEditor from "@/components/CauseEditor";
import { api } from "@/lib/api";

export type RootCauseOption = { id: string; nombre: string; categoria: string; usos: number };

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { analysis, load, setHeader, save, saving, error, dirty, addCause } = useAnalysisStore();
  const [expanded, setExpanded] = useState<Set<Categoria>>(new Set());
  const [roots, setRoots] = useState<RootCauseOption[]>([]);

  useEffect(() => {
    load(params.id);
    api.get<RootCauseOption[]>("/api/root-causes").then(setRoots).catch(() => {});
  }, [params.id, load]);

  if (!analysis) return <p className="text-sm text-[#8A96A0]">Cargando…</p>;

  const toggle = (c: Categoria) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });

  const total = analysis.causes.filter((c) => c.texto.trim()).length;
  const ver = analysis.causes.filter((c) => c.estado === "VERIFICADA").length;
  const pct = total ? Math.round((ver / total) * 100) : 0;

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div>
          <label className="label">Folio</label>
          <input className="input font-mono" value={analysis.folio}
            onChange={(e) => setHeader({ folio: e.target.value })} />
        </div>
        <div>
          <label className="label">Proceso / línea</label>
          <input className="input" value={analysis.proceso}
            onChange={(e) => setHeader({ proceso: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Efecto — concreto y medible</label>
          <input className="input border-2 border-[#B23A1E] bg-[#FAE7E0] font-semibold dark:bg-[#3A2019]"
            value={analysis.efecto} onChange={(e) => setHeader({ efecto: e.target.value })} />
        </div>
      </div>

      <div className="card mb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#51606A]">Diagrama</p>
        <Fishbone
          efecto={analysis.efecto}
          folio={analysis.folio}
          causes={analysis.causes}
          expanded={expanded}
          onToggle={toggle}
          onPickCategory={(c) => document.getElementById(`cat-${c}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="h-2.5 min-w-[180px] flex-1 overflow-hidden rounded-full border border-[#E5DECF] bg-[#FBEBEB]">
            <div className="h-full bg-[#0F6E56]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[#51606A]">{ver} de {total} causas verificadas ({pct}%)</span>
          <span className="font-semibold text-[#A32D2D]">Solo las verificadas generan acciones.</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="input max-w-[220px]" value={analysis.status}
          onChange={(e) => setHeader({ status: e.target.value as any })}>
          <option value="BORRADOR">Borrador</option>
          <option value="EN_REVISION">En revisión</option>
          <option value="CERRADO">Cerrado</option>
        </select>
        <button className="btn btn-primary ml-auto" onClick={save} disabled={saving || !dirty}>
          {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#A32D2D] bg-[#FBEBEB] p-3 text-sm text-[#A32D2D]">
          {error}
        </p>
      )}

      {CATEGORIAS.map((cat) => {
        const idxs = analysis.causes
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c.categoria === cat);
        return (
          <div key={cat} id={`cat-${cat}`} className="card mb-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B9750F]" />
              <h3 className="font-semibold">{CATEGORIA_LABEL[cat]}</h3>
              <span className="ml-auto text-xs text-[#8A96A0]">{idxs.length} causa(s)</span>
            </div>
            {idxs.map(({ c, i }) => (
              <CauseEditor key={i} index={i} cause={c} roots={roots} />
            ))}
            <button className="btn w-full justify-center border-dashed text-[#B9750F]"
              onClick={() => { addCause(cat as Categoria); setExpanded((p) => new Set(p).add(cat as Categoria)); }}>
              + Agregar causa
            </button>
          </div>
        );
      })}
    </>
  );
}
