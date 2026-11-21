import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wavePsychologistNativeTurn,wavePsychologistNativeSummary}
 from '../lib/assist/wave-psychologist-native.mjs';
const source=()=>readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8');
test('site Ali has explicit reversible psychologist consent, never implicit deepening',()=>{
 const s=source();
 assert.match(s,/psychInterview==="pending"/);
 assert.match(s,/data-hh-ali-psychologist-offer/);
 assert.match(s,/data-hh-ali-psychologist-agree/);
 assert.match(s,/data-hh-ali-psychologist-decline/);
 assert.match(s,/setPsychInterview\("active"\)/);
 assert.match(s,/setPsychInterview\("off"\)/);
 for(const name of ['startGuided','startContent','startProject','completeSupportQuiz']){
   const start=s.indexOf('function '+name+'(');
   assert.ok(start>0);
   assert.match(s.slice(start,start+350),/setPsychInterview\("off"\)/);
 }
 assert.match(s,/consentPsychologistInterview\(\);return/);
 assert.match(s,/leavePsychologistInterview\(\);return/);
 assert.match(s,/data-hh-ali-psychologist-finish/);
});
test('local psychologist dialogue never sends personal interview answers to provider or saves transcript',()=>{
 const s=source();
 const a=s.indexOf('if(psychInterview==="active"&&judgmentChoice===null)');
 const b=s.indexOf('if(judgmentChoice!==null){\n      if(authenticated',a);
 const local=s.slice(a,b);
 assert.ok(a>0&&b>a);
 assert.match(local,/wavePsychologistNativeTurn/);
 assert.match(local,/requiresProtectedReply/);
 assert.doesNotMatch(local,/fetch\(|privateTranscript\.savePair|ownedInference|setUseAgentMemory/);
 // When the person returns to ordinary Ali, NO local interview text can
 // re-enter /api/holistic-agent/turn through its history input.
 assert.match(s,/const shareableTurns=messages\.filter\(row=>row\.localOnly!==true\)/);
 assert.match(s,/const previousTurns=\(!leaveSupport&&supportSelection\)/);
 assert.match(s,/localOnly:true/);
 assert.match(s,/turns:messages\.filter\(row=>row\.localOnly\)\.slice\(-28\)/);
 assert.match(s,/data-hh-ali-psychologist-private-handoff/);
 assert.match(s,/data-hh-ali-psychologist-copy/);
 assert.match(s,/const \[psychFinalSummary,setPsychFinalSummary\]/);
 assert.match(s,/const \[psychCopyStatus,setPsychCopyStatus\]/);
 assert.match(s,/navigator\.clipboard\.writeText\(psychFinalSummary\)/);
 assert.match(s,/setPsychFinalSummary\(brief\|\|null\)/);
 // The explicit user click only invokes the browser clipboard.
 assert.match(s,/onClick=\{\(\)=>\{\s*if\(!psychFinalSummary\)return;/);
 assert.doesNotMatch(s,/encodeURIComponent\(psychFinalSummary\)|\?summary=/);
 assert.match(s,/href=\{"\/"\+locale\+"\/services\/free-situation-review"\}/);
});
test('source stage and consent actions are available across guest and member chat',()=>{
 const s=source();
 assert.match(s,/const \[psychStage,setPsychStage\]=useState\("situation"\)/);
 assert.match(s,/setPsychSlots\(\{\}\)/);
 assert.match(s,/setPsychSummaryVisible\(Boolean\(brief\)\)/);
 for(const locale of ['ru','en','es']){
   const a=wavePsychologistNativeTurn({stage:'situation',message:
     locale==='ru'?'На работе непростая ситуация':
       locale==='es'?'En mi trabajo hay dificultades':'My work situation is difficult',locale});
   assert.ok(a?.reply&&a.stage==='goal');
   assert.ok(wavePsychologistNativeSummary({locale,slots:a.slots}));
 }
});
