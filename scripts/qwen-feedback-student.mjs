#!/usr/bin/env node
/**
 * Experimental first-party binary reviewer TRAINED on observed (fictional) Qwen outputs.
 * It does NOT fine-tune Qwen weights. It is NOT connected to client production.
 * The tiny corpus is insufficient for promotion; the deterministic gate is safer.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const ROWS_URL = new URL('../data/holistic-support/qwen-observations-ru-en-v1.json',import.meta.url);
const DIM=256;
const h=str=>{let n=2166136261;for(const ch of str)n=Math.imul((n^ch.charCodeAt(0)),16777619);return (n>>>0)%DIM;};
export function vectorize(row){
  const txt=`${row.locale} ${row.role} ${row.user} ${row.response}`.toLowerCase().replace(/ё/g,'е');
  const x=new Float64Array(DIM);
  const terms=txt.match(/[\p{L}\p{N}]+/gu)||[];
  for(const word of terms){x[h('w:'+word)]+=1.5;const padded='^'+word+'$';for(let n=2;n<=4;n++)for(let i=0;i+n<=padded.length;i++)x[h('c:'+padded.slice(i,i+n))]+=0.15;}
  const norm=Math.hypot(...x)||1;return Float64Array.from(x,v=>v/norm);
}
export function validateRows(obj){
  if(obj?.schema!=='hh-qwen-observations-v1'||obj?.fineTuned!==false||!Array.isArray(obj.cases)||obj.cases.length<4)throw Error('INVALID_TEACHER_SOURCE');
  const ids=new Set();
  for(const r of obj.cases){
    if(!/^qr\d+$/.test(r.id)||ids.has(r.id)||!['ru','en'].includes(r.locale)||!['coach','secretary'].includes(r.role)||
      typeof r.user!=='string'||typeof r.response!=='string'||r.user.length>400||r.response.length>1000||
      typeof r.expertAccepted!=='boolean')throw Error('INVALID_QWEN_OBSERVATION');
    ids.add(r.id);
  }
  return obj.cases;
}
export function trainTeacherFeedback(rows,{epochs=220,learningRate=0.3}={}){
  const W=new Float64Array(DIM);let b=0;
  const samples=rows.map(r=>({x:vectorize(r),y:Number(r.expertAccepted)}));
  for(let e=0;e<epochs;e++){
    const lr=learningRate/(1+e/30);
    for(const {x,y} of samples){let z=b;for(let i=0;i<DIM;i++)z+=W[i]*x[i];
      const pred=1/(1+Math.exp(-Math.max(-20,Math.min(20,z))));const err=y-pred;
      b+=lr*err;for(let i=0;i<DIM;i++)W[i]+=lr*(err*x[i]-0.001*W[i]);
    }
  }
  return {weights:Array.from(W),bias:b};
}
export function studentScore(fit,row){const v=vectorize(row);let s=fit.bias;for(let i=0;i<DIM;i++)s+=fit.weights[i]*v[i];return +(1/(1+Math.exp(-s))).toFixed(4);}
export function buildFeedbackArtifact(path=ROWS_URL){
  const input=readFileSync(path,'utf8');const dataset=JSON.parse(input);const rows=validateRows(dataset);
  const fitted=trainTeacherFeedback(rows);
  const artifact={schema:'hh-qwen-feedback-student-experiment-v1',trainedFrom:'reviewed_synthetic_qwen_observations',
    modelSource:dataset.model,teacherSha256:createHash('sha256').update(input).digest('hex'),
    samples:rows.length,features:DIM,epochs:220,fineTunedQwen:false,deployable:false,
    qualityClaim:'NONE; microscopic non-independent experimental corpus',
    weights:fitted.weights,bias:fitted.bias,
    // In-sample scores are diagnostics ONLY and cannot be called accuracy or quality evidence.
    trainingDiagnostics:rows.map(r=>({id:r.id,reviewedAccept:r.expertAccepted,score:studentScore(fitted,r)}))};
  return artifact;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const artifact=buildFeedbackArtifact();
  const out=process.argv[2];
  if(!out||!out.startsWith('/'))throw Error('OUTPUT_ABSOLUTE_PATH_REQUIRED');
  writeFileSync(out,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({trained:artifact.samples,features:artifact.features,teacherSha256:artifact.teacherSha256,
    deployable:artifact.deployable,output:out}));
}