import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('All localized home pages reuse one public three-tab entrance without legacy Home',()=>{
 const home=read('components/home-program-entry.tsx')
 assert.ok(home.indexOf('data-home-dialogue-header') < home.indexOf('data-home-program-entrance'))
 assert.doesNotMatch(home,/data-home-dialogue-hero|data-home-intent-form|HomeDialogueEntry/)
 assert.match(home,/<ProfileSpaceDashboard locale=\{locale\} root=\{[^\n]+\} homeDiscovery=\{true\} \/>/)
 assert.match(read('components/holistic-house-home.tsx'),/<HomeProgramEntry locale=\{locale\}/)
 assert.match(read('app/es/page.tsx'),/<HolisticHouseHome locale="es"/)
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

test('Canonical Home mounts no retired marketing or Ali blocks',()=>{
 const home=read('components/holistic-house-home.tsx')
 assert.match(home,/data-home-design="program-discovery-v2"/)
 assert.doesNotMatch(home,/<HomeDialogueEntry|<HomeDeferredSections|<HomePresentationVideoSection|service-home-about/)
 assert.match(read('app/page.tsx'),/<HolisticHouseHome locale="en"/)
 assert.match(read('app/[locale]/page.tsx'),/<HolisticHouseHome locale="ru"/)
})
