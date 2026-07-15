import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireAdmin, HttpError } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

/**
 * El admin resetea la contraseña de un usuario.
 * El sistema genera una temporal aleatoria y la devuelve UNA sola vez
 * (nunca se guarda en claro; se muestra al admin para comunicarla).
 */
function tempPassword(): string {
  // 12 chars legibles, sin caracteres ambiguos.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) throw new HttpError(404, "Usuario no encontrado.");

    const temp = tempPassword();
    await prisma.user.update({
      where: { id: params.id },
      data: { password: await bcrypt.hash(temp, 12) },
    });
    // Se devuelve en claro SOLO en esta respuesta. No se registra en ningún log.
    return ok({ email: target.email, tempPassword: temp });
  } catch (e) {
    return fail(e);
  }
}
