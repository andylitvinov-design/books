import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REMOTE_SUPPORT_DRAFT_KEY,readRemoteSupportDraft,formatRemoteSupportDraft,
  normalizeRemoteSupportBooking,
} from '../lib/practitioners/remote-energy-support.js'

const now=Date.parse('2027-01-16T14:00:00.000Z')
const booking={
  version:2,goal:'Energy and resources',method:'Usui Reiki',format:'asynchronous',
  duration:20,date:'2027-01-17',time:'14:00',timezone:'America/Toronto',
  startsAt:'2027-01-17T19:00:00.000Z',expectedPrice:45,expectedCurrency:'CAD',
}
const service={
  slug:'remote-energy-support',area_key:'energy_spiritual',status:'published',
  active:true,delivery_format:'online',pricing_mode:'fixed',
  confirmed_price:45,currency:'CAD',duration_minutes:20,
  discovery_metadata:{methods:['Usui Reiki'],priceOptions:[
    {duration:10,price:25},{duration:20,price:45},
    {duration:30,price:65},{duration:60,price:120},
  ]},
}
function rejects(input,s=service,at=now){
  assert.throws(()=>normalizeRemoteSupportBooking(input,s,at))
}
test('published practitioner price, format, UTC time and currency are server-authoritative',()=>{
  const result=normalizeRemoteSupportBooking(booking,service,now)
  assert.deepEqual({duration:result.duration,price:result.price,currency:result.currency},
    {duration:20,price:45,currency:'CAD'})
  assert.equal(result.startsAt,booking.startsAt)
  assert.equal(result.paymentStatus,'not_enabled')
  assert.equal(result.kind,'remote_energy_support')
})
test('10/20/30/60 options must be explicitly priced; never extrapolate',()=>{
  for(const [duration,price] of [[10,25],[20,45],[30,65],[60,120]]){
    assert.equal(normalizeRemoteSupportBooking({...booking,duration,expectedPrice:price},service,now).price,price)
  }
  rejects({...booking,duration:15})
  rejects({...booking,duration:60,expectedPrice:45})
  rejects({...booking,duration:10,expectedPrice:1})
  rejects({...booking,expectedCurrency:'EUR'})
  rejects({...booking,price:0})
})
test('unpublished and unapproved remote offerings cannot accept money claims',()=>{
  rejects(booking,{...service,status:'submitted'})
  rejects(booking,{...service,slug:'other'})
  rejects(booking,{...service,active:false})
  rejects(booking,{...service,pricing_mode:'contact'})
  rejects(booking,{...service,discovery_metadata:{methods:['Usui Reiki'],priceOptions:[]},duration_minutes:30})
  assert.equal(normalizeRemoteSupportBooking(booking,{...service,discovery_metadata:{methods:['Usui Reiki']}} ,now).price,45)
})
test('timezone/date consistency blocks DST-gap and forged timezone',()=>{
  rejects({...booking,timezone:'America/Vancouver'})
  rejects({...booking,timezone:'Asia/Invalid'})
  rejects({...booking,date:'2027-01-18'})
  const spring={...booking,date:'2027-03-14',time:'02:30',
    startsAt:'2027-03-14T07:30:00.000Z'}
  rejects(spring,service,Date.parse('2027-03-01T00:00:00.000Z'))
})
test('no backdated or distant booking; no arbitrary goal/method',()=>{
  rejects(booking,service,Date.parse('2027-01-18T00:00:00.000Z'))
  rejects(booking,service,Date.parse('2026-09-01T00:00:00.000Z'))
  rejects({...booking,method:'Not a published practitioner method'})
  rejects({...booking,goal:'Guaranteed recovery from a diagnosis'})
  rejects({...booking,format:'video-platform'})
})
test('only matching, recent, minimal scheduling preference is restored',()=>{
  const savedAt=now
  const draft={...booking,version:2,serviceId:'offering-id',practitioner:'Real Master',savedAt}
  const storage={getItem:key=>key===REMOTE_SUPPORT_DRAFT_KEY?JSON.stringify(draft):null}
  assert.equal(readRemoteSupportDraft(storage,'offering-id',now)?.expectedPrice,45)
  assert.equal(readRemoteSupportDraft(storage,'other-id',now),null)
  assert.equal(readRemoteSupportDraft(storage,'offering-id',now+2*24*3600*1000),null)
  assert.equal(formatRemoteSupportDraft(draft).includes('NOT yet confirmed'),false)
  assert.match(formatRemoteSupportDraft(draft),/not confirmed or paid/i)
})
