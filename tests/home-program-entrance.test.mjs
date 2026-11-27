import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('All localized home pages reuse one public three-tab entrance before Ali',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 assert.ok(home.indexOf('data-home-dialogue-header') < home.indexOf('data-home-program-entrance'))
 assert.ok(home.indexOf('data-home-program-entrance') < home.indexOf('data-home-dialogue-hero'))
 assert.match(home,/<ProfileSpaceDashboard locale=\{locale\} root=\{[^\n]+\} homeDiscovery=\{true\} \/>/)
 assert.match(read('components/holistic-house-home.tsx'),/<HomeDialogueEntry locale=\{locale\}/)
 assert.match(read('app/es/page.tsx'),/<HomeDialogueEntry locale="es"/)
})
test('Public discovery retains tabs, default Clarity, and does not expose private progress',()=>{
 const dashboard=read('components/app/profile-space-dashboard.jsx')
 assert.match(dashboard,/homeDiscovery = false/)
 assert.match(dashboard,/useState\('clarity'\)/)
 assert.match(dashboard,/id: 'clarity'[\s\S]*id: 'goals'[\s\S]*id: 'business'/)
 assert.match(dashboard,/if \(accountId && !embeddedSection\) return <Link href=\{profile\+'#my-courses'\}/)
 assert.match(dashboard,/!embeddedSection && !homeDiscovery && <details/)
 assert.match(dashboard,/!embeddedSection && !homeDiscovery && <Link/)
})
