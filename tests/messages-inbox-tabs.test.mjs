import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {filterInboxRows,normalizeMessagesTab} from '../lib/app/messages-inbox-tabs.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the owner inbox separates Telegram/private conversations and website/client enquiries without copying rows',()=>{
  const rows=[
    {key:'crm:1',kind:'crm',lifecycle:'client',name:'Telegram Andy'},
    {key:'crm:5',kind:'crm',lifecycle:'lead',name:'Telegram business lead'},
    {key:'direct:2',kind:'direct',name:'Member Andy'},
    {key:'business:3',kind:'business',name:'Business request'},
    {key:'request:4',kind:'request',name:'Site consultation'},
  ]
  assert.deepEqual(filterInboxRows(rows,'chats').map(x=>x.key),['crm:1','direct:2'])
  assert.deepEqual(filterInboxRows(rows,'requests').map(x=>x.key),['crm:5','business:3','request:4'])
  assert.equal(filterInboxRows(rows,'chats').length+filterInboxRows(rows,'requests').length,rows.length)
  assert.strictEqual(filterInboxRows(rows,'requests')[0],rows[1])
  assert.deepEqual(filterInboxRows(rows,'requests',' business request ').map(x=>x.key),['business:3'])
  assert.deepEqual(filterInboxRows(rows,'chats','andy').map(x=>x.key),['crm:1','direct:2'])
  assert.deepEqual(filterInboxRows(rows,'requests','telegram').map(x=>x.key),['crm:5'])
  // An incoming Telegram service enquiry is a lead, not a duplicate chat row.
  assert.deepEqual(filterInboxRows(rows,'chats','no-match'),[])
  assert.deepEqual(filterInboxRows([], 'requests'),[])
  assert.deepEqual(filterInboxRows(null,'requests'),[])
  assert.equal(normalizeMessagesTab('unknown'),'chats')
  assert.equal(normalizeMessagesTab('requests'),'requests')
  assert.deepEqual(filterInboxRows([{kind:'unknown',name:'X'}],'requests'),[])
})

test('owner tabs are linked, accessible and URL-backed without unmounting chat state',()=>{
  const source=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  assert.match(source,/role="tablist" aria-label=\{t.tabs\}/)
  assert.match(source,/lifecycle:item\.lifecycle/)
  assert.match(source,/hidden=\{Boolean\(selected\)&&!inMessagesTab\(selected,tab\)\}/)
  assert.match(css,/\.detail\[hidden\]\{display:none!important\}/)
  assert.match(source,/aria-selected=\{tab===id\}/)
  assert.match(source,/role="tabpanel"/)
  assert.match(source,/aria-controls="hh-simple-list-panel"/)
  assert.match(source,/setTab\(normalizeMessagesTab\(query.get\('tab'\)\)\)/)
  assert.match(source,/url.searchParams.set\('tab','requests'\)/)
  assert.match(source,/url.searchParams.delete\('tab'\)/)
  assert.match(source,/setOpenDetail\(false\)/)
  assert.match(source,/\},\[openDetail\]\) \/\/ Tabs collapse/)
  assert.doesNotMatch(source,/switchTab=.*setSelectedKey\(''\)/s)
  for(const term of ["chats:'Inbox'","requestsTab:'Client requests'","chats:'Входящие'","requestsTab:'Заявки'","chats:'Recibidos'","requestsTab:'Solicitudes'"])
    assert.ok(source.includes(term),term)
  assert.match(css,/\.shell\[data-detail-open="true"\] \.tabs\{display:none\}/)
  assert.match(css,/\.tabs button\[aria-selected="true"\]/)
})
