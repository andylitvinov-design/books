import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {createPresetMotionGuideV3,createPresetMotionProjectV3,listPresetMotionGuides} from "../lib/mandala/openmotion-preset-guide.mjs";
import {parseMotionGuideV3} from "../lib/mandala/video-project-v3.mjs";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>JSON.parse(readFileSync(join(root,path),"utf8"));
const standards=read("data/video-catalog/standard-motion-films-v1.json");
const legacy=read("data/video-catalog/free-film-presets-v2.json");
const scenes=read("data/video-catalog/scene-taxonomy.json").scenes;

test("one six-beat Anti-stress standard film reuses six distinct licensed motion sources",()=>{
  assert.equal(standards.count,1);
  assert.equal(standards.films.length,1);
  const film=standards.films[0];
  assert.equal(film.id,"anti-stress-30s");
  assert.equal(film.category,"stress-anxiety");
  assert.equal(film.durationMs,30000);
  assert.equal(film.clips.length,6);
  const origins=new Set();
  for(const id of film.clips){
    const scene=scenes.find(row=>row.id===id);
    assert.ok(scene,id);
    assert.equal(scene.status,"approved");
    assert.equal(scene.media,"licensed_mp4");
    assert.equal(scene.rightsReference.kind,"existing_approved_first_party_master");
    assert.ok(scene.allowedAspects.includes("portrait"));
    assert.match(scene.video,/^\/videos\/holistic-house\/film-collection-v2\/[a-z-]+\.mp4$/);
    const origin=scene.originMasterKeys[0];
    assert.ok(!origins.has(origin),"no repeated physical footage");
    origins.add(origin);
  }
  assert.equal(legacy.presets.length,25,"original four-shot collection stays untouched");
  assert.ok(legacy.presets.every(p=>p.clips.length===4));
});

test("the three localized guides compile into actual 30s six-shot 5s motion, captions and original audio",()=>{
  for(const locale of ["en","ru","es"]){
    const options=listPresetMotionGuides(locale);
    assert.equal(options.length,26);
    assert.deepEqual(options.filter(p=>p.id==="anti-stress-30s").map(p=>p.aspect),["portrait"]);
    const guide=parseMotionGuideV3(createPresetMotionGuideV3("anti-stress-30s",locale));
    assert.equal(guide.durationMs,30000);
    assert.equal(guide.videoTracks[0].clips.length,6);
    for(const [i,clip] of guide.videoTracks[0].clips.entries()){
      assert.equal(clip.startMs,i*5000);
      assert.equal(clip.durationMs,5000);
      assert.equal(clip.transitionIn,"cut");
      assert.equal(clip.assetId,standards.films[0].clips[i]);
    }
    assert.equal(guide.textTracks[0].items.length,7);
    const beats=guide.textTracks[0].items.slice(1);
    assert.deepEqual(beats.map(x=>x.text),standards.films[0].captions[locale]);
    for(const [i,cue] of beats.entries()){
      assert.equal(cue.startMs,i*5000);
      assert.equal(cue.endMs,(i+1)*5000);
      assert.equal(cue.approved,true);
    }
    assert.equal(guide.audioTracks.length,1);
    assert.equal(guide.audioTracks[0].assetId,"breeze");
    assert.equal(guide.audioTracks[0].durationMs,30000);
    const {project,approvedAssets}=createPresetMotionProjectV3("anti-stress-30s",locale);
    assert.equal(project.durationMs,30000);
    assert.equal(project.videoTracks[0].clips.length,6);
    assert.equal(approvedAssets.length,7);
  }
});

test("public link only opts into the existing OpenMotion picker, never auto-renders",()=>{
  const picker=readFileSync(join(root,"components/mandala-openmotion-picker.tsx"),"utf8");
  assert.match(picker,/motionPreset/);
  assert.match(picker,/setPresetId\("anti-stress-30s"\)/);
  assert.doesNotMatch(picker,/exportOpenMotionPresetMp4\("anti-stress-30s"/);
});

test("approved film has one real lightweight H264/AAC public master, no still-photo replacement",()=>{
 const f=standards.films[0],m=f.publishedMaster;
 assert.equal(f.status,"encoded_master_verified_phone_pending");
 assert.equal(m.locale,"en");
 assert.equal(m.durationSeconds,30);
 assert.equal(m.width,720);
 assert.equal(m.height,1280);
 assert.equal(m.videoCodec,"h264");
 assert.equal(m.audioCodec,"aac");
 assert.equal(m.sourceClips,6);
 assert.equal(m.sourcePhotos,0);
 assert.match(m.sha256,/^[0-9a-f]{64}$/);
 assert.match(m.path,/^\/videos\/holistic-house\/standard-motion-v1\/anti-stress-30s-en\.mp4$/);
 assert.ok(statSync(join(root,"public",m.path)).size>2000000);
 const picker=readFileSync(join(root,"components/mandala-openmotion-picker.tsx"),"utf8");
 assert.match(picker,/<PublishedStandardMotionFilm/);
 const player=readFileSync(join(root,"components/published-standard-motion-film.tsx"),"utf8");
 assert.match(player,/data-openmotion-standard-master/);
 assert.match(player,/preload="metadata"/);
 assert.match(player,/src=\{master\.path\}/);
 assert.match(player,/href=\{master\.path\} download/);
 assert.doesNotMatch(player,/<video[^>]*autoPlay/);
});
