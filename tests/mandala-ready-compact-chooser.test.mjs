import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");

test("Ready has distinct pre-render and completed modes; selected tier and Generate precede practice offers",()=>{
  assert.match(ready,/data-ready-state=\{completed\?"complete":"choose"\}/);
  assert.match(ready,/data-ready-video-tiers/);
  assert.match(ready,/checked=\{videoTier===tier.id\}/);
  assert.match(ready,/onClick=\{generateSelectedVideo\} data-ready-generate/);
  assert.ok(ready.indexOf("data-ready-video-tiers")<ready.indexOf("data-ready-generate"));
  assert.ok(ready.indexOf("data-ready-generate")<ready.indexOf("data-ready-meditation"));
  assert.match(ready,/data-ready-journey/);
  assert.match(ready,/data-ready-status/);
  assert.match(ready,/data-ready-save-choices/);
});

test("Before export the native mobile chooser is compact and retains visible Generate and continuation cards",()=>{
  assert.match(css,/HH_READY_COMPACT_CHOOSE_20261113/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/\.root\[data-ready-state="choose"\] \.selectedVideo\{height:64px;aspect-ratio:auto/);
  assert.match(css,/\.root\[data-ready-state="choose"\] \.tierOption\{/);
  assert.match(css,/\.root\[data-ready-state="choose"\] \.primary\{\s*min-height:50px/);
  assert.match(css,/@media\(max-width:350px\)/);
  assert.match(css, /@media\(max-width:430px\) and \(max-height:730px\)/);
  const scoped=css.slice(css.indexOf("/* HH_READY_COMPACT_CHOOSE_20261113"));
  assert.doesNotMatch(scoped,/position:\s*(fixed|sticky)|display:\s*none[^\n]*\.tier|overflow:\s*hidden/);
  assert.doesNotMatch(scoped,/\.root\[data-ready-state="complete"\]/,
    "compact pre-render rules must not alter a verified completed video");
});

test("Original free quota, paid manual cart and EN/RU/ES labels remain intact",()=>{
  assert.match(ready,/type VideoTier="basic"\|"photo"\|"character"/);
  assert.match(ready,/price:"€3"/);
  assert.match(ready,/price:"€5"/);
  assert.match(ready,/createVideoCartSelection\(id\)/);
  assert.match(ready,/onGenerateBasicVideo\(\)/);
  assert.match(ready,/data-ready-video-payment-disclosure/);
  for(const loc of ["en","ru","es"]){
    const begin=ready.indexOf("  "+loc+":{",ready.indexOf("const COPY={"));
    const end=loc==="en"?ready.indexOf("  ru:{",begin):
      loc==="ru"?ready.indexOf("  es:{",begin):ready.indexOf("} as const;",begin);
    assert.ok(begin>=0&&end>begin,loc+" locale block exists");
    for(const term of ["videoChooseTitle","videoGenerate","videoCartAction","videoPaidInfo"]){
      assert.ok(ready.slice(begin,end).includes(term+":"),loc+" "+term);
    }
  }
});
