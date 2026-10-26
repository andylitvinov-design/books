import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, symlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const conditions = process.execArgv.filter((arg) => arg.startsWith("--conditions="));

test("SEO audit command exits nonzero on failures and validates the public keyword/sitemap contract", () => {
  const result = spawnSync(process.execPath, [...conditions, "scripts/verify-seo.mjs"], { encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS: SEO map, 15 public locale URLs/);
});

// Execute the real CLI from a complete source-only copy. No source rewrite that
// inserts H1 markers, no altered module loader, no network and no application boot.
const cliSources = [
  "scripts/verify-seo.mjs", "data/seo-priority-paths.js", "package.json", "data/seo-demand-map.json",
  "app/[locale]/about/page.tsx", "app/[locale]/services/free-situation-review/page.tsx",
  "app/[locale]/academy/[[...slug]]/page.tsx", "components/yggdrasil-free-initiation.tsx",
  "components/free-entry-landing.tsx", "components/free-entry-landing.module.css", "app/[locale]/app/[[...path]]/page.jsx",
  "app/[locale]/client/[selector]/page.js", "app/[locale]/report/[assessmentId]/page.jsx",
  "app/admin/clients/page.js", "app/sitemap.ts", "app/layout.tsx",
];
function realCliFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "hh-seo-cli-"));
  try {
    for (const path of cliSources) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(new URL("../" + path, import.meta.url), join(root, path));
    }
    mkdirSync(join(root, "node_modules"));
    symlinkSync(dirname(dirname(fileURLToPath(import.meta.resolve("typescript")))), join(root, "node_modules/typescript"), "dir");
    return run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const invoke = (root, args = []) => spawnSync(process.execPath, [...conditions, "scripts/verify-seo.mjs", ...args], { cwd: root, encoding: "utf8", timeout: 20000 });

test("real CLI source-root copy succeeds and invalid live origin fails after source success", () => realCliFixture((root) => {
  const source = invoke(root);
  assert.equal(source.status, 0, source.stderr);
  assert.match(source.stdout, /source checks only/);
  assert.doesNotMatch(source.stdout, /PASS: live/);
  const invalid = invoke(root, ["--live-base=http://example.com"]);
  assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
  assert.match(invalid.stdout, /source checks only/, "Live input validation is reached only after a genuine source pass");
  assert.match(invalid.stderr, /FAIL:/);
  assert.match(invalid.stderr, /http:|https:/);
  assert.doesNotMatch(invalid.stdout, /PASS: live/);
}));

for (const [name, path, from, to, expected] of [
  ["no H1", "components/free-entry-landing.tsx", '<h1 id="free-entry-title">{t.title}</h1>', '<h2 id="free-entry-title">{t.title}</h2>', /exactly one H1/],
  ["wrong locale", "app/[locale]/services/free-situation-review/page.tsx", '<FreeEntryLanding locale={locale} kind="situation" />', '<FreeEntryLanding locale="en" kind="situation" />', /wrong delegated locale\/kind/],
  ["wrong canonical", "app/[locale]/services/free-situation-review/page.tsx", 'canonical: "/" + locale + "/services/free-situation-review"', 'canonical: "/en/services/free-situation-review"', /wrong self canonical ru/],
  ["unmounted source delegation", "app/[locale]/services/free-situation-review/page.tsx", '<FreeEntryLanding locale={locale} kind="situation" />', '<main />', /one actual delegated owner/],
]) test("real CLI exits nonzero for " + name, () => realCliFixture((root) => {
  const file = join(root, path), source = readFileSync(file, "utf8");
  assert.equal(source.split(from).length - 1, 1, "Mutate exactly one actual source anchor");
  writeFileSync(file, source.replace(from, to));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:/);
  assert.match(result.stderr, expected);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

for (const [name, path, from, to, expected, all = false] of [
  ["reviewer ordinary owner throw", "components/free-entry-landing.tsx", '  const t = copy[locale][kind];', '  throw new Error("Unreachable heading");\n  const t = copy[locale][kind];', /unsupported owner effect\/control flow/],
  ["reviewer Object.assign title mutation", "components/free-entry-landing.tsx", '  const t = copy[locale][kind];', '  const t = copy[locale][kind];\n  Object.assign(t, { title: "" });', /unsupported owner effect\/control flow/],
  ["reviewer computed metadata override", "app/[locale]/services/free-situation-review/page.tsx", 'title: t.title, description: t.description,\n    alternates:', 'title: t.title, description: t.description, ["ti" + "tle"]: "Wrong title",\n    alternates:', /metadata must have explicit noncomputed fields/],
  ["reviewer wrong locale source property", "app/[locale]/services/free-situation-review/page.tsx", 'const { locale } = await params;', 'const { wrong: locale } = await params;', /requested params.locale property binding/, true],
  ["reviewer wrong metadata params property", "app/[locale]/services/free-situation-review/page.tsx", 'generateMetadata({ params }: Props)', 'generateMetadata({ wrong: params }: Props)', /owner must receive actual params property/],
  ["reviewer wrong route params property", "app/[locale]/services/free-situation-review/page.tsx", 'FreeSituationReviewPage({ params }: Props)', 'FreeSituationReviewPage({ wrong: params }: Props)', /owner must receive actual params property/],
]) test("real CLI rejects " + name, () => realCliFixture((root) => {
  const file = join(root, path), source = readFileSync(file, "utf8");
  assert.equal(source.split(from).length - 1, all ? 2 : 1);
  writeFileSync(file, all ? source.replaceAll(from, to) : source.replace(from, to));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:/);
  assert.match(result.stderr, expected);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

for (const [name, from, to, expected] of [
  ["route guard alternative", 'if (!isPublicLocale(locale)) notFound();', 'if (!isPublicLocale(locale)) notFound(); else throw new Error("Unreachable valid locale");', /unsupported route preparation\/guard shape/],
  ["metadata guard throw alternative", 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) return { robots: { index: false } }; else throw new Error("Unreachable metadata");', /unsupported metadata preparation\/guard\/declarator shape/],
  ["metadata guard return alternative", 'if (!isPublicLocale(locale)) return { robots: { index: false } };', 'if (!isPublicLocale(locale)) return { robots: { index: false } }; else return { title: "Wrong early metadata" };', /unsupported metadata preparation\/guard\/declarator shape/],
  ["extra metadata declarator mutation", 'const t = copy[locale];', 'const t = copy[locale], ignored = Object.assign(t, { title: "" });', /unsupported metadata preparation\/guard\/declarator shape/],
  ["extra metadata declarator throw", 'const t = copy[locale];', 'const t = copy[locale], ignored = (() => { throw new Error("Unreachable metadata declarator"); })();', /unsupported metadata preparation\/guard\/declarator shape/],
  ["returned route sibling effect", 'return <FreeEntryLanding locale={locale} kind="situation" />;', 'return <>{(() => { throw new Error("Unreachable route"); })()}<FreeEntryLanding locale={locale} kind="situation" /></>;', /unsupported route call\/effect/],
  ["returned route attribute effect", '<FreeEntryLanding locale={locale} kind="situation" />', '<FreeEntryLanding locale={locale} kind="situation" data-check={(() => { throw new Error("Unreachable route attribute"); })()} />', /unsupported route call\/effect/],
  ["separate same-module metadata mutation", '<FreeEntryLanding locale={locale} kind="situation" />', '<FreeEntryLanding locale={locale} kind="situation" data-check={Object.assign(copy.en, { title: "" })} />', /unsupported route call\/effect/],
]) test("real CLI rejects complete-grammar " + name, () => realCliFixture((root) => {
  const file = join(root, "app/[locale]/services/free-situation-review/page.tsx"), source = readFileSync(file, "utf8");
  assert.equal(source.split(from).length - 1, 1);
  writeFileSync(file, source.replace(from, to));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape/);
  assert.match(result.stderr, expected);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

test("real CLI rejects resource-management declarator masquerading as const", () => realCliFixture((root) => {
  const file = join(root, "app/[locale]/services/free-situation-review/page.tsx"), source = readFileSync(file, "utf8");
  const from = 'const t = copy[locale];';
  assert.equal(source.split(from).length - 1, 1);
  writeFileSync(file, source.replace(from, 'await using t = copy[locale];'));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape/);
  assert.match(result.stderr, /missing source binding t/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

test("real CLI rejects ambient metadata binding rather than treating it as runtime const", () => realCliFixture((root) => {
  const file = join(root, "app/[locale]/services/free-situation-review/page.tsx"), source = readFileSync(file, "utf8");
  const from = 'const t = copy[locale];';
  assert.equal(source.split(from).length - 1, 1);
  writeFileSync(file, source.replace(from, 'declare const t = copy[locale];'));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape/);
  assert.match(result.stderr, /missing source binding t/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

for (const [name, path, start, from, to, expected] of [
  ["metadata await identifier", "app/[locale]/services/free-situation-review/page.tsx", "export async function generateMetadata", "await params", "awaitparams", /metadata preparation\/guard\/declarator/],
  ["route await identifier", "app/[locale]/services/free-situation-review/page.tsx", "export default async function FreeSituationReviewPage", "await params", "awaitparams", /requested params.locale/],
  ...[
    ["join object coercion", '[{ toString: null }].join(" ")', /join primitive receiver\/coercion/],
    ["join object method", '[{ toString() { return {}; } }].join(" ")', /source data must have explicit noncomputed fields/],
    ["unbound approved call", 'String(i + 1)', /unbound owner identifier i/],
    ["null property", '(null as unknown as { value: string }).value', /unsupported\/missing own owner property/],
  ].map(([name, expression, expected]) => [name, "components/free-entry-landing.tsx", "", '<h1 id="free-entry-title">{t.title}</h1>', '{' + expression + '}<h1 id="free-entry-title">{t.title}</h1>', expected]),
]) test("real CLI rejects closed-grammar reviewer " + name, () => realCliFixture((root) => {
  const file = join(root, path), source = readFileSync(file, "utf8"), index = start ? source.indexOf(start) : 0;
  assert.ok(index >= 0);
  const tail = source.slice(index); assert.ok(tail.includes(from));
  writeFileSync(file, source.slice(0, index) + tail.replace(from, to));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape/);
  assert.match(result.stderr, expected);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

for (const [name, sourceStyle] of [
  ["case-equivalent display none", '{ display: "NONE" }'],
  ["whitespace-equivalent visibility hidden", '{ visibility: " HIDDEN " }'],
  ["decimal string opacity zero", '{ opacity: "0.00" }'],
  ["percentage opacity zero", '{ opacity: "0%" }'],
]) test("real CLI rejects hidden literal visibility " + name, () => realCliFixture((root) => {
  const file = join(root, "components/free-entry-landing.tsx"), source = readFileSync(file, "utf8");
  const anchor = '<h1 id="free-entry-title">{t.title}</h1>';
  assert.equal(source.split(anchor).length - 1, 1);
  writeFileSync(file, source.replace(anchor, anchor.replace('<h1 ', '<h1 style={' + sourceStyle + '} ')));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape: explicitly hidden SEO style/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));

test("real CLI treats unknown literal visibility aria-hidden tokens as unverified", () => realCliFixture((root) => {
  const file = join(root, "components/free-entry-landing.tsx"), source = readFileSync(file, "utf8");
  const anchor = '<h1 id="free-entry-title">{t.title}</h1>';
  assert.equal(source.split(anchor).length - 1, 1);
  writeFileSync(file, source.replace(anchor, anchor.replace('<h1 ', '<h1 aria-hidden="TRUE" ')));
  const result = invoke(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /FAIL:.*unverified source shape: unsupported aria-hidden literal on SEO ancestor/);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|SyntaxError/);
  assert.doesNotMatch(result.stdout, /PASS:/);
}));
