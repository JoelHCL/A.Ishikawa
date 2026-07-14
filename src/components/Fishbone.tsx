"use client";
import { useMemo } from "react";
import type { Cause, Categoria } from "@/store/useAnalysisStore";
import { CATEGORIA_LABEL } from "@/lib/validation";

/**
 * Espina de pescado. Layout dinámico: mide el texto envuelto, apila los bloques
 * según su altura REAL y el lienzo crece. Por eso nunca se trunca nada.
 */
const CATS: { key: Categoria; side: "top" | "bottom"; bx: number }[] = [
  { key: "MANO_DE_OBRA", side: "top", bx: 150 },
  { key: "METODO", side: "top", bx: 330 },
  { key: "MAQUINA", side: "top", bx: 510 },
  { key: "MATERIAL", side: "bottom", bx: 150 },
  { key: "MEDICION", side: "bottom", bx: 330 },
  { key: "MEDIO_AMBIENTE", side: "bottom", bx: 510 },
];

function wrap(text: string, maxChars: number): string[] {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["(vacío)"];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export default function Fishbone({
  efecto,
  folio,
  causes,
  expanded,
  onToggle,
  onPickCategory,
}: {
  efecto: string;
  folio: string;
  causes: Cause[];
  expanded: Set<Categoria>;
  onToggle: (c: Categoria) => void;
  onPickCategory: (c: Categoria) => void;
}) {
  const model = useMemo(() => {
    const byCat = new Map<Categoria, Cause[]>();
    CATS.forEach((c) => byCat.set(c.key, []));
    causes.forEach((c) => byCat.get(c.categoria)?.push(c));

    const meas = new Map<Categoria, { blocks: any[]; h: number }>();
    CATS.forEach(({ key }) => {
      const items = byCat.get(key)!;
      const blocks = items.map((it) => {
        const cl = wrap(it.texto || "(sin nombre)", 20);
        const boxH = cl.length * 13 + 12;
        const subs = it.subCauses.map((s) => ({
          lines: wrap(s.texto || "(sin texto)", 22),
          ss: s.subSubCauses.slice(0, 5).map((x) => wrap(x.texto || "(sin texto)", 18)),
        }));
        let subsH = 0;
        subs.forEach((sb) => {
          subsH += sb.lines.length * 11 + 3;
          sb.ss.forEach((s2) => (subsH += s2.length * 10 + 2));
          if (sb.ss.length) subsH += 2;
        });
        if (subs.length) subsH += 6;
        return { it, cl, boxH, subs, blockH: boxH + subsH + 16 };
      });
      const h = Math.max(blocks.reduce((s, b) => s + b.blockH, 0), 30);
      meas.set(key, { blocks, h });
    });
    return { byCat, meas };
  }, [causes]);

  const isOpen = (k: Categoria) => expanded.has(k);
  const hTop = Math.max(60, ...CATS.filter((c) => c.side === "top").map((c) => (isOpen(c.key) ? model.meas.get(c.key)!.h : 0)));
  const hBot = Math.max(60, ...CATS.filter((c) => c.side === "bottom").map((c) => (isOpen(c.key) ? model.meas.get(c.key)!.h : 0)));

  const HEADER_TOP = 46, HEADERH = 36;
  const topStart = HEADER_TOP + HEADERH + 16;
  const spineY = topStart + hTop + 30;
  const botStart = spineY + 30;
  const botHeaderY = botStart + hBot + 14;
  const canvasH = botHeaderY + HEADERH + 34;

  const nodes: JSX.Element[] = [];
  let key = 0;

  CATS.forEach((cat) => {
    const items = model.byCat.get(cat.key)!;
    const n = items.length;
    const bx = cat.bx, rx = bx - 78, w = 156, colR = bx;
    const headerY = cat.side === "top" ? HEADER_TOP : botHeaderY;
    const headerInner = cat.side === "top" ? headerY + HEADERH : headerY;
    const attachX = bx + 26;

    nodes.push(<line key={key++} x1={attachX} y1={spineY} x2={bx} y2={headerInner} stroke="#A99C82" strokeWidth={1.6} />);

    if (isOpen(cat.key) && n > 0) {
      const startY = cat.side === "top" ? topStart : botStart;
      const { blocks, h } = model.meas.get(cat.key)!;
      nodes.push(
        <line key={key++} x1={colR} y1={cat.side === "top" ? headerInner : startY}
          x2={colR} y2={cat.side === "top" ? startY + h : headerY} stroke="#CFC6B3" strokeWidth={1.4} />
      );
      let y = startY;
      blocks.forEach((b: any) => {
        const it = b.it as Cause;
        const col = it.estado === "VERIFICADA" ? "#0F6E56" : "#A35A0F";
        const subc = it.estado === "VERIFICADA" ? "#3F8F76" : "#B5793A";
        const subc2 = it.estado === "VERIFICADA" ? "#6FB49E" : "#C99A6A";
        const boxW = 150, bxx = colR - boxW, byy = y;

        nodes.push(<rect key={key++} x={bxx} y={byy} width={boxW} height={b.boxH} rx={6} fill="#FFFFFF" stroke={col} strokeWidth={1.3} />);
        b.cl.forEach((l: string, k2: number) =>
          nodes.push(<text key={key++} x={bxx + 8} y={byy + 16 + k2 * 13} fontSize={11} fontWeight={600} fill={col}>{l}</text>)
        );

        if (b.subs.length) {
          const Xr = colR - 8;
          const subTop = byy + b.boxH + 1;
          let y2 = byy + b.boxH + 13;
          let last = subTop;
          b.subs.forEach((sb: any) => {
            sb.lines.forEach((ln: string) => {
              nodes.push(<text key={key++} x={bxx + 8} y={y2} fontSize={9.5} fill={subc}>{ln}</text>);
              y2 += 11;
            });
            const uy = y2 - 8;
            nodes.push(<line key={key++} x1={bxx + 6} y1={uy} x2={Xr} y2={uy} stroke={subc} strokeWidth={1} />);
            last = uy; y2 += 3;
            sb.ss.forEach((s2: string[]) => {
              s2.forEach((ln) => {
                nodes.push(<text key={key++} x={bxx + 22} y={y2} fontSize={8.5} fill={subc2}>{ln}</text>);
                y2 += 10;
              });
              const uy2 = y2 - 7;
              nodes.push(<line key={key++} x1={bxx + 20} y1={uy2} x2={Xr} y2={uy2} stroke={subc2} strokeWidth={0.8} />);
              last = uy2; y2 += 2;
            });
            y2 += 3;
          });
          nodes.push(<line key={key++} x1={Xr} y1={subTop} x2={Xr} y2={last} stroke={subc} strokeWidth={1.2} />);
        }
        y += b.blockH;
      });
    }

    const fill = n > 0 ? "#E4F4EE" : "#FFFFFF";
    const stroke = n > 0 ? "#0F6E56" : "#C9BFA8";
    nodes.push(
      <g key={key++} style={{ cursor: "pointer" }} onClick={() => onPickCategory(cat.key)}>
        <rect x={rx} y={headerY} width={w} height={36} rx={8} fill={fill} stroke={stroke} strokeWidth={1.2} />
        <text x={bx - 12} y={headerY + 22} textAnchor="middle" fontSize={13.5} fontWeight={650} fill="#1C2A33">
          {CATEGORIA_LABEL[cat.key]}
        </text>
      </g>
    );
    const open = isOpen(cat.key);
    nodes.push(
      <g key={key++} style={{ cursor: "pointer" }} onClick={() => onToggle(cat.key)}>
        <title>{open ? "Ocultar" : "Mostrar"} ramas</title>
        <circle cx={rx + w - 15} cy={headerY + 18} r={12}
          fill={n > 0 ? (open ? "#0B5343" : "#0F6E56") : "#EDE7D8"}
          stroke={open ? "#0B5343" : n > 0 ? "#0F6E56" : "#D8D0BF"} strokeWidth={open ? 2 : 1} />
        <text x={rx + w - 15} y={headerY + 22} textAnchor="middle" fontSize={12} fontWeight={700}
          fill={n > 0 ? "#fff" : "#9A8F78"}>{n}</text>
      </g>
    );
  });

  const effLines = wrap(efecto || "Define el efecto (concreto y medible)", 30).slice(0, 3);

  return (
    <svg viewBox={`0 0 940 ${canvasH}`} className="w-full h-auto">
      <defs>
        <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#1C2A33" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <line x1={60} y1={spineY} x2={695} y2={spineY} stroke="#51606A" strokeWidth={2.4} markerEnd="url(#ar)" />

      <rect x={735} y={10} width={192} height={34} rx={8} fill="#EEF3FB" stroke="#1F4E79" strokeWidth={1.4} />
      <text x={747} y={31} fontSize={12} fill="#1F4E79" fontWeight={700}>Folio:</text>
      <text x={792} y={31} fontSize={12.5} fill="#1C2A33" fontWeight={600}>{folio || "—"}</text>

      <rect x={705} y={spineY - 47} width={222} height={94} rx={10}
        fill={efecto ? "#FAE7E0" : "#FFF4F0"} stroke="#B23A1E" strokeWidth={1.6} />
      <text x={816} y={spineY - 29} textAnchor="middle" fontSize={11} fill="#B23A1E" fontWeight={700}>EFECTO</text>
      {effLines.map((l, i) => (
        <text key={i} x={816} y={spineY - 11 + i * 16} textAnchor="middle"
          fontSize={efecto ? 14 : 12} fontWeight={efecto ? 600 : 400} fill={efecto ? "#5A1F12" : "#C98C80"}>{l}</text>
      ))}

      {nodes}
    </svg>
  );
}
