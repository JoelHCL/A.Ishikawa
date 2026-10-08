import ExcelJS from "exceljs";
import { requireSession, HttpError } from "@/lib/auth";
import { computeRecurrence } from "@/lib/recurrence";
import { CATEGORIA_LABEL } from "@/lib/validation";

/**
 * Exporta el reporte de causas recurrentes a Excel (.xlsx) para Contraloría.
 * Usa exactamente los mismos números que la vista (misma función compartida).
 */
export async function GET(req: Request) {
  try {
    await requireSession();
    const min = Number(new URL(req.url).searchParams.get("min") ?? 2);
    const { total, rows } = await computeRecurrence(min);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Ishikawa · Petrowax";
    wb.created = new Date();

    // --- Hoja 1: Resumen (una fila por causa raíz) ---
    const ws = wb.addWorksheet("Causas recurrentes");
    ws.columns = [
      { header: "Causa raíz", key: "nombre", width: 40 },
      { header: "Categoría (6M)", key: "categoria", width: 18 },
      { header: "Área(s) responsable(s)", key: "areas", width: 28 },
      { header: "Apariciones", key: "apariciones", width: 12 },
      { header: "Verificadas", key: "verificadas", width: 12 },
      { header: "Reincidente", key: "reincidente", width: 12 },
      { header: "% del total", key: "pct", width: 11 },
      { header: "% acumulado", key: "pctAcum", width: 12 },
      { header: "Folios", key: "folios", width: 40 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2A33" } };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    rows.forEach((r) => {
      const row = ws.addRow({
        nombre: r.nombre,
        categoria: CATEGORIA_LABEL[r.categoria] ?? r.categoria,
        areas: r.areas.length ? r.areas.join(", ") : "— sin asignar —",
        apariciones: r.apariciones,
        verificadas: r.verificadas,
        reincidente: r.reincidente ? "SÍ" : "No",
        pct: r.pct / 100,
        pctAcum: r.pctAcumulado / 100,
        folios: r.analyses.map((a) => a.folio).join(", "),
      });
      row.getCell("pct").numFmt = "0%";
      row.getCell("pctAcum").numFmt = "0%";
      if (r.reincidente) {
        row.getCell("reincidente").font = { bold: true, color: { argb: "FFA32D2D" } };
      }
      if (!r.areas.length) {
        row.getCell("areas").font = { color: { argb: "FFA35A0F" } };
      }
    });

    // --- Hoja 2: Detalle (una fila por aparición) ---
    const wd = wb.addWorksheet("Detalle por análisis");
    wd.columns = [
      { header: "Causa raíz", key: "nombre", width: 40 },
      { header: "Folio", key: "folio", width: 20 },
      { header: "Proceso", key: "proceso", width: 26 },
      { header: "Estado análisis", key: "status", width: 16 },
      { header: "Fecha", key: "fecha", width: 14 },
    ];
    wd.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wd.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2A33" } };
    rows.forEach((r) => {
      r.analyses.forEach((a) => {
        const row = wd.addRow({
          nombre: r.nombre,
          folio: a.folio,
          proceso: a.proceso,
          status: a.status,
          fecha: new Date(a.fecha),
        });
        row.getCell("fecha").numFmt = "dd/mm/yyyy";
      });
    });

    // --- Hoja 3: Por área (agregado que pidió Contraloría) ---
    const wa = wb.addWorksheet("Por área");
    wa.columns = [
      { header: "Área responsable", key: "area", width: 28 },
      { header: "Causas raíz recurrentes", key: "causas", width: 22 },
      { header: "Apariciones totales", key: "apar", width: 18 },
    ];
    wa.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wa.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2A33" } };
    const porArea = new Map<string, { causas: number; apar: number }>();
    rows.forEach((r) => {
      const areas = r.areas.length ? r.areas : ["— sin asignar —"];
      areas.forEach((a) => {
        const cur = porArea.get(a) ?? { causas: 0, apar: 0 };
        cur.causas += 1;
        cur.apar += r.apariciones;
        porArea.set(a, cur);
      });
    });
    Array.from(porArea.entries())
      .sort((a, b) => b[1].apar - a[1].apar)
      .forEach(([area, v]) => wa.addRow({ area, causas: v.causas, apar: v.apar }));

    const buffer = await wb.xlsx.writeBuffer();
    const fecha = new Date().toISOString().slice(0, 10);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="causas-recurrentes-${fecha}.xlsx"`,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) return new Response(e.message, { status: e.status });
    console.error(e);
    return new Response("Error al generar el reporte.", { status: 500 });
  }
}
