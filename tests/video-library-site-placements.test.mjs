import test from "node:test";
import assert from "node:assert/strict";
import {auditSiteVideoSlotCoverage} from "../lib/video-library/site-placements.mjs";

test("site video slots are not mistaken for a provider playback verification",()=>{
 const report=auditSiteVideoSlotCoverage();
 assert.equal(report.schemaVersion,"hh-site-video-slots-offline-v1");
 assert.equal(report.summary.configuredSlots,16);
 assert.equal(report.summary.builtInPublicSourcePlacements,11);
 assert.ok(report.summary.localePlacements>=30);
 assert.equal(report.summary.actualLiveVerifiedPlacements,0);
 assert.equal(report.summary.liveStoreRead,false);
 assert.equal(report.summary.actualProviderPlaybackRead,false);
 assert.ok(report.rows.every(r=>r.livePlaybackVerified===false&&
   r.ownerStoreChecked===false&&r.editorReviewedForCurrentPage===false));
});
test("EN/RU/ES stay distinct and dynamic entities never fabricate a page URL",()=>{
 const report=auditSiteVideoSlotCoverage();
 const es=report.rows.filter(r=>r.locale==="es");
 assert.deepEqual(es.map(r=>r.slotId).sort(),["about-intro","thank-you"]);
 const about=report.rows.find(r=>r.slotId==="about-intro"&&r.locale==="es");
 assert.equal(about.provider,"heygen");
 assert.equal(about.path,"/es/about");
 const dyn=report.rows.filter(r=>r.pageMode==="entity_dynamic");
 assert.ok(dyn.length>0);
 assert.ok(dyn.every(r=>r.path===null&&!r.metadataPublishedSource));
});
test("candidate or maliciously added records cannot increase published coverage",()=>{
 const base=auditSiteVideoSlotCoverage();
 const spoof=[
  {slot:"thank-you",locale:"en",entityId:"",published:{status:"candidate",youtubeId:"ABCDEFGHIJK"}},
  {slot:"about-intro",locale:"en",entityId:"",published:{status:"published",youtubeId:"https://example.org"}},
  {slot:"invalid-slot",locale:"ru",published:{status:"published",youtubeId:"ABCDEFGHIJK"}},
 ];
 const forged=auditSiteVideoSlotCoverage({records:spoof});
 assert.equal(forged.summary.builtInPublicSourcePlacements,0);
 assert.ok(forged.summary.builtInPublicSourcePlacements<base.summary.builtInPublicSourcePlacements);
 assert.throws(()=>auditSiteVideoSlotCoverage({records:{}}));
});
