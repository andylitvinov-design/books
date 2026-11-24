import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS} from '../lib/profile/development-vectors.mjs'
import {vectorWheelScore,vectorWheelRows,vectorWheelPolygon,vectorWheelSegments,vectorWheelPoint} from '../lib/profile/development-vector-wheel.mjs'
import {promptForDevelopmentVector} from '../lib/profile/development-vector-prompts.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('missing and half-filled pairs are never charted as zeros or real client scores',()=>{
 const rows=vectorWheelRows(INNER_VECTOR_ITEMS,{anchor:{current:'0',desired:'8'},
  connection:{current:'3',desired:''}})
 assert.equal(rows.length,8)
 assert.equal(rows[0].current,0)
 assert.equal(rows[0].desired,8)
 assert.equal(rows[1].current,null)
 assert.equal(rows[1].desired,null)
 assert.equal(vectorWheelPolygon(rows,'current'),null)
 assert.deepEqual(vectorWheelSegments(rows,'current'),[])
 assert.equal(vectorWheelScore(''),null)
 assert.equal(vectorWheelScore('11'),null)
 assert.equal(vectorWheelScore(-1),null)
 assert.equal(vectorWheelScore('0'),0)
})
test('complete owner ratings draw both polygon contours with faithful gaps',()=>{
 const data=Object.fromEntries(INNER_VECTOR_ITEMS.map((item,i)=>
  [item.id,{current:String(i),desired:String(i+1)}]))
 const rows=vectorWheelRows(INNER_VECTOR_ITEMS,data)
 assert.equal(rows.every(x=>x.gap===1),true)
 assert.equal(vectorWheelPolygon(rows,'current').split(' ').length,8)
 assert.equal(vectorWheelPolygon(rows,'desired').split(' ').length,8)
 assert.equal(vectorWheelSegments(rows,'current').length,8)
 assert.deepEqual(vectorWheelPoint(0,0),{x:170,y:158})
})
test('each guided meaning axis and life domain has a localized self-reflection question',()=>{
 for(const [track,items] of [['inner',INNER_VECTOR_ITEMS],['outer',OUTER_VECTOR_ITEMS]]){
  assert.equal(items.length,8)
  for(const item of items)for(const locale of ['en','ru','es'])
   assert.ok(promptForDevelopmentVector(track,item.id,locale).length>12)
 }
 assert.equal(promptForDevelopmentVector('inner','unknown','en'),'')
})
test('private wheel is wired to actual owner vectors, with no placeholders',()=>{
 const editor=read('components/app/development-vectors.jsx')
 const wheel=read('components/app/development-vector-wheel.jsx')
 const focus=read('components/app/profile-space-focus.jsx')
 assert.match(editor,/DevelopmentVectorWheel/)
 assert.match(editor,/ratings=\{draft\[track\]\.ratings\}/)
 assert.match(editor,/promptForDevelopmentVector/)
 assert.match(wheel,/data-development-vector-wheel/)
 assert.match(wheel,/vectorWheelRows/)
 assert.doesNotMatch(wheel,/localStorage|sessionStorage|Math\.random|fetch\(/)
 assert.match(focus,/appFetch\('development-goals'/)
 assert.match(focus,/normalizeDevelopmentVectors/)
 assert.match(focus,/hh:development-vectors-saved/)
 assert.match(focus,/href=\{'\/'\+lang\+'\/development-vectors'\}/)
 assert.match(focus,/if \(!accountId\) return undefined/)
})
