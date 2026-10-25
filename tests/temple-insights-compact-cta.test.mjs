import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const source = read("components/ideas-discovery.tsx");
const styles = read("components/ideas-discovery.module.css");

test("Temple Insights offers two stacked real actions without transferring question data", () => {
  assert.match(source, /<button type="submit" form="ideas-question-form" className=\{styles\.testButton\} data-ideas-tao>/);
  const templeLink = source.slice(source.indexOf("{variant === "temple" ? <Link"), source.indexOf("</Link> : null}", source.indexOf("{variant === "temple" ? <Link")));
  assert.ok(templeLink.includes('href={freeOfferHref(locale, "review")}'));
  assert.match(templeLink, /data-ideas-personal-diagnostic/);
  assert.match(templeLink, /prefetch=\{false\}/);
  const first = source.indexOf("data-ideas-tao>");
  const second = source.indexOf("data-ideas-personal-diagnostic");
  assert.ok(first >= 0 && second > first, "diagnostic link must follow the symbolic-insight button");
  for (const label of [
    "Request Free Personal Diagnostic",
    "Запросить бесплатную личную диагностику",
    "Solicitar diagnóstico personal gratuito",
  ]) assert.ok(source.includes(label), "missing localized action: " + label);
  assert.match(source, /if \(id === "review"\) return/);
  assert.match(source, /\/services\/free-situation-review#request-free-review/);
  const offer = read("components/free-entry-landing.tsx");
  assert.match(offer, /"request-free-review"/);
  const link = source.slice(source.indexOf("{variant === "temple" ? <Link"), source.indexOf("</Link> : null}", source.indexOf("{variant === "temple" ? <Link")));
  assert.doesNotMatch(link, /onClick=|fetch\(|question\}/, "free diagnostic must not silently share the browser-only question");
});

test("Temple variant removes the fixed empty hero space at 320–430px", () => {
  assert.match(styles, /\.root\[data-temple-mode="true"\] \.hero \{[\s\S]*?min-height: 0;/);
  assert.match(styles, /\.root\[data-temple-mode="true"\] \.heroActions \{[\s\S]*?grid-template-columns: minmax\(0,1fr\);/);
  assert.match(styles, /\.root\[data-temple-mode="true"\] \.heroActions \.diagnosticAction \{/);
  assert.match(styles, /@media \(max-width: 600px\) \{[\s\S]*?\.root\[data-temple-mode="true"\] \.hero \{ min-height: 0;/);
  assert.match(styles, /@media \(max-width: 360px\) \{[\s\S]*?\.root\[data-temple-mode="true"\] \.hero \{ min-height: 0;/);
  assert.match(styles, /\.heroActions \.diagnosticAction \{[\s\S]*?min-height: 52px/);
  assert.match(styles, /\.heroActions \.diagnosticAction \{[\s\S]*?overflow-wrap: anywhere/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
});
