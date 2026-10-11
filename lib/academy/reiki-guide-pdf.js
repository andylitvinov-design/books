// Lightweight, dependency-free PDF export of the existing Reiki course guides.
// Uses the same bundled Noto Sans font as the site's signed PDFs: Cyrillic and
// accented Latin text remain selectable/searchable rather than rasterised.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { formatReikiLevelPrice, getReikiLevelPrice } from "./reiki-level-pricing.js";

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
    kicker: "THE PRACTICE · THE STUDY PATH · THE NEXT STEP",
    subtitle: "STUDY GUIDE & PERSONAL INITIATION",
    essence: {
      tantra: "Nine progressive levels of body awareness, symbolic energy work and meditation. The path explores presence, connection, archetypes, creativity and integration.",
      yggdrasil: "A seven-module learning system: basic levels, instructor practice, temple traditions, Eastern and Western symbolic arts, runes and advanced work.",
    },
    structure: {
      tantra: "9 LEVELS · GUIDED PRACTICE · SYMBOLIC ATTUNEMENTS",
      yggdrasil: "7 MODULES · 37 LEARNING STEPS · ONE INTEGRATED SYSTEM",
    },
    optionsHeading: "Choose your Level 1 initiation",
    expressTitle: "FREE EXPRESS LEVEL 1",
    personalTitle: "FULL PERSONAL LEVEL 1",
    freePrice: "FREE",
    expressDescription: "Introductory initiation. Ask about the next available format.",
    personalDescription: "One-to-one personal initiation. Rate is for each level.",
    feeNote: "Prices shown are for initiation, not a promise of results. Full programme tuition and dates, if applicable, are confirmed separately.",
    insideHeading: "WHAT IS INSIDE",
    insideText: {
      tantra: "A clear map of all nine levels with their themes, attunements and guided practice ideas. Begin with Level 1 and explore the path at your own pace.",
      yggdrasil: "A seven-module map covering the foundation, instructor training, temple traditions, Eastern and Western teachings, runic studies and advanced practice.",
    },
    syllabusLead: {
      tantra: "Explore the original nine-stage framework. Attunement names below are symbolic concepts in this teaching tradition.",
      yggdrasil: "Explore the seven modules and 37 steps. Names of practices and powers are historical or symbolic course terms.",
    },
    programme: "THE SYSTEM · STUDY OUTLINE",
    nextSteps: "YOUR NEXT STEP",
    nextStepBody: "Read the programme, then choose the free express Level 1 initiation or the full personal Level 1 initiation. Ask Andrey about availability before booking.",
    contactTitle: "PERSONAL GUIDANCE WITH ANDREY",
    disclaimer: "Spiritual education and personal reflection. Not medical care or a guarantee of results.",
    contact: "Andrey Litvinov  ·  WhatsApp +1 437 606 6502  ·  Telegram @AndyTherapist",
  },
  ru: {
    title: { tantra: "Тантра Рейки", yggdrasil: "Рейки Иггдрасиль" },
    kicker: "ПРАКТИКА · ПРОГРАММА · ПЕРВЫЙ ШАГ",
    subtitle: "УЧЕБНЫЙ ПУТЕВОДИТЕЛЬ И ЛИЧНАЯ ИНИЦИАЦИЯ",
    essence: {
      tantra: "Девять ступеней телесной осознанности, символической энергетической работы и медитации. Путь исследует присутствие, близость, архетипы, творчество и интеграцию.",
      yggdrasil: "Система из семи учебных модулей: базовые ступени, инструкторский курс, храмовые традиции, восточные и западные символические практики, руны и продвинутая работа.",
    },
    structure: {
      tantra: "9 СТУПЕНЕЙ · ПРАКТИКИ · СИМВОЛИЧЕСКИЕ НАСТРОЙКИ",
      yggdrasil: "7 МОДУЛЕЙ · 37 УЧЕБНЫХ ШАГОВ · ЕДИНАЯ СИСТЕМА",
    },
    optionsHeading: "Варианты инициации первой ступени",
    expressTitle: "БЕСПЛАТНАЯ ЭКСПРЕСС",
    personalTitle: "ПОЛНАЯ ЛИЧНАЯ",
    freePrice: "БЕСПЛАТНО",
    expressDescription: "Вводная экспресс-инициация. Доступность и формат уточняются.",
    personalDescription: "Индивидуальная инициация. Стоимость указана за одну ступень.",
    feeNote: "Цены относятся к инициациям. Стоимость полного обучения и даты, если применимо, уточняются отдельно. Результат не гарантирован.",
    insideHeading: "ЧТО ВНУТРИ",
    insideText: {
      tantra: "Понятная карта девяти ступеней: ключевые темы, настройки и идеи для практики. Начните с первой ступени и последовательно изучайте путь.",
      yggdrasil: "Структура семи модулей: базовый курс, обучение инструкторов, храмовые традиции, восточные и западные школы, руны и продвинутые практики.",
    },
    syllabusLead: {
      tantra: "Подробная структура всех девяти ступеней. Названия настроек — символические понятия данной традиции.",
      yggdrasil: "Семь модулей и 37 шагов программы. Названия практик и способностей передают исторические символические темы.",
    },
    programme: "СИСТЕМА · УЧЕБНАЯ ПРОГРАММА",
    nextSteps: "КАК НАЧАТЬ",
    nextStepBody: "Ознакомьтесь с программой, затем выберите бесплатную экспресс-инициацию или полную личную инициацию первой ступени. Даты уточняются у Андрея.",
    contactTitle: "ЛИЧНО С АНДРЕЕМ",
    disclaimer: "Духовная и образовательная практика, не медицинская помощь и без гарантий результата.",
    contact: "Андрей Литвинов  ·  WhatsApp +1 437 606 6502  ·  Telegram @AndyTherapist",
  },
  es: {
    title: { tantra: "Tantra Reiki", yggdrasil: "Reiki Yggdrasil" },
    kicker: "LA PRÁCTICA · EL PROGRAMA · EL PRIMER PASO",
    subtitle: "GUÍA DE ESTUDIO E INICIACIÓN PERSONAL",
    essence: {
      tantra: "Nueve niveles de conciencia corporal, trabajo simbólico con la energía y meditación. El camino explora presencia, conexión, arquetipos, creatividad e integración.",
      yggdrasil: "Siete módulos de estudio: niveles básicos, formación de instructores, tradiciones de templos, artes simbólicas orientales y occidentales, runas y práctica avanzada.",
    },
    structure: {
      tantra: "9 NIVELES · PRÁCTICAS · SINTONIZACIONES SIMBÓLICAS",
      yggdrasil: "7 MÓDULOS · 37 PASOS · UN SISTEMA INTEGRADO",
    },
    optionsHeading: "Elige tu iniciación de nivel 1",
    expressTitle: "INICIACIÓN EXPRÉS GRATUITA",
    personalTitle: "INICIACIÓN PERSONAL COMPLETA",
    freePrice: "GRATIS",
    expressDescription: "Una introducción al nivel 1. Consulta el formato disponible.",
    personalDescription: "Iniciación individual; el precio corresponde a cada nivel.",
    feeNote: "Estas tarifas corresponden a la iniciación. La matrícula de cursos completos y las fechas se confirman por separado. Sin garantías de resultados.",
    insideHeading: "QUÉ INCLUYE ESTA GUÍA",
    insideText: {
      tantra: "Un mapa de los nueve niveles con sus temas, sintonizaciones y prácticas guiadas. Comienza por el nivel 1 y explora el programa paso a paso.",
      yggdrasil: "Un mapa de siete módulos: curso básico, formación de instructores, templos, tradiciones orientales y occidentales, runas y trabajo avanzado.",
    },
    syllabusLead: {
      tantra: "Nueve etapas de estudio. Las sintonizaciones se presentan como conceptos simbólicos de la tradición.",
      yggdrasil: "Siete módulos y 37 pasos. Los nombres de las prácticas se conservan como conceptos simbólicos o históricos.",
    },
    programme: "EL SISTEMA · PLAN DE ESTUDIO",
    nextSteps: "CÓMO COMENZAR",
    nextStepBody: "Lee el programa y solicita la iniciación exprés gratuita o la iniciación personal completa de nivel 1. Consulta la disponibilidad con Andrey.",
    contactTitle: "ACOMPAÑAMIENTO PERSONAL CON ANDREY",
    disclaimer: "Educación espiritual y reflexión; no sustituye atención médica ni promete resultados.",
    contact: "Andrey Litvinov  ·  WhatsApp +1 437 606 6502  ·  Telegram @AndyTherapist",
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
  const rate = getReikiLevelPrice(course);
  const displayPrice = formatReikiLevelPrice(course, locale);
  const usage = new Map();
  const layouts = [];
  const paper = "0.980 0.970 0.949";
  const navy = "0.115 0.263 0.333";
  const white = "1 1 1";
  const gold = "0.86 0.67 0.44";
  const lightTeal = "0.886 0.954 0.941";
  const lightGold = "0.987 0.938 0.866";
  const fine = "0.78 0.85 0.86";
  const pageUrl = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/" + (course === "tantra" ? "tantra-reiki" : "yggdrasil");
  let page;
  let y;

  function pdfText(value, x, baseline, size = 9.5, color = ink) {
    page.push(color + " rg BT /F1 " + size + " Tf 1 0 0 1 " + x + " " + baseline + " Tm <" + encodeGlyphs(value, usage) + "> Tj ET");
  }
  function rect(x, baseline, width, height, color) {
    page.push(color + " rg " + x + " " + baseline + " " + width + " " + height + " re f");
  }
  function strokeLine(x1, y1, x2, y2, color = gold, width = 2) {
    page.push(color + " RG " + width + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  }
  function circle(cx, cy, radius, color = gold, width = 1.6) {
    const k = 0.55228475 * radius;
    page.push(color + " RG " + width + " w " + (cx + radius) + " " + cy + " m " +
      (cx + radius) + " " + (cy + k) + " " + (cx + k) + " " + (cy + radius) + " " + cx + " " + (cy + radius) + " c " +
      (cx - k) + " " + (cy + radius) + " " + (cx - radius) + " " + (cy + k) + " " + (cx - radius) + " " + cy + " c " +
      (cx - radius) + " " + (cy - k) + " " + (cx - k) + " " + (cy - radius) + " " + cx + " " + (cy - radius) + " c " +
      (cx + k) + " " + (cy - radius) + " " + (cx + radius) + " " + (cy - k) + " " + (cx + radius) + " " + cy + " c S");
  }
  function textLines(value, x, top, width, size = 10, leading = 15, color = ink, limit = 24) {
    const rows = wrap(value, width, size);
    if (rows.length > limit) throw new Error("Reiki guide text overflow");
    for (const line of rows) {
      pdfText(line, x, top, size, color);
      top -= leading;
    }
    return top;
  }
  function footer() {
    rect(LEFT, 61, CONTENT_WIDTH, 1, fine);
    textLines(t.disclaimer, LEFT, 47, CONTENT_WIDTH - 28, 6.7, 9, muted, 2);
    pdfText(String(layouts.length).padStart(2, "0"), PAGE_WIDTH - LEFT - 17, 43, 8.2, accent);
  }
  function startPage(isCover = false) {
    page = [];
    layouts.push(page);
    rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, paper);
    if (isCover) {
      rect(0, PAGE_HEIGHT - 310, PAGE_WIDTH, 310, navy);
      rect(0, PAGE_HEIGHT - 310, PAGE_WIDTH, 6, gold);
    } else {
      rect(0, PAGE_HEIGHT - 9, PAGE_WIDTH, 9, accent);
      pdfText("HOLISTIC HOUSE", LEFT, PAGE_HEIGHT - 44, 11.2, accent);
      pdfText(t.title[course], LEFT, PAGE_HEIGHT - 64, 9.3, muted);
    }
    footer();
    y = isCover ? 0 : PAGE_HEIGHT - 105;
  }
  function room(height) { if (y - height < 82) startPage(); }
  function paragraph(value, size = 9.8, leading = 15.5, color = ink, indent = 0) {
    const rows = wrap(value, CONTENT_WIDTH - indent, size);
    room(rows.length * leading + 6);
    for (const line of rows) { pdfText(line, LEFT + indent, y, size, color); y -= leading; }
    y -= 6;
  }
  function sectionHeading(value) {
    const rows = wrap(value, CONTENT_WIDTH - 29, 11.6);
    const height = Math.max(44, rows.length * 18 + 21);
    room(height + 46);
    y -= 11;
    rect(LEFT, y - height + 18, CONTENT_WIDTH, height, lightTeal);
    rect(LEFT, y - height + 18, 4, height, accent);
    let baseline = y - 10;
    for (const line of rows) { pdfText(line, LEFT + 17, baseline, 11.6, navy); baseline -= 18; }
    y -= height + 5;
  }
  function decorativeMark() {
    if (course === "yggdrasil") {
      circle(472, 661, 65, gold, 1.1);
      strokeLine(473, 617, 473, 706, gold, 3.2);
      for (const dx of [-52, -33, 33, 52]) {
        const side = Math.sign(dx);
        const outX = 473 + dx;
        strokeLine(473, 676 + Math.abs(dx) / 5, outX, 704 + Math.abs(dx) / 4, gold, 1.8);
        strokeLine(473, 634, outX, 612 - Math.abs(dx) / 6, gold, 1.8);
        strokeLine(473, 661, 473 + side * 26, 672, gold, 1.4);
      }
    } else {
      circle(459, 661, 57, gold, 1.3);
      circle(494, 661, 57, gold, 1.3);
      circle(476, 661, 77, gold, 0.65);
      strokeLine(423, 661, 528, 661, gold, 1.1);
      strokeLine(476, 597, 476, 723, gold, 0.85);
    }
  }

  // Distinct cover, with course identity, its actual scope and two initiation options.
  startPage(true);
  pdfText("HOLISTIC HOUSE", LEFT, 790, 13.2, white);
  rect(LEFT, 777, 56, 2.8, gold);
  pdfText(t.kicker, LEFT, 751, 9.7, gold);
  pdfText(t.title[course], LEFT, 697, 28.5, white);
  textLines(t.essence[course], LEFT, 658, 340, 11.1, 18.1, white, 5);
  textLines(t.structure[course], LEFT, 550, 350, 8.7, 14, gold, 2);
  decorativeMark();

  pdfText(t.optionsHeading, LEFT, 496, 16.2, navy);
  rect(LEFT, 323, 239, 149, lightTeal);
  rect(LEFT + 252, 323, CONTENT_WIDTH - 252, 149, lightGold);
  rect(LEFT, 465, 239, 7, accent);
  rect(LEFT + 252, 465, CONTENT_WIDTH - 252, 7, gold);
  textLines(t.expressTitle, LEFT + 14, 446, 210, 10.0, 13.5, navy, 2);
  textLines(t.personalTitle, LEFT + 265, 446, 206, 10.0, 13.5, navy, 2);
  pdfText(t.freePrice, LEFT + 14, 400, 23.0, accent);
  pdfText(displayPrice, LEFT + 265, 402, 14.4, navy);
  textLines(t.expressDescription, LEFT + 14, 371, 208, 8.5, 12.3, ink, 3);
  textLines(t.personalDescription, LEFT + 265, 370, 208, 8.5, 12.3, ink, 3);
  textLines(t.feeNote, LEFT, 304, CONTENT_WIDTH, 8.1, 12, muted, 3);

  rect(LEFT, 128, CONTENT_WIDTH, 135, white);
  rect(LEFT, 128, 4, 135, accent);
  pdfText(t.insideHeading, LEFT + 19, 242, 12.5, accent);
  textLines(t.insideText[course], LEFT + 19, 214, CONTENT_WIDTH - 40, 10.7, 17, ink, 5);
  pdfText(t.contactTitle, LEFT, 104, 9.4, accent);
  pdfText(t.contact, LEFT, 84, 8.0, navy);

  // The full verified syllabus starts on its own page instead of being cramped
  // around rates; continuation pages have restrained recurring headers.
  startPage();
  paragraph(t.programme, 17, 24, navy);
  paragraph(t.syllabusLead[course], 10.1, 17, muted);
  y -= 8;

  const contentLines = String(source).replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();
    if (!line || /^=+$/.test(line)) { if (!line) y -= 2.5; continue; }
    if (i === 0) continue; // Original title has an attractive dedicated cover.
    if (/^(Read the full programme|Полная программа|Programa completo|To enquire|Вопросы Андрею|Consulta a Andrey)/i.test(line)) break;
    if (/^https:\/\/holistichouse\.vercel\.app/.test(line)) continue;
    if (/^(Level|Module|Nivel|Módulo|Ступень|Модуль)\s+\d+[.:]/iu.test(line)) {
      sectionHeading(line);
    } else if (/^(Attunements|Suggested practice|Настройки|Практика|Sintonizaciones|Práctica)/iu.test(line)) {
      paragraph(line, 9.2, 14.5, muted, 11);
    } else if (/^\d{1,2}\.\s/.test(line)) {
      paragraph(line, 10.0, 16.4, ink, 13);
    } else if (/^[-–]\s/.test(line)) {
      paragraph(line.replace(/^[-–]\s/, ""), 9.9, 15.9, ink, 11);
    } else {
      paragraph(line, 9.7, 15.7, ink);
    }
  }

  room(122);
  sectionHeading(t.nextSteps);
  paragraph(t.nextStepBody, 10.1, 16, ink);
  paragraph(t.contact, 9.1, 15, accent);
  paragraph(pageUrl, 9.0, 15, muted);

  const objects = [];
  const catalog = object(objects, "");
  const info = object(objects, "<< /Creator (Holistic House) /Subject (Reiki initiation price: EUR " + rate.amountEur + " per " + rate.durationMinutes + " minutes per level) >>");
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
  chunks.push(Buffer.from("xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n" + offsets.slice(1).map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") + "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R /Info " + info + " 0 R >>\nstartxref\n" + offset + "\n%%EOF\n", "ascii"));
  return Buffer.concat(chunks);
}
