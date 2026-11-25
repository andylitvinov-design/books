import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8')
test('practice home exposes exactly six primary entries and preserves protected legacy tools',()=>{
  const nav=source.match(/<nav className="hh-practice-v4-grid" data-practice-simple-nav[\s\S]*?<\/nav>/)?.[0]
  assert.ok(nav,'primary practitioner navigation must exist')
  assert.equal((nav.match(/<button\b/g)||[]).length,6,'messages, clients, services, materials, promotion and profile')
  for(const dest of ["?section=clients&tab=chats","choosePanel('clients')","choosePanel('services')","openMaterialsPanel('articles')","isOwner?'marketing':'analytics'","choosePanel('profile')"]) assert.ok(nav.includes(dest),dest)
  for(const marker of ['PracticeInnerHeader','PracticeInnerBottomNavigation','data-practice-client-tools','data-practice-service-tools','data-practice-material-tools','data-practice-growth-tools',"openMaterialsPanel('courses')","openOwner('reports')","openOwner('payment')"]){
    assert.ok(source.includes(marker),'existing secure tool unavailable: '+marker)
  }
  assert.match(nav,/onClick=\{\(\)=>window\.location\.assign/)
})
