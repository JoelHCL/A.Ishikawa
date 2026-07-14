/**
 * Siembra ÚNICAMENTE al administrador.
 * Los 10 usuarios se dan de alta desde el panel /admin dentro de la app.
 *
 * La contraseña se lee de ADMIN_PASSWORD (variable de entorno).
 * NUNCA se escribe en el código ni se sube a Git.
 *
 *   ADMIN_PASSWORD='...' npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "mesadecontrol@petrowax.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 10) {
    throw new Error(
      "Define ADMIN_PASSWORD (mínimo 10 caracteres) antes de sembrar.\n" +
        "Ejemplo:  ADMIN_PASSWORD='tu-contraseña-larga' npm run db:seed"
    );
  }

  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Mesa de Control", password: hash, role: "ADMIN" },
  });

  console.log(`Administrador listo: ${admin.email}`);
  console.log("Ahora entra a /admin para dar de alta a los 10 analistas.");
  console.log("Borra ADMIN_PASSWORD de tu .env.");
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
