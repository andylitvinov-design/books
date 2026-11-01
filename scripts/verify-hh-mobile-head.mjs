// This runs against the built Next.js server: source-only metadata tests
// missed the global app/manifest.ts overriding Cabinet/public page manifests.
import assert from 'node:assert/strict'

const origin=process.argv[2]||'http://127.0.0.1:3098'
const cases=[
  ['/', '/holistic-house-app.webmanifest'],
  ['/ru', '/holistic-house-app-ru.webmanifest'],
  ['/es', '/holistic-house-app-es.webmanifest'],
  ['/en/install', '/holistic-house-app.webmanifest'],
  ['/ru/install', '/holistic-house-app-ru.webmanifest'],
  ['/es/install', '/holistic-house-app-es.webmanifest'],
  ['/en/app/portrait', '/holistic-house-app.webmanifest'],
  ['/ru/app/portrait', '/holistic-house-app-ru.webmanifest'],
  ['/ru/homeopathy', '/manifest.webmanifest'],
  ['/en/homeopathy', '/manifest.webmanifest'],
]
const failures=[]
for(const [route,expected] of cases){
  try{
    const response=await fetch(new URL(route,origin),{redirect:'follow'})
    assert.equal(response.status,200,route+' returned '+response.status)
    const html=await response.text()
    const links=[...html.matchAll(/<link\b[^>]*\brel=["']manifest["'][^>]*>/gi)]
      .map(match=>match[0].match(/\bhref=["']([^"']+)["']/i)?.[1])
      .filter(Boolean)
    assert.deepEqual(links,[expected],route+' must advertise exactly one correct app')
    process.stdout.write('PASS '+route+' -> '+links[0]+'\n')
  }catch(error){
    failures.push(route+': '+String(error?.message||error))
  }
}
for(const path of ['/holistic-house-app.webmanifest','/holistic-house-app-ru.webmanifest','/holistic-house-app-es.webmanifest','/manifest.webmanifest']){
  try{
    const response=await fetch(new URL(path,origin))
    assert.equal(response.status,200,path+' status')
    const manifest=await response.json()
    assert.equal(manifest.display,'standalone',path)
    assert.equal(manifest.name,path==='/manifest.webmanifest'?'PsiAlchemy':'Holistic House',path)
  }catch(error){failures.push(path+': '+String(error?.message||error))}
}
if(failures.length){
  process.stderr.write(failures.join('\n')+'\n')
  process.exitCode=1
}
