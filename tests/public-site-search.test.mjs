import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteSearch, searchPublicItems } from "../lib/public-site-search.mjs";

const items = [
  { kind: "service", title: "Free situation review", description: "Personal written feedback", href: "/en/services/free-situation-review" },
  { kind: "course", title: "Kundalini Reiki", description: "Study energy and meditation", href: "/en/academy/reiki/kundalini-reiki" },
  { kind: "material", title: "Рейки — методичка", description: "Практика", href: "/ru/books/reiki" },
  { kind: "article", title: "Estrés y calma", description: "Guía para el bienestar", href: "/es/articles/stress" },
  { kind: "test", title: "Stress self-check", description: "Free test", href: "/en/client/tests" },
  { kind: "material", title: "A private report", description: "Not indexed", href: "//evil.example/steal" },
  { kind: "material", title: "Video lesson", description: "", href: "javascript:alert(1)" },
];

test("search normalizes casing, Russian yo and accented Spanish", () => {
  assert.equal(normalizeSiteSearch(" Ёлка / ESTRÉS! "), "елка estres");
  assert.equal(searchPublicItems(items, "рейки")[0].href, "/ru/books/reiki");
  assert.equal(searchPublicItems(items, "estres")[0].href, "/es/articles/stress");
});

test("multiword queries match one item and prefer a title to body", () => {
  assert.equal(searchPublicItems(items, "Free situation")[0].href, "/en/services/free-situation-review");
  assert.deepEqual(searchPublicItems(items, "reiki free"), []);
  assert.equal(searchPublicItems(items, "stress")[0].title, "Stress self-check");
});

test("search requires two characters, bounds results, and never returns unsafe hrefs", () => {
  assert.deepEqual(searchPublicItems(items, "s"), []);
  assert.deepEqual(searchPublicItems(items, "x".repeat(81)), []);
  assert.equal(searchPublicItems(items, "stress", 1).length, 1);
  assert.deepEqual(searchPublicItems(items, "private"), []);
  assert.deepEqual(searchPublicItems(items, "video"), []);
});
