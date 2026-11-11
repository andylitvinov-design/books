/** Native AI independent original synthetic gold evaluation; no outside models, network or private data. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const locales=['ru','en','es'];
const classes=['hello','thanks','bye','identity','capabilities','courses','services','pricing','human','booking','technical','privacy','status','unsure','smalltalk'];
const norm=s=>String(s??'').toLocaleLowerCase('en').replace(/ё/gu,'е').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/gu,' ').trim();
const round=n=>Number(n.toFixed(4));
const ratio=(a,b)=>b?a/b:0;

export function readGoldFile(path=new URL('../tests/fixtures/native-ai-secretary-gold-v1.json',import.meta.url)){
  const raw=readFileSync(path,'utf8'),p=JSON.parse(raw);
  if(!Array.isArray(p.P)||!Array.isArray(p.N)||!Array.isArray(p.D))throw Error('NATIVE_GOLD_PACK_INVALID');
  const gold={...p,
    cases:[
      ...p.P.map(([locale,expectedIntent,utterance],i)=>({
        id:'pos-'+locale+'-'+expectedIntent+'-'+i,group:'secretary-'+expectedIntent+'-'+i%3,
        locale,kind:'intent',expectedIntent,utterance,expectAccept:true
      })),
      ...p.N.map(([locale,category,utterance],i)=>({
        id:'neg-'+locale+'-'+i,group:'negative-'+category+'-'+i%16,
        locale,kind:'abstain',category,expectedIntent:null,utterance,expectAccept:false
      }))
    ],
    dialogues:p.D.map(([locale,task,criterion,turns])=>({
      id:'dialogue-'+locale+'-'+task,group:'dialogue-'+task,locale,task,criterion,
      turns:turns.map(([user,expectedIntent])=>({user,expectedIntent}))
    }))
  };
  validateNativeGoldSet(gold);
  return {gold,sha256:createHash('sha256').update(raw).digest('hex')};
}

export function validateNativeGoldSet(gold,{trainingPhrases=[]}={}){
  if(!gold||gold.schemaVersion!=='hh-native-gold-v1'||gold.locked!==true||
    JSON.stringify(gold.languages)!==JSON.stringify(locales)||
    JSON.stringify(gold.classes)!==JSON.stringify(classes)||
    !Array.isArray(gold.cases)||!Array.isArray(gold.dialogues))
      throw Error('NATIVE_GOLD_SCHEMA_INVALID');
  const seenId=new Set(),seenText=new Set(),training=new Set(trainingPhrases.map(norm));
  const localeCount=Object.fromEntries(locales.map(x=>[x,0]));
  for(const row of gold.cases){
    if(!row||typeof row.id!=='string'||seenId.has(row.id)||
      typeof row.group!=='string'||row.group.length<8||
      !locales.includes(row.locale)||typeof row.utterance!=='string'||
      row.utterance.length<4||row.utterance.length>600||
      !['intent','abstain'].includes(row.kind)||
      row.expectAccept!==(row.kind==='intent')||
      (row.kind==='intent'&&!classes.includes(row.expectedIntent))||
      (row.kind==='abstain'&&row.expectedIntent!==null))
        throw Error('NATIVE_GOLD_CASE_INVALID:'+String(row?.id));
    const phrase=norm(row.utterance);
    if(seenText.has(phrase)||training.has(phrase))
      throw Error('NATIVE_GOLD_DUPLICATE_OR_TRAIN_LEAK:'+row.id);
    seenId.add(row.id);seenText.add(phrase);localeCount[row.locale]++;
  }
  if(gold.cases.length<150||gold.dialogues.length<9||
     locales.some(locale=>localeCount[locale]<45))
    throw Error('NATIVE_GOLD_COVERAGE_TOO_SMALL');
  for(const d of gold.dialogues){
    if(!d||typeof d.id!=='string'||seenId.has(d.id)||!locales.includes(d.locale)||
      !['booking_time','booking_refusal','correction','context_price'].includes(d.task)||
      !Array.isArray(d.turns)||d.turns.length<2||d.turns.length>12||
      d.turns.some(t=>!t||typeof t.user!=='string'||t.user.length<2||
        t.user.length>600||(t.expectedIntent!==null&&!classes.includes(t.expectedIntent))))
        throw Error('NATIVE_GOLD_DIALOGUE_INVALID:'+String(d?.id));
    seenId.add(d.id);
  }
  return {cases:gold.cases.length,dialogues:gold.dialogues.length,
    groups:new Set([...gold.cases,...gold.dialogues].map(x=>x.group)).size};
}

export function evaluateNativeGoldCases(gold,classify){
  validateNativeGoldSet(gold);
  if(typeof classify!=='function')throw Error('NATIVE_GOLD_CLASSIFIER_REQUIRED');
  const rows=gold.cases.map(r=>{
    const p=classify(r.utterance,r.locale)||{},accepted=p.accepted===true;
    const intent=typeof p.intent==='string'?p.intent:null;
    const correct=r.kind==='intent'?(accepted&&intent===r.expectedIntent):!accepted;
    return {id:r.id,locale:r.locale,kind:r.kind,expected:r.expectedIntent,
      accepted,intent,correct};
  });
  const metrics=input=>{
    const pos=input.filter(x=>x.kind==='intent'),neg=input.filter(x=>x.kind==='abstain');
    const truePos=pos.filter(x=>x.correct).length;
    const accepted=input.filter(x=>x.accepted).length;
    return {total:input.length,positive:pos.length,negative:neg.length,
      correct:input.filter(x=>x.correct).length,
      recall:round(ratio(truePos,pos.length)),acceptedPrecision:round(ratio(truePos,accepted)),
      falseAcceptRate:round(ratio(neg.filter(x=>x.accepted).length,neg.length)),
      wrongAccepted:pos.filter(x=>x.accepted&&!x.correct).length,
      abstainedPositive:pos.filter(x=>!x.accepted).length};
  };
  const perLanguage={},perClass={};
  for(const locale of locales){
    const subset=rows.filter(x=>x.locale===locale),labels={};
    for(const cls of classes){
      const pos=subset.filter(x=>x.expected===cls);
      const tp=pos.filter(x=>x.correct).length;
      const fp=subset.filter(x=>x.accepted&&x.intent===cls&&x.expected!==cls).length;
      const precision=ratio(tp,tp+fp),recall=ratio(tp,pos.length);
      labels[cls]={support:pos.length,precision:round(precision),
        recall:round(recall),f1:round(ratio(2*precision*recall,precision+recall))};
    }
    perClass[locale]=labels;
    perLanguage[locale]={...metrics(subset),macroF1:round(classes.reduce((n,k)=>n+labels[k].f1,0)/classes.length)};
  }
  return {overall:metrics(rows),perLanguage,perClass,
    failures:rows.filter(x=>!x.correct).map(x=>({id:x.id,locale:x.locale,
      expected:x.expected||'abstain',got:x.accepted?x.intent:'abstain'})),rows};
}
const normalizeReply=s=>norm(s);
const time={ru:/вечер/u,en:/evening/u,es:/tarde/u};
const consult={ru:/консультаци/u,en:/consultation/u,es:/consulta/u};
const price={ru:/(?:стоимост|цен|евр)/u,en:/(?:cost|price|fee|charge)/u,es:/(?:preci|cost|tarif|cobr)/u};
const booking={ru:/(?:запис|заброниру|подберем\s+время)/u,
  en:/(?:book|reserv|schedule|appointment\s+(?:now|for))/u,
  es:/(?:reserv|agend|concert.*cita|program.*sesion)/u};
export function evaluateNativeDialogues(gold,turn){
  validateNativeGoldSet(gold);
  if(typeof turn!=='function')throw Error('NATIVE_GOLD_TURN_HANDLER_REQUIRED');
  const rows=[];
  for(const d of gold.dialogues){
    const history=[];let result=null,unanswered=0;
    for(const step of d.turns){
      result=turn({message:step.user,locale:d.locale,history})||null;
      if(typeof result?.reply!=='string'||!result.reply.trim())unanswered++;
      history.push({role:'user',text:step.user});
      if(result?.reply)history.push({role:'assistant',text:result.reply});
    }
    const reply=normalizeReply(result?.reply);
    let passed=false;
    if(result?.reply){
      if(d.task==='booking_time')passed=time[d.locale].test(reply);
      if(d.task==='booking_refusal')passed=!booking[d.locale].test(reply)&&
        !/(?:consultation|консультаци|consulta)/u.test(reply);
      if(d.task==='correction')passed=consult[d.locale].test(reply);
      if(d.task==='context_price')passed=price[d.locale].test(reply);
    }
    rows.push({id:d.id,locale:d.locale,task:d.task,passed,
      replied:Boolean(result?.reply),unanswered});
  }
  const passed=rows.filter(x=>x.passed).length;
  return {passed,total:rows.length,rate:round(ratio(passed,rows.length)),
    byLocale:Object.fromEntries(locales.map(l=>[l,rows.filter(x=>x.locale===l&&x.passed).length])),
    failures:rows.filter(x=>!x.passed),rows};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const {gold,sha256}=readGoldFile();
  const [{classifyNativeSecretaryIntent},{nativeSecretaryTurn},{NATIVE_SECRETARY_EXAMPLES_V1}]=await Promise.all([
    import('../lib/holistic-support/native-intent-model.mjs'),
    import('../lib/holistic-support/native-secretary.mjs'),
    import('../data/holistic-support/native-secretary-examples.mjs')
  ]);
  const examples=Object.values(NATIVE_SECRETARY_EXAMPLES_V1).flatMap(x=>Object.values(x).flat());
  const coverage=validateNativeGoldSet(gold,{trainingPhrases:examples});
  const classification=evaluateNativeGoldCases(gold,classifyNativeSecretaryIntent);
  const dialogue=evaluateNativeDialogues(gold,nativeSecretaryTurn);
  const payload={schema:'hh-native-eval-v1',datasetSha256:sha256,coverage,
    classification,dialogue,liveVerified:false};
  if(process.argv.includes('--json'))console.log(JSON.stringify(payload,null,2));
  else {
    console.log('NATIVE GOLD SHA '+sha256+' / cases '+coverage.cases+' / dialogues '+coverage.dialogues);
    for(const locale of locales)console.log(locale+': macroF1='+classification.perLanguage[locale].macroF1+
      ' recall='+classification.perLanguage[locale].recall+
      ' OOD false accept='+classification.perLanguage[locale].falseAcceptRate);
    console.log('pure dialogue passes '+dialogue.passed+'/'+dialogue.total+'; authenticated LIVE not tested');
  }
  // Valid baseline may score poorly. Never train/tune on this locked test set.
}
