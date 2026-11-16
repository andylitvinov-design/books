import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFeedbackArtifact,trainTeacherFeedback,studentScore,validateRows} from '../scripts/qwen-feedback-student.mjs';
test('train actual small student weights from previously observed and manually reviewed Qwen replies',()=>{
 const artifact=buildFeedbackArtifact();
 assert.equal(artifact.samples,6);assert.equal(artifact.weights.length,256);
 assert.equal(artifact.fineTunedQwen,false);assert.equal(artifact.deployable,false);
 assert.ok(artifact.teacherSha256.length===64);
 assert.ok(artifact.weights.some(x=>x!==0));
});
test('training is deterministic and rejects unreviewed data',()=>{
 const a=buildFeedbackArtifact(),b=buildFeedbackArtifact();
 assert.deepEqual(a.weights,b.weights);
 assert.throws(()=>validateRows({schema:'hh-qwen-observations-v1',fineTuned:false,cases:[{id:'qr1',locale:'ru',role:'coach',user:'some',response:'response'}]}),/INVALID_TEACHER_SOURCE|INVALID_QWEN_OBSERVATION/);
 assert.throws(()=>validateRows({schema:'hh-qwen-observations-v1',fineTuned:true,cases:[]}),/INVALID_TEACHER_SOURCE/);
});
test('in-sample scores are informational, no clinical or production claim',()=>{
 const x=buildFeedbackArtifact();
 assert.match(x.qualityClaim,/NONE/);
 for(const row of x.trainingDiagnostics){assert.ok(row.score>=0 && row.score<=1);assert.match(row.id,/^qr\d+$/);}
});