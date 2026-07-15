"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Perfil() {
  const [me, setMe] = useState<{ name: string; email: string; role: string } | null>(null);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>("/api/auth/me").then((s) => {
      if (s) { setMe(s); setName(s.name); }
    });
  }, []);

  async function saveName() {
    setErr(null); setMsg(null);
    try { await api.patch("/api/me", { name }); setMsg("Nombre actualizado."); }
    catch (e: any) { setErr(e.message); }
  }
  async function savePass() {
    setErr(null); setMsg(null);
    try {
      await api.patch("/api/me", { currentPassword: cur, newPassword: nw });
      setMsg("Contraseña actualizada."); setCur(""); setNw("");
    } catch (e: any) { setErr(e.message); }
  }

  if (!me) return <p className="text-sm text-[#8A96A0]">Cargando…</p>;

  return (
    <>
      <h2 className="mb-4 text-base font-semibold">Mi perfil</h2>
      {msg && <p className="mb-3 rounded-lg border border-[#0F6E56] bg-[#E4F4EE] p-2 text-sm text-[#0F6E56]">{msg}</p>}
      {err && <p className="mb-3 rounded-lg border border-[#A32D2D] bg-[#FBEBEB] p-2 text-sm text-[#A32D2D]">{err}</p>}

      <div className="card mb-4 max-w-md">
        <p className="mb-2 text-sm text-[#8A96A0]">
          {me.email} · rol {me.role} <span className="text-xs">(el correo y el rol solo los cambia el admin)</span>
        </p>
        <label className="label">Nombre</label>
        <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" onClick={saveName}>Guardar nombre</button>
      </div>

      <div className="card max-w-md">
        <h3 className="mb-2 font-semibold">Cambiar contraseña</h3>
        <label className="label">Contraseña actual</label>
        <input className="input mb-3" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <label className="label">Nueva contraseña (mín. 10)</label>
        <input className="input mb-3" type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
        <button className="btn btn-primary" onClick={savePass}>Actualizar contraseña</button>
      </div>
    </>
  );
}
