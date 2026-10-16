import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = [
  "app/[locale]/academy/[[...slug]]/page.tsx",
  "app/[locale]/library/page.tsx",
  "app/[locale]/wu-xing/page.tsx",
  "app/[locale]/services/free-situation-review/page.tsx",
  "app/[locale]/courses/antistress/page.tsx",
  "app/[locale]/courses/methodology/page.tsx",
  "app/[locale]/library/distance-homeopathy/page.tsx",
];

test("shared public EN/RU/ES page metadata includes a consistent English x-default", () => {
  for (const path of routes) {
    const code = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.match(code, /"x-default":/, path);
    assert.match(code, /languages:/, path);
  }
});
