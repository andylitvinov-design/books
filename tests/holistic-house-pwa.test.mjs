import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {UNIFIED_DOCK_IDS,unifiedMobileDockHref} from '../lib/unified-mobile-dock.mjs'
test('private Cabinet advertises a dedicated installable Holistic House PWA',()=>{
 const manifest=JSON.parse(readFileSync('public/holistic-house-app.webmanifest','utf8'))
 const layout=readFileSync('app/[locale]/app/layout.jsx','utf8')
 const sw=readFileSync('public/sw.js','utf8')
 assert.equal(manifest.name,'Holistic House')
 assert.equal(manifest.display,'standalone')
 assert.doesNotMatch(layout,/manifest:.*holistic-house-app\.webmanifest/)
 assert.match(readFileSync('app/[locale]/layout.tsx','utf8'),/holistic-house-app\.webmanifest/)
 assert.match(sw,/notificationclick/)
 assert.match(sw,/network-only/)
 assert.doesNotMatch(sw,/localStorage/)
})

test('one unified Holistic House installation, not an accidental OPORA-only launcher',()=>{
  const en=JSON.parse(readFileSync('public/holistic-house-app.webmanifest','utf8'))
  const ru=JSON.parse(readFileSync('public/holistic-house-app-ru.webmanifest','utf8'))
  const es=JSON.parse(readFileSync('public/holistic-house-app-es.webmanifest','utf8'))
  const legacy=JSON.parse(readFileSync('public/holistic-house.webmanifest','utf8'))
  const page=readFileSync('app/[locale]/app/[[...path]]/page.jsx','utf8')
  for(const manifest of [en,ru,es,legacy]){
    assert.equal(manifest.name,'Holistic House')
    assert.equal(manifest.id,'/en/app')
    assert.equal(manifest.scope,'/')
    assert.equal(manifest.display,'standalone')
    for(const size of [192,512])
      assert.ok(manifest.icons.some(icon=>icon.type==='image/png'&&
        icon.sizes===size+'x'+size&&icon.src==='/holistic-house-icon/'+size))
    assert.ok(manifest.shortcuts.some(s=>s.url.endsWith('/app/messages')))
  }
  assert.equal(en.start_url,'/en')
  assert.equal(ru.start_url,'/ru')
  assert.equal(es.start_url,'/es')
  assert.match(page,/query.program === 'stress'/)
  assert.match(page,/holistic-house-app-ru\.webmanifest/)
  assert.match(page,/holistic-house-app\.webmanifest/)
  assert.match(page,/opora-antistress-ru\.webmanifest/)
  assert.match(page,/oporaInstall \?/)
  assert.doesNotMatch(page,/manifest: path\[0\] === 'course'/)
})

test('installed canonical root scope covers all seven tab routes',()=>{
 const origin='https://holistichouse.vercel.app';
 for(const locale of ['en','ru','es']){
  const name='public/holistic-house-app'+(locale==='en'?'':'-'+locale)+'.webmanifest';
  const m=JSON.parse(readFileSync(name,'utf8'));
  const scope=new URL(m.scope,origin);
  const start=new URL(m.start_url,origin);
  assert.equal(start.origin,scope.origin);
  assert.ok(start.pathname.startsWith(scope.pathname));
  for(const id of UNIFIED_DOCK_IDS){
   const url=new URL(unifiedMobileDockHref(locale,id),origin);
   assert.equal(url.origin,scope.origin,id);
   assert.ok(url.pathname.startsWith(scope.pathname),id);
  }
 }
 assert.notEqual(new URL('https://codex-public-book-library.vercel.app/ru/holistic-support/mobile').origin,origin);
});

test('install landing is public, bilingual and links to real protected messaging settings',()=>{
  const guide=readFileSync('app/[locale]/install/page.jsx','utf8')
  const icon=readFileSync('app/holistic-house-icon/[size]/route.js','utf8')
  assert.match(guide,/Add to Home Screen/)
  assert.match(guide,/На экран «Домой»/)
  assert.match(guide,/app\/messages/)
  assert.match(guide,/app\/settings#hh-phone-notifications/)
  assert.match(guide,/robots:\{index:false,follow:false\}/)
  assert.match(guide,/holistic-house-icon\/180/)
  assert.match(icon,/new ImageResponse/)
  assert.match(icon,/'180':180,'192':192,'512':512/)
  assert.match(icon,/Cache-Control/)
  // All private Cabinet/API requests still bypass SW caching.
  const sw=readFileSync('public/sw.js','utf8')
  assert.match(sw,/PRIVATE_PREFIXES/)
  assert.match(sw,/\/en\/app/)
  assert.match(sw,/network-only/)
})

test('iOS Home Screen icon never invokes dynamic font download for unsupported symbol glyph',()=>{
 const icon=readFileSync('app/holistic-house-icon/[size]/route.js','utf8')
 assert.match(icon,/new ImageResponse\(/)
 assert.match(icon,/transform:'rotate\(45deg\)'/)
 assert.doesNotMatch(icon,/'✦'\)/)
 assert.doesNotMatch(icon,/fontSize:size\*\.11/)
})

test('public Holistic House pages default to the correct Home Screen app without relabelling PsiAlchemy',()=>{
  const root=readFileSync('app/layout.tsx','utf8')
  const localeLayout=readFileSync('app/[locale]/layout.tsx','utf8')
  const psiLayout=readFileSync('app/[locale]/homeopathy/layout.tsx','utf8')
  const psiSpanish=readFileSync('app/es/homeopathy/layout.tsx','utf8')
  const esLayout=readFileSync('app/es/layout.tsx','utf8')
  const psi=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'))
  assert.match(root,/manifest: "\/holistic-house-app.webmanifest"/)
  assert.match(root,/applicationName: "Holistic House"/)
  assert.match(localeLayout,/manifest: locale === "ru"/)
  assert.match(localeLayout,/holistic-house-app-ru.webmanifest/)
 assert.match(localeLayout,/holistic-house-app-es.webmanifest/)
  assert.match(root,/appleWebApp: \{ capable: true, title: "Holistic House"/)
  assert.match(psiLayout,/manifest: "\/manifest.webmanifest"/)
  assert.match(psiSpanish,/manifest: "\/manifest.webmanifest"/)
  assert.match(esLayout,/holistic-house-app-es\.webmanifest/)
  assert.equal(psi.name,'PsiAlchemy')
  assert.equal(psi.start_url,'/ru/homeopathy')
})

test('real service-worker offline fallback is limited to anonymous Holistic House navigation',async()=>{
 const source=readFileSync('public/sw.js','utf8')
 const handlers=new Map(),stores=new Map()
 const fakeCache=name=>{
   if(!stores.has(name))stores.set(name,new Map())
   const store=stores.get(name)
   return {
     async addAll(paths){
       for(const path of paths){
         const page=readFileSync('public'+path,'utf8')
         assert.match(page,/Holistic House/)
         assert.match(page,/noindex,nofollow/)
         store.set(path,{url:path})
       }
     },
     async match(path){return store.get(typeof path==='string'?path:path.url)},
     async put(path,response){store.set(typeof path==='string'?path:path.url,response)}
   }
 }
 const scope={
   self:{
     location:{origin:'https://holistichouse.vercel.app'},
     addEventListener:(type,fn)=>handlers.set(type,fn),
     skipWaiting:async()=>{},
     clients:{claim:async()=>{}}
   },
   importScripts:(path)=>assert.equal(path,'/course-notifications-sw.js'),
   caches:{
     open:async name=>fakeCache(name),
     keys:async()=>[...stores.keys()],
     delete:async name=>stores.delete(name)
   },
   URL,Response,fetch:async()=>{throw Error('offline')}
 }
 runInNewContext(source,scope)
 const install={waitUntil(promise){this.promise=promise}}
 handlers.get('install')(install)
 await install.promise
 assert.equal(stores.get('hh-public-offline-v1').size,3)
 const navigation=(path,mode='navigate',method='GET')=>{
   let result=null
   handlers.get('fetch')({
     request:{url:'https://holistichouse.vercel.app'+path,mode,method},
     respondWith(promise){result=promise}
   })
   return result
 }
 for(const [path,locale] of [['/','en'],['/en','en'],['/ru','ru'],['/es/mytube','es']]){
   const response=navigation(path)
   assert.ok(response,'expected public offline fallback: '+path)
   assert.equal((await response).url,'/holistic-house-offline-'+locale+'.html')
 }
 for(const path of ['/en/app/messages','/ru/app/portrait','/es/app/tests',
   '/api/app/messages','/en/client/abc','/ru/prescriptions/id',
   '/en/homeopathy/remedies/arsenicum-album']){
   assert.equal(navigation(path),null,'private or separate app navigation must bypass fallback: '+path)
 }
 assert.equal(navigation('/ru','navigate','POST'),null)
 assert.equal(navigation('/ru','cors'),null)
 const activate={waitUntil(promise){this.promise=promise}}
 handlers.get('activate')(activate)
 await activate.promise
})
