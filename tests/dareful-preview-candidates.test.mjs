import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCandidateManifest} from "../scripts/preview-dareful-candidates.mjs";
const manifest=JSON.parse(readFileSync(new URL("../data/video-catalog/dareful-verified-candidate-wave-20261101.json",import.meta.url),"utf8"));
test("four unapproved, official Dareful Mux sources have license and video preview restrictions",()=>{
 assert.equal(validateCandidateManifest(manifest),true);
 assert.equal(manifest.sources.length,4);
 assert.equal(manifest.approvedForPublication,false);
 assert.equal(new Set(manifest.sources.map(s=>s.id)).size,4);
 for(const item of manifest.sources){
  assert.equal(item.visualReviewRequired,true);
  assert.match(item.sourcePage,/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/);
  assert.match(item.mediaUrl,/^https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8$/);
 }
});
test("reject arbitrary URL, approval spoofing, too many clips and invalid output",()=>{
 assert.throws(()=>validateCandidateManifest({...manifest,approvedForPublication:true}));
 assert.throws(()=>validateCandidateManifest({...manifest,sources:[...manifest.sources,...manifest.sources]}));
 assert.throws(()=>validateCandidateManifest({...manifest,sources:[{...manifest.sources[0],mediaUrl:"https://127.0.0.1/private"}]}));
 assert.throws(()=>validateCandidateManifest({...manifest,sources:[{...manifest.sources[0],sourcePage:"https://dareful.com.evil.org/other/"}]}));
});
test("preview mechanism cannot publish raw stock or mark masters approved",()=>{
 const script=readFileSync(new URL("../scripts/preview-dareful-candidates.mjs",import.meta.url),"utf8");
 assert.match(script,/PREVIEW_ONLY_NOT_IMPORTED/);
 assert.match(script,/contact_sheet_needs_human_review/);
 assert.doesNotMatch(script,/importFreeStockScene|update_ref|create_pull_request|public\/videos\/holistic-house/);
});
