// Lightweight, dependency-free PDF export of the existing Reiki course guides.
// Uses the same bundled Noto Sans font as the site's signed PDFs: Cyrillic and
// accented Latin text remain selectable/searchable rather than rasterised.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 52;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT * 2;
const ink = "0.12 0.25 0.31";
const muted = "0.35 0.46 0.50";
const accent = "0.09 0.43 0.51";
const fontData = readFileSync(resolve(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"));

const copy = {
  en: {
    title: { tantra: "Tantra Reiki", yggdrasil: "Reiki Yggdrasil" },
    subtitle: "STUDY GUIDE · LEVEL 1 INITIATION · PRICING",
    priceHeading: "Level 1 initiation options & prices",
    priceLines: [
      "Free express Level 1 initiation — FREE (CAD $0). Request availability via WhatsApp.",
      "Full personal Level 1 initiation — individual fee; confirm the current price and format directly with Andrey before booking.",
      "Further courses and modules — dates, tuition and eligibility are confirmed individually.",
    ],
    programme: "System overview & study material",
    disclaimer: "Spiritual and educational material. No medical treatment or guaranteed outcomes.",
    contact: "Andrey Litvinov · WhatsApp +1 437 606 6502 · Telegram @AndyTherapist",
  },
  ru: {
    title: { tantra: "Тантра Рейки", yggdrasil: "Рейки Иггдрасиль" },
    subtitle: "УЧЕБНЫЕ МАТЕРИАЛЫ · 1-Я СТУПЕНЬ · СТОИМОСТЬ",
    priceHeading: "Варианты и стоимость инициации 1-й ступени",
    priceLines: [
      "Бесплатная экспресс-инициация 1-й ступени — БЕСПЛАТНО (0 CAD). Доступность уточняется через WhatsApp.",
      "Полная личная инициация 1-й ступени — индивидуальная стоимость; цену и формат Андрей подтвердит до записи.",
      "Дальнейшие ступени и модули — сроки, стоимость обучения и условия согласовываются лично.",
    ],
    programme: "Описание системы и учебные материалы",
    disclaimer: "Духовная и образовательная практика; не медицинское лечение и без обещаний результата.",
    contact: "Андрей Литвинов · WhatsApp +1 437 606 6502 · Telegram @AndyTherapist",
  },
  es: {
    title: { tantra: "Tantra Reiki", yggdrasil: "Reiki Yggdrasil" },
    subtitle: "GUÍA DE ESTUDIO · INICIACIÓN NIVEL 1 · PRECIOS",
    priceHeading: "Opciones de iniciación de nivel 1 y precios",
    priceLines: [
      "Iniciación exprés gratuita de nivel 1 — GRATIS (0 CAD). Consulta disponibilidad por WhatsApp.",
      "Iniciación personal completa de nivel 1 — precio individual; Andrey confirma coste y formato antes de reservar.",
      "Cursos y módulos adicionales — fechas, precio y condiciones se confirman personalmente.",
    ],
    programme: "Descripción del sistema y materiales de estudio",
    disclaimer: "Contenido espiritual y educativo; no es tratamiento médico ni garantiza resultados.",
    contact: "Andrey Litvinov · WhatsApp +1 437 606 6502 · Telegram @AndyTherapist",
  },
};

const u16 = (buffer, offset) => buffer.readUInt16BE(offset);
const u32 = (buffer, offset) => buffer.readUInt32BE(offset);

function parseFont(data) {
  const tables = new Map();
  for (let i = 0; i < u16(data, 4); i++) {
    const n = 12 + i * 16;
    tables.set(data.toString("ascii", n, n + 4), { offset: u32(data, n + 8) });
  }
  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  const cmap = tables.get("cmap");
  if (!head || !hhea || !hmtx || !cmap) throw new Error("Missing bundled Noto font tables");
  let selected;
  for (let i = 0; i < u16(data, cmap.offset + 2); i++) {
    const n = cmap.offset + 4 + i * 8;
    const platform = u16(data, n);
    const encoding = u16(data, n + 2);
    const offset = cmap.offset + u32(data, n + 4);
    if (u16(data, offset) === 4) {
      if (!selected || (platform === 3 && encoding === 1)) selected = { offset };
      if (platform === 3 && encoding === 1) break;
    }
  }
  if (!selected) throw new Error("Noto font does not expose a BMP cmap");
  const metricsCount = u16(data, hhea.offset + 34);
  const unitsPerEm = u16(data, head.offset + 18);
  const scale = (value) => Math.round(value * 1000 / unitsPerEm);
  return {
    data,
    ascent: scale(data.readInt16BE(hhea.offset + 4)),
    descent: scale(data.readInt16BE(hhea.offset + 6)),
    bounding: [scale(data.readInt16BE(head.offset + 36)), scale(data.readInt16BE(head.offset + 38)), scale(data.readInt16BE(head.offset + 40)), scale(data.readInt16BE(head.offset + 42))],
    glyph(cp) {
      const segments = u16(data, selected.offset + 6) / 2;
      const ends = selected.offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let i = 0; i < segments; i++) {
        const begin = u16(data, starts + i * 2);
        const end = u16(data, ends + i * 2);
        if (cp < begin || cp > end) continue;
        const delta = u16(data, deltas + i * 2);
        const pos = ranges + i * 2;
        const range = u16(data, pos);
        if (range === 0) return (cp + delta) & 0xffff;
        const index = u16(data, pos + range + (cp - begin) * 2);
        return index ? (index + delta) & 0xffff : 0;
      }
      return 0;
    },
    width(glyph) { return scale(u16(data, hmtx.offset + Math.min(glyph, metricsCount - 1) * 4)); },
  };
}
const font = parseFont(fontData);

function encodeGlyphs(value, usage) {
  return [...String(value)].map((char) => {
    const original = char.codePointAt(0);
    const cp = font.glyph(original) ? original : 0x3f;
    const glyph = font.glyph(cp);
    usage.set(glyph, cp);
    return glyph.toString(16).toUpperCase().padStart(4, "0");
  }).join("");
}

function measure(value, size) {
  return [...String(value)].reduce((n, char) => {
    const cp = char.codePointAt(0);
    return n + font.width(font.glyph(cp) || font.glyph(0x3f)) * size / 1000;
  }, 0);
}

function wrap(value, maxWidth, size) {
  const output = [];
  for (const paragraph of String(value).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && measure(line + " " + word, size) <= maxWidth) { line += " " + word; continue; }
      if (line) { output.push(line); line = ""; }
      if (measure(word, size) <= maxWidth) { line = word; continue; }
      for (const char of word) {
        if (line && measure(line + char, size) > maxWidth) { output.push(line); line = ""; }
        line += char;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function object(objects, value) {
  objects.push(Buffer.isBuffer(value) ? value : Buffer.from(value, "ascii"));
  return objects.length;
}

function fontObjects(objects, usage) {
  const glyphs = [...usage.entries()].filter(([id]) => id > 0).sort(([a], [b]) => a - b);
  const widths = glyphs.map(([id]) => id + " [" + font.width(id) + "]").join(" ");
  const toUnicode = (cp) => cp <= 0xffff
    ? cp.toString(16).toUpperCase().padStart(4, "0")
    : (() => {
        const value = cp - 0x10000;
        return (0xd800 + (value >> 10)).toString(16).toUpperCase().padStart(4, "0") +
          (0xdc00 + (value & 0x3ff)).toString(16).toUpperCase().padStart(4, "0");
      })();
  const cmap = [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
  ];
  for (let i = 0; i < glyphs.length; i += 100) {
    const entries = glyphs.slice(i, i + 100);
    cmap.push(entries.length + " beginbfchar");
    for (const [id, cp] of entries) cmap.push("<" + id.toString(16).toUpperCase().padStart(4, "0") + "> <" + toUnicode(cp) + ">");
    cmap.push("endbfchar");
  }
  cmap.push("endcmap", "CMapName currentdict /CMap defineresource pop", "end", "end");
  const compressed = deflateSync(font.data);
  const program = object(objects, Buffer.concat([
    Buffer.from("<< /Length " + compressed.length + " /Length1 " + font.data.length + " /Filter /FlateDecode >>\nstream\n", "ascii"),
    compressed,
    Buffer.from("\nendstream", "ascii"),
  ]));
  const descriptor = object(objects, "<< /Type /FontDescriptor /FontName /NotoSans-Regular /Flags 32 /FontBBox [" + font.bounding.join(" ") + "] /Ascent " + font.ascent + " /Descent " + font.descent + " /CapHeight " + font.ascent + " /ItalicAngle 0 /StemV 80 /FontFile2 " + program + " 0 R >>");
  const descendant = object(objects, "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor " + descriptor + " 0 R /DW 500 /W [" + widths + "] /CIDToGIDMap /Identity >>");
  const cmapText = cmap.join("\n");
  const map = object(objects, "<< /Length " + Buffer.byteLength(cmapText, "ascii") + " >>\nstream\n" + cmapText + "\nendstream");
  return object(objects, "<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Regular /Encoding /Identity-H /DescendantFonts [" + descendant + " 0 R] /ToUnicode " + map + " 0 R >>");
}

export function buildReikiCourseGuidePdf({ course, locale, source }) {
  if (!["tantra", "yggdrasil"].includes(course) || !["en", "ru", "es"].includes(locale)) throw new Error("Unsupported course or locale");
  const t = copy[locale];
  const usage = new Map();
  const layouts = [];
  let page;
  let y;

  function pdfText(value, x, baseline, size = 9.5, color = ink) {
    page.push(color + " rg BT /F1 " + size + " Tf 1 0 0 1 " + x + " " + baseline + " Tm <" + encodeGlyphs(value, usage) + "> Tj ET");
  }
  function rect(x, baseline, width, height, color) {
    page.push(color + " rg " + x + " " + baseline + " " + width + " " + height + " re f");
  }
  function startPage() {
    page = [];
    layouts.push(page);
    rect(0, PAGE_HEIGHT - 9, PAGE_WIDTH, 9, accent);
    pdfText("HOLISTIC HOUSE", LEFT, PAGE_HEIGHT - 43, 11, accent);
    pdfText("ANDREY LITVINOV", LEFT, PAGE_HEIGHT - 60, 8, muted);
    rect(LEFT, 55, CONTENT_WIDTH, 1, "0.78 0.86 0.86");
    pdfText(t.disclaimer, LEFT, 39, 7.2, muted);
    pdfText(String(layouts.length), PAGE_WIDTH - LEFT - 12, 39, 8, accent);
    y = PAGE_HEIGHT - 98;
  }
  function room(height) { if (y - height < 78) startPage(); }
  function paragraph(value, size = 9.5, leading = 15, color = ink, indent = 0) {
    const lines = wrap(value, CONTENT_WIDTH - indent, size);
    room(lines.length * leading + 4);
    for (const line of lines) { pdfText(line, LEFT + indent, y, size, color); y -= leading; }
    y -= 3;
  }
  function heading(value, size = 11.5) {
    room(43);
    y -= 5;
    paragraph(value, size, 18, accent);
    y -= 3;
  }

  startPage();
  paragraph(t.title[course], 24, 31, ink);
  paragraph(t.subtitle, 9.8, 18, accent);
  y -= 7;
  rect(LEFT, y, CONTENT_WIDTH, 1, "0.78 0.86 0.86");
  y -= 26;
  heading(t.priceHeading, 12.6);
  for (const line of t.priceLines) paragraph("• " + line, 9.4, 15.5, ink, 4);
  y -= 8;
  heading(t.programme, 12.6);
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || /^=+$/.test(line)) { if (line === "") y -= 4; continue; }
    if (i === 0) continue; // Original all-caps source title is already on the cover.
    if (/^(Level|Module|Nivel|Módulo|Ступень|Модуль)\s+\d+[.:]/iu.test(line)) heading(line, 10.8);
    else paragraph(line, 9.2, 14.8);
  }
  y -= 9;
  heading(t.contact, 9.7);

  const objects = [];
  const catalog = object(objects, "");
  const pages = object(objects, "");
  const fontRef = fontObjects(objects, usage);
  const pageRefs = layouts.map((commands) => {
    const stream = commands.join("\n");
    const contents = object(objects, "<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "\nendstream");
    return object(objects, "<< /Type /Page /Parent " + pages + " 0 R /MediaBox [0 0 " + PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Resources << /Font << /F1 " + fontRef + " 0 R >> >> /Contents " + contents + " 0 R >>");
  });
  objects[catalog - 1] = Buffer.from("<< /Type /Catalog /Pages " + pages + " 0 R >>", "ascii");
  objects[pages - 1] = Buffer.from("<< /Type /Pages /Kids [" + pageRefs.map((ref) => ref + " 0 R").join(" ") + "] /Count " + pageRefs.length + " >>", "ascii");
  const chunks = [Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = chunks[0].length;
  for (const [index, entry] of objects.entries()) {
    offsets.push(offset);
    const part = Buffer.concat([Buffer.from((index + 1) + " 0 obj\n", "ascii"), entry, Buffer.from("\nendobj\n", "ascii")]);
    chunks.push(part);
    offset += part.length;
  }
  chunks.push(Buffer.from("xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n" + offsets.slice(1).map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") + "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + offset + "\n%%EOF\n", "ascii"));
  return Buffer.concat(chunks);
}
