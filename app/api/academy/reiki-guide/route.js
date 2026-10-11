import { readFile } from "node:fs/promises";
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
  const basename = course === "tantra" ? "tantra-reiki" : course === "kundalini" ? "kundalini-reiki" : "reiki-yggdrasil";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + basename + (course === "kundalini" ? "-study-guide-" : "-study-prices-") + locale + '.pdf"',
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
