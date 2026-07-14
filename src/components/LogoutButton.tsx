"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        await api.post("/api/auth/logout", {});
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
