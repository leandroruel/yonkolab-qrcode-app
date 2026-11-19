/**
 * Molduras ("frames") que emolduram o QR code.
 *
 * Cada moldura recebe um nó SVG já pronto do QR — ancorado em (0,0) e com tamanho
 * `s` — e devolve o corpo de um SVG que o emoldura, mais as dimensões totais.
 * O mesmo código alimenta três consumidores:
 *
 *   1. as miniaturas da galeria (com um QR de exemplo, desenhado na hora);
 *   2. a pré-visualização rasterizada (via `<img>` com data URL);
 *   3. o download em SVG (vetorial, com o QR embutido como SVG aninhado).
 *
 * Todas as medidas derivam de `s`, então a moldura escala junto com o QR.
 */

/** Paleta efetiva da moldura, derivada do estilo atual do QR. */
export interface FramePalette {
  /** Cor de destaque: pontos do QR e elementos da moldura. */
  fg: string;
  /** Cor de fundo: placa do QR e cartão da moldura. */
  bg: string;
  /** Texto legível sobre `fg`. */
  on: string;
  /** Texto legível sobre `bg`. */
  ink: string;
  /** Acento secundário (gradientes e blocos). */
  accent2: string;
}

export interface FrameInput {
  /** Nó SVG do QR já posicionado em (0,0) com tamanho `s`. */
  qr: string;
  /** Tamanho do QR em px (unidade base da moldura). */
  s: number;
  /** Texto da chamada (ex.: "Escaneie-me!"). */
  caption: string;
  palette: FramePalette;
  /** Sufixo único para ids internos (evita colisão entre miniaturas). */
  uid: string;
}

export interface FrameOutput {
  width: number;
  height: number;
  body: string;
}

export interface FrameDef {
  id: string;
  label: string;
  build: (i: FrameInput) => FrameOutput;
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Arredonda para 2 casas, mantendo o markup compacto. */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function esc(v: string): string {
  return v
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/** Caminho de um retângulo arredondado (raio uniforme). */
function rrect(w: number, h: number, r: number): string {
  const rr = r2(Math.min(r, w / 2, h / 2));
  return (
    `M${rr},0 H${r2(w - rr)} A${rr},${rr} 0 0 1 ${r2(w)},${rr} ` +
    `V${r2(h - rr)} A${rr},${rr} 0 0 1 ${r2(w - rr)},${r2(h)} ` +
    `H${rr} A${rr},${rr} 0 0 1 0,${r2(h - rr)} ` +
    `V${rr} A${rr},${rr} 0 0 1 ${rr},0 Z`
  );
}

/** Faixa horizontal colada embaixo, arredondada só nos cantos de baixo. */
function bottomStrip(w: number, h: number, barH: number, r: number): string {
  const y = r2(h - barH);
  const rr = r2(Math.min(r, w / 2, h / 2));
  return (
    `M0,${y} H${r2(w)} V${r2(h - rr)} A${rr},${rr} 0 0 1 ${r2(w - rr)},${r2(h)} ` +
    `H${rr} A${rr},${rr} 0 0 1 0,${r2(h - rr)} Z`
  );
}

/** Faixa horizontal colada em cima, arredondada só nos cantos de cima. */
function topStrip(w: number, barH: number, r: number): string {
  const rr = r2(Math.min(r, w / 2, barH / 2));
  return (
    `M0,${r2(barH)} V${rr} A${rr},${rr} 0 0 1 ${rr},0 H${r2(w - rr)} ` +
    `A${rr},${rr} 0 0 1 ${r2(w)},${rr} V${r2(barH)} Z`
  );
}

function place(qr: string, x: number, y: number): string {
  return `<g transform="translate(${r2(x)} ${r2(y)})">${qr}</g>`;
}

function plate(p: FramePalette, x: number, y: number, s: number, r = 0): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(s)}" height="${r2(s)}" rx="${r2(r)}" fill="${p.bg}"/>`;
}

function label(
  x: number,
  y: number,
  size: number,
  fill: string,
  content: string,
  opts: { upper?: boolean; weight?: number; spacing?: number } = {},
): string {
  const text = opts.upper ? content.toUpperCase() : content;
  const spacing = opts.spacing ?? size * 0.12;
  const weight = opts.weight ?? 700;
  return (
    `<text x="${r2(x)}" y="${r2(y)}" font-family="${FONT}" font-size="${r2(size)}" ` +
    `font-weight="${weight}" letter-spacing="${r2(spacing)}" fill="${fill}" ` +
    `text-anchor="middle" dominant-baseline="central">${esc(text)}</text>`
  );
}

function phoneIcon(x: number, y: number, size: number, color: string): string {
  const w = size * 0.6;
  const h = size;
  const r = w * 0.3;
  const sw = Math.max(1, size * 0.1);
  return (
    `<g transform="translate(${r2(x)} ${r2(y)})" fill="none" stroke="${color}" stroke-width="${r2(sw)}">` +
    `<rect x="0" y="0" width="${r2(w)}" height="${r2(h)}" rx="${r2(r)}" ry="${r2(r)}"/>` +
    `<circle cx="${r2(w / 2)}" cy="${r2(h * 0.82)}" r="${r2(size * 0.05)}" fill="${color}" stroke="none"/>` +
    `</g>`
  );
}

/** Cantos em "L" (mira de leitura). */
function bracketsPath(w: number, h: number, inset: number, arm: number, r: number): string {
  const i = inset;
  const a = arm;
  const rr = r2(r);
  const p1 = `M${r2(i)},${r2(i + a)} V${r2(i + rr > 0 ? i + rr : i)} A${rr},${rr} 0 0 1 ${r2(i + rr)},${r2(i)} H${r2(i + a)}`;
  const p2 = `M${r2(w - i - a)},${r2(i)} H${r2(w - i - rr)} A${rr},${rr} 0 0 1 ${r2(w - i)},${r2(i + rr)} V${r2(i + a)}`;
  const p3 = `M${r2(w - i)},${r2(h - i - a)} V${r2(h - i - rr)} A${rr},${rr} 0 0 1 ${r2(w - i - rr)},${r2(h - i)} H${r2(w - i - a)}`;
  const p4 = `M${r2(i + a)},${r2(h - i)} H${r2(i + rr)} A${rr},${rr} 0 0 1 ${r2(i)},${r2(h - i - rr)} V${r2(h - i - a)}`;
  return [p1, p2, p3, p4].join(' ');
}

/* -------------------------------------------------------------------------- */
/* Cores                                                                      */
/* -------------------------------------------------------------------------- */

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  let h = m[1];
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function toHex(c: { r: number; g: number; b: number }): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(c.r)}${f(c.g)}${f(c.b)}`;
}

/** Mistura `a` com `b` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - cb.b) * t,
  });
}

/** Escurece (< 0) ou clareia (> 0) uma cor. */
export function shade(hex: string, amount: number): string {
  return amount < 0 ? mix(hex, '#000000', -amount) : mix(hex, '#ffffff', amount);
}

/** Cor de texto com contraste legível sobre `hex`. */
export function readableOn(hex: string): string {
  const c = parseHex(hex);
  if (!c) return '#ffffff';
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  return lum > 0.45 ? '#14141c' : '#ffffff';
}

/** Monta a paleta usada pelas molduras a partir do estilo atual do QR. */
export function framePalette(dotsColor: string, bgColor: string): FramePalette {
  return {
    fg: dotsColor,
    bg: bgColor,
    on: readableOn(dotsColor),
    ink: readableOn(bgColor),
    accent2: shade(dotsColor, -0.28),
  };
}

/* -------------------------------------------------------------------------- */
/* QR de exemplo (miniaturas)                                                 */
/* -------------------------------------------------------------------------- */

const SAMPLE_MODULES = 21;

/** QR de exemplo determinístico: finder patterns + módulos pseudoaleatórios. */
export function sampleQr(s: number, fg: string): string {
  const n = SAMPLE_MODULES;
  const m = s / n;
  const dark = Array.from({ length: n * n }, () => false);
  const set = (x: number, y: number, v: boolean) => {
    if (x >= 0 && y >= 0 && x < n && y < n) dark[y * n + x] = v;
  };
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        set(ox + x, oy + y, edge || core);
      }
    }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const reserved = (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      if (reserved) continue;
      set(x, y, rnd() > 0.5);
    }
  }

  let rects = '';
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (dark[y * n + x]) {
        rects += `<rect x="${r2(x * m)}" y="${r2(y * m)}" width="${r2(m)}" height="${r2(m)}"/>`;
      }
    }
  }
  return `<svg x="0" y="0" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg"><g fill="${fg}">${rects}</g></svg>`;
}

/* -------------------------------------------------------------------------- */
/* Molduras                                                                   */
/* -------------------------------------------------------------------------- */

function defineFrames(): FrameDef[] {
  const frames: FrameDef[] = [
    {
      id: 'none',
      label: 'Nenhuma',
      build: ({ qr, s, palette }) => ({
        width: s,
        height: s,
        body: plate(palette, 0, 0, s) + qr,
      }),
    },

    {
      id: 'bar',
      label: 'Faixa inferior',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const barH = s * 0.19;
        const rad = s * 0.07;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          `<path d="${bottomStrip(w, h, barH, rad)}" fill="${palette.fg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          label(w / 2, h - barH / 2, s * 0.078, palette.on, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'bar-top',
      label: 'Faixa superior',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const barH = s * 0.19;
        const rad = s * 0.07;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          `<path d="${topStrip(w, barH, rad)}" fill="${palette.fg}"/>` +
          plate(palette, pad, pad + barH, s) +
          place(qr, pad, pad + barH) +
          label(w / 2, barH / 2, s * 0.078, palette.on, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'outline',
      label: 'Contorno',
      build: ({ qr, s, caption, palette }) => {
        const bw = Math.max(1.4, s * 0.008);
        const m = bw;
        const pad = s * 0.075;
        const barH = s * 0.16;
        const rad = s * 0.07;
        const w = s + pad * 2 + m * 2;
        const h = s + pad * 2 + barH + m * 2;
        const divY = m + pad + s + s * 0.035;
        const body =
          `<rect x="${r2(m)}" y="${r2(m)}" width="${r2(w - m * 2)}" height="${r2(h - m * 2)}" rx="${r2(rad)}" fill="${palette.bg}" stroke="${palette.fg}" stroke-width="${r2(bw)}"/>` +
          `<line x1="${r2(m + pad)}" y1="${r2(divY)}" x2="${r2(w - m - pad)}" y2="${r2(divY)}" stroke="${palette.fg}" stroke-width="${r2(bw * 0.7)}" opacity="0.45"/>` +
          plate(palette, m + pad, m + pad, s) +
          place(qr, m + pad, m + pad) +
          label(w / 2, h - m - barH / 2, s * 0.072, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'pill',
      label: 'Pílula',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.09;
        const gap = s * 0.07;
        const pillH = s * 0.17;
        const w = s + pad * 2;
        const pillW = w * 0.84;
        const cardH = s + pad * 2;
        const h = cardH + gap + pillH;
        const body =
          `<path d="${rrect(w, cardH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<rect x="${r2((w - pillW) / 2)}" y="${r2(cardH + gap)}" width="${r2(pillW)}" height="${r2(pillH)}" rx="${r2(pillH / 2)}" fill="${palette.fg}"/>` +
          label(w / 2, cardH + gap + pillH / 2, s * 0.072, palette.on, caption);
        return { width: w, height: h, body };
      },
    },

    {
      id: 'bubble',
      label: 'Balão',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.21;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const bubbleH = barH * 0.72;
        const bubbleW = w - pad * 1.1;
        const bubbleX = (w - bubbleW) / 2;
        const bubbleY = h - pad * 0.6 - bubbleH;
        const cx = w / 2;
        const tw = s * 0.06;
        const th = barH * 0.34;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<path d="M${r2(cx - tw)},${r2(bubbleY)} L${r2(cx)},${r2(bubbleY - th)} L${r2(cx + tw)},${r2(bubbleY)} Z" fill="${palette.fg}"/>` +
          `<rect x="${r2(bubbleX)}" y="${r2(bubbleY)}" width="${r2(bubbleW)}" height="${r2(bubbleH)}" rx="${r2(bubbleH * 0.34)}" fill="${palette.fg}"/>` +
          label(cx, bubbleY + bubbleH / 2, s * 0.066, palette.on, caption);
        return { width: w, height: h, body };
      },
    },

    {
      id: 'ticket',
      label: 'Bilhete',
      build: ({ qr, s, caption, palette, uid }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.2;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const divY = h - barH - s * 0.01;
        const nr = s * 0.038;
        const mid = rrect(w, h, rad);
        const dashes = `${r2(s * 0.05)} ${r2(s * 0.04)}`;
        const body =
          `<defs><mask id="notch-${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${r2(w)}" height="${r2(h)}">` +
          `<rect x="0" y="0" width="${r2(w)}" height="${r2(h)}" fill="#fff"/>` +
          `<circle cx="0" cy="${r2(divY)}" r="${r2(nr)}" fill="#000"/>` +
          `<circle cx="${r2(w)}" cy="${r2(divY)}" r="${r2(nr)}" fill="#000"/>` +
          `</mask></defs>` +
          `<g mask="url(#notch-${uid})">` +
          `<path d="${mid}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `</g>` +
          `<line x1="${r2(pad * 0.5)}" y1="${r2(divY)}" x2="${r2(w - pad * 0.5)}" y2="${r2(divY)}" stroke="${palette.fg}" stroke-width="${r2(Math.max(1, s * 0.008))}" stroke-dasharray="${dashes}" opacity="0.7"/>` +
          label(w / 2, divY + barH / 2, s * 0.072, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'flag',
      label: 'Etiqueta',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.2;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const blk = w * 0.28;
        const y0 = h - barH;
        const blkW = blk - s * 0.01;
        const icon = phoneIcon(pad * 0.6, y0 + barH / 2 - s * 0.05, s * 0.1, palette.on);
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<path d="${bottomStrip(w, h, barH, rad)}" fill="${palette.fg}"/>` +
          `<path d="M0,${r2(y0)} H${r2(blkW)} V${r2(h)} H${r2(rad)} A${r2(rad)},${r2(rad)} 0 0 1 0,${r2(h - rad)} Z" fill="${palette.accent2}"/>` +
          icon +
          label(blk + (w - blk) / 2, y0 + barH / 2, s * 0.068, palette.on, caption);
        return { width: w, height: h, body };
      },
    },

    {
      id: 'phone',
      label: 'Telefone',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.2;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const fs = s * 0.07;
        const iconH = s * 0.11;
        const textW = caption.length * fs * 0.62;
        const totalW = iconH * 0.6 + s * 0.05 + textW;
        const startX = (w - totalW) / 2;
        const cy = h - barH / 2;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<path d="${bottomStrip(w, h, barH, rad)}" fill="${palette.fg}"/>` +
          phoneIcon(startX, cy - iconH / 2, iconH, palette.on) +
          `<text x="${r2(startX + iconH * 0.6 + s * 0.05)}" y="${r2(cy)}" font-family="${FONT}" font-size="${r2(fs)}" font-weight="700" fill="${palette.on}" dominant-baseline="central">${esc(caption)}</text>`;
        return { width: w, height: h, body };
      },
    },

    {
      id: 'arrow',
      label: 'Seta',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.18;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const y0 = h - barH;
        const cr = barH * 0.34;
        const cx = w - pad - cr;
        const cy = y0 + barH / 2;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(cr)}" fill="${palette.fg}"/>` +
          `<path d="M${r2(cx - cr * 0.35)},${r2(cy - cr * 0.42)} L${r2(cx + cr * 0.34)},${r2(cy)} L${r2(cx - cr * 0.35)},${r2(cy + cr * 0.42)} Z" fill="${palette.on}"/>` +
          `<text x="${r2(pad)}" y="${r2(cy)}" font-family="${FONT}" font-size="${r2(s * 0.07)}" font-weight="700" letter-spacing="${r2(s * 0.008)}" fill="${palette.ink}" dominant-baseline="central">${esc(caption)}</text>`;
        return { width: w, height: h, body };
      },
    },

    {
      id: 'brackets',
      label: 'Mira',
      build: ({ qr, s, caption, palette }) => {
        const gap = s * 0.07;
        const capH = s * 0.14;
        const w = s + gap * 2;
        const h = s + gap * 2 + capH;
        const sw = Math.max(2, s * 0.032);
        const path = bracketsPath(w, h - capH, gap, s * 0.13, 0);
        const body =
          plate(palette, gap, gap, s) +
          place(qr, gap, gap) +
          `<path d="${path}" fill="none" stroke="${palette.fg}" stroke-width="${r2(sw)}" stroke-linecap="square"/>` +
          label(w / 2, h - capH / 2, s * 0.072, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'brackets-round',
      label: 'Mira arredondada',
      build: ({ qr, s, caption, palette }) => {
        const gap = s * 0.07;
        const capH = s * 0.14;
        const w = s + gap * 2;
        const h = s + gap * 2 + capH;
        const sw = Math.max(2, s * 0.032);
        const path = bracketsPath(w, h - capH, gap, s * 0.14, s * 0.07);
        const body =
          plate(palette, gap, gap, s) +
          place(qr, gap, gap) +
          `<path d="${path}" fill="none" stroke="${palette.fg}" stroke-width="${r2(sw)}" stroke-linecap="round"/>` +
          label(w / 2, h - capH / 2, s * 0.072, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'dashed',
      label: 'Tracejada',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.08;
        const capH = s * 0.16;
        const bw = Math.max(1.6, s * 0.01);
        const m = bw;
        const w = s + pad * 2 + m * 2;
        const h = s + pad * 2 + capH + m * 2;
        const body =
          `<rect x="${r2(m)}" y="${r2(m)}" width="${r2(w - m * 2)}" height="${r2(h - m * 2)}" rx="${r2(rad)}" fill="${palette.bg}" stroke="${palette.fg}" stroke-width="${r2(bw)}" stroke-dasharray="${r2(s * 0.045)} ${r2(s * 0.03)}"/>` +
          plate(palette, m + pad, m + pad, s) +
          place(qr, m + pad, m + pad) +
          label(w / 2, h - m - capH / 2, s * 0.068, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'thick',
      label: 'Grossa',
      build: ({ qr, s, caption, palette }) => {
        const bw = s * 0.05;
        const pad = s * 0.075;
        const capH = s * 0.16;
        const rad = s * 0.09;
        const w = s + pad * 2 + bw * 4;
        const h = s + pad * 2 + capH + bw * 4;
        const cx = w / 2;
        const cy = h / 2 - capH * 0.15;
        const body =
          `<rect x="${r2(bw)}" y="${r2(bw)}" width="${r2(w - bw * 2)}" height="${r2(h - bw * 2)}" rx="${r2(rad)}" fill="none" stroke="${palette.fg}" stroke-width="${r2(bw * 2)}"/>` +
          plate(palette, cx - s / 2, cy - s / 2, s, rad * 0.4) +
          place(qr, cx - s / 2, cy - s / 2) +
          label(cx, h - bw - capH / 2, s * 0.07, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'double',
      label: 'Dupla',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.075;
        const capH = s * 0.16;
        const rad = s * 0.06;
        const w = s + pad * 2;
        const h = s + pad * 2 + capH;
        const bw = Math.max(1.2, s * 0.007);
        const body =
          `<path d="${rrect(w, h, rad)}" fill="${palette.bg}"/>` +
          `<path d="${rrect(w - bw * 4, h - bw * 4, rad * 0.8)}" fill="none" stroke="${palette.fg}" stroke-width="${r2(bw)}" transform="translate(${r2(bw * 2)} ${r2(bw * 2)})" opacity="0.55"/>` +
          `<rect x="${r2(bw * 5)}" y="${r2(bw * 5)}" width="${r2(w - bw * 10)}" height="${r2(h - bw * 10)}" rx="${r2(rad * 0.6)}" fill="none" stroke="${palette.fg}" stroke-width="${r2(bw)}" opacity="0.3"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          label(w / 2, h - pad * 0.55, s * 0.068, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'tab',
      label: 'Aba no topo',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const tabH = s * 0.13;
        const tabW = s + pad * 2;
        const tabIn = s * 0.14;
        const w = s + pad * 2;
        const h = tabH + pad * 1.4 + s + pad * 2;
        const qrY = tabH + pad * 1.4;
        const body =
          `<path d="${rrect(w, h - tabH, rad)}" fill="${palette.bg}" transform="translate(0 ${r2(tabH)})"/>` +
          `<rect x="${r2(tabIn)}" y="0" width="${r2(tabW - tabIn * 2)}" height="${r2(tabH * 2)}" rx="${r2(rad)}" fill="${palette.fg}"/>` +
          plate(palette, pad, qrY + pad, s) +
          place(qr, pad, qrY + pad) +
          label(w / 2, tabH * 0.62, s * 0.065, palette.on, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'underline',
      label: 'Sublinhado',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const capH = s * 0.2;
        const w = s + pad * 2;
        const h = s + pad * 2 + capH;
        const barW = Math.min(w * 0.5, s * 0.42);
        const body =
          `<path d="${rrect(w, h - capH, s * 0.06)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<rect x="${r2((w - barW) / 2)}" y="${r2(h - s * 0.045)}" width="${r2(barW)}" height="${r2(s * 0.022)}" rx="${r2(s * 0.011)}" fill="${palette.fg}"/>` +
          label(w / 2, h - capH * 0.62, s * 0.07, palette.ink, caption);
        return { width: w, height: h, body };
      },
    },

    {
      id: 'dotted',
      label: 'Pontilhada',
      build: ({ qr, s, caption, palette, uid }) => {
        const pad = s * 0.06;
        const rad = s * 0.08;
        const capH = s * 0.16;
        const bw = Math.max(1.8, s * 0.012);
        const m = bw;
        const w = s + pad * 2 + m * 2;
        const h = s + pad * 2 + capH + m * 2;
        const body =
          `<rect x="${r2(m)}" y="${r2(m)}" width="${r2(w - m * 2)}" height="${r2(h - m * 2)}" rx="${r2(rad)}" fill="${palette.bg}" stroke="${palette.fg}" stroke-width="${r2(bw)}" stroke-dasharray="0 ${r2(s * 0.028)}" stroke-linecap="round" data-dots="${uid}"/>` +
          plate(palette, m + pad, m + pad, s) +
          place(qr, m + pad, m + pad) +
          label(w / 2, h - m - capH / 2, s * 0.068, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'gradient',
      label: 'Gradiente',
      build: ({ qr, s, caption, palette, uid }) => {
        const pad = s * 0.06;
        const barH = s * 0.2;
        const rad = s * 0.07;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const body =
          `<defs><linearGradient id="grad-${uid}" x1="0" y1="0" x2="1" y2="0">` +
          `<stop offset="0" stop-color="${palette.fg}"/>` +
          `<stop offset="1" stop-color="${palette.accent2}"/>` +
          `</linearGradient></defs>` +
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<path d="${bottomStrip(w, h, barH, rad)}" fill="url(#grad-${uid})"/>` +
          label(w / 2, h - barH / 2, s * 0.078, palette.on, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'mono',
      label: 'Escura',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.07;
        const barH = s * 0.17;
        const rad = s * 0.09;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const body =
          `<path d="${rrect(w, h - barH, rad)}" fill="${palette.fg}"/>` +
          `<rect x="${r2(pad)}" y="${r2(pad)}" width="${r2(s)}" height="${r2(s)}" rx="${r2(rad * 0.5)}" fill="${palette.bg}"/>` +
          place(qr, pad, pad) +
          label(w / 2, h - barH / 2 - s * 0.01, s * 0.07, palette.bg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'badge',
      label: 'Selo',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.08;
        const ov = s * 0.09;
        const w = s + pad * 2 + ov;
        const h = s + pad * 2 + ov;
        const cw = w - ov;
        const ch = h - ov;
        const bx = cw - s * 0.02;
        const by = ch - s * 0.02;
        const br = s * 0.11;
        const ic = br * 0.95;
        const sw = Math.max(1.4, s * 0.014);
        const body =
          `<path d="${rrect(cw, ch, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          `<circle cx="${r2(bx)}" cy="${r2(by)}" r="${r2(br)}" fill="${palette.fg}"/>` +
          `<g transform="translate(${r2(bx - ic / 2)} ${r2(by - ic / 2)}" fill="none" stroke="${palette.on}" stroke-width="${r2(sw)}" stroke-linecap="round">` +
          `<path d="M0,${r2(ic * 0.3)} V0 H${r2(ic * 0.3)}"/>` +
          `<path d="M${r2(ic * 0.7)},0 H${r2(ic)} V${r2(ic * 0.3)}"/>` +
          `<path d="M${r2(ic)},${r2(ic * 0.7)} V${r2(ic)} H${r2(ic * 0.7)}"/>` +
          `<path d="M${r2(ic * 0.3)},${r2(ic)} H0 V${r2(ic * 0.7)}"/>` +
          `</g>` +
          label(cw / 2, ch - pad * 0.6, s * 0.066, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'dots4',
      label: 'Quatro pontos',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const capH = s * 0.15;
        const w = s + pad * 2;
        const h = s + pad * 2 + capH;
        const r = s * 0.028;
        const pts: Array<[number, number]> = [
          [pad, pad],
          [pad + s, pad],
          [pad, pad + s],
          [pad + s, pad + s],
        ];
        const dots = pts
          .map(([x, y]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="${palette.fg}"/>`)
          .join('');
        const body =
          `<path d="${rrect(w, h - capH, rad)}" fill="${palette.bg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          dots +
          label(w / 2, h - capH / 2, s * 0.07, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },

    {
      id: 'cut',
      label: 'Canto cortado',
      build: ({ qr, s, caption, palette }) => {
        const pad = s * 0.06;
        const rad = s * 0.07;
        const barH = s * 0.18;
        const c = s * 0.2;
        const w = s + pad * 2;
        const h = s + pad * 2 + barH;
        const cardPath =
          `M${r2(rad)},0 H${r2(w - c)} L${r2(w)},${r2(c)} V${r2(h - rad)} ` +
          `A${r2(rad)},${r2(rad)} 0 0 1 ${r2(w - rad)},${r2(h)} H${r2(rad)} ` +
          `A${r2(rad)},${r2(rad)} 0 0 1 0,${r2(h - rad)} V${r2(rad)} ` +
          `A${r2(rad)},${r2(rad)} 0 0 1 ${r2(rad)},0 Z`;
        const body =
          `<path d="${cardPath}" fill="${palette.bg}"/>` +
          `<path d="M${r2(w - c)},0 L${r2(w)},0 L${r2(w)},${r2(c)} Z" fill="${palette.fg}"/>` +
          plate(palette, pad, pad, s) +
          place(qr, pad, pad) +
          label(w / 2, h - barH / 2, s * 0.07, palette.fg, caption, { upper: true });
        return { width: w, height: h, body };
      },
    },
  ];

  return frames;
}

export const FRAMES: readonly FrameDef[] = defineFrames();

const FRAME_MAP: Map<string, FrameDef> = new Map(FRAMES.map((f) => [f.id, f]));

export function frameById(id: string): FrameDef {
  return FRAME_MAP.get(id) ?? FRAMES[0]!;
}

/** Composição final: dimensões e documento SVG completo. */
export interface ComposedFrame {
  width: number;
  height: number;
  svg: string;
}

export function composeFrame(id: string, input: FrameInput): ComposedFrame {
  const frame = frameById(id);
  const { width, height, body } = frame.build(input);
  const w = Math.round(width);
  const h = Math.round(height);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${r2(width)} ${r2(height)}">${body}</svg>`;
  return { width: w, height: h, svg };
}

/** Predefinições de cores rápidas (módulos + fundo), como na galeria de referência. */
export interface ColorPreset {
  id: string;
  label: string;
  /** Cor dos módulos (pontos/cantos). */
  dots: string;
  /** Cor de fundo do QR. */
  bg: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { id: 'preto', label: 'Preto', dots: '#000000', bg: '#ffffff' },
  { id: 'branco', label: 'Branco', dots: '#ffffff', bg: '#000000' },
  { id: 'verde', label: 'Verde', dots: '#0f766e', bg: '#ffffff' },
  { id: 'violeta', label: 'Violeta', dots: '#6d28d9', bg: '#ffffff' },
  { id: 'pix', label: 'PIX', dots: '#a16207', bg: '#ffffff' },
  { id: 'azul', label: 'Azul', dots: '#1d4ed8', bg: '#ffffff' },
  { id: 'vermelho', label: 'Vermelho', dots: '#dc2626', bg: '#ffffff' },
];