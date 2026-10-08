"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

type Stage = "password" | "enroll" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const r = await api.post<{ stage: Stage }>("/api/auth/login", parsed.data);
      if (r.stage === "enroll") {
        const s = await api.get<{ qr: string; secret: string }>("/api/auth/2fa/setup");
        setQr(s.qr); setSecret(s.secret); setStage("enroll");
      } else {
        setStage("verify");
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function submitCode() {
    setError(null);
    if (code.replace(/\s/g, "").length < 6) return setError("Escribe el código de 6 dígitos.");
    setBusy(true);
    try {
      await api.post("/api/auth/2fa/verify", { code });
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#51606A]">Petrowax México</p>
        <h1 className="mb-1 mt-1 text-xl font-semibold">Ishikawa · Mesa de Control</h1>

        {stage === "password" && (
          <>
            <p className="mb-5 text-sm text-[#8A96A0]">
              El acceso lo da de alta el administrador. No hay registro público.
            </p>
            <label className="label">Correo</label>
            <input className="input mb-3" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()} autoComplete="username" />
            <label className="label">Contraseña</label>
            <input className="input mb-4" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()} autoComplete="current-password" />
            {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}
            <button className="btn btn-primary w-full justify-center" onClick={submitPassword} disabled={busy}>
              {busy ? "Verificando…" : "Continuar"}
            </button>
          </>
        )}

        {stage === "enroll" && (
          <>
            <p className="mb-3 text-sm text-[#8A96A0]">
              Configura tu segundo factor <b>una sola vez</b>. Abre <b>Google Authenticator</b> o
              <b> Microsoft Authenticator</b> en tu celular y escanea este código:
            </p>
            {qr && <img src={qr} alt="Código QR 2FA" className="mx-auto mb-3 h-44 w-44 rounded border border-[#E5DECF]" />}
            {secret && (
              <p className="mb-3 text-center text-xs text-[#8A96A0]">
                ¿No puedes escanear? Captura esta clave:<br />
                <span className="font-mono text-[13px] tracking-wider text-[#1C2A33]">{secret}</span>
              </p>
            )}
            <label className="label">Código que muestra la app (6 dígitos)</label>
            <input className="input mb-4 text-center font-mono text-lg tracking-widest" value={code}
              inputMode="numeric" maxLength={6}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCode()} />
            {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}
            <button className="btn btn-primary w-full justify-center" onClick={submitCode} disabled={busy}>
              {busy ? "Activando…" : "Activar y entrar"}
            </button>
          </>
        )}

        {stage === "verify" && (
          <>
            <p className="mb-4 text-sm text-[#8A96A0]">
              Escribe el código de 6 dígitos que muestra tu app autenticadora.
            </p>
            <label className="label">Código (6 dígitos)</label>
            <input className="input mb-4 text-center font-mono text-lg tracking-widest" value={code}
              inputMode="numeric" maxLength={6} autoFocus
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCode()} />
            {error && <p className="mb-3 text-sm text-[#A32D2D]">{error}</p>}
            <button className="btn btn-primary w-full justify-center" onClick={submitCode} disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
