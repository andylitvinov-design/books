import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPersonalMeditationScript} from "../lib/mandala/personal-meditation-script.mjs";
import {parseMeditationNarration,findLocalMeditationVoices,meditationNarrationEstimate,
  playMeditationNarration} from "../lib/mandala/meditation-narration.mjs";
test("real narration queue strips editing metadata and pauses are actions, not spoken words",()=>{
  const script=buildPersonalMeditationScript({locale:"ru",theme:"money",wish:"хочу лучше говорить о работе",
    technique:"future-step",length:3});
  const queue=parseMeditationNarration(script);
  assert.ok(queue.length>10);
  assert.ok(queue.filter(x=>x.kind==="pause").length>=3);
  assert.ok(queue.filter(x=>x.kind==="speech").every(x=>!x.text.startsWith("Контекст ·")));
  assert.ok(queue.filter(x=>x.kind==="speech").every(x=>!x.text.includes("[Пауза")));
  assert.ok(meditationNarrationEstimate(script)>60);
});
test("only installed LOCAL speech voices in the chosen language are eligible",()=>{
  const voice=(name,lang,localService)=>({name,lang,localService});
  const list=[voice("RU device","ru-RU",true),voice("RU remote","ru-RU",false),
    voice("EN device","en-US",true)];
  assert.deepEqual(findLocalMeditationVoices(list,"ru").map(v=>v.name),["RU device"]);
  assert.deepEqual(findLocalMeditationVoices(list,"es"),[]);
  assert.deepEqual(findLocalMeditationVoices(list,"en").map(v=>v.name),["EN device"]);
});
test("speech playback actually submits text utterances and schedules real pauses",()=>{
  const script=buildPersonalMeditationScript({locale:"en",length:3,technique:"grounding"});
  const spoken=[];const timers=[];const pauses=[];
  class Utterance{constructor(text){this.text=text;this.onend=null;this.onerror=null;}}
  const synthesis={cancelCount:0,cancel(){this.cancelCount++;},
    speak(utterance){spoken.push(utterance.text);utterance.onend?.();}};
  const localVoice={name:"Local English",lang:"en-US",localService:true};
  const result=playMeditationNarration({
    script,locale:"en",rate:0.9,voice:localVoice,synthesis,Utterance,
    schedule:(fn,ms)=>{const id={fn,ms};timers.push(id);pauses.push(ms);return id;},
    unschedule:id=>{const i=timers.indexOf(id);if(i>=0)timers.splice(i,1);}
  });
  assert.ok(spoken.length>=1,"the first utterance was actually sent to speechSynthesis");
  let cycles=0;while(timers.length&&cycles++<120){timers.shift().fn();}
  assert.ok(spoken.length>=8,"the narration moves through all real text steps");
  assert.ok(pauses.some(ms=>ms>=10000),"pause marker is an actual timed silence");
  assert.ok(!spoken.join(" ").includes("[Optional quiet pause"));
  assert.ok(result.queueLength>=spoken.length);
});
test("stop cancels pending pause and does not continue speaking",()=>{
  const script=buildPersonalMeditationScript({locale:"en",length:3});
  const timers=[];const spoken=[];let stopped="";
  class Utterance{constructor(text){this.text=text;}}
  const synth={cancel(){},speak(u){spoken.push(u.text);u.onend?.();}};
  const result=playMeditationNarration({
    script,locale:"en",voice:{lang:"en-US",localService:true},synthesis:synth,Utterance,
    schedule:(fn,ms)=>{const id={fn,ms};timers.push(id);return id;},
    unschedule:id=>{const i=timers.indexOf(id);if(i>=0)timers.splice(i,1);},
    onStop:reason=>stopped=reason
  });
  assert.ok(timers.length>0);
  const before=spoken.length;
  result.stop();
  assert.equal(stopped,"stopped");
  assert.equal(timers.length,0);
  assert.equal(spoken.length,before);
});
test("remote voice is rejected rather than silently sending private client text",()=>{
  assert.throws(()=>playMeditationNarration({
    script:"A gentle pause",locale:"en",voice:{lang:"en-US",localService:false},
    synthesis:{cancel(){},speak(){}},Utterance:class{}
  }),/local voice unavailable/);
});
test("website writer has a real action, not pretend MP3 export or external AI call",()=>{
  const file=readFileSync(new URL("../components/mandala-personal-meditation.tsx",import.meta.url),"utf8");
  assert.match(file,/data-meditation-listen/);
  assert.match(file,/playMeditationNarration/);
  assert.match(file,/data-meditation-method/);
  assert.match(file,/data-meditation-length/);
  assert.match(file,/data-meditation-download/);
  assert.ok(!/\bfetch\s*\(|localStorage|sessionStorage|openai\.com|api\/generate/.test(file));
});
