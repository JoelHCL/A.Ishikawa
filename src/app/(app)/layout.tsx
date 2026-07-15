import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <div className="mx-auto max-w-6xl p-5">
      <header className="mb-6 flex flex-wrap items-center gap-4 border-b-2 border-[#1C2A33] pb-3 dark:border-[#E8E6E1]">
        <div className="mr-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Petrowax · Mesa de Control</p>
          <h1 className="text-lg font-semibold">Análisis de causa raíz</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="btn" href="/dashboard">Análisis</Link>
          <Link className="btn" href="/recurrentes">Causas recurrentes</Link>
          <Link className="btn" href="/perfil">Mi perfil</Link>
          {s?.role === "ADMIN" && <Link className="btn" href="/admin">Admin</Link>}
          <ThemeToggle />
          <LogoutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
