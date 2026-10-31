test('provider leads and account-bound requests appear in the real chat without duplicating rows',()=>{
  const rows=[
    {key:'crm:1',kind:'crm',lifecycle:'client',name:'Telegram Andy'},
    {key:'crm:5',kind:'crm',lifecycle:'lead',name:'Telegram service lead'},
    {key:'direct:2',kind:'direct',name:'Member Andy'},
    {key:'business:3',kind:'business',name:'Business request'},
    {key:'request:4',kind:'request',name:'Site consultation',item:{requestKind:'account'}},
    {key:'request:6',kind:'request',name:'Public guest enquiry',item:{requestKind:'public'}},
  ]
  const chats=filterInboxRows(rows,'chats')
  const requests=filterInboxRows(rows,'requests')
  assert.deepEqual(chats.map(x=>x.key),['crm:1','crm:5','direct:2','request:4'])
  assert.deepEqual(requests.map(x=>x.key),['crm:5','business:3','request:4','request:6'])
  assert.equal(new Set(chats.map(x=>x.key)).size,chats.length)
  assert.equal(new Set(requests.map(x=>x.key)).size,requests.length)
  assert.strictEqual(chats[1],requests[0],'one CRM thread, not a copied lead')
  assert.strictEqual(chats[3],requests[2],'one account-bound conversation, not a copied request')
  assert.deepEqual(filterInboxRows(rows,'chats','public guest'),[])
  assert.deepEqual(filterInboxRows(rows,'requests','business request').map(x=>x.key),['business:3'])
  assert.deepEqual(filterInboxRows(rows,'chats','andy').map(x=>x.key),['crm:1','direct:2'])
  assert.deepEqual(filterInboxRows(rows,'chats','telegram').map(x=>x.key),['crm:1','crm:5'])
  assert.deepEqual(filterInboxRows(rows,'requests','telegram').map(x=>x.key),['crm:5'])
  assert.deepEqual(filterInboxRows(rows,'chats','no-match'),[])
  assert.deepEqual(filterInboxRows([], 'requests'),[])
  assert.deepEqual(filterInboxRows(null,'requests'),[])
  assert.equal(normalizeMessagesTab('unknown'),'chats')
  assert.equal(normalizeMessagesTab('requests'),'requests')
  assert.deepEqual(filterInboxRows([{kind:'unknown',name:'X'}],'requests'),[])
  assert.deepEqual(filterInboxRows([{kind:'request',name:'Incomplete'}],'chats'),[])
})

test('owner tabs are linked, accessible and URL-backed without unmounting chat state',()=>{
  const source=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  assert.match(source,/role="tablist" aria-label=\{t.tabs\}/)
  assert.match(source,/lifecycle:item\.lifecycle/)
  assert.match(source,/hidden=\{Boolean\(selected\)&&!embedded&&!inMessagesTab\(selected,tab\)\}/)
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
  for(const term of ["chats:'Conversations'","requestsTab:'Requests'","chats:'Переписка'","requestsTab:'Заявки'","chats:'Recibidos'","requestsTab:'Solicitudes'"])
    assert.ok(source.includes(term),term)
  assert.match(css,/\.shell\[data-detail-open="true"\] \.tabs\{display:none\}/)
  assert.match(css,/\.tabs button\[aria-selected="true"\]/)
})
