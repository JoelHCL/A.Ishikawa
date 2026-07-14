import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Traduce errores a respuestas limpias. Nunca filtra stack traces al cliente. */
export function fail(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 }
    );
  }
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}
