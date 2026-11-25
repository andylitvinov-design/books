import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const file = path => new URL("../" + path, import.meta.url);
const read = path => readFileSync(file(path), "utf8");

test("a lightweight branded splash is isolated to public data-feed routes", () => {
  const component = read("components/public-loading-splash.tsx");
  const css = read("components/public-loading-splash.module.css");
  const logo = read("public/icons/holistic-house-teal.svg");
  assert.match(component, /export function PublicLoadingSplash\(/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-busy="true"/);
  assert.match(component, /data-hh-loading-splash/);
  assert.match(component, /src="\/icons\/holistic-house-teal\.svg"/);
  assert.ok(Buffer.byteLength(logo) < 2048, "the first-party logo must remain tiny");
  assert.doesNotMatch(component, /["']use client["']|setTimeout\(|setInterval\(|fetch\(|next\/image|useEffect|window\.|document\./);
  for (const path of ["app/[locale]/library/loading.tsx", "app/[locale]/mytube/loading.tsx"]) {
    assert.match(read(path), /<PublicLoadingSplash\s*\/>/);
    assert.match(read(path), /export default function Loading\(/);
  }
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /animation:\s*none/);
  assert.doesNotMatch(css, /@import|url\(|position:\s*fixed|animation-delay|transition-delay/);
});

test("protected routes and server redirects are never wrapped by a root loading boundary", () => {
  // A global loading.tsx streams before the server auth/redirect status can be
  // computed, returning HTTP 200 plus a meta refresh instead of 307/308.
  assert.equal(existsSync(file("app/loading.tsx")), false);
  assert.equal(existsSync(file("app/[locale]/loading.tsx")), false);
  assert.equal(existsSync(file("app/admin/loading.tsx")), false);
  assert.match(read("app/page.tsx"), /redirect\(/);
  assert.match(read("app/[locale]/services/psychohomeopathy/page.tsx"), /permanentRedirect\(/);
  assert.doesNotMatch(read("app/layout.tsx"), /PublicLoadingSplash/);
});
