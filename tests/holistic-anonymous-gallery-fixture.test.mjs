import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceModule,denied} from './helpers/current-source-render.mjs';
import {AppError,requireUUID} from '../lib/assessments/contracts.js';
import {PRIVATE_HEADERS,safeError} from '../lib/app/http.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('source-confirmed anonymous talisman fixture is exact401 SIGN_IN_REQUIRED without customer/provider reads',async()=>{
  const sessionSource=read('lib/app/session.js');
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(sessionSource)+'\0').update(sessionSource).digest('hex'),
    'ea991a5c87b29bd8aed6ecdf3e1a8e510c4286c4');
  let syntheticAuthChecks=0;
  const {createRequestAuth}=sourceModule(sessionSource,'session.js',{
    'server-only':{}, '../assessments/contracts.js':{AppError,requireUUID},
    '@supabase/ssr':{createServerClient:()=>({auth:{
      getUser:async()=>{syntheticAuthChecks++;return {data:{user:null},error:null};},getSession:denied,
    },storage:new Proxy({},{get:denied})})},
  });
  const route=sourceModule(read('app/api/holistic-support/talismans/route.js'),'route.js',{
    'next/server':{NextResponse:{json:(body,{status=200,headers})=>({body,status,headers})}},
    '@/lib/app/config':{getAppConfig:()=>({test:true}),requireSameOrigin:denied},
    '@/lib/app/session':{createRequestAuth},'@/lib/app/database':{consumeRate:denied},
    '@/lib/app/http':{PRIVATE_HEADERS,safeError},'@/lib/assessments/contracts':{AppError,requireUUID},
    '@/lib/app/support-talismans':Object.fromEntries(['TALISMAN_BUCKET','validateTalismanDetails','listMyTalismans',
      'reserveTalisman','completeTalisman','getMyTalisman','removeTalismanRecord','cancelTalismanReservation'].map(key=>[key,denied])),
  });
  const response=await route.GET({cookies:{getAll:()=>[]}});
  assert.equal(syntheticAuthChecks,1);
  assert.equal(response.status,401);
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)),{error:'SIGN_IN_REQUIRED'});
  assert.equal(response.headers,PRIVATE_HEADERS);
  assert.match(read('components/support-talisman-gallery.tsx'),/if\(response\.status===401\)\{setAuthorized\(false\);setItems\(\[\]\);setError\(""\);return;\}/);
});
