"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    try {
      await api.post("/api/auth/login", parsed.data);
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#51606A]">
          Petrowax México
        </p>
        <h1 className="mb-1 mt-1 text-xl font-semibold">Ishikawa · Mesa de Control</h1>
        <p className="mb-5 text-sm text-[#8A96A0]">
          El acceso lo da de alta el administrador. No hay registro público.
        </p>

        <label className="label">Correo</label>
        <input className="input mb-3" value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete="username" />

        <label className="label">Contraseña</label>
        <input className="input mb-4" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete="current-password" />

        {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}

        <button className="btn btn-primary w-full justify-center" onClick={submit} disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </main>
  );
}
