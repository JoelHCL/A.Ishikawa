import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  cookies().delete(COOKIE_NAME);
  return ok({ done: true });
}
