import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SECRETARY_MODES,secretaryModeInstruction}
 from '../lib/assist/secretary-modes.mjs';
import {FREE_DIAGNOSTIC_MODE,aliFreeDiagnosticTurn}
 from '../lib/assist/ali-free-diagnostic.mjs';
import {freeCoreAnswersReady} from '../lib/crm/ali-free-package-receipts.mjs';
import {aliServiceSecretaryTurn,aliServiceSecretarySummary}
 from '../lib/assist/ali-service-secretary.mjs';
import {wavePsychologistNativeTurn} from '../lib/assist/wave-psychologist-native.mjs';
import {v3ServiceStart,v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {ALI_FREE_DIAGNOSTIC_OFFER_IDS,aliVerifiedDiagnosticOffer,
 resolveAliSecretaryAlgorithm,aliDiagnosticServiceIntro,
 ALI_SECRETARY_ALGORITHM_STAGES} from '../lib/assist/ali-secretary-algorithms.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('three named Ali algorithms share one model and no implicit consent',()=>{
 assert.equal(SECRETARY_MODES.DIAGNOSTICIAN,FREE_DIAGNOSTIC_MODE);
 assert.equal(new Set(Object.values(SECRETARY_MODES)).size,3);
 for(const mode of Object.values(SECRETARY_MODES))
   assert.ok(ALI_SECRETARY_ALGORITHM_STAGES[mode].length>=5);
 assert.match(secretaryModeInstruction({mode:SECRETARY_MODES.SECRETARY,
   locale:'ru',serviceSelected:true}),/do NOT ask them to choose it again/);
 assert.match(secretaryModeInstruction({mode:SECRETARY_MODES.PSYCHOLOGIST,
   locale:'ru'}),/VOLUNTARY/);
 assert.match(secretaryModeInstruction({mode:SECRETARY_MODES.DIAGNOSTICIAN,
   locale:'ru'}),/three essentials/);
 for(const mode of [SECRETARY_MODES.PSYCHOLOGIST,SECRETARY_MODES.DIAGNOSTICIAN]){
   assert.equal(resolveAliSecretaryAlgorithm({requestedMode:mode}).mode,
     SECRETARY_MODES.SECRETARY);
   const p=resolveAliSecretaryAlgorithm({requestedMode:mode,entryVerified:true});
   assert.equal(p.mode,mode);
   assert.equal(p.activated,false);
   assert.equal(p.canCollectPrivateMedia,false);
 }
});

test('only published first-party free reviews trigger the complete diagnostic package',()=>{
 for(const locale of ['ru','en','es']){
   assert.match(aliDiagnosticServiceIntro(locale,'Разбор'),/Ali/);
   for(const id of ALI_FREE_DIAGNOSTIC_OFFER_IDS){
     const entry=v3ServiceStart('/start hhitem_'+id+'_'+locale);
     assert.ok(entry,id+' '+locale);
     assert.equal(aliVerifiedDiagnosticOffer(entry),true);
     assert.equal(resolveAliSecretaryAlgorithm({...entry,entryVerified:true}).mode,
       SECRETARY_MODES.DIAGNOSTICIAN);
   }
 }
 assert.equal(aliVerifiedDiagnosticOffer({service:'coaching',
   offerId:'consultation_free',locale:'ru'}),false);
 for(const id of ['consultation_full','browse_tests','personal_extended_review','bogus']){
   assert.equal(resolveAliSecretaryAlgorithm({entryVerified:true,locale:'ru',
     service:'general',offerId:id}).mode,SECRETARY_MODES.SECRETARY,id);
 }
});

test('Secretary is a short request, not a psychological interview',()=>{
 const a=aliServiceSecretaryTurn({message:'yes',locale:'en'});
 const b=aliServiceSecretaryTurn({message:'tomorrow afternoon',locale:'en',
   stage:a.stage,slots:a.slots});
 const c=aliServiceSecretaryTurn({message:'online',locale:'en',
   stage:b.stage,slots:b.slots});
 assert.equal(c.stage,'ready');
 const summary=aliServiceSecretarySummary({locale:'en',
   slots:c.slots,title:'Verified service'});
 assert.match(summary,/tomorrow afternoon/);
 assert.doesNotMatch(summary,/trauma|diagnosis|relationship/i);
});

test('Secretary Psychologist stays soft and records only stated facts',()=>{
 const a=wavePsychologistNativeTurn({message:'My work has become difficult',
   locale:'en',stage:'situation'});
 assert.equal(a.stage,'goal');
 assert.match(a.slots.situation,/work/);
 const b=wavePsychologistNativeTurn({message:'I want clarity',locale:'en',
   stage:a.stage,slots:a.slots});
 assert.equal(b.stage,'challenge');
});

test('the exact three questions satisfy receipt-verified finalization in RU/EN/ES',()=>{
 for(const [locale,answers] of [
  ['ru',['Хочу разобраться с работой','Трудно сделать выбор','Сейчас есть два предложения']],
  ['en',['I want clarity at work','I have too many decisions','Now I have two job offers']],
  ['es',['Quiero aclarar una decisión laboral','Me cuesta decidir','Ahora tengo dos ofertas de trabajo']],
 ]){
  let step={stage:'goal',slots:{},turns:[]};
  for(const answer of answers){
    const p=aliFreeDiagnosticTurn({...step,locale,message:answer});
    assert.ok(p?.reply);
    step={stage:p.stage,slots:p.slots,turns:[
      ...step.turns,{role:'user',text:answer},{role:'assistant',text:p.reply}]};
  }
  assert.equal(step.stage,'ready',locale);
  assert.equal(freeCoreAnswersReady({intakeSlots:step.slots}),true,locale);
 }
});

test('signed V3 routing preserves consent, secure media and separate CRM Send',()=>{
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(handler,/resolveAliSecretaryAlgorithm/);
 assert.match(handler,/diagnosticServiceEntry/);
 assert.match(handler,/mode:SECRETARY_MODES\.DIAGNOSTICIAN/);
 assert.match(handler,/ctx\.mode===FREE_DIAGNOSTIC_MODE\?aliFreeDiagnosticFirst\(lang\)/);
 assert.match(handler,/ctx\.mode!==FREE_DIAGNOSTIC_MODE&&ctx\.conversationKind/);
 assert.match(handler,/freeCoreAnswersReady\(ctx\)/);
 assert.match(handler,/issueTelegramFreeDiagnosticHandoff/);
 assert.match(handler,/ai_review_consent_at=now\(\)/);
 assert.match(handler,/finishTelegramFreePackagePhoto/);
 assert.equal(v3Context({turns:[],mode:SECRETARY_MODES.DIAGNOSTICIAN}).mode,
    FREE_DIAGNOSTIC_MODE);
});
