import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {warmCabinetExitDocument} from '../scripts/helpers/cabinet-navigation-verifier.mjs'
const fixture=status=>{const events=[];return{events,context:{request:{async get(url){events.push(['get',url]);return{status:()=>status,async body(){events.push(['body'])},async dispose(){events.push(['dispose'])}}}}}}}
test('isolated Home readiness consumes and releases the public response without navigating the browser',async()=>{
 const {context,events}=fixture(200);await warmCabinetExitDocument(context,'http://localhost:3100')
 assert.deepEqual(events,[['get','http://localhost:3100/'],['body'],['dispose']])
})
test('failed compilation is not ignored and non-loopback warm-up is refused',async()=>{
 const {context,events}=fixture(503);await assert.rejects(warmCabinetExitDocument(context,'http://localhost:3100'))
 assert.deepEqual(events,[['get','http://localhost:3100/'],['dispose']])
 events.length=0;await assert.rejects(warmCabinetExitDocument(context,'https://holistichouse.vercel.app'));assert.deepEqual(events,[])
})
test('warm-up precedes archive setup and the unchanged real Home click',()=>{
 const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 const warm=source.indexOf('await warmCabinetExitDocument(context,origin)'),archive=source.indexOf("await page.goto(origin+'/en/app/analysis');await ready()",warm),click=source.indexOf('await openCabinetHome(page,expect,{origin})',archive)
 assert.ok(warm>0&&archive>warm&&click>archive)
 assert.match(source.slice(warm,archive),/waitForLoadState\('networkidle'\)/)
})
