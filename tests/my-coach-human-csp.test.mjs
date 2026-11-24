import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {NextRequest,NextResponse} from 'next/server.js'

// Exercise the SAME actual middleware that serves Production. No mocked CSP
// strings, private sessions, provider calls, real bookings or external media.
const source=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8')
const PROJECT_ORIGIN='https://aaaaaaaaaaaaaaaaaaaa.supabase.co'
const presentationBucket=PROJECT_ORIGIN+'/storage/v1/object/public/hh-practitioner-presentations/'
const site='https://holistichouse.vercel.app'
function createMiddleware(env={HH_APP_SUPABASE_URL:PROJECT_ORIGIN,NODE_ENV:'production'}) {
  const modules={
    'next/server':{NextResponse},
    './lib/canonical-redirect':{canonicalRedirectTarget:()=>null,privateMigrationBridge:()=>null},
    './lib/app/admin-auth-refresh':{refreshAdminAuth:async()=>[]},
  }
  const runtime={
    exports:{}, Headers, URL, crypto:globalThis.crypto,
    process:{env}, require(name){
      assert.ok(Object.hasOwn(modules,name),'unexpected module '+name)
      return modules[name]
    },
  }
  const js=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  }}).outputText
  runInNewContext(js,runtime)
  return runtime.exports.middleware
}
async function policy(middleware,path) {
  const response=await middleware(new NextRequest(site+path))
  assert.equal(response.status,200,path)
  const csp=response.headers.get('content-security-policy')||''
  assert.ok(csp.includes("frame-ancestors 'none'"),path+': CSP remains active')
  return Object.fromEntries(csp.split('; ').map(section=>{
    const [directive,...sources]=section.split(' ')
    return [directive,sources.filter(Boolean)]
  }))
}
function hasExact(policy,directive,source) {
  return policy[directive]?.includes(source)===true
}

test('Only real specialist detail pages may play approved Vimeo and public presentation videos',async()=>{
  const middleware=createMiddleware()
  for(const path of [
    '/ru/my-coach/real/andy-litvinov',
    '/en/my-coach/real/andy-litvinov',
    '/es/my-coach/real/andy-litvinov',
    '/ru/my-coach/real/published-practitioner',
  ]) {
    const p=await policy(middleware,path)
    assert.equal(hasExact(p,'frame-src','https://www.youtube-nocookie.com'),true,path)
    assert.equal(hasExact(p,'frame-src','https://app.heygen.com'),true,path)
    assert.equal(hasExact(p,'frame-src','https://player.vimeo.com'),true,path)
    assert.equal(hasExact(p,'media-src',presentationBucket),true,path)
    assert.equal(hasExact(p,'img-src',PROJECT_ORIGIN),true,path)
    assert.equal(hasExact(p,'media-src',PROJECT_ORIGIN),false,path+': no unrestricted storage origin')
    assert.equal(hasExact(p,'media-src','blob:'),false,path+': no private blob media')
  }
})

test('No broadened Vimeo or practitioner presentation origins on AI, public catalog, APIs or private pages',async()=>{
  const middleware=createMiddleware()
  for(const path of [
    '/ru/my-coach', '/ru/coaching/sessions', '/ru/masters/andy-litvinov',
    '/ru/services/imagery-therapy', '/ru/app/messages','/api/app/direct-messages',
    '/admin/clients', '/en/client/session/10000000-0000-4000-8000-000000000001',
  ]) {
    const p=await policy(middleware,path)
    assert.equal(hasExact(p,'frame-src','https://player.vimeo.com'),false,path)
    assert.equal(hasExact(p,'media-src',presentationBucket),false,path)
  }
})

test('Unconfigured storage stays fail-closed; no arbitrary origin or private media reaches public specialist CSP',async()=>{
  const middleware=createMiddleware({NODE_ENV:'production',HH_APP_SUPABASE_URL:''})
  const p=await policy(middleware,'/ru/my-coach/real/andy-litvinov')
  assert.equal(hasExact(p,'frame-src','https://player.vimeo.com'),true)
  assert.ok(!p['media-src'].some(s=>s.includes('supabase.co')))
  assert.ok(!p['img-src'].some(s=>s.includes('supabase.co')))
  assert.equal(hasExact(p,'media-src','https:'),false)
  assert.equal(hasExact(p,'media-src','data:'),false)
})
