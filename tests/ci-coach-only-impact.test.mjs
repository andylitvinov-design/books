import assert from 'node:assert/strict';
import test from 'node:test';
import {SHARED_COACH_DISPATCHER, verifiedCoachOnlySharedRouting} from '../lib/ci/coach-only-impact.mjs';

const before="import {myCoachGenerativeTurn} from '@/lib/app/coaching-brain'\nconst sharedAuth = true;\n    // Signed-in, stateless dialogue for the selected My Coach persona. Client\n    if (joined === 'my-coach/turn') { return json(myCoachGenerativeTurn()); }\n    // A synthetic preflight proves verified ZDR free-model access before any\nconst sharedPayment = true;\n";
const after="import {myCoachGenerativeTurn,myCoachGenerativeStreamTurn} from '@/lib/app/coaching-brain'\nimport {geminiCoachTextConfig} from '@/lib/coaching/gemini-coach-text.mjs'\nconst sharedAuth = true;\n    // Signed-in, stateless dialogue for the selected My Coach persona. Client\n    if (joined === 'my-coach/stream') { return new Response('ok'); }\n    if (joined === 'my-coach/turn') { return json(myCoachGenerativeTurn()); }\n    // A synthetic preflight proves verified ZDR free-model access before any\nconst sharedPayment = true;\n";
const route={filename:SHARED_COACH_DISPATCHER,status:'M'};
const path=filename=>({filename,status:'M'});
test('only separately owned Coach route, UI, voice and tests are eligible',()=>{
  const candidate=[route,
    {filename:'app/api/app/my-coach/voice/synthesize/route.js',status:'A'},
    path('components/my-coach-live-dialogue.module.css'),
    path('lib/app/coaching-brain.js'),
    {filename:'lib/coaching/gemini-live-provider.mjs',status:'A'},
    path('lib/personal-coaching/streamed-mp3-playback.mjs'),
    path('tests/coaching-live-voice.test.mjs'),
    path('tests/my-coach-gemini-tiers-tts.test.mjs'),
    path('tests/practice-public-private-unified.test.mjs'),
    path('docs/coaching/MY_COACH_GEMINI_TIERS_VOICES_20261120.md')];
  assert.equal(verifiedCoachOnlySharedRouting(candidate,before,after),true);
});
test('unproven, renamed, security, payments, services and cross-feature edits retain full browser',()=>{
 for(const extra of [
  'lib/app/session.js','app/api/app/auth/route.js','app/api/app/notification-channels/route.js',
  'lib/commerce/checkout.js','lib/coaching/private-auth.mjs','lib/coaching/payment-adapter.mjs',
  'components/site-video-player.tsx','components/holistic-support-mobile.tsx',
  'app/[locale]/services/page.tsx','middleware.ts','package-lock.json','tests/ci-routing.test.mjs'
 ])assert.equal(verifiedCoachOnlySharedRouting([route,path(extra)],before,after),false,extra);
 for(const tamper of [
   after.replace('const sharedPayment = true;', 'const sharedPayment = false;'),
   after.replace('const sharedAuth = true;', 'const sharedAuth = false;'),
   after.replace("joined === 'my-coach/stream'","joined === 'service-cart/stream'"),
   after.replace('    // Signed-in, stateless dialogue for the selected My Coach persona. Client','// lost reviewed anchor'),
 ]) assert.equal(verifiedCoachOnlySharedRouting([route],before,tamper),false);
 for(const rows of [[],[{...route,status:'D'}],[{...route,status:'renamed'}],
   [{...route,previous_filename:'app/api/payment/route.js'}],[route,route],
   [route,{filename:'lib/coaching/../app/auth.js',status:'M'}]]){
   assert.equal(verifiedCoachOnlySharedRouting(rows,before,after),false);
 }
});

test('unguarded shared execution between coach branches always invokes real public/media browser',()=>{
  for(const inserted of [
    'config.paymentEnabled=false;',
    "if (joined === 'services/cart') { return json('bypass'); }",
    'await disableGlobalAuth();',
    'const {shared} = globalThis;',
  ]){
    const injection=after.replace("    if (joined === 'my-coach/stream')",
      '    '+inserted+"\n    if (joined === 'my-coach/stream')");
    assert.equal(verifiedCoachOnlySharedRouting([route],before,injection),false,
      'shared non-Coach statement cannot be scoped: '+inserted);
  }
});
