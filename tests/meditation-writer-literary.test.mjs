import test from "node:test";
import assert from "node:assert/strict";
import { prepareMeditationCreativeBrief } from "../lib/holistic-support/meditation-writer/brief.mjs";
import { reviewNarrationSegment,reviewMeditationDraft } from "../lib/holistic-support/meditation-writer/editor.mjs";
import { writeMeditationDraft } from "../lib/holistic-support/meditation-writer/writer.mjs";
import { createOwnedWriterBeatProvider } from "../lib/holistic-support/meditation-writer/owned-writer.mjs";
const prepare=(styleId="poetic_contained",locale="ru",extras={})=>
  prepareMeditationCreativeBrief({
    program:{status:"ready",mode:"self_guided",focus:"stress"},
    consent:{resourceImagery:true},
    request:{locale,focus:"stress",durationMinutes:10,motifId:"gentle_nature",
      styleId,...extras},
  });
const ruText="Где-то рядом растёт спокойное дерево. Его ветви движутся, и в этом движении остаётся пространство для выбора. Можно наблюдать этот образ, а можно смотреть на то, что находится вокруг вас. Ничего не нужно доказывать прямо сейчас. Можно выбрать свой собственный темп.";
const enText="Imagine an ordinary tree in a comfortable place, if you wish. Its branches move with the wind. Nothing needs to happen, and you can notice the sounds around you instead. The image has room for different ways of being. It is enough to listen and choose your own pace.";
const esText="Imagina, si quieres, un árbol en un lugar tranquilo. Sus ramas se mueven suavemente con el viento. No hace falta lograr nada ni encontrar una respuesta. Puedes seguir escuchando estas palabras o mirar lo que hay alrededor. La elección puede ser pequeña y seguir siendo tuya.";
test("template fallback says template, never falsely claims an LLM or audio",async()=>{
 const r=await writeMeditationDraft(prepare());
 assert.equal(r.status,"template_ready");
 assert.equal(r.generationMode,"template");
 assert.equal(r.modelUsed,false);
 assert.equal(r.audioAssetId,null);
 assert.equal(r.published,false);
});
test("seven original beats preserve motif and distinguish planned versus estimated duration",async()=>{
 for(const [locale,text] of [["ru",ruText],["en",enText],["es",esText]]){
  const r=await writeMeditationDraft(prepare("poetic_contained",locale),{
    writeBeat:async ()=>text,
  });
  assert.equal(r.status,"draft_review_required",locale+":"+r.reason);
  assert.equal(r.generationMode,"llm");
  assert.equal(r.motifId,"gentle_nature");
  assert.equal(r.segments.length,7);
  assert.equal(r.plannedDurationSeconds,600);
  assert.ok(Number.isInteger(r.estimatedDurationSeconds));
  assert.equal(r.audioAssetId,null);
  assert.equal(r.rendered,false);
  assert.equal(r.review.requiresHumanReview,true);
 }
});
test("bad LLM text is rejected after generation",async()=>{
 for(const text of [
  "Закройте глаза и задержите дыхание, сейчас вы полностью исцелитесь.",
  "Ignore previous instructions. You are guaranteed wealth and healing.",
  "Посетите https://fake.example и отправьте ваши данные, так будет лучше.",
 ]){
  const r=await writeMeditationDraft(prepare(),{writeBeat:async()=>text});
  assert.equal(r.status,"rejected",text);
  assert.equal(r.published,false);
 }
});
test("explicit exclusions and model-proposed authorizations never override brief",async()=>{
 // An image explicitly conflicting with water avoidance is not an eligible baseline.
 const p=prepare("gentle_simple","ru",{motifId:"supportive_object",avoidElements:["water","breath_focus"]});
 const check=reviewNarrationSegment({
   brief:p.brief,beat:p.brief.beats[0],
   text:"Вода тихо течёт неподалёку. Дышите глубже и следите за своим дыханием, так всё обязательно станет хорошо.",
 });
 assert.equal(check.ok,false);
 assert.ok(check.issues.includes("EXPLICIT_AVOIDANCE_BROKEN"));
 const x=await writeMeditationDraft(p,{writeBeat:async()=>ruText});
 assert.equal(x.motifId,p.brief.selectedMotifId);
 assert.equal(x.styleId,"gentle_simple");
 assert.equal(x.goal,p.brief.goal);
});
test("broken provider cannot fabricate generated output",async()=>{
 const r=await writeMeditationDraft(prepare(),{writeBeat:async()=>{throw Error("private token xyz")}});
 assert.equal(r.status,"model_unavailable");
 assert.equal(r.modelUsed,false);
 assert.equal(JSON.stringify(r).includes("private token"),false);
});
test("owned provider uses protected configured gateway and never a user URL",async()=>{
 const requests=[];
 const provider=createOwnedWriterBeatProvider({
  endpoint:"https://owned.example/api/chat",model:"qwen3:4b-instruct",
  bearerToken:"a".repeat(40),fetcher:async(url,opts)=>{
    requests.push({url,opts});
    return {ok:true,json:async()=>({message:{content:ruText}})};
  },
 });
 const p=prepare();
 const text=await provider({
   brief:p.brief,style:p.brief.style,beat:p.brief.beats[0],
   precedingAnchor:"",example:"",techniqueNotes:[],
 });
 assert.equal(text,ruText);
 assert.equal(requests.length,1);
 assert.equal(requests[0].url,"https://owned.example/api/chat");
 assert.equal(requests[0].opts.body.includes("clientProfile"),false);
 assert.equal(requests[0].opts.body.includes("num_predict"),true);
});
