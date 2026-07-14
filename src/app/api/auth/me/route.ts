import { getSession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function GET() {
  const s = await getSession();
  return ok(s ?? null);
}
