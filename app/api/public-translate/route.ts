import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CYRILLIC = /[\u0400-\u04FF]/;
const MAX_TEXTS = 24;
const MAX_TEXT_LENGTH = 9000;
const CHUNK_SIZE = 3200;

function splitText(text: string) {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > CHUNK_SIZE) {
    let cut = Math.max(
      rest.lastIndexOf(". ", CHUNK_SIZE),
      rest.lastIndexOf("! ", CHUNK_SIZE),
      rest.lastIndexOf("? ", CHUNK_SIZE),
      rest.lastIndexOf("\n", CHUNK_SIZE),
      rest.lastIndexOf(" ", CHUNK_SIZE),
    );
    if (cut < CHUNK_SIZE * 0.55) cut = CHUNK_SIZE;
    else cut += 1;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateChunk(text: string) {
  if (!CYRILLIC.test(text)) return text;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ru");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 HolisticHouse/1.0" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) throw new Error("Translation service unavailable");
  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part: unknown) => Array.isArray(part) ? String(part[0] ?? "") : "").join("")
    : "";
  return translated || text;
}

async function translateText(text: string) {
  if (!CYRILLIC.test(text)) return text;
  const chunks = splitText(text);
  const translated: string[] = [];
  for (const chunk of chunks) translated.push(await translateChunk(chunk));
  return translated.join("");
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const texts = Array.isArray(payload?.texts) ? payload.texts : null;
    if (!texts || texts.length > MAX_TEXTS) {
      return NextResponse.json({ error: "Invalid translation batch" }, { status: 400 });
    }

    const clean = texts.map((value: unknown) => String(value ?? ""));
    if (clean.some((value: string) => value.length > MAX_TEXT_LENGTH)) {
      return NextResponse.json({ error: "Translation segment too large" }, { status: 400 });
    }

    const translations = await Promise.all(clean.map(translateText));
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ error: "Translation unavailable" }, { status: 502 });
  }
}
