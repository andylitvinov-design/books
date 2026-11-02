'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {loadTrustedClassifier,assessBaseFreshness}=require('../scripts/ci-pr-base-freshness.cjs');
test('production checkout classifies ordinary and sensitive paths against its exact SHA',async()=>{
 const classifier=await loadTrustedClassifier(process.env.GITHUB_WORKSPACE);
 assert.match(classifier.classifierBase,/^[a-f0-9]{40}$/);
 const {decideRoute,classifierBase}=classifier;
 assert.equal(decideRoute([{status:'M',filename:'components/card.tsx'}],null,null),'CORE');
 for(const filename of ['.github/workflows/gate.yml','lib/billing/stripe-provider.js','unknown/file.js'])
  assert.equal(decideRoute([{status:'M',filename}],null,null),'FULL',filename);
 const github={rest:{repos:{getBranch:async()=>({data:{commit:{sha:classifierBase}}})},pulls:{listFiles:async()=>({data:[{filename:'components/card.tsx',status:'modified'}]})}}};
 const pr={number:1,base:{sha:'a'.repeat(40)},changed_files:1};
 assert.equal((await assessBaseFreshness({github,owner:'o',repo:'r',pr,...classifier})).ok,true);
});
