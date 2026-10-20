import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {
  nextGrowthPost,isSavedGrowthPost,publicCampaignLink,
} from '../lib/growth-studio/model.mjs'
import {createMemoryGrowthStudioStore} from '../lib/growth-studio/store.js'
import {buildManualCalendarIcs} from '../lib/growth-studio/manual-calendar.mjs'
import {publicationStatusLabel} from '../lib/growth-studio/channel-capabilities.mjs'
import {
  manualGrowthPostingInbox,manualGrowthCopyText,manualGrowthDestination,MANUAL_DESTINATIONS,
} from '../lib/growth-studio/manual-inbox.mjs'

const created=new Date('2026-10-18T12:00:00.000Z')
const now=new Date('2026-10-20T12:00:00.000Z')
function post(scheduledAt,channel='instagram'){
  const draft=nextGrowthPost({action:'save',id:randomUUID(),now:created,
    fields:{brand:'holistic_house',channel,locale:'en',title:'Public course information',
      caption:'Discover a publicly available learning program.',sourceUrl:'/en/academy',
      campaign:'course_202610',scheduledAt,mediaUrl:'',mediaAlt:''}})
  const approved=nextGrowthPost({current:draft,action:'approve',now:created})
  return scheduledAt?nextGrowthPost({current:approved,action:'plan',now:created}):approved
}

test('owner-reported completion never creates provider-confirmed publication data',async()=>{
  const store=createMemoryGrowthStudioStore()
  // Exercise the real optimistic revision chain against persistent storage.
  const draft=nextGrowthPost({action:'save',id:randomUUID(),now:created,
    fields:{brand:'holistic_house',channel:'instagram',locale:'en',
      title:'Public class',caption:'Free course information',sourceUrl:'/en/academy',
      campaign:'course_202610',scheduledAt:'2026-10-20T14:00:00.000Z',mediaUrl:'',mediaAlt:''}})
  await store.save(draft,0)
  const approved=nextGrowthPost({current:draft,action:'approve',now:created})
  await store.save(approved,1)
  const planned=nextGrowthPost({current:approved,action:'plan',now:created})
  await store.save(planned,2)
  const done=nextGrowthPost({current:planned,action:'complete_manual',now})
  assert.equal(done.status,'manual_done')
  assert.equal(done.manualDoneAt,now.toISOString())
  assert.equal(done.revision,4)
  assert.equal(isSavedGrowthPost(done),true)
  assert.equal(Object.hasOwn(done,'delivery'),false)
  assert.match(publicationStatusLabel(done.status),/unverified/)
  await store.save(done,3)
  assert.equal((await store.get(draft.id)).status,'manual_done')
  assert.equal(buildManualCalendarIcs([done]).includes('BEGIN:VEVENT'),false)
  await assert.rejects(store.save(nextGrowthPost({current:planned,action:'archive',now}),3),/conflict/)
  const restored=nextGrowthPost({current:done,action:'undo_manual',now})
  assert.equal(restored.status,'planned_manual')
  assert.equal(restored.revision,5)
  assert.equal(Object.hasOwn(restored,'manualDoneAt'),false)
  await store.save(restored,4)
  assert.equal((await store.get(draft.id)).status,'planned_manual')
})

test('rejects invalid manual completions from unapproved or provider-confirmed statuses',()=>{
  const approved=post('')
  const planned=post('2026-10-20T14:00:00.000Z')
  const done=nextGrowthPost({current:planned,action:'complete_manual',now})
  for(const source of [approved,{...planned,status:'draft'},{...planned,status:'archived'},done]){
    assert.throws(()=>nextGrowthPost({current:source,action:'complete_manual',now}),/invalid_transition/)
  }
  assert.throws(()=>nextGrowthPost({current:planned,action:'undo_manual',now}),/invalid_transition/)
  assert.throws(()=>nextGrowthPost({current:done,action:'archive',now}),/invalid_transition/)
  assert.throws(()=>nextGrowthPost({current:done,action:'reopen',now}),/invalid_transition/)
  assert.throws(()=>nextGrowthPost({current:done,action:'save',fields:{
    brand:done.brand,channel:done.channel,locale:done.locale,title:done.title,
    caption:done.caption,sourceUrl:done.sourceUrl,campaign:done.campaign,
    scheduledAt:done.scheduledAt,mediaUrl:done.mediaUrl,mediaAlt:done.mediaAlt,
  },now,id:done.id}),/invalid_transition/)
})

test('forged "manual_done" without timestamp or with provider receipts fails closed',()=>{
  const planned=post('2026-10-20T14:00:00.000Z')
  assert.equal(isSavedGrowthPost({...planned,status:'manual_done'}),false)
  assert.equal(isSavedGrowthPost({...planned,status:'manual_done',manualDoneAt:'2026-10-20'}),false)
  const done=nextGrowthPost({current:planned,action:'complete_manual',now})
  assert.equal(isSavedGrowthPost({...done,manualDoneAt:'invalid'}),false)
  assert.equal(isSavedGrowthPost({...done,manualDoneAt:'2026-10-01T12:00:00.000Z'}),false)
  assert.equal(isSavedGrowthPost({...done,delivery:{provider:'telegram',messageId:1}}),false)
  assert.equal(isSavedGrowthPost({...planned,manualDoneAt:now.toISOString()}),false)
})

test('manual inbox sorts overdue, today and future using Toronto time and excludes completed posts',()=>{
  const overdue=post('2026-10-19T13:00:00.000Z')
  const today=post('2026-10-20T23:00:00.000Z')
  const future=post('2026-10-21T14:00:00.000Z')
  const completed=nextGrowthPost({current:post('2026-10-19T14:00:00.000Z'),action:'complete_manual',now})
  const approved=post('')
  const result=manualGrowthPostingInbox([future,approved,today,overdue,completed],now)
  assert.deepEqual(result.overdue.map(x=>x.id),[overdue.id])
  assert.deepEqual(result.today.map(x=>x.id),[today.id])
  assert.deepEqual(result.upcoming.map(x=>x.id),[future.id])
  assert.equal(result.manuallyCompleted,1)
  assert.equal(result.total,3)
  assert.equal(manualGrowthPostingInbox([]).total,0)
})

test('Toronto local day is not confused with UTC date near DST boundary',()=>{
  const today=post('2026-11-02T00:30:00.000Z')
  const result=manualGrowthPostingInbox([today],new Date('2026-11-01T22:00:00.000Z'))
  assert.equal(result.today.length,1)
  assert.equal(result.upcoming.length,0)
})

test('copy exact approved copy and UTM, never unapproved/private content',()=>{
  const planned=post('2026-10-20T14:00:00.000Z')
  const copy=manualGrowthCopyText(planned)
  assert.match(copy,/Discover a publicly available learning program/)
  assert.match(copy,/utm_source=instagram/)
  assert.match(copy,/utm_campaign=course_202610/)
  assert.equal(copy.includes('admin/clients'),false)
  assert.throws(()=>manualGrowthCopyText({...planned,status:'draft'}),/invalid_manual_handoff/)
  assert.throws(()=>manualGrowthCopyText(nextGrowthPost({current:planned,action:'complete_manual',now})),/invalid_manual_handoff/)
})

test('official external destinations are constant and never derive URLs from client input',()=>{
  for(const [provider,url] of Object.entries(MANUAL_DESTINATIONS)){
    assert.equal(manualGrowthDestination(provider),url)
    if(url){
      const parsed=new URL(url)
      assert.equal(parsed.protocol,'https:')
      assert.equal(parsed.username,'')
      assert.equal(parsed.password,'')
      assert.equal(parsed.hash,'')
    }
  }
  assert.equal(manualGrowthDestination('javascript:alert(1)'),null)
  assert.equal(manualGrowthDestination('https://malicious.invalid/'),null)
  assert.equal(manualGrowthDestination('mastodon'),null)
  assert.equal(manualGrowthDestination('wordpress'),null)
})

test('server manual completion requires authenticated owner, explicit confirmation and revision CAS',()=>{
  const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  assert.match(actions,/requireAdminRequest\(\)/)
  assert.match(actions,/input\.action === 'complete_manual' && input\.confirmed !== true/)
  assert.match(actions,/store\.save\(post,input\.expectedRevision\)/)
  const ui=readFileSync(new URL('../components/growth-studio.jsx',import.meta.url),'utf8')
  assert.match(ui,/window\.confirm\(preview\)/)
  assert.match(ui,/GrowthStudioManualInbox/)
})
