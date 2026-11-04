import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";

const root=new URL("../",import.meta.url);
const manifest=JSON.parse(readFileSync(new URL("data/video-catalog/hd-editorial-decisions-20261104.json",root),"utf8"));
const folder="assets/video-editorial-pr3383-pending-approval/";
const inventory=JSON.parse(readFileSync(new URL(folder+"inventory.json",root),"utf8"));
const shortlist=manifest.candidates.filter(x=>x.decision==="editorial_shortlist_pending_owner");

test("source decisions have exact, mutually exclusive 16 = 4 + 4 + 8 counts",()=>{
  assert.equal(manifest.pr,3383);
  assert.equal(manifest.sourceArtifactId,13300344783);
  assert.equal(manifest.stagingOnly,true);
  assert.equal(manifest.ownerPublicationApproval,false);
  assert.equal(manifest.productionReleased,false);
  assert.equal(manifest.paidServicesAllowed,false);
  assert.equal(manifest.candidates.length,16);
  assert.equal(new Set(manifest.candidates.map(x=>x.id)).size,16);
  assert.equal(shortlist.length,4);
  assert.equal(manifest.candidates.filter(x=>x.decision==="editorial_reject").length,4);
  assert.equal(manifest.candidates.filter(x=>x.decision==="technical_reject").length,8);
});

test("physical staged portrait clips are the same verified bytes, and remain unreleased",()=>{
  assert.equal(inventory.status,"EDITORIAL_NOT_OWNER_APPROVED_NOT_LIVE");
  assert.equal(inventory.assetCount,4);
  assert.equal(inventory.items.length,4);
  assert.equal(inventory.containsPublicPaths,false);
  assert.equal(inventory.allowLandscapeExport,false);
  const recorded=new Set(inventory.items.map(x=>x.id));
  assert.deepEqual(recorded,new Set(shortlist.map(x=>x.id)));
  for(const clip of shortlist){
    assert.equal(clip.approvedForPublication,false);
    assert.equal(clip.sourceFormat,"portrait_9x16_only");
    assert.equal(clip.allowLandscapeExport,false);
    assert.equal(clip.width,720);
    assert.equal(clip.height,1280);
    assert.equal(clip.fps,24);
    assert.equal(clip.licenseUrl,"https://creativecommons.org/licenses/by/4.0/");
    assert.equal(clip.sourcePage,"https://dareful.com/"+clip.id+"/");
    assert.equal(clip.creator,"Joel Holland");
    assert.equal(clip.requiresCredit,true);
    assert.equal(clip.requiresChangeNotice,true);
    assert.match(clip.changes,/cropped/);
    const inInventory=inventory.items.find(x=>x.id===clip.id);
    assert.equal(inInventory?.approval,"OWNER_PENDING");
    assert.equal(inInventory?.published,false);
    assert.equal(inInventory?.sha256,clip.videoSha256);
    for(const [ext,bytes,sha] of [["mp4",clip.videoBytes,clip.videoSha256],["jpg",clip.posterBytes,clip.posterSha256]]){
      const uri=new URL(folder+clip.id+"."+ext,root);
      assert.equal(existsSync(uri),true,clip.id+"."+ext+" absent");
      assert.equal(statSync(uri).size,bytes,clip.id+" "+ext+" size");
      assert.equal(createHash("sha256").update(readFileSync(uri)).digest("hex"),sha,clip.id+" "+ext+" hash");
    }
    assert.equal(existsSync(new URL("public/videos/holistic-house/film-collection-v3/"+clip.id+".mp4",root)),false);
  }
});

test("no misleading tags enter the future stock selector, and no new assets are in public",()=>{
  const byId=new Map(shortlist.map(x=>[x.id,x]));
  assert.deepEqual(byId.get("sun-trees-forest")?.tags.includes("snow"),true);
  assert.deepEqual(byId.get("sun-trees-forest")?.tags.includes("winter"),true);
  assert.equal(byId.get("warm-clouds-sunset")?.tags.includes("money"),false);
  assert.equal(byId.get("snow-forest-winter")?.tags.includes("winter"),true);
  const liveStock=JSON.parse(readFileSync(new URL("data/video-catalog/free-stock-scenes.json",root),"utf8"));
  assert.equal(liveStock.some(s=>byId.has(s.id)),false);
});
