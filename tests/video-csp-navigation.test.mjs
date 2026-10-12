import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("public video CSP allows only reviewed embed origins and scopes native Tantra media", async () => {
  const middleware = await source("middleware.ts");
  assert.match(middleware, /const publicDocument = !privateDocument && !pathname\.startsWith\('\/api\/'\)/);
  assert.match(middleware, /frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/app\.heygen\.com/);
  assert.match(middleware, /tantraReikiPage \? "media-src 'self' https:\/\/www\.psitrends\.com" : "media-src 'self'"/);
  assert.match(middleware, /privateDocument \? 'private'/);
  assert.doesNotMatch(middleware, /frame-src \*/);
  assert.doesNotMatch(middleware, /media-src \*/);
});

test("About's Psychic Alchemy renderer uses the reviewed HeyGen embed", async () => {
  const aboutVideo = await source("components/psychic-alchemy-intro-video.tsx");
  assert.match(aboutVideo, /https:\/\/app\.heygen\.com\/embeds\/\$\{VIDEO_ID\}/);
  assert.match(aboutVideo, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(aboutVideo, /aria-label=\{`Open video: \$\{video\.title\}`\}/);
});

test("CSP class boundary reloads only cross-policy client navigation", async () => {
  const [middleware, layout, boundary] = await Promise.all([
    source("middleware.ts"), source("app/layout.tsx"), source("components/csp-navigation-boundary.tsx"),
  ]);
  assert.match(middleware, /requestHeaders\.set\('x-csp-class', cspClass\)/);
  assert.match(layout, /<body className="font-sans" data-csp-class=\{cspClass\}>/);
  assert.match(layout, /<CspNavigationBoundary \/>/);
  assert.match(boundary, /window\.location\.assign\(url\.href\)/);
  assert.match(boundary, /window\.location\.reload\(\)/);
  assert.match(boundary, /addEventListener\("click", onClick, true\)/);
  assert.match(boundary, /removeEventListener\("click", onClick, true\)/);
  assert.match(boundary, /addEventListener\("popstate", onPopState\)/);
  assert.match(boundary, /removeEventListener\("popstate", onPopState\)/);
  assert.match(boundary, /tantra-media/);
  assert.match(boundary, /private/);
});

test("library video cards use existing public destinations", async () => {
  const library = await source("components/library-hub.tsx");
  assert.match(library, /href: "\/en\/homeopathy"/);
  assert.match(library, /href: "\/\?lang=ru"/);
  assert.match(library, /href: "\/ru\/homeopathy"/);
  assert.doesNotMatch(library, /href: "\/ru\/"/);
});

test("private Yggdrasil recording stays listed without a playable provider id", async () => {
  const [curriculum, courses, player] = await Promise.all([
    source("data/academy/yggdrasil-curriculum.json"), source("components/academy-video-courses.tsx"), source("components/academy-video-library-client.tsx"),
  ]);
  assert.doesNotMatch(curriculum, /FxOE-cEAnP4/);
  assert.match(curriculum, /"availability": "unavailable"/);
  assert.match(courses, /video\.availability === "unavailable"/);
  assert.match(player, /lesson\.unavailable/);
  assert.match(player, /not publicly playable/);
});



test("client CSP classification exactly follows middleware including encoded and root paths", async () => {
  const [middleware, boundary] = await Promise.all([source("middleware.ts"), source("components/csp-navigation-boundary.tsx")]);
  const serverPrivate = middleware.slice(middleware.indexOf("function privatePath("), middleware.indexOf("export function middleware"));
  const clientPrivate = boundary.slice(boundary.indexOf("function privatePath("), boundary.indexOf("function cspClassForPath("));
  assert.equal(clientPrivate.trim(), serverPrivate.trim(), "Private-path rules must stay identical; never widen private CSP");
  const classifySource = boundary.slice(boundary.indexOf("function privatePath("), boundary.indexOf("/**")).replaceAll(": string", "");
  const classify = new Function(classifySource + "; return cspClassForPath;")();
  const isPrivate = new Function(serverPrivate.replaceAll(": string", "") + "; return privatePath;")();
  const paths = ["/", "/en/about", "/ru/services", "/es/about", "/admin", "/admin/videos", "/admin/videos/", "/document-preview", "/document-preview/example", "/api", "/api/", "/api/client", "/api/client-example", "/api/admin", "/api/admin/example", "/api/prescriptions", "/api/prescriptions/example", "/api/prescription-access", "/api/app", "/api/app/me"];
  for (const locale of ["en", "ru", "es"]) {
    for (const section of ["app", "client", "report", "prescriptions", "academy/reiki/tantra-reiki"]) {
      for (const suffix of ["", "/", "/example"]) paths.push(`/${locale}/${section}${suffix}`);
    }
  }
  for (const path of [...paths, ...paths.map(path => path.replaceAll("/", "%2F")), ...paths.map(path => path.replaceAll("/", "//")), "/en/%63lient/example", "/%65n/client/example", "/en/client/%invalid"]) {
    const expected = path === "/admin/videos" ? "video-manager" : isPrivate(path) ? "private"
      : /^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(path) ? "tantra-media"
        : path.startsWith("/api/") ? "restricted" : "public-video";
    assert.equal(classify(path), expected, path);
  }
});
