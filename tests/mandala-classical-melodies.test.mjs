import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SONGS,MASTER_IDS,DURATION_SECONDS,SAMPLE_RATE} from "../scripts/generate-mandala-melodies.mjs";
import {mandalaAudioTracks} from "../lib/mandala/audio-recommendations.mjs";

test("24 distinct authored WAV scores match every advertised melody in the Video Studio",()=>{
  const catalog=mandalaAudioTracks.filter(track=>track.kind==="melody");
  const ids=new Set(SONGS.map(song=>song.id));
  assert.equal(SONGS.length,24);
  assert.equal(ids.size,24);
  assert.equal(MASTER_IDS.length,24);
  assert.deepEqual(new Set(catalog.map(track=>track.id)),ids);
  for(const song of SONGS){
    assert.ok(song.motif.length===8);
    assert.ok(song.chords.length===4);
  }
  assert.equal(DURATION_SECONDS,32);
  assert.equal(SAMPLE_RATE,22050);
});
test("public-domain themes are newly synthesized from authored scores, not commercial files",()=>{
  for(const id of ["ode-to-joy","greensleeves"]){
    const song=SONGS.find(item=>item.id===id);
    assert.ok(song);
    assert.ok(Array.isArray(song.motif));
    const track=mandalaAudioTracks.find(item=>item.id===id);
    assert.equal(track?.kind,"melody");
    assert.equal(track?.durationSeconds,32);
    for(const locale of ["ru","en","es"]){
      assert.ok(track.name[locale]);
      assert.ok(track.detail[locale]);
    }
    assert.equal(track.voiceSafe,true);
  }
});
test("all Video Studio melody IDs have a local first-party playback endpoint",()=>{
 const localMusic=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
 for(const id of MASTER_IDS)assert.ok(
   localMusic.includes('  "'+id+'",')||
   (id==="handpan"&&localMusic.includes('  "handpan",')),
   "missing playback ID "+id);
 // Both routes must stay valid: dedicated MP3 files and the historical WAV catalog.
 assert.match(localMusic,/return isScenarioAudioPreset\(preset\)/);
 assert.match(localMusic,/\/audio\/mandala\/scenarios\//);
 assert.match(localMusic,/"\.mp3"/);
 assert.match(localMusic,/\/audio\/mandala\//);
 assert.match(localMusic,/"\.wav"/);
});
