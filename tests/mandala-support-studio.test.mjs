import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const client = read("components/mandala-support-studio.tsx");
const style = read("components/mandala-support-studio.module.css");
const page = read("app/[locale]/holistic-support/mandala/page.tsx");
const hostPage = read("app/[locale]/holistic-support/page.tsx");
const hostStyle = read("app/[locale]/holistic-support/holistic-support.module.css");

test("personal mandala practice is reachable from Holistic Support and localized", () => {
  assert.match(hostPage, /href=\{"\/" \+ locale \+ "\/holistic-support\/mandala"\}/);
  assert.match(hostPage, /className=\{styles\.mandalaEntry\}/);
  assert.match(hostPage, /<HolisticMeditationGallery locale=\{locale\} videos=\{freeMeditationVideos\(locale\)\} \/>/);
  assert.match(hostStyle, /\.mandalaEntry/);
  assert.match(page, /isPublicLocale\(locale\)/);
  assert.match(page, /freeMeditationVideos\(locale\)/);
  for (const locale of ["en", "ru", "es"]) {
    assert.match(page, new RegExp(locale + ': "/' + locale + '/holistic-support/mandala"'));
  }
  for (const str of ["My support mandala", "Моя мандала поддержки", "Mi mandala de apoyo",
    "Create my support mandala", "Создать мандалу поддержки", "Crear mi mandala de apoyo"]) {
    assert.ok((page + hostPage).includes(str), "Missing translation: " + str);
  }
});

test("constructor uses five real local template assets including original stone mosaic", () => {
  const paths = ["sun", "lotus", "star", "dao", "stone-mosaic-01"].map(
    name => "public/images/mandalas/" + name + ".svg",
  );
  for (const path of paths) {
    const svg = read(path);
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox="0 0 1200 1200"/);
    assert.match(svg, /<\/svg>\s*$/);
    assert.doesNotMatch(svg, /<script|<foreignObject|http:\/\//i);
  }
  for (const path of paths) {
    assert.ok(client.includes(path.replace("public", "")), "Missing template link: " + path);
  }
  assert.match(read("public/images/mandalas/stone-mosaic-01.svg"), /aria-label="Каменная мандала 1"/);
  assert.match(client, /drawMandala\(/);
  assert.match(client, /ctx\.clip\(\)/);
  assert.match(client, /ctx\.drawImage\(portrait,/);
  assert.match(client, /ctx\.fillText\(intention\.trim\(\),/);
});

test("photo stays in memory and can be downloaded privately with crop controls", () => {
  assert.match(client, /type="file" accept="image\/\*"/);
  assert.match(client, /MAX_PHOTO_BYTES = 15 \* 1024 \* 1024/);
  assert.match(client, /file\.type === "image\/svg\+xml"/);
  assert.match(client, /URL\.createObjectURL\(file\)/);
  assert.match(client, /URL\.revokeObjectURL\(photoUrl\)/);
  assert.match(client, /canvas\.toBlob\(/);
  assert.match(client, /link\.download = "holistic-house-mandala\.png"/);
  assert.match(client, /type="range"/);
  assert.match(client, /setPanX\(0\)/);
  assert.match(client, /setPanY\(0\)/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|supabase|storage\.from|fetch\(|XMLHttpRequest|FormData/);
  for (const str of ["Your photo and intention stay in this browser", "Фото и намерение остаются в вашем браузере", "La imagen y tu intención permanecen en este navegador"]) {
    assert.ok(client.includes(str), "Missing privacy notice: " + str);
  }
});

test("meditation reuses source-backed visible YouTube video player without hidden audio", () => {
  assert.match(client, /videos: MeditationVideo\[\]/);
  assert.match(client, /<AcademyVideoPlayer key=\{activeVideo\.id\}/);
  assert.match(client, /youtubeId=\{activeVideo\.id\}/);
  assert.match(client, /video\.topics\.includes\(topic\)/);
  assert.match(client, /setVideoId\(null\)/);
  assert.match(client, /data-mandala-video-player/);
  assert.doesNotMatch(client, /<audio|autoplay=\{true\}|youtubeId:\s*["']|youtube-nocookie\.com\/embed\/|\.mp3/);
  assert.match(style, /academy-video-frame/);
  assert.match(style, /min-height:200px/);
  assert.match(style, /max-width:430px/);
  assert.match(style, /max-width:860px/);
  assert.match(client, /A reflective practice for personal focus, not a treatment/);
});

test("new TSX compiles syntactically before typecheck/Next build", () => {
  for (const [file, source] of [
    ["components/mandala-support-studio.tsx", client],
    ["app/[locale]/holistic-support/mandala/page.tsx", page],
  ]) {
    const result = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    });
    assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0, file);
  }
});
