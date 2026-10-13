import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(p,'utf8')
test('native activity never includes client notes, scales or medication',()=>{
 const widget=read('ios/App/HHCourseWidget/HHCourseWidget.swift')
 const bridge=read('ios/App/App/HHCourseActivityPlugin.swift')
 const attrs=read('ios/App/Shared/HHCourseAttributes.swift')
 assert.match(widget,/ActivityConfiguration\(for: HHCourseAttributes\.self\)/)
 assert.match(widget,/DynamicIsland/)
 assert.match(bridge,/CAPBridgedPlugin/)
 assert.match(attrs,/ContentState/)
 for(const value of ['diagnosis','symptom','remedy','notes','testScore','privateURL']){
   assert.ok(!attrs.includes(value))
 }
})
test('native tokens are owner-scoped and only active cycles can register',()=>{
 const sql=read('supabase/migrations/20261013183000_hh_native_live_activities.sql')
 const code=read('lib/app/native-live-activity.js')
 assert.match(sql,/references app_private\.growth_cycles/)
 assert.match(sql,/row level security/)
 assert.match(code,/c\.account_id=\$2/)
 assert.match(code,/c\.status='active'/)
 assert.match(code,/apns-push-type':'liveactivity'/)
 assert.doesNotMatch(code,/console\.log/)
})
