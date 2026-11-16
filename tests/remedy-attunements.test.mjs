import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(readFileSync(path.join(root, "data/remedy-attunements.json"), "utf8")).entries;
const canonical = new Set(JSON.parse(readFileSync(path.join(root, "data/book-02-remedy-toc.json"), "utf8")).entries.map((item) => item.slug));

test("original poetry archive contains 23 traceable, non-duplicated poems", () => {
  assert.equal(records.length, 23);
  assert.equal(new Set(records.map((p) => p.message_id)).size, 23);
  assert.deepEqual(records.map((p) => p.message_id).sort((a,b)=>a-b), [189,190,200,202,205,218,221,224,245,249,258,279,283,286,420,426,430,566,623,668,691,695,752]);
  for(const p of records) {
    assert.ok(p.text.length>=200 && p.text.split("\n").length>=12, p.id);
    assert.equal(p.source_url, "https://t.me/psychic_alchemy/"+p.message_id);
    assert.ok(["poem","group-poem","poetic-meditation"].includes(p.form));
  }
});
test("every poem links only to existing paired canonical descriptions", () => {
  const slugs = [...new Set(records.flatMap(p=>p.remedy_slugs))];
  assert.equal(slugs.length, 23);
  assert.equal(records.reduce((n,p)=>n+p.remedy_slugs.length,0),26);
  for(const slug of slugs) {
    assert.equal(canonical.has(slug), true,slug);
    for(const locale of ["ru","en"])assert.equal(existsSync(path.join(root,"content","remedies",locale,slug+".md")),true,slug);
  }
  assert.deepEqual(records.filter(p=>p.remedy_slugs.includes("staphysagria")).map(p=>p.message_id),[279,283]);
  assert.deepEqual(records.find(p=>p.message_id===691).remedy_slugs,["magnesium-muriaticum","carcinosinum","thuja"]);
});
