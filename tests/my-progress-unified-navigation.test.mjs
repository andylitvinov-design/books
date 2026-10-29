import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildMyProgress } from '../lib/app/my-progress.mjs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const at = day => '2026-10-' + day + 'T11:00:00.000Z'

test('mobile My Progress opens the signed-in account route, not a transient support-page anchor', () => {
  const support = source('components/holistic-support-mobile.tsx')
  const app = source('components/app/app-workspace.jsx')
  const auth = source('app/api/app/[...path]/route.js')
  assert.match(support, /data-support-mobile-progress-link/)
  assert.match(support, /href=\{accountProgressHref\}/)
  assert.match(support, /data-support-open-account-progress/)
  assert.doesNotMatch(support, /<a href="#support-progress">/)
  assert.match(support, /progress:\s*"На этом экране"/)
  assert.match(support, /locale === "es" \? "en" : locale/)
  assert.match(app, /page === 'progress' \? \{ continueTo: 'progress' \}/)
  assert.match(app, /page === 'progress' && <MyProgress/)
  assert.match(auth, /continueTo === 'progress'/)
  assert.match(auth, /app\/progress/)
  assert.match(auth, /INVALID_CONTINUATION/)
  assert.match(auth, /validPracticeContinuation/)
  assert.match(auth, /requireSameOrigin/)
})

test('account progress is organized by site rubrics, with horizontal newest-first history and no fabricated watch progress', () => {
  const page = source('components/app/my-progress.jsx')
  const css = source('components/app/my-progress.module.css')
  for (const phrase of ['data-my-progress', 'data-progress-existing-function-links',
    'data-progress-topic-filters', 'data-progress-horizontal-history', 'hh-progress-watch-title',
    'hh-progress-mandalas-title', 'hh-progress-activity-title']) {
    assert.ok(page.includes(phrase), phrase)
  }
  assert.match(page, /const TOPIC_IDS=\['all','energy','money','relationships','meaning'\]/)
  assert.match(page, /selectedTopic===id/)
  assert.match(page, /rubrics\.length \? rubrics\.map/)
  assert.match(page, /aria-expanded=\{historyExpanded\}/)
  assert.match(page, /historyExpanded && <>/)
  assert.match(page, /'messages\/my-orders'/)
  assert.match(page, /\/practice\?panel=services/)
  assert.match(page, /\/messages\?section=orders/)
  assert.match(css, /\.rubricRail/)
  assert.match(css, /grid-auto-flow:column/)
  assert.match(css, /scroll-snap-type:x proximity/)
  assert.match(css, /@media\(max-width:750px\)/)
  assert.match(css, /@media\(max-width:350px\)/)
  assert.doesNotMatch(page, /autoplay=1/)
})

test('old account requests and new order inbox are deduplicated and never mix private notes into card metadata', () => {
  const out = buildMyProgress({
    bootstrap: {
      results:[{id:'r1',definitionKey:'hh-resource-pulse',measurementAt:at('19'),answers:{secret:'HIDDEN_ANSWERS'}}],
      requests:[{id:'order1',status:'requested',createdAt:at('20'),message:'HIDDEN_MESSAGE'}],
    },
    orders:{orders:[
      {id:'order1',status:'contacted',createdAt:at('20'),unread:2,message:'HIDDEN_MESSAGE'},
      {id:'order2',status:'confirmed',createdAt:at('24')},
    ]},
    growth:{
      courses:[{id:'course1',focusTags:['energy','work'],status:'active',updatedAt:at('25'),
        completedLessons:3,durationDays:14,goals:['HIDDEN_GOAL']}],
      course:{id:'course1',focusTags:['energy'],dayCompletions:{
        '1':{completedAt:at('21')},
      }},
    },
    videos:{videos:[{id:'mandala1',status:'ready',theme:'relationships',readyAt:at('22')},
      {id:'not-uploaded',status:'pending',createdAt:at('27')}]},
    videoProgress:{records:[{videoId:'abcdefghijk',title:'Verified public lesson',status:'watched',markedAt:at('26')}]},
    topicsOfTest:()=>['body','relationships','some-unrecognized-topic'],
    videoTopics:{abcdefghijk:['energy']},
    locale:'ru',
  })
  assert.equal(out.entries.filter(item=>item.category==='services').length,2)
  assert.equal(out.entries.find(item=>item.id==='services:order1').status,'contacted')
  assert.match(out.entries.find(item=>item.id==='services:order1').href,/\/messages\?section=orders&order=order1/)
  assert.match(out.entries.find(item=>item.id==='services:order1').detail,/Новые сообщения: 2/)
  assert.deepEqual(out.entries.find(item=>item.id==='tests:r1').topics,['energy','relationships'])
  assert.deepEqual(out.entries.find(item=>item.id==='courses:course1').topics,['energy','money'])
  assert.deepEqual(out.entries.find(item=>item.id==='mandalas:mandala1').topics,['relationships'])
  assert.deepEqual(out.entries.find(item=>item.id==='videos:abcdefghijk').topics,['energy'])
  assert.equal(out.totals.mandalas,1)
  assert.equal(out.totals.watchedVideos,1)
  assert.equal(out.totals.practices,1)
  assert.ok(!out.entries.some(item=>item.id.includes('not-uploaded')))
  assert.ok(out.entries.every((item,index,all)=>index===0||Date.parse(all[index-1].at)>=Date.parse(item.at)))
  for (const secret of ['HIDDEN_ANSWERS','HIDDEN_MESSAGE','HIDDEN_GOAL']) {
    assert.equal(JSON.stringify(out).includes(secret),false)
  }
})

test('practitioner offerings stay behind original private Practice; client order lists are separate from CRM client profiles', () => {
  const progress=source('components/app/my-progress.jsx')
  const inbox=source('app/api/app/messages/my-orders/route.js')
  const support=source('components/holistic-support-mobile.tsx')
  assert.match(progress, /Boolean\(data\?\.practitioner\|\|data\?\.practice\)/)
  assert.match(progress, /profileShortcut/)
  assert.match(progress, /servicesShortcut/)
  assert.match(progress, /ordersShortcut/)
  assert.match(progress, /messagesShortcut/)
  assert.match(inbox, /auth\.verified\(\)/)
  assert.match(inbox, /myOrderInbox\(actor\)/)
  assert.doesNotMatch(progress, /appFetch\('crm\//)
  assert.match(support, /Шкалы, фото и история просмотра не отправляются на сервер/)
  assert.match(support, /const markCurrentVideoWatched = async/)
  assert.match(support, /data-support-account-video-mark/)
  assert.match(support, /status: "watched"/)
  assert.match(support, /response.status === 401/)
  assert.match(support, /savedVideos.includes\(selected.id\)/)
  // Only the explicit self-confirmation saves video progress; Play remains local.
  const onPlay = support.slice(support.indexOf('const startVideo = () =>'), support.indexOf('const markCurrentVideoWatched'))
  assert.doesNotMatch(onPlay, /video-progress|fetch\(/)
})
