import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { signSession, cookieOptions, COOKIE_NAME, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const { email, password } = loginSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });
    // Mensaje idéntico en ambos casos: no revelamos si el correo existe.
    const bad = new HttpError(401, "Correo o contraseña incorrectos.");
    if (!user || !user.active) throw bad;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw bad;

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    cookies().set(COOKIE_NAME, token, cookieOptions());

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return fail(e);
  }
}
