"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const d = document.documentElement.classList.contains("dark");
    setDark(d);
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  };
  return (
    <button className="btn" onClick={toggle} title="Cambiar tema">
      {dark ? "Claro" : "Oscuro"}
    </button>
  );
}
