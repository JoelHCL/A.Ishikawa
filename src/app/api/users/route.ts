import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createUserSchema } from "@/lib/validation";
import { requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

// El registro público NO existe. Solo el ADMIN da de alta usuarios.
export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, active: true,
        createdAt: true, lockedUntil: true, failedAttempts: true, lastLoginAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return ok(users);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = createUserSchema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new HttpError(409, "Ya existe un usuario con ese correo.");

    const user = await prisma.user.create({
      data: { ...data, password: await bcrypt.hash(data.password, 12) },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    return ok(user, 201);
  } catch (e) {
    return fail(e);
  }
}
