import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { daoStages, getDaoStage } from "../data/dao/taoist-stages.mjs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the author's complete 18-stage Dao map covers all three cycles in EN/RU/ES", () => {
  assert.equal(daoStages.length, 18);
  assert.deepEqual(daoStages.map(s => s.number), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.deepEqual([1,2,3].map(p => daoStages.filter(s => s.phase === p).length), [7,7,4]);
  assert.equal(getDaoStage(3).name.ru, "Прометей");
  assert.equal(getDaoStage(8).name.ru, "Река");
  assert.equal(getDaoStage(18).name.ru, "У-Цзи");
  assert.equal(getDaoStage(19), null);
  for (const stage of daoStages) for (const locale of ["en","ru","es"]) {
    assert.ok(stage.name[locale]?.trim(), "missing title " + stage.number + "/" + locale);
    assert.ok(stage.task[locale]?.trim(), "missing task " + stage.number + "/" + locale);
  }
});

test("all 18 stages are in the public localized guide, with exact deep links and free intake", () => {
  const page = read("app/[locale]/dao/stages/page.tsx");
  const css = read("app/[locale]/dao/stages/dao-stages.module.css");
  assert.match(page, /daoStages\.filter\(stage => stage\.phase === phase\)/);
  assert.match(page, /id=\{"stage-" \+ stage\.number\}/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /"x-default"/);
  assert.match(page, /PublicSiteHeader/);
  assert.match(page, /\/coaching\/intake\?topic=personal/);
  for (const locale of ["en","ru","es"]) assert.ok(page.includes('locale: "' + locale + '"'));
  assert.match(page, /not a medical diagnosis/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /\.stage:target/);
});

test("original owner manuscript artwork is local, unique and tied to specific stage koans", () => {
  const board = read("components/taoist-koan-board.tsx");
  const assets = ["torch","fortress","sprout","captain","stream","river","campfire"];
  const names = assets.map(n => "/images/dao-stages/dao-" + n + "-original.jpg");
  for (const path of names) {
    assert.ok(board.includes(path), "board missing " + path);
    assert.ok(existsSync(new URL("../public" + path, import.meta.url)), "image missing " + path);
  }
  assert.match(board, /active.id === "small-flame"/);
  assert.doesNotMatch(board, /reiki-approved-sunrise|report-lighthouse-coast|course-start-heron/);
});
