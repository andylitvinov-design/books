import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateLabRelease} from '../scripts/lab-policy.mjs';
const base={now:Date.now(),history:[],sha:'a'.repeat(40),budget:'verified',isolation:'verified',lease:'verified',target:'preview',projectId:'prj_bjwATbHF61gzEhfsrNe54lEnvJZw'};
for(const [name,change,expected] of [
 ['allowed',{},'allowed'],['no budget',{budget:'unknown'},'budget-unverified'],['no isolation',{isolation:'unknown'},'isolation-unverified'],['no lease',{lease:'unknown'},'central-lease-unverified'],['wrong target',{target:'production'},'wrong-target'],['wrong project',{projectId:'other'},'wrong-project'],['duplicate',{history:[{time:base.now-3600000,sha:base.sha}]},'duplicate-sha'],['cooldown',{history:[{time:base.now-5000,sha:'b'.repeat(40)}]},'cooldown'],['daily',{history:Array.from({length:12},(_,i)=>({time:base.now-3600000-i*1000,sha:String(i)}))},'daily-limit'],['bad history',{history:null},'history-unavailable']]) test(name,()=>assert.equal(evaluateLabRelease({...base,...change}),expected));
