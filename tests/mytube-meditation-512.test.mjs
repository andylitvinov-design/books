import assert from "node:assert/strict";
import {test} from "node:test";
import {getMyTubePreparedMeditationPair,auditMyTubePreparedMeditations} from "../lib/mandala/mytube-meditation-text-pairs.mjs";
import {buildShortMeditationOptions} from "../lib/mandala/short-meditation-options.mjs";
import taxonomy from "../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
test("512 unique drafts cover 256 canonical MyTube stories",()=>{
 assert.deepEqual(auditMyTubePreparedMeditations(),{ok:true,scenarios:256,meditations:512,errors:[]});
 const ids=taxonomy.categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics.flatMap(t=>t.scenarios.map(x=>x.id))));
 assert.equal(ids.length,256);
 for(const id of ids){
  const pair=getMyTubePreparedMeditationPair(id,"ru");
  assert.equal(pair.scenarioId,id);assert.equal(pair.durationMeasured,false);
  assert.deepEqual(pair.options.map(x=>x.id),["a","b"]);
  assert.deepEqual(pair.options.map(x=>x.seconds),[30,30]);
  assert.notEqual(pair.options[0].text,pair.options[1].text);
 }
});
test("Selected video matches both text alternatives with no neighboring topic",()=>{
 const a=buildShortMeditationOptions({scenarioId:"life-purpose-s1",locale:"ru",theme:"goals",request:""});
 const b=buildShortMeditationOptions({scenarioId:"loneliness-s1",locale:"ru",theme:"relationships",request:""});
 assert.equal(a.status,"ready");assert.equal(b.status,"ready");
 assert.match(a.options[0].text,/Компас не слушается/);
 assert.match(b.options[0].text,/Одинокий свет в окне/);
 assert.doesNotMatch(a.options[0].text,/Одинокий свет в окне/);
});
test("Unknown IDs fall back, EN/ES stay localized and safety preempts lookup",()=>{
 assert.equal(getMyTubePreparedMeditationPair("fake","ru"),null);
 assert.equal(getMyTubePreparedMeditationPair("__proto__","ru"),null);
 assert.equal(getMyTubePreparedMeditationPair("life-purpose-s1","en"),null);
 for(const locale of ["en","es"]){
  const result=buildShortMeditationOptions({scenarioId:"life-purpose-s1",locale,theme:"goals"});
  assert.equal(result.status,"ready");
  assert.ok(result.options.every(x=>!x.text.includes("Компас")));
 }
 const risk=buildShortMeditationOptions({scenarioId:"life-purpose-s1",locale:"ru",theme:"energy",request:"хочу умереть"});
 assert.equal(risk.status,"safety");assert.equal(risk.options.length,0);
 const revised=buildShortMeditationOptions({scenarioId:"life-purpose-s1",locale:"ru",theme:"energy",revision:1});
 assert.equal(revised.status,"ready");assert.equal(revised.options.length,2);
 assert.notEqual(revised.options[0].text,getMyTubePreparedMeditationPair("life-purpose-s1","ru").options[0].text);
});
