import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("Auto Director is on the first screen, ahead of manual filters",()=>{
 assert.ok(source.includes("data-auto-video-director"));
 assert.ok(source.indexOf("data-auto-video-director")<source.indexOf('data-video-quick-section="1"'));
 assert.ok(source.includes("recommendAutoVideo({"));
 assert.ok(source.includes("compileFreeFilmPreset(selectedAutoFilm"));
});
test("free-only explicit confirmation; no charges, external upload or automatic publishing",()=>{
 const block=source.slice(source.indexOf('data-auto-video-director'),source.indexOf('data-video-quick-section="1"'));
 assert.ok(block.includes("onClick={()=>applyAutoVideo()}"));
 assert.ok(block.includes("setAutoVideoProposal(recommendAutoVideo"));
 assert.ok(!block.includes("providerApi"));
 assert.ok(!block.includes("fetch("));
 assert.ok(block.includes("data-auto-video-confirm"));
});
