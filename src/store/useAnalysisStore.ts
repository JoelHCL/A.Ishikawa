"use client";
import { create } from "zustand";
import { api } from "@/lib/api";

export type Categoria =
  | "MANO_DE_OBRA" | "METODO" | "MAQUINA"
  | "MATERIAL" | "MEDICION" | "MEDIO_AMBIENTE";

export type SubSub = { id?: string; texto: string };
export type Sub = { id?: string; texto: string; subSubCauses: SubSub[] };
export type Cause = {
  id?: string;
  categoria: Categoria;
  texto: string;
  estado: "SUPUESTA" | "VERIFICADA";
  evidencia?: string | null;
  accion?: string | null;
  responsable?: string | null;
  fechaLimite?: string | null;
  rootCauseId?: string | null;
  subCauses: Sub[];
};
export type Analysis = {
  id?: string;
  folio: string;
  proceso: string;
  efecto: string;
  participantes?: string | null;
  status: "BORRADOR" | "EN_REVISION" | "CERRADO";
  causes: Cause[];
};

type State = {
  analysis: Analysis | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  load: (id: string) => Promise<void>;
  setHeader: (p: Partial<Analysis>) => void;
  addCause: (c: Categoria) => void;
  updateCause: (i: number, p: Partial<Cause>) => void;
  removeCause: (i: number) => void;
  addSub: (i: number) => void;
  updateSub: (i: number, j: number, texto: string) => void;
  removeSub: (i: number, j: number) => void;
  addSubSub: (i: number, j: number) => void;
  updateSubSub: (i: number, j: number, k: number, texto: string) => void;
  removeSubSub: (i: number, j: number, k: number) => void;
  save: () => Promise<void>;
};

const MAX_SUBSUB = 5; // tope duro, alineado con el esquema Zod del servidor

export const useAnalysisStore = create<State>((set, get) => ({
  analysis: null,
  loading: false,
  saving: false,
  error: null,
  dirty: false,

  load: async (id) => {
    set({ loading: true, error: null });
    try {
      const a = await api.get<any>(`/api/analyses/${id}`);
      set({
        analysis: {
          id: a.id,
          folio: a.folio,
          proceso: a.proceso,
          efecto: a.efecto,
          participantes: a.participantes,
          status: a.status,
          causes: (a.causes ?? []).map((c: any) => ({
            id: c.id,
            categoria: c.categoria,
            texto: c.texto,
            estado: c.estado,
            evidencia: c.evidencia,
            accion: c.accion,
            responsable: c.responsable,
            fechaLimite: c.fechaLimite ? String(c.fechaLimite).slice(0, 10) : null,
            rootCauseId: c.rootCauseId,
            subCauses: (c.subCauses ?? []).map((s: any) => ({
              id: s.id,
              texto: s.texto,
              subSubCauses: (s.subSubCauses ?? []).map((x: any) => ({ id: x.id, texto: x.texto })),
            })),
          })),
        },
        loading: false,
        dirty: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setHeader: (p) => {
    const a = get().analysis;
    if (!a) return;
    set({ analysis: { ...a, ...p }, dirty: true });
  },

  addCause: (categoria) => {
    const a = get().analysis;
    if (!a) return;
    set({
      analysis: {
        ...a,
        causes: [
          ...a.causes,
          { categoria, texto: "", estado: "SUPUESTA", evidencia: "", subCauses: [] },
        ],
      },
      dirty: true,
    });
  },

  updateCause: (i, p) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) => (idx === i ? { ...c, ...p } : c));
    set({ analysis: { ...a, causes }, dirty: true });
  },

  removeCause: (i) => {
    const a = get().analysis;
    if (!a) return;
    set({ analysis: { ...a, causes: a.causes.filter((_, idx) => idx !== i) }, dirty: true });
  },

  addSub: (i) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx === i ? { ...c, subCauses: [...c.subCauses, { texto: "", subSubCauses: [] }] } : c
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  updateSub: (i, j, texto) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx !== i ? c : { ...c, subCauses: c.subCauses.map((s, jd) => (jd === j ? { ...s, texto } : s)) }
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  removeSub: (i, j) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx !== i ? c : { ...c, subCauses: c.subCauses.filter((_, jd) => jd !== j) }
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  addSubSub: (i, j) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx !== i
        ? c
        : {
            ...c,
            subCauses: c.subCauses.map((s, jd) =>
              jd !== j || s.subSubCauses.length >= MAX_SUBSUB
                ? s
                : { ...s, subSubCauses: [...s.subSubCauses, { texto: "" }] }
            ),
          }
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  updateSubSub: (i, j, k, texto) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx !== i
        ? c
        : {
            ...c,
            subCauses: c.subCauses.map((s, jd) =>
              jd !== j
                ? s
                : { ...s, subSubCauses: s.subSubCauses.map((x, kd) => (kd === k ? { texto } : x)) }
            ),
          }
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  removeSubSub: (i, j, k) => {
    const a = get().analysis;
    if (!a) return;
    const causes = a.causes.map((c, idx) =>
      idx !== i
        ? c
        : {
            ...c,
            subCauses: c.subCauses.map((s, jd) =>
              jd !== j ? s : { ...s, subSubCauses: s.subSubCauses.filter((_, kd) => kd !== k) }
            ),
          }
    );
    set({ analysis: { ...a, causes }, dirty: true });
  },

  save: async () => {
    const a = get().analysis;
    if (!a?.id) return;
    set({ saving: true, error: null });
    try {
      await api.put(`/api/analyses/${a.id}`, a);
      set({ saving: false, dirty: false });
    } catch (e: any) {
      // El servidor rechaza VERIFICADA sin evidencia. El error llega aquí tal cual.
      set({ error: e.message, saving: false });
    }
  },
}));
