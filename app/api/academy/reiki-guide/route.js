import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { buildReikiCourseGuidePdf } from "@/lib/academy/reiki-guide-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coursePaths = {
  tantra: "tantra",
  yggdrasil: "yggdrasil",
  kundalini: "kundalini",
};
const locales = new Set(["en", "ru", "es"]);

export async function GET(request) {
  const url = new URL(request.url);
  const course = url.searchParams.get("course");
  const locale = url.searchParams.get("locale");
  if (!Object.hasOwn(coursePaths, course) || !locales.has(locale)) {
    return new Response("Unknown Reiki course or language", { status: 404 });
  }

  // Kundalini Reiki is a byte-for-byte copy of the USER-UPLOADED
  // 24-page Paul Crick PDF, NOT a newly generated study guide.
  // All languages download the exact same English-language original.
  if (course === "kundalini") {
    const originalPath = "/academy/kundalini-reiki/kundalini-reiki-manual-paul-crick.pdf";
    const filePath = resolve(process.cwd(), "public", "academy", "kundalini-reiki", "kundalini-reiki-manual-paul-crick.pdf");
    let original;
    try {
      original = await readFile(filePath);
    } catch {
      const response = await fetch(new URL(originalPath, url), { cache: "no-store" });
      if (!response.ok) return new Response("Original manual is temporarily unavailable", { status: 503 });
      original = Buffer.from(await response.arrayBuffer());
    }
    const expected = "dd28184c0199ceb947295dc2ef407fbc3e818375bb533928e0b721528355f18b";
    const actual = createHash("sha256").update(original).digest("hex");
    if (original.length !== 243352 || actual !== expected) {
      return new Response("Original manual did not pass integrity verification", { status: 503 });
    }
    return new Response(new Uint8Array(original), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Kundalini_Reiki_Manual_Paul_Crick.pdf"',
        "Content-Length": String(original.length),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const filename = coursePaths[course] + "." + locale + ".txt";
  const filePath = resolve(process.cwd(), "public", "academy", "course-guides", filename);
  let guide;
  try {
    guide = await readFile(filePath, "utf8");
  } catch {
    // Vercel may deliver /public assets through its CDN rather than the function bundle.
    const response = await fetch(new URL("/academy/course-guides/" + filename, url), { cache: "no-store" });
    if (!response.ok) return new Response("Course guide is temporarily unavailable", { status: 503 });
    guide = await response.text();
  }
  if (guide.length < 1000 || !guide.includes("holistichouse.vercel.app")) {
    return new Response("Invalid course guide", { status: 503 });
  }

  const buffer = buildReikiCourseGuidePdf({ course, locale, source: guide });
  const basename = course === "tantra" ? "tantra-reiki" : "reiki-yggdrasil";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + basename + "-study-prices-" + locale + '.pdf"',
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
