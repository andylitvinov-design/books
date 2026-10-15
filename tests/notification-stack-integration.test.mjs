import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {mount,findButton,textOf,deferred} from './helpers/course-ui-harness.mjs'
const read=p=>readFileSync(p,'utf8')
test('both cron URLs share exactly one canonical sender and daily claim ledger',()=>{
 const canonical=read('app/api/internal/notification-dispatch/route.js')
 const alias=read('app/api/app/notifications/dispatch/route.js')
 assert.match(alias,/export \{ GET \} from '@\/app\/api\/internal\/notification-dispatch\/route'/)
 assert.doesNotMatch(alias,/createNotificationDispatcher|createWebPushTransport/)
 assert.match(canonical,/dispatchCourseReminders\(config\)/)
 const dispatcher=read('lib/app/notification-dispatch.js')
 assert.equal((dispatcher.match(/claim_due_course_pushes/g)||[]).length,1)
 assert.doesNotMatch(canonical+alias+dispatcher,/lib\/notifications|billing_private|notifications_private/)
 const sql=read('supabase/migrations/20261013174000_hh_push_dispatch.sql')
 assert.match(sql,/on conflict\(subscription_id,local_day\) do nothing/)
 assert.match(sql,/and exists\([\s\S]*from app_private.growth_cycles/)
})
test('root worker installs exactly one safe push and click listener',async()=>{
 const listeners=new Map(),shown=[]
 const self={location:{origin:'https://example.invalid'},registration:{showNotification:async(...args)=>shown.push(args)},addEventListener:(event,cb)=>{listeners.set(event,[...(listeners.get(event)||[]),cb])}}
 const context=vm.createContext({self,URL,importScripts:path=>vm.runInContext(read('public'+path),context)})
 vm.runInContext(read('public/sw.js'),context)
 for(const event of ['push','notificationclick'])assert.equal(listeners.get(event).length,1)
 let work;listeners.get('push')[0]({data:{json:()=>({locale:'ru',body:'private health data'})},waitUntil:p=>work=p});await work
 assert.equal(shown.length,1);assert.doesNotMatch(JSON.stringify(shown),/private health data/)
})
test('canonical settings surface only in Settings, with rich native preview retained',()=>{
 const app=read('components/app/app-workspace.jsx')
 assert.doesNotMatch(app,/CourseNotificationSettings|components\/pwa\/course-notification-settings/)
 assert.equal((app.match(/<NotificationSettings /g)||[]).length,1)
 assert.match(app,/page === 'course' && <MyCourse data=\{data\} locale=\{locale\} \/>/)
 assert.doesNotMatch(app,/SubscriptionHousePromo/)
 assert.match(app,/page === 'settings'[\s\S]*NotificationSettings/)
 for(const tag of ['styles.preview','<LiveActivityControl','notifications/test','notifications/preferences'])assert.ok(read('components/app/notification-settings.jsx').includes(tag))
})
function ui(fetcher,accountId='owner-a'){
 return mount('notification-settings',{props:{locale:'en',accountId},extraModules:{
  './live-activity-control':{default:()=>null},
  '@/lib/app/client-fetch':{appFetch:fetcher}
 }})
}
const state={enabled:true,ready:false,deviceCount:1,courseReminders:true,reminderHour:19,liveActivitiesAvailable:false}
test('canonical settings duplicate clicks send once with explicit owner context',async()=>{
 const pending=deferred(),calls=[]
 const view=ui(async(path,body,_method,options)=>{calls.push({path,body,options});return path==='notifications'?state:pending.promise})
 await view.settle();const button=findButton(view.tree,'Send a test notification');assert.ok(button)
 const first=button.props.onClick();await button.props.onClick();await view.settle()
 assert.equal(calls.filter(x=>x.path==='notifications/test').length,1)
 assert.equal(calls.at(-1).options.accountId,'owner-a')
 pending.resolve({accepted:1});await first;await view.settle();view.unmount()
})
test('canonical settings delayed old-owner response cannot update new account',async()=>{
 const pending=deferred(),calls=[]
 const view=ui(async(path,body,_method,options)=>{calls.push({path,options});return options.accountId==='owner-a'?pending.promise:{...state,deviceCount:2}})
 view.render({locale:'en',accountId:'owner-b'});await view.settle()
 assert.equal(calls[0].options.signal.aborted,true)
 pending.resolve({...state,deviceCount:99});await view.settle()
 assert.doesNotMatch(textOf(view.tree),/99/)
 assert.match(textOf(view.tree),/2/);view.unmount()
})
test('notification mutations and Live Activity reads bind owner, course changes notify once',()=>{
 const api=read('app/api/app/[...path]/route.js')
 const block=api.slice(api.indexOf("if (path[0] === 'notifications')"),api.indexOf("if (path[0] === 'course'"))
 assert.match(block,/x-hh-account-id/)
 for(const path of ['notifications/subscribe','notifications/unsubscribe','notifications/preferences','notifications/test','notifications/live-token','notifications/live-stop'])assert.ok(block.includes(path))
 assert.match(read('components/app/live-activity-control.jsx'),/accountId:session.accountId/)
 const today=read('components/app/course-today.jsx')
 assert.equal((today.match(/dispatchEvent\(new Event\('hh-course-changed'\)\)/g)||[]).length,1)
 assert.ok(today.indexOf('if(!isCurrent())return null',today.indexOf('async function submit'))<today.indexOf("dispatchEvent(new Event('hh-course-changed'))"))
})
function live(bridge,props={locale:'en',accountId:'owner-a',serverReady:true}){
 const view=mount('live-activity-control',{props,extraModules:{
  '@/lib/app/client-fetch':{appFetch:async path=>path.startsWith('course/today')?{cycle:{id:'cycle-a',day:1,status:'active'}}:{revoked:true}},
  '@/lib/native/client':{isNativePsiAlchemy:()=>true},
  '@capacitor/core':{registerPlugin:()=>bridge,Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}
 }})
 return view
}
test('native control resets interrupted busy state on locale change without stale token upload',async()=>{
 const pending=deferred();let starts=0
 const bridge={availability:async()=>({available:true}),addListener:async()=>({remove(){}}),list:async()=>({activities:[]}),start:async()=>{starts++;return pending.promise},update:async()=>{},stop:async()=>{}}
 const view=live(bridge);await view.settle()
 const start=findButton(view.tree,'Show my course');assert.ok(start);assert.equal(Boolean(start.props.disabled),false)
 const old=start.props.onClick();await view.settle()
 view.render({locale:'ru',accountId:'owner-a',serverReady:true});await view.settle()
 const fresh=findButton(view.tree,'Показать мой курс');assert.ok(fresh);assert.equal(Boolean(fresh.props.disabled),false)
 pending.resolve({activityId:'old-activity'});await old;await view.settle()
 assert.equal(starts,1);assert.equal(Boolean(findButton(view.tree,'Показать мой курс').props.disabled),false);view.unmount()
})
test('native control cleans a listener that resolves after its owner session ended',async()=>{
 const pending=deferred();let added=0,removed=0
 const bridge={availability:async()=>({available:true}),addListener:async()=>{added++;return pending.promise},list:async()=>({activities:[]})}
 const view=live(bridge);await view.settle();assert.equal(added,1)
 view.unmount();pending.resolve({remove(){removed++}});await view.settle()
 assert.equal(removed,1)
})
