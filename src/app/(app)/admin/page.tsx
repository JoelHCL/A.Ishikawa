"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CATEGORIA_LABEL, CATEGORIAS } from "@/lib/validation";

type User = { id: string; email: string; name: string; role: string; active: boolean };
type Root = { id: string; nombre: string; categoria: string; status: string; usos: number };

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [roots, setRoots] = useState<Root[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tempPass, setTempPass] = useState<{ email: string; pass: string } | null>(null);
  const [nu, setNu] = useState({ email: "", name: "", password: "", role: "ANALYST" });
  const [nr, setNr] = useState({ nombre: "", categoria: "METODO" });

  const reload = () => {
    api.get<User[]>("/api/users").then(setUsers).catch((e) => setError(e.message));
    api.get<Root[]>("/api/root-causes?all=1").then(setRoots).catch(() => {});
  };
  useEffect(reload, []);

  async function createUser() {
    setError(null);
    try {
      await api.post("/api/users", nu);
      setNu({ email: "", name: "", password: "", role: "ANALYST" });
      reload();
    } catch (e: any) { setError(e.message); }
  }

  async function toggleActive(u: User) {
    setError(null);
    try { await api.patch(`/api/users/${u.id}`, { active: !u.active }); reload(); }
    catch (e: any) { setError(e.message); }
  }

  async function resetPass(u: User) {
    setError(null);
    if (!confirm(`¿Generar una contraseña temporal nueva para ${u.email}? La actual dejará de servir.`)) return;
    try {
      const r = await api.post<{ email: string; tempPassword: string }>(`/api/users/${u.id}/reset-password`, {});
      setTempPass({ email: r.email, pass: r.tempPassword });
    } catch (e: any) { setError(e.message); }
  }

  async function createRoot() {
    setError(null);
    try { await api.post("/api/root-causes", nr); setNr({ nombre: "", categoria: "METODO" }); reload(); }
    catch (e: any) { setError(e.message); }
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/api/root-causes/${id}`, { status }); reload();
  }

  async function deleteRoot(r: Root) {
    setError(null);
    const extra = r.usos > 0 ? `\n\nOJO: está ligada a ${r.usos} causa(s) en análisis; esas causas quedarán "sin ligar" (los análisis NO se borran).` : "";
    if (!confirm(`¿Borrar la causa raíz "${r.nombre}" del catálogo?${extra}`)) return;
    try { await api.del(`/api/root-causes/${r.id}`); reload(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}

      {tempPass && (
        <div className="card mb-4 border-2 border-[#B9750F] bg-[#FBEFD6]">
          <p className="text-sm">
            Contraseña temporal para <b>{tempPass.email}</b>. Se muestra <b>una sola vez</b> —
            cópiala y entrégala por un canal seguro. Pídele que la cambie en su perfil al entrar.
          </p>
          <p className="my-2 rounded bg-white p-2 font-mono text-lg tracking-wider">{tempPass.pass}</p>
          <button className="btn" onClick={() => setTempPass(null)}>Ya la copié, ocultar</button>
        </div>
      )}

      <div className="card mb-5">
        <h2 className="mb-1 font-semibold">Usuarios</h2>
        <p className="mb-3 text-sm text-[#8A96A0]">
          No hay registro público: las cuentas se crean aquí. Desactivar corta el acceso sin
          borrar el historial de sus análisis.
        </p>
        <div className="grid gap-2 md:grid-cols-5">
          <input className="input" placeholder="Correo" value={nu.email}
            onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          <input className="input" placeholder="Nombre" value={nu.name}
            onChange={(e) => setNu({ ...nu, name: e.target.value })} />
          <input className="input" type="password" placeholder="Contraseña (mín. 10)"
            value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <select className="input" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
            <option value="ANALYST">Analista</option>
            <option value="AUDITOR">Auditor (solo lectura)</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <button className="btn btn-primary justify-center" onClick={createUser}>Dar de alta</button>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-[#8A96A0]">
              <th className="p-2">Nombre</th><th className="p-2">Correo</th><th className="p-2">Rol</th>
              <th className="p-2">Estado</th><th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[#E5DECF] dark:border-[#2A3136]">
                <td className="p-2">{u.name}</td>
                <td className="p-2 font-mono text-xs">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">
                  <span className={u.active ? "text-[#0F6E56]" : "text-[#A32D2D]"}>
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="btn py-1 text-xs" onClick={() => toggleActive(u)}>
                      {u.active ? "Desactivar" : "Reactivar"}
                    </button>
                    <button className="btn py-1 text-xs" onClick={() => resetPass(u)}>
                      Resetear contraseña
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">Catálogo de causas raíz</h2>
        <p className="mb-3 text-sm text-[#8A96A0]">
          Solo las APROBADAS cuentan para recurrencia. Si registran una mal, bórrala:
          los análisis que la usaban quedan "sin ligar", no se borran.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="input" placeholder="Nombre canónico de la causa raíz"
            value={nr.nombre} onChange={(e) => setNr({ ...nr, nombre: e.target.value })} />
          <select className="input" value={nr.categoria}
            onChange={(e) => setNr({ ...nr, categoria: e.target.value })}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
          </select>
          <button className="btn btn-primary justify-center" onClick={createRoot}>Agregar (aprobada)</button>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-[#8A96A0]">
              <th className="p-2">Causa raíz</th><th className="p-2">Categoría</th>
              <th className="p-2">Usos</th><th className="p-2">Estado</th><th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roots.map((r) => (
              <tr key={r.id} className="border-t border-[#E5DECF] dark:border-[#2A3136]">
                <td className="p-2">{r.nombre}</td>
                <td className="p-2">{CATEGORIA_LABEL[r.categoria]}</td>
                <td className="p-2">{r.usos}</td>
                <td className="p-2">
                  <span className={r.status === "APROBADA" ? "text-[#0F6E56]" : "text-[#B9750F]"}>
                    {r.status}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    {r.status !== "APROBADA" && (
                      <button className="btn py-1 text-xs" onClick={() => setStatus(r.id, "APROBADA")}>Aprobar</button>
                    )}
                    <button className="btn py-1 text-xs hover:border-[#A32D2D] hover:text-[#A32D2D]"
                      onClick={() => deleteRoot(r)}>Borrar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
