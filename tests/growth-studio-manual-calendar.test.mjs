import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {nextGrowthPost} from '../lib/growth-studio/model.mjs'
import {
  torontoWallTimeToUtc,nextManualSlot,findManualTimeConflicts,buildManualCalendarIcs,
} from '../lib/growth-studio/manual-calendar.mjs'
function post({brand='holistic_house',channel='telegram',status='planned_manual',scheduledAt='2026-10-20T14:00:00.000Z',title='Public invitation'}={}){
 const draft=nextGrowthPost({action:'save',id:randomUUID(),fields:{brand,channel,locale:'en',title,
   caption:'Public information only',sourceUrl:'/en/academy',campaign:'academy_202610',
   scheduledAt,mediaUrl:'',mediaAlt:''},now:new Date('2026-10-19T12:00:00.000Z')})
 return {...draft,status}
}
test('Toronto local wall times respect EST/EDT and reject nonexistent or ambiguous DST time',()=>{
 assert.equal(torontoWallTimeToUtc('2026-10-20','10:00'),'2026-10-20T14:00:00.000Z')
 assert.equal(torontoWallTimeToUtc('2026-11-02','10:00'),'2026-11-02T15:00:00.000Z')
 assert.equal(torontoWallTimeToUtc('2026-03-08','02:30'),null)
 assert.equal(torontoWallTimeToUtc('2026-11-01','01:30'),null)
 assert.equal(torontoWallTimeToUtc('2026-11-01','02:30'),'2026-11-01T07:30:00.000Z')
 assert.equal(torontoWallTimeToUtc('2026-02-29','10:00'),null)
})
test('find next weekday slot within 45 days without claiming best times or external publish',()=>{
 const result=nextManualSlot({brand:'holistic_house',channel:'telegram',records:[],
   now:new Date('2026-10-20T12:00:00.000Z')})
 assert.equal(result.scheduledAt,'2026-10-20T14:00:00.000Z')
 assert.equal(result.delivery,'manual_only')
 assert.equal(result.timeZone,'America/Toronto')
})
test('same brand + channel conflicts are skipped, other channels do not collide',()=>{
 const blocked=post()
 const second=nextManualSlot({brand:'holistic_house',channel:'telegram',records:[blocked],
   now:new Date('2026-10-20T12:00:00.000Z')})
 assert.equal(second.scheduledAt,'2026-10-20T21:00:00.000Z')
 const unrelated=nextManualSlot({brand:'holistic_house',channel:'instagram',records:[blocked],
   now:new Date('2026-10-20T12:00:00.000Z')})
 assert.equal(unrelated.scheduledAt,'2026-10-20T14:00:00.000Z')
 assert.equal(findManualTimeConflicts({records:[blocked],brand:'holistic_house',channel:'telegram',
   scheduledAt:'2026-10-20T14:14:00.000Z'}).length,1)
 assert.equal(findManualTimeConflicts({records:[blocked],brand:'holistic_house',channel:'telegram',
   scheduledAt:'2026-10-20T14:15:00.000Z'}).length,0)
})
test('DST gap is skipped, not silently scheduled at a different hour',()=>{
 const result=nextManualSlot({brand:'holistic_house',channel:'telegram',records:[],
   now:new Date('2026-03-07T18:00:00.000Z'),weekdays:[0],
   times:['02:30','03:30']})
 assert.equal(result.scheduledAt,'2026-03-08T07:30:00.000Z')
})
test('manual .ics contains only planned tasks, no captions or provider-published claim',()=>{
 const planned=post({title:'Hello, world; this is an educational lesson'})
 const draft=post({status:'draft',title:'Not planned'})
 const published=post({status:'published',title:'Already sent'})
 const text=buildManualCalendarIcs([draft,planned,published],{now:new Date('2026-10-20T12:00:00.000Z')})
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,1)
 assert.match(text,/DTSTART:20261020T140000Z/)
 assert.match(text,/UID:/)
 assert.match(text,/BEGIN:VALARM/)
 assert.match(text,/NOT published or automatically scheduled/)
 assert.doesNotMatch(text,/Public information only|Not planned|Already sent/)
 assert.match(text,/MANUAL post/)
})
test('ICS calendar lines fold by UTF8 bytes, retain CRLF and escape punctuation',()=>{
 const item=post({title:'Русское объявление; и, немного очень длинного приветственного текста'})
 const raw=buildManualCalendarIcs([item],{now:'2026-10-20T12:00:00.000Z'})
 assert.ok(raw.endsWith('\r\n'))
 const encoder=new TextEncoder()
 for(const line of raw.split('\r\n'))if(line)assert.ok(encoder.encode(line).length<=75)
 assert.match(raw,/\\;/)
 assert.match(raw,/\\,/)
})
test('invalid planner parameters fail safely, calendar export does not contact network',()=>{
 assert.equal(nextManualSlot({brand:'unknown',channel:'telegram'}),null)
 assert.equal(nextManualSlot({brand:'holistic_house',channel:'telegram',times:['25:00']}),null)
 assert.throws(()=>buildManualCalendarIcs([],{reminderMinutes:-1}),/INVALID_MANUAL_CALENDAR/)
 assert.equal(findManualTimeConflicts({records:[],brand:'holistic_house',channel:'telegram',
    scheduledAt:'invalid'}).length,0)
})
