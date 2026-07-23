import { z } from "zod";

// Un solo esquema, usado por el cliente Y el servidor. No se duplican reglas.

export const CATEGORIAS = [
  "MANO_DE_OBRA",
  "METODO",
  "MAQUINA",
  "MATERIAL",
  "MEDICION",
  "MEDIO_AMBIENTE",
] as const;

export const CATEGORIA_LABEL: Record<string, string> = {
  MANO_DE_OBRA: "Mano de obra",
  METODO: "Método",
  MAQUINA: "Máquina",
  MATERIAL: "Material",
  MEDICION: "Medición",
  MEDIO_AMBIENTE: "Medio ambiente",
};

export const loginSchema = z.object({
  email: z.string().email("Correo inválido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export const createUserSchema = z.object({
  email: z.string().email("Correo inválido."),
  name: z.string().min(2, "Nombre demasiado corto."),
  password: z.string().min(10, "Mínimo 10 caracteres."),
  role: z.enum(["ADMIN", "ANALYST", "AUDITOR"]).default("ANALYST"),
});

export const subSubCauseSchema = z.object({
  id: z.string().optional(),
  texto: z.string().min(1),
});

export const subCauseSchema = z.object({
  id: z.string().optional(),
  texto: z.string().min(1),
  // TOPE DURO: 5 sub-sub-causas. Ver README, sección "Límites deliberados".
  subSubCauses: z.array(subSubCauseSchema).max(5, "Máximo 5 sub-sub-causas.").default([]),
});

export const causeSchema = z
  .object({
    id: z.string().optional(),
    categoria: z.enum(CATEGORIAS),
    texto: z.string().min(3, "Describe la causa."),
    estado: z.enum(["SUPUESTA", "VERIFICADA"]).default("SUPUESTA"),
    evidencia: z.string().nullable().optional(),
    accion: z.string().nullable().optional(),
    responsable: z.string().nullable().optional(),
    fechaLimite: z.string().nullable().optional(),
    rootCauseId: z.string().nullable().optional(),
    subCauses: z.array(subCauseSchema).default([]),
  })
  // CANDADO 2, ahora aplicado en el servidor y no por buena voluntad:
  // no se puede marcar VERIFICADA sin evidencia.
  .refine((c) => c.estado !== "VERIFICADA" || (c.evidencia?.trim().length ?? 0) > 0, {
    message: "Una causa VERIFICADA requiere evidencia o dato que la respalde.",
    path: ["evidencia"],
  })
  // Solo las causas verificadas generan acciones correctivas.
  .refine((c) => !c.accion?.trim() || c.estado === "VERIFICADA", {
    message: "Solo una causa VERIFICADA puede tener acción correctiva.",
    path: ["accion"],
  });

export const analysisSchema = z.object({
  folio: z.string().min(3, "Folio requerido."),
  proceso: z.string().min(2, "Indica el proceso o línea."),
  // CANDADO 1: el efecto debe ser concreto. No se puede guardar vacío.
  efecto: z.string().min(10, "El efecto debe ser concreto y medible (mín. 10 caracteres)."),
  participantes: z.string().nullable().optional(),
  status: z.enum(["BORRADOR", "EN_REVISION", "CERRADO"]).default("BORRADOR"),
  causes: z.array(causeSchema).default([]),
});

export const rootCauseSchema = z.object({
  nombre: z.string().min(3, "Nombre de la causa raíz."),
  descripcion: z.string().nullable().optional(),
  categoria: z.enum(CATEGORIAS),
});

export type AnalysisInput = z.infer<typeof analysisSchema>;
export type CauseInput = z.infer<typeof causeSchema>;

// --- Perfil propio y administración de usuarios ---
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto.").optional(),
  // Para cambiar la propia contraseña se exige la actual.
  currentPassword: z.string().optional(),
  newPassword: z.string().min(10, "La nueva contraseña debe tener mínimo 10 caracteres.").optional(),
}).refine((d) => !d.newPassword || (d.currentPassword?.length ?? 0) > 0, {
  message: "Para cambiar la contraseña, escribe también la actual.",
  path: ["currentPassword"],
});

export const adminUpdateUserSchema = z.object({
  active: z.boolean().optional(),
  unlock: z.boolean().optional(), // quita el bloqueo por intentos fallidos
}).refine((d) => d.active !== undefined || d.unlock !== undefined, {
  message: "Nada que actualizar.",
});
