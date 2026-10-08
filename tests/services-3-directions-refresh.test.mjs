import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const services = readFileSync(new URL("../app/[locale]/services/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/[locale]/services/services-landing.module.css", import.meta.url), "utf8");

test("services landing has three primary directions, not competing category grid", () => {
  assert.match(services, /id: "psychohomeopathy"/);
  assert.match(services, /id: "imagery"/);
  assert.match(services, /id: "constellations"/);
  assert.match(services, /free-situation-review/);
  assert.match(services, /services-landing\.module\.css/);
  assert.match(styles, /\.directionStack\s*\{/);
});
