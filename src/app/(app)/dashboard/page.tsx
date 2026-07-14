"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Row = {
  id: string; folio: string; proceso: string; efecto: string;
  status: string; owner: string; totalCausas: number; verificadas: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ folio: "", proceso: "", efecto: "" });

  useEffect(() => {
    api.get<Row[]>("/api/analyses").then(setRows).catch((e) => setError(e.message));
  }, []);

  async function create() {
    setError(null);
    try {
      const a = await api.post<{ id: string }>("/api/analyses", { ...form, status: "BORRADOR", causes: [] });
      router.push(`/analysis/${a.id}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold">Análisis</h2>
        <button className="btn btn-primary ml-auto" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancelar" : "Nuevo análisis"}
        </button>
      </div>

      {creating && (
        <div className="card mb-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">Folio</label>
              <input className="input" placeholder="FO-PETRO-DGA-001"
                value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} />
            </div>
            <div>
              <label className="label">Proceso / línea</label>
              <input className="input" placeholder="Llenado línea 2"
                value={form.proceso} onChange={(e) => setForm({ ...form, proceso: e.target.value })} />
            </div>
            <div>
              <label className="label">Efecto (concreto y medible)</label>
              <input className="input" placeholder="12% de envases fuera de peso (±5 g)…"
                value={form.efecto} onChange={(e) => setForm({ ...form, efecto: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary mt-3" onClick={create}>Crear</button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#8A96A0]">
              <th className="p-2">Folio</th><th className="p-2">Proceso</th>
              <th className="p-2">Efecto</th><th className="p-2">Estado</th>
              <th className="p-2">Verificadas</th><th className="p-2">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#E5DECF] dark:border-[#2A3136]">
                <td className="p-2 font-mono text-xs">
                  <Link className="underline" href={`/analysis/${r.id}`}>{r.folio}</Link>
                </td>
                <td className="p-2">{r.proceso}</td>
                <td className="p-2 max-w-[280px] truncate" title={r.efecto}>{r.efecto}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  <span className={r.verificadas === 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>
                    {r.verificadas}/{r.totalCausas}
                  </span>
                </td>
                <td className="p-2">{r.owner}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="p-3 text-[#8A96A0]" colSpan={6}>Aún no hay análisis.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
