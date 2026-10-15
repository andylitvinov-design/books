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



const kundaliniCover = {
  en: {
    title: "Kundalini Reiki",
    essence: "Three stages of Reiki self-practice, chakra and Kundalini imagery, Balance meditation and Master-level symbolic studies.",
    structure: "3 LEVELS · MEDITATION · BALANCE · MASTER",
    optionsHeading: "Your personal study path",
    expressTitle: "FULL STUDY GUIDE",
    personalTitle: "PERSONAL LEVEL 1",
    freePrice: "INCLUDED",
    price: "ON REQUEST",
    expressDescription: "All three levels, practice exercises and learning notes in one document.",
    personalDescription: "Ask Andrey about the teacher-led initiation, current schedule and fees.",
    feeNote: "The guide is available for download. Personal initiation and training fees are confirmed with Andrey; no free initiation or fixed price is implied.",
    insideText: "Learn Level 1 foundations, Level 2 Balance, Level 3 Master extensions and optional everyday reflection. Everything is here in Holistic House.",
    syllabusLead: "Three-level learning path with exercises and historical symbolic practice names. The material is educational, not medical advice.",
    nextStepBody: "Study this complete guide, begin with a gentle Level 1 meditation, then contact Andrey about optional personal initiation and current training conditions.",
  },
  ru: {
    title: "Кундалини Рейки",
    essence: "Три ступени практики с собой: медитации, символика чакр и Кундалини, «Баланс» и мастерские образные настройки.",
    structure: "3 СТУПЕНИ · МЕДИТАЦИЯ · БАЛАНС · МАСТЕР",
    optionsHeading: "Ваш личный путь обучения",
    expressTitle: "ПОЛНАЯ ПРОГРАММА",
    personalTitle: "ЛИЧНАЯ ИНИЦИАЦИЯ",
    freePrice: "В PDF",
    price: "Уточнить",
    expressDescription: "Описание всех трёх ступеней, упражнения и заметки для самостоятельной практики.",
    personalDescription: "Формат, даты и стоимость личной инициации уточняются у Андрея.",
    feeNote: "PDF можно скачать. Стоимость и доступность личного обучения уточняются отдельно; бесплатная инициация здесь не обещается.",
    insideText: "Первая ступень — основы, вторая — «Баланс», третья — Мастер и дополнительные символические практики. Все материалы собраны в Holistic House.",
    syllabusLead: "Три ступени обучения с упражнениями и традиционными символическими названиями. Это образовательная практика, не лечение.",
    nextStepBody: "Прочитайте программу, начните с мягкой медитации первой ступени и напишите Андрею по вопросу личной инициации и актуальных условий.",
  },
  es: {
    title: "Kundalini Reiki",
    essence: "Tres niveles de práctica personal: meditación, imágenes simbólicas de Kundalini y chakras, Balance y formación de Maestro.",
    structure: "3 NIVELES · MEDITACIÓN · BALANCE · MAESTRO",
    optionsHeading: "Tu camino de aprendizaje",
    expressTitle: "GUÍA COMPLETA",
    personalTitle: "INICIACIÓN PERSONAL",
    freePrice: "INCLUIDA",
    price: "CONSULTAR",
    expressDescription: "Los tres niveles, ejercicios y notas de práctica personal en un documento.",
    personalDescription: "Consulta con Andrey el formato, calendario y precio de la iniciación.",
    feeNote: "La guía se puede descargar. Los precios de formación e iniciación se confirman individualmente; no se promete iniciación gratuita.",
    insideText: "Nivel 1: fundamentos; Nivel 2: Balance; Nivel 3: Maestro y extensiones simbólicas. Todo el material está en Holistic House.",
    syllabusLead: "Tres niveles con ejercicios y nombres de prácticas simbólicas históricas. Material educativo, no tratamiento médico.",
    nextStepBody: "Lee la guía, empieza con la meditación de Nivel 1 y consulta con Andrey la iniciación personal y las condiciones actuales.",
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
  if (!["tantra", "yggdrasil", "kundalini"].includes(course) || !["en", "ru", "es"].includes(locale)) throw new Error("Unsupported course or locale");
  // Kundalini must never be silently regenerated; its public download is the exact user-uploaded Paul Crick PDF.
  if (course === "kundalini") throw new Error("Kundalini Reiki uses the uploaded original Paul Crick PDF");
  if (course === "tantra") return buildTantraMobilePdf({ locale, source });
  const t = copy[locale];
  const isKundalini = course === "kundalini";
  const k = kundaliniCover[locale];
  const rate = isKundalini ? null : getReikiLevelPrice(course);
  const displayPrice = isKundalini ? k.price : formatReikiLevelPrice(course, locale);
  const usage = new Map();
  const layouts = [];
  const paper = "0.980 0.970 0.949";
  const navy = "0.115 0.263 0.333";
  const white = "1 1 1";
  const gold = "0.86 0.67 0.44";
  const lightTeal = "0.886 0.954 0.941";
  const lightGold = "0.987 0.938 0.866";
  const fine = "0.78 0.85 0.86";
  const pageUrl = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/" + (course === "tantra" ? "tantra-reiki" : course === "kundalini" ? "kundalini-reiki" : "yggdrasil");
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
      pdfText(isKundalini ? k.title : t.title[course], LEFT, PAGE_HEIGHT - 64, 9.3, muted);
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
    if (course === "kundalini") {
      strokeLine(471, 607, 471, 721, gold, 1.3);
      for (let i = 0; i < 7; i++) circle(471, 610 + i * 17, 7.5, gold, 1.4);
      circle(471, 661, 72, gold, 1.1);
    } else if (course === "yggdrasil") {
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
  pdfText(isKundalini ? k.title : t.title[course], LEFT, 697, 28.5, white);
  textLines(isKundalini ? k.essence : t.essence[course], LEFT, 658, 340, 11.1, 18.1, white, 5);
  textLines(isKundalini ? k.structure : t.structure[course], LEFT, 550, 350, 8.7, 14, gold, 2);
  decorativeMark();

  pdfText(isKundalini ? k.optionsHeading : t.optionsHeading, LEFT, 496, 16.2, navy);
  rect(LEFT, 323, 239, 149, lightTeal);
  rect(LEFT + 252, 323, CONTENT_WIDTH - 252, 149, lightGold);
  rect(LEFT, 465, 239, 7, accent);
  rect(LEFT + 252, 465, CONTENT_WIDTH - 252, 7, gold);
  textLines(isKundalini ? k.expressTitle : t.expressTitle, LEFT + 14, 446, 210, 10.0, 13.5, navy, 2);
  textLines(isKundalini ? k.personalTitle : t.personalTitle, LEFT + 265, 446, 206, 10.0, 13.5, navy, 2);
  pdfText(isKundalini ? k.freePrice : t.freePrice, LEFT + 14, 400, 23.0, accent);
  pdfText(displayPrice, LEFT + 265, 402, 14.4, navy);
  textLines(isKundalini ? k.expressDescription : t.expressDescription, LEFT + 14, 371, 208, 8.5, 12.3, ink, 3);
  textLines(isKundalini ? k.personalDescription : t.personalDescription, LEFT + 265, 370, 208, 8.5, 12.3, ink, 3);
  textLines(isKundalini ? k.feeNote : t.feeNote, LEFT, 304, CONTENT_WIDTH, 8.1, 12, muted, 3);

  rect(LEFT, 128, CONTENT_WIDTH, 135, white);
  rect(LEFT, 128, 4, 135, accent);
  pdfText(t.insideHeading, LEFT + 19, 242, 12.5, accent);
  textLines(isKundalini ? k.insideText : t.insideText[course], LEFT + 19, 214, CONTENT_WIDTH - 40, 10.7, 17, ink, 5);
  pdfText(t.contactTitle, LEFT, 104, 9.4, accent);
  pdfText(t.contact, LEFT, 84, 8.0, navy);

  // The full verified syllabus starts on its own page instead of being cramped
  // around rates; continuation pages have restrained recurring headers.
  startPage();
  paragraph(t.programme, 17, 24, navy);
  paragraph(isKundalini ? k.syllabusLead : t.syllabusLead[course], 10.1, 17, muted);
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
    } else if (/^(Attunements|Suggested practice|Настройки|Практика|Sintonizaciones|Práctica|Focus|Тема|Enfoque)/iu.test(line)) {
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
  paragraph(isKundalini ? k.nextStepBody : t.nextStepBody, 10.1, 16, ink);
  paragraph(t.contact, 9.1, 15, accent);
  paragraph(pageUrl, 9.0, 15, muted);

  const objects = [];
  const catalog = object(objects, "");
  const info = object(objects, "<< /Creator (Holistic House) /Subject (" + (isKundalini ? "Kundalini Reiki three-level study guide; personal initiation fee on request" : "Reiki initiation price: EUR " + rate.amountEur + " per " + rate.durationMinutes + " minutes per level") + ") >>");
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


/**
 * Phone-first edition of the Tantra Reiki learning guide.
 * The original A4 engine remains untouched for Reiki Yggdrasil; all nine
 * Tantra stages are parsed from the public EN/RU/ES curriculum text rather
 * than duplicated in the renderer. 14pt body text on a 390pt-wide page
 * stays comfortably readable in a mobile PDF viewer without pinch zoom.
 */
function buildTantraMobilePdf({ locale, source }) {
  const W = 390;
  const H = 694;
  const M = 28;
  const CW = W - 2 * M;
  const paper = "0.984 0.982 0.962";
  const deep = "0.090 0.244 0.290";
  const ocean = "0.099 0.433 0.480";
  const inkBlue = "0.195 0.323 0.365";
  const soft = "0.337 0.452 0.482";
  const white = "1 1 1";
  const gold = "0.786 0.605 0.381";
  const mint = "0.893 0.960 0.943";
  const paleBlue = "0.929 0.967 0.973";
  const beige = "0.985 0.948 0.880";
  const rule = "0.775 0.866 0.862";
  const labels = {
    en: {
      guide: "MOBILE STUDY GUIDE", levels: "9 LEVELS / 3 PHASES",
      title: "Tantra Reiki", lead: "Nine stages of body awareness, connection, symbolic energy work and personal practice. Follow the path at your own pace.",
      start: "BEGIN WITH LEVEL ONE", choose: "CHOOSE HOW TO START",
      free: "FREE EXPRESS LEVEL 1", paid: "PERSONAL LEVEL 1",
      freeBody: "Introductory initiation · enquire for the next available format",
      paidBody: "Individual initiation · per level · confirmed personally",
      roadmap: "One journey. Three movements.", roadmapLead: "Begin gently with body awareness, then explore connection, symbolic creativity and integration. Each practice is optional and consent-based.",
      phases: [
        ["01  /  FOUNDATION", "Levels 1–3 · Sensitivity, inner vitality and connection"],
        ["02  /  DEEPENING", "Levels 4–6 · Archetypes, inner light and integration"],
        ["03  /  MASTER PATH", "Levels 7–9 · Attention, creativity and mastery"]
      ],
      stage: "LEVEL", inside: "THE TRADITIONAL PERSPECTIVE", meaning: "WHAT THIS STAGE EXPLORES",
      tuning: "TRADITIONAL ATTUNEMENTS", practice: "GUIDED PRACTICE IDEA",
      reflect: "A QUESTION TO EXPLORE", takeNext: "YOUR NEXT STEP",
      endLead: "Curious to begin? Read about Level 1, then contact Andrey to ask about the available initiation format, schedule and current fee.",
      freeNote: "FREE EXPRESS INITIATION", paidNote: "FULL PERSONAL INITIATION",
      contact: "ANDREY LITVINOV", disclaimer: "Spiritual education and reflection, not medical care or guaranteed results.",
      website: "See the full course and original teachings online",
      continuation: "CONTINUED"
    },
    ru: {
      guide: "МЕТОДИЧКА ДЛЯ ТЕЛЕФОНА", levels: "9 СТУПЕНЕЙ / 3 ЭТАПА",
      title: "Тантра Рейки", lead: "Девять ступеней телесной осознанности, контакта и символических практик. Изучайте программу в собственном темпе.",
      start: "НАЧНИТЕ С ПЕРВОЙ СТУПЕНИ", choose: "ВЫБЕРИТЕ ВАРИАНТ",
      free: "БЕСПЛАТНАЯ ЭКСПРЕСС-ИНИЦИАЦИЯ", paid: "ЛИЧНАЯ ИНИЦИАЦИЯ",
      freeBody: "Вводный формат · доступность уточняется лично",
      paidBody: "Индивидуальное занятие · цена за одну ступень",
      roadmap: "Один путь. Три этапа.", roadmapLead: "Начните с мягкого исследования ощущений, затем переходите к символическому контакту, творчеству и интеграции. Все практики добровольны.",
      phases: [
        ["01  /  ОСНОВА", "Ступени 1–3 · Чувствительность и жизненность"],
        ["02  /  УГЛУБЛЕНИЕ", "Ступени 4–6 · Архетипы и внутренний свет"],
        ["03  /  ПУТЬ МАСТЕРА", "Ступени 7–9 · Внимание и созидание"]
      ],
      stage: "СТУПЕНЬ", inside: "ОБРАЗЫ АВТОРСКОЙ ПРОГРАММЫ", meaning: "СМЫСЛ СТУПЕНИ",
      tuning: "ТРАДИЦИОННЫЕ НАСТРОЙКИ", practice: "ИДЕЯ ДЛЯ ПРАКТИКИ",
      reflect: "ВОПРОС ДЛЯ РАЗМЫШЛЕНИЯ", takeNext: "СЛЕДУЮЩИЙ ШАГ",
      endLead: "Начните с первой ступени. Напишите Андрею, чтобы уточнить актуальный формат, расписание и условия инициации.",
      freeNote: "БЕСПЛАТНЫЙ ЭКСПРЕСС-ФОРМАТ", paidNote: "ПОЛНАЯ ЛИЧНАЯ ИНИЦИАЦИЯ",
      contact: "АНДРЕЙ ЛИТВИНОВ", disclaimer: "Духовное образование, не медицинская помощь или гарантия результата.",
      website: "Полная программа и материалы на сайте",
      continuation: "ПРОДОЛЖЕНИЕ"
    },
    es: {
      guide: "GUÍA PARA MÓVIL", levels: "9 ETAPAS / 3 FASES",
      title: "Tantra Reiki", lead: "Nueve etapas de conciencia corporal, conexión y prácticas simbólicas. Explora el camino a tu propio ritmo.",
      start: "COMIENZA POR EL NIVEL UNO", choose: "ELIGE CÓMO EMPEZAR",
      free: "INICIACIÓN EXPRÉS GRATUITA", paid: "INICIACIÓN PERSONAL",
      freeBody: "Introducción gratuita · consulta la disponibilidad",
      paidBody: "Sesión individual · tarifa por cada nivel",
      roadmap: "Un camino. Tres movimientos.", roadmapLead: "Empieza por la sensibilidad corporal y explora conexión, creatividad simbólica e integración. Las prácticas son voluntarias y consensuadas.",
      phases: [
        ["01  /  BASE", "Etapas 1–3 · Sensibilidad y conexión"],
        ["02  /  PROFUNDIZACIÓN", "Etapas 4–6 · Arquetipos y luz interior"],
        ["03  /  MAESTRÍA", "Etapas 7–9 · Atención y creación"]
      ],
      stage: "NIVEL", inside: "LA MIRADA ORIGINAL", meaning: "SIGNIFICADO DE LA ETAPA",
      tuning: "SINTONIZACIONES", practice: "IDEA DE PRÁCTICA",
      reflect: "PREGUNTA PARA REFLEXIONAR", takeNext: "EL SIGUIENTE PASO",
      endLead: "Empieza por el primer nivel. Contacta con Andrey para confirmar el formato, las fechas y las condiciones actuales.",
      freeNote: "EXPRÉS GRATUITA", paidNote: "PERSONAL COMPLETA",
      contact: "ANDREY LITVINOV", disclaimer: "Educación espiritual, no atención médica ni garantía de resultados.",
      website: "Programa y materiales completos",
      continuation: "CONTINUACIÓN"
    }
  }[locale];
  const prefix = locale === "ru" ? "https://holistichouse.vercel.app/ru" : locale === "es" ? "https://holistichouse.vercel.app/es" : "https://holistichouse.vercel.app/en";
  const courseUrl = prefix + "/academy/reiki/tantra-reiki";
  const displayPrice = formatReikiLevelPrice("tantra", locale);
  const rows = String(source).replace(/\r\n?/g, "\n").split("\n");
  const stages = [];
  let current = null;
  for (const raw of rows) {
    const s = raw.trim();
    const found = /^(?:Level|Ступень|Nivel)\s+(\d+)\.\s+(.+)$/iu.exec(s);
    if (found) {
      const pair = found[2].split(/\s+[—–]\s+/u);
      current = {
        n: Number(found[1]), title: pair[0], subtitle: pair.slice(1).join(" — "),
        meaning: "", author: "", tuning: "", practice: "", reflect: ""
      };
      stages.push(current);
      continue;
    }
    if (!current) continue;
    if (/^[-–]\s+/u.test(s)) current.meaning += (current.meaning ? " " : "") + s.replace(/^[-–]\s+/u, "");
    else if (/^Author's perspective:/iu.test(s)) current.author = s.replace(/^Author's perspective:\s*/iu, "");
    else if (/^(?:Attunements|Настройки|Sintonizaciones):/iu.test(s)) current.tuning = s.replace(/^[^:]+:\s*/u, "");
    else if (/^(?:Suggested practice|Практика|Práctica):/iu.test(s)) current.practice = s.replace(/^[^:]+:\s*/u, "");
    else if (/^(?:Reflection|Вопрос для размышления|Para reflexionar):/iu.test(s)) current.reflect = s.replace(/^[^:]+:\s*/u, "");
  }
  if (stages.length !== 9 || stages.some((s, n) => s.n !== n + 1 || !s.meaning || !s.tuning || !s.practice)) {
    throw new Error("Tantra Reiki mobile guide requires nine complete source-based levels");
  }
  const usage = new Map();
  const layouts = [];
  let page = [];
  let y = 0;
  function fillRect(x, bottom, width, height, color) {
    page.push(color + " rg " + x + " " + bottom + " " + width + " " + height + " re f");
  }
  function line(x1, y1, x2, y2, color = rule, width = 1) {
    page.push(color + " RG " + width + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  }
  function print(s, x, baseline, size = 14, color = inkBlue) {
    page.push(color + " rg BT /F1 " + size + " Tf 1 0 0 1 " + x + " " + baseline + " Tm <" + encodeGlyphs(s, usage) + "> Tj ET");
  }
  function drawCircle(cx, cy, radius, color = gold, weight = 1.2) {
    const k = radius * 0.55228475;
    page.push(color + " RG " + weight + " w " + (cx + radius) + " " + cy + " m " +
      (cx + radius) + " " + (cy + k) + " " + (cx + k) + " " + (cy + radius) + " " + cx + " " + (cy + radius) + " c " +
      (cx - k) + " " + (cy + radius) + " " + (cx - radius) + " " + (cy + k) + " " + (cx - radius) + " " + cy + " c " +
      (cx - radius) + " " + (cy - k) + " " + (cx - k) + " " + (cy - radius) + " " + cx + " " + (cy - radius) + " c " +
      (cx + k) + " " + (cy - radius) + " " + (cx + radius) + " " + (cy - k) + " " + (cx + radius) + " " + cy + " c S");
  }
  function paintPage() {
    page = [];
    layouts.push(page);
    fillRect(0, 0, W, H, paper);
    fillRect(0, H - 7, W, 7, ocean);
    print("HOLISTIC HOUSE", M, H - 34, 11, ocean);
    print(labels.guide, M, H - 53, 9.3, soft);
    line(M, 52, W - M, 52);
    print(labels.disclaimer, M, 35, 7.6, soft);
    print(String(layouts.length).padStart(2, "0"), W - M - 19, 35, 9.5, ocean);
    y = H - 91;
  }
  function writeText(text, size = 14.1, leading = 20.9, color = inkBlue, leftIndent = 0) {
    for (const row of wrap(text, CW - leftIndent, size)) {
      if (y < 75) {
        paintPage();
        print(labels.continuation, M, y, 11.5, ocean);
        y -= 30;
      }
      print(row, M + leftIndent, y, size, color);
      y -= leading;
    }
    y -= 11;
  }
  function section(heading, text, opts = {}) {
    if (!text) return;
    const size = opts.bodySize ?? 14.1;
    const leading = opts.leading ?? 20.9;
    const required = wrap(text, CW - 5, size).length * leading + 46;
    if (y < Math.min(required, 140) + 72) paintPage();
    print(heading, M, y, 10.7, ocean);
    y -= 27;
    writeText(text, size, leading, opts.color ?? inkBlue, 0);
  }
  function highlight(heading, text) {
    if (!text) return;
    const all = wrap(text, CW - 30, 13.5);
    const h = all.length * 20 + 60;
    if (y - h < 71) paintPage();
    fillRect(M, y - h, CW, h, mint);
    fillRect(M, y - h, 4, h, ocean);
    print(heading, M + 16, y - 25, 10.1, ocean);
    let b = y - 53;
    for (const row of all) { print(row, M + 16, b, 13.5, deep); b -= 20; }
    y -= h + 13;
  }
  // Cover: one readable column, never two A4-width pricing columns.
  paintPage();
  fillRect(0, H - 361, W, 361, deep);
  fillRect(0, H - 362, W, 5, gold);
  print("HOLISTIC HOUSE", M, H - 51, 13.2, white);
  print(labels.guide, M, H - 81, 10.3, gold);
  drawCircle(W - 55, H - 132, 66, gold, 1);
  drawCircle(W - 55, H - 132, 49, gold, 1);
  print(labels.title, M, H - 172, 35, white);
  let coverY = H - 217;
  for (const row of wrap(labels.lead, CW - 10, 15.2)) {
    print(row, M, coverY, 15.2, white);
    coverY -= 24;
  }
  print(labels.levels, M, H - 339, 10.5, gold);
  print(labels.choose, M, H - 396, 16.8, deep);
  fillRect(M, H - 480, CW, 65, mint);
  fillRect(M, H - 480, 5, 65, ocean);
  print(labels.free, M + 14, H - 439, 13, deep);
  print(labels.freeBody, M + 14, H - 461, 10.1, inkBlue);
  fillRect(M, H - 569, CW, 75, beige);
  fillRect(M, H - 569, 5, 75, gold);
  print(labels.paid, M + 14, H - 516, 12.8, deep);
  print(displayPrice, M + 14, H - 542, 16.4, ocean);
  print(labels.contact, M, 97, 11, ocean);
  print("WhatsApp +1 437 606 6502", M, 78, 11.4, inkBlue);

  // A short roadmap gives first-time readers an approachable overview.
  paintPage();
  print(labels.levels, M, y, 11.3, ocean);
  y -= 49;
  writeText(labels.roadmap, 27, 35, deep);
  writeText(labels.roadmapLead, 14.7, 21.7, inkBlue);
  y -= 6;
  for (const phase of labels.phases) {
    const paragraph = wrap(phase[1], CW - 32, 14.0);
    const h = paragraph.length * 21 + 56;
    if (y - h < 75) paintPage();
    fillRect(M, y - h, CW, h, paleBlue);
    fillRect(M, y - h, 5, h, ocean);
    print(phase[0], M + 18, y - 27, 11.3, ocean);
    let cy = y - 54;
    for (const row of paragraph) { print(row, M + 18, cy, 14, deep); cy -= 21; }
    y -= h + 17;
  }
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    paintPage();
    print(labels.stage + " " + String(i + 1).padStart(2, "0") + " / 09", M, y, 12.2, ocean);
    print(labels.phases[Math.floor(i / 3)][0], M + 154, y, 10.2, soft);
    y -= 36;
    const titleLines = wrap(stage.title, CW - 7, 26.4);
    for (const titleLine of titleLines) { print(titleLine, M, y, 26.4, deep); y -= 32; }
    y -= 1;
    writeText(stage.subtitle, 14.7, 21, ocean);
    line(M, y + 5, M + CW, y + 5, gold, 1.5);
    y -= 26;
    section(labels.meaning, stage.meaning);
    if (stage.author) section(labels.inside, stage.author, { bodySize: 13.7, leading: 20.5 });
    section(labels.tuning, stage.tuning.replace(/;\s*/g, "  ·  "), { bodySize: 13.7, leading: 20.4 });
    section(labels.practice, stage.practice);
    highlight(labels.reflect, stage.reflect);
  }

  // Final one-page consultation CTA; all information comes from the site's
  // published initiation policy and matches the online Level 1 offers.
  paintPage();
  print(labels.start, M, y, 11, ocean);
  y -= 42;
  writeText(labels.takeNext, 29, 36, deep);
  writeText(labels.endLead, 14.7, 22, inkBlue);
  y -= 12;
  const opts = [
    [labels.freeNote, labels.free, labels.freeBody, mint, ocean],
    [labels.paidNote, displayPrice, labels.paidBody, beige, gold]
  ];
  for (const o of opts) {
    const desc = wrap(o[2], CW - 36, 12.3);
    const h = desc.length * 18 + 90;
    if (y - h < 70) paintPage();
    fillRect(M, y - h, CW, h, o[3]);
    fillRect(M, y - h, 5, h, o[4]);
    print(o[0], M + 18, y - 27, 10, ocean);
    print(o[1], M + 18, y - 57, 16.7, deep);
    let v = y - 80;
    for (const row of desc) { print(row, M + 18, v, 12.3, inkBlue); v -= 18; }
    y -= h + 14;
  }
  if (y < 150) paintPage();
  print(labels.contact, M, y, 11.2, ocean);
  y -= 23;
  print("WhatsApp +1 437 606 6502", M, y, 13.1, deep);
  y -= 25;
  print("Telegram @AndyTherapist", M, y, 13.1, deep);
  y -= 38;
  print(labels.website, M, y, 11.4, ocean);
  y -= 23;
  writeText(courseUrl, 10.2, 15, soft);

  const objects = [];
  const catalog = object(objects, "");
  const rate = getReikiLevelPrice("tantra");
  const info = object(objects, "<< /Creator (Holistic House) /Subject (Reiki initiation price: EUR " + rate.amountEur + " per " + rate.durationMinutes + " minutes per level; Tantra Reiki mobile study guide, 9 symbolic levels) >>");
  const pagesRef = object(objects, "");
  const fontRef = fontObjects(objects, usage);
  const pageRefs = layouts.map((commands) => {
    const stream = commands.join("\n");
    const contents = object(objects, "<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "\nendstream");
    return object(objects, "<< /Type /Page /Parent " + pagesRef + " 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /Font << /F1 " + fontRef + " 0 R >> >> /Contents " + contents + " 0 R >>");
  });
  objects[catalog - 1] = Buffer.from("<< /Type /Catalog /Pages " + pagesRef + " 0 R >>", "ascii");
  objects[pagesRef - 1] = Buffer.from("<< /Type /Pages /Kids [" + pageRefs.map((id) => id + " 0 R").join(" ") + "] /Count " + pageRefs.length + " >>", "ascii");
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
