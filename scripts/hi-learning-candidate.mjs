/**
 * Owner-invoked, offline-only, reproducible native-intent research.
 * No provider, no private conversation input, no model promotion, no Qwen LoRA.
 * Run: node scripts/hi-learning-candidate.mjs --output-dir /tmp/hi-learning-<revision>
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildTrainingSet,trainRuEnArtifact,nativeLexicalTrigrams,
  nativeLexicalSimilarity} from './train-native-ru-en-offline.mjs';
import {scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {classifyNativeSecretaryIntentForLocale} from '../lib/holistic-support/native-intent-model.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent}
  from '../lib/holistic-support/native-secretary.mjs';
import {telegramServiceRequestDraft,parseTelegramServiceDraft}
  from '../lib/assist/telegram-business-request.mjs';
import {gateHiLearningCandidate} from '../lib/holistic-support/hi-learning-policy.mjs';

const rawGold=readFileSync(new URL('../tests/fixtures/native-ai-secretary-gold-v1.json',import.meta.url),'utf8');
const gold=JSON.parse(rawGold);
const independent=JSON.parse(readFileSync(new URL('../tests/fixtures/hi-learning-independent-v1.json',import.meta.url),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const labels=Object.keys(buildTrainingSet('v9'));

/** All independent cases and dialogue turns must remain wholly outside training. */
export function assertHiLearningIndependentFixture(fixture,training=buildTrainingSet('v9')){
  if(fixture?.schema!=='hi-learning-independent-ru-en-es-v1'||fixture.locked!==true||
    fixture.synthetic!==true||fixture.privateClientData!==false||
    !Array.isArray(fixture.cases)||!Array.isArray(fixture.dialogues)||
    !Array.isArray(fixture.telegramOrders))throw Error('INVALID_INDEPENDENT_FIXTURE');
  const seen=new Set(),train=Object.values(training).flatMap(v=>[...v.ru,...v.en])
    .map(normalizeNativeText);
  const trainSet=new Set(train),grams=train.map(nativeLexicalTrigrams);
  const check=text=>{
    if(typeof text!=='string'||text.length<3||text.length>600)throw Error('INVALID_FIXTURE_TEXT');
    const key=normalizeNativeText(text);
    if(!key||seen.has(key)||trainSet.has(key))throw Error('TRAIN_TEST_LEAKAGE');
    seen.add(key);
    if(grams.some(g=>nativeLexicalSimilarity(g,nativeLexicalTrigrams(text))>=.86))
      throw Error('TRAIN_TEST_NEAR_DUPLICATE');
  };
  for(const row of fixture.cases){
    if(!['ru','en','es'].includes(row.locale)||
      !(row.intent===null||labels.includes(row.intent)))throw Error('INVALID_FIXTURE_LABEL');
    check(row.text);
  }
  for(const locale of ['ru','en']){
    if(fixture.cases.filter(r=>r.locale===locale&&r.intent!==null).length<5||
      fixture.cases.filter(r=>r.locale===locale&&r.intent===null).length<3)throw Error('INDEPENDENT_CASES_MISSING');
    const scenarios=fixture.dialogues.filter(x=>x.locale===locale);
    if(scenarios.length!==1||!Array.isArray(scenarios[0].turns)||scenarios[0].turns.length<4)
      throw Error('INDEPENDENT_DIALOGUE_MISSING');
    for(const turn of scenarios[0].turns)check(turn.text);
  }
  for(const row of fixture.telegramOrders){
    if(!row||!['ru','en','es'].includes(row.locale)||
      !['homeopathy','coaching','reiki','constellations','business'].includes(row.service)||
      parseTelegramServiceDraft(telegramServiceRequestDraft(row.service,row.locale))?.service!==row.service)
      throw Error('TELEGRAM_FIXTURE_INVALID');
  }
  if(fixture.telegramOrders.length<5)throw Error('TELEGRAM_COVERAGE_MISSING');
  return true;
}
function evaluateModel(locale,predict,fixture=independent){
  const cases=[
    ...gold.P.filter(x=>x[0]===locale).map(x=>({locale,expected:x[1],message:x[2],category:'positive'})),
    ...gold.N.filter(x=>x[0]===locale).map(x=>({locale,expected:null,message:x[2],category:x[1]})),
    ...fixture.cases.filter(x=>x.locale===locale).map(x=>({
      locale,expected:x.intent,message:x.text,category:x.intent?'positive':'independent_negative',
    })),
  ];
  const rows=cases.map(row=>{
    const prediction=predict(row.message,locale);
    const accepted=prediction.accepted===true&&nativeSecretaryAllowsUtterance(row.message)&&
      nativeSecretaryAllowsIntent(row.message,locale,prediction.intent);
    return {...row,intent:prediction.intent,accepted};
  });
  const scored=scoreRuEnPredictions(rows,labels);
  const safetyFailures=rows.filter(row=>row.expected===null&&
    ['risk','protected_action','refusal'].includes(row.category)&&row.accepted).length;
  return {positives:scored.positive,negatives:scored.negative,
    macroF1:Number(scored.macroF1.toFixed(5)),
    accuracy:Number(scored.accuracy.toFixed(5)),
    falseAccepts:scored.falseAccepts,safetyFailures};
}
const baselinePredict=(message,locale)=>classifyNativeSecretaryIntentForLocale(message,locale).prediction;
const predictArtifact=artifact=>(message)=>predictNativeIntent({
  labels:artifact.labelMap,weights:artifact.weights,bias:artifact.bias,
  characterWeight:2,dimensions:8192,
},message);
/** Does not write unless called by the explicit CLI below. */
export function buildHiLearningCandidateReport(){
  assertHiLearningIndependentFixture(independent);
  const ru=trainRuEnArtifact('ru','v9',{balancePower:.5,characterWeight:2,dimensions:8192});
  const en=trainRuEnArtifact('en','v8',{balancePower:.5,characterWeight:2,dimensions:8192});
  const baselineScores=Object.fromEntries(['ru','en','es'].map(locale=>
    [locale,evaluateModel(locale,baselinePredict)]));
  const candidateScores={
    ru:evaluateModel('ru',predictArtifact(ru)),
    en:evaluateModel('en',predictArtifact(en)),
    // We never train, alter or route the ES model; unchanged controls still run.
    es:evaluateModel('es',baselinePredict),
  };
  const holdoutHash=sha(rawGold);
  if(ru.holdoutHash!==holdoutHash||en.holdoutHash!==holdoutHash)throw Error('HOLDOUT_HASH_MISMATCH');
  const baseline={holdoutHash,scores:baselineScores,
    provenance:'checked_out_production_source_not_necessarily_served_live'};
  const candidate={version:ru.modelVersion,holdoutHash,scores:candidateScores,
    deployable:false,automaticPromotion:false,
    dataPolicy:{privateClientData:false,trainingHoldoutOverlap:false,
      provenanceVerified:true,humanReviewComplete:false},
    evaluation:{locked:true,independentRuEn:true,esRegression:true,
      telegramOrders:false,safetyPassed:Object.values(candidateScores).every(x=>x.safetyFailures===0)}};
  const decision=gateHiLearningCandidate({baseline,candidate});
  return {baseline,candidate,decision,artifacts:{ru,en},fixtureHash:sha(JSON.stringify(independent))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--output-dir'||!args[1]||
     args[1].startsWith('--'))throw Error('OUTPUT_DIR_REQUIRED');
  const destination=resolve(args[1]),root=resolve(new URL('..',import.meta.url).pathname);
  for(const guarded of ['app','data','lib','supabase','.github']){
    if(destination===join(root,guarded)||destination.startsWith(join(root,guarded)+'/'))
      throw Error('PRODUCTION_ARTIFACT_WRITE_DENIED');
  }
  const report=buildHiLearningCandidateReport();
  mkdirSync(destination,{recursive:true});
  const files={
    [report.artifacts.ru.modelVersion+'.json']:JSON.stringify(report.artifacts.ru),
    [report.artifacts.en.modelVersion+'.json']:JSON.stringify(report.artifacts.en),
    'hi-learning-candidate-review.json':JSON.stringify({
      baseline:report.baseline,candidate:report.candidate,decision:report.decision,
      fixtureHash:report.fixtureHash,scope:'research_only_not_live',
      requiredNextSteps:['independent_dialogue_replay','telegram_order_e2e',
        'safety_review','explicit_human_review','protected_pull_request','live_smoke'],
    },null,2)+'\n',
  };
  for(const [name,content] of Object.entries(files))
    writeFileSync(join(destination,name),content,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:report.decision.status,reasonCodes:report.decision.reasons,
    candidateVersion:report.candidate.version,source:'offline_research',liveChanged:false,
    files:Object.keys(files)}));
}
