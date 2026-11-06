import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const file = path => new URL("../"+path,import.meta.url);
const load = path => JSON.parse(readFileSync(file(path),"utf8"));
const candidate = load("data/video-catalog/warm-sunlight-source-queue-20261106.json");
const released = load("data/video-catalog/free-stock-scenes.json").flatMap(scene => scene.sources || []);
const previousFiles = [
  "dareful-verified-candidate-wave-20261101.json",
  "dareful-verified-candidate-wave2-20261101.json",
  "dareful-verified-candidate-wave3-20261103.json"
];
const previous = previousFiles.flatMap(name=>load("data/video-catalog/"+name).sources);
const extraPath = "data/video-catalog/dareful-cinematic-hd-candidates-wave2-20261105.json";
const draft = existsSync(file(extraPath)) ? load(extraPath).sources : [];
test("warm sun discovery stays non-playable until each real moving film is verified",()=>{
  assert.equal(candidate.schemaVersion,"hh-warm-sunlight-source-queue-v1");
  assert.equal(candidate.sourceCount,candidate.sources.length);
  assert.ok(candidate.sourceCount>=9);
  assert.equal(candidate.newImportedMp4Count,0);
  assert.equal(candidate.countsTowardPlayableCatalog,false);
  assert.equal(candidate.productionBaseline.totalRecords,732);
  const knownUrls = new Set([...released,...previous,...draft].map(s=>s.sourcePage));
  const knownStreams = new Set([...released,...previous,...draft].map(s=>s.mediaUrl).filter(Boolean));
  const ids = new Set(),urls = new Set(),streams = new Set();
  for(const s of candidate.sources){
    assert.match(s.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(s.sourcePage,/^https:\/\/dareful\.com\/[a-z0-9-]+\/$/);
    assert.equal(s.rights.licenseId,"cc_by_4_0");
    assert.equal(s.rights.creator,"Joel Holland");
    assert.equal(s.rights.attributionRequired,true);
    assert.equal(s.rights.modificationNoticeRequired,true);
    assert.equal(s.approvedForPublication,false);
    assert.equal(s.physicallyImported,false);
    assert.equal(s.playableInGenerator,false);
    assert.match(s.qualityStatus,/awaiting_/);
    assert.equal(s.visualTags.includes("warm_sunlight"),true);
    for(const lang of ["ru","en","es"])assert.ok(s.label[lang]?.trim());
    assert.equal(knownUrls.has(s.sourcePage),false,"already published or queued source must not be counted new");
    assert.equal(urls.has(s.sourcePage),false);
    assert.equal(ids.has(s.id),false);
    ids.add(s.id);urls.add(s.sourcePage);
    if(s.mediaUrl!==null){
      assert.match(s.mediaUrl,/^https:\/\/stream\.mux\.com\/[a-zA-Z0-9]+\.m3u8$/);
      assert.equal(knownStreams.has(s.mediaUrl),false);
      assert.equal(streams.has(s.mediaUrl),false,"same Mux stream must not count twice");
      streams.add(s.mediaUrl);
    }else{
      assert.equal(s.rights.sourcePageVerification,"search_index_only_recheck_official_page");
    }
    assert.ok(s.claimedSource.durationSeconds>=8);
  }
  assert.equal(candidate.excludedPotentialDuplicate[0].countedAsNew,false);
  assert.equal(candidate.excludedPotentialDuplicate[0].sharedMediaUrlWith,"rocky-mountain-sunset-light");
});
