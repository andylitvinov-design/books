import test from "node:test";
import assert from "node:assert/strict";
import { createAnonymousGeminiSegmentProvider,
  anonymizeMeditationBrief,freeGeminiWriterReady,FREE_GEMINI_WRITER_MODEL
} from "../lib/holistic-support/meditation-writer/free-gemini.mjs";
import { writeMeditationDraft } from "../lib/holistic-support/meditation-writer/writer.mjs";
import { prepareMeditationCreativeBrief } from "../lib/holistic-support/meditation-writer/brief.mjs";
const privatePhrase="VERY_PRIVATE_CLIENT_PHRASE_XYZ";
const russian="Можно увидеть спокойное дерево у знакомой дорожки. Его ветви неторопливо движутся, и вокруг остаётся место для выбора. Нет необходимости придумывать правильный ответ. Можно наблюдать эту сцену, а можно прислушаться к звукам комнаты. Пусть темп остаётся вашим собственным и удобным сейчас.";
const prepared=()=>prepareMeditationCreativeBrief({
 program:{status:"ready",mode:"self_guided",focus:"stress"},
 consent:{resourceImagery:true},
 request:{locale:"ru",focus:"stress",durationMinutes:10,motifId:"gentle_nature",
   styleId:"gentle_simple",clientPhrase:privatePhrase},
});
test("Gemini writer requires explicit operator free-tier attestation",()=>{
 const base={HH_COUNCIL_GEMINI_API_KEY:"test_key_0123456789012345",
  HH_MEDITATION_WRITER_GEMINI_FREE_ENABLED:"true"};
 assert.equal(freeGeminiWriterReady(base),false);
 assert.equal(freeGeminiWriterReady({...base,HH_MEDITATION_WRITER_GEMINI_FREE_TIER_CONFIRMED:"true"}),true);
 assert.equal(FREE_GEMINI_WRITER_MODEL,"gemini-3.5-flash-lite");
});
test("anonymous request never sends personal phrase, history, nor profile",async()=>{
 const p=prepared();
 assert.equal(p.status,"brief_ready");
 const sanitized=anonymizeMeditationBrief({...p.brief,
   problemFrame:"DIAGNOSIS_PRIVATE_XYZ",history:"HISTORY_PRIVATE_XYZ",
   profile:"PROFILE_PRIVATE_XYZ"});
 assert.equal(JSON.stringify(sanitized).includes(privatePhrase),false);
 let wire="";
 const provider=createAnonymousGeminiSegmentProvider({
   key:"test_key_0123456789012345",
   fetcher:async (url,opts)=>{
     assert.ok(url.endsWith("gemini-3.5-flash-lite:generateContent"));
     assert.equal(opts.headers["x-goog-api-key"],"test_key_0123456789012345");
     wire=opts.body;
     return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{
       content:{parts:[{text:JSON.stringify({segments:p.brief.beats.map(b=>({
         beatId:b.id,text:russian,
       }))})}]},
     }]})};
   },
 });
 const result=await writeMeditationDraft(p,{writeSegments:provider});
 assert.equal(result.status,"draft_review_required");
 assert.equal(result.generationMode,"llm");
 assert.equal(result.clientPhraseUsed,false);
 assert.equal(result.published,false);
 for(const privateText of [privatePhrase,"DIAGNOSIS_PRIVATE_XYZ",
   "HISTORY_PRIVATE_XYZ","PROFILE_PRIVATE_XYZ","clientPhrase","problemFrame",
   "desiredExperience","email","userId"])assert.equal(wire.includes(privateText),false,privateText);
 assert.ok(wire.includes("gentle_nature"));
});
test("bad response and free quota do not become a fabricated LLM draft",async()=>{
 const p=prepared();
 const bad=createAnonymousGeminiSegmentProvider({
   key:"test_key_0123456789012345",
   fetcher:async()=>({ok:true,status:200,text:async()=>"{broken"}),
 });
 const no=await writeMeditationDraft(p,{writeSegments:bad});
 assert.equal(no.status,"model_unavailable");
 assert.equal(no.modelUsed,false);
 const quota=createAnonymousGeminiSegmentProvider({
   key:"test_key_0123456789012345",
   fetcher:async()=>({ok:false,status:429}),
 });
 const unavailable=await writeMeditationDraft(p,{writeSegments:quota});
 assert.equal(unavailable.status,"model_unavailable");
});
