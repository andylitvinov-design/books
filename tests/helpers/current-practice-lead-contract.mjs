import assert from 'node:assert/strict'
import {returnedSource,opening,expression,ts} from './current-source-render.mjs'
export function assertCurrentPracticeLeadIsolation(source) {
  const {file,nodes}=returnedSource(source,'PracticeWorkspace')
  const matches=tag=>nodes.filter(node=>opening(node)?.tagName.getText(file)===tag)
  const crm=matches('CrmManager');assert.equal(crm.length,1,'Exactly one actual CRM mount')
  assert.ok(ts.isBinaryExpression(crm[0].parent),'CRM remains inside a conditional render expression')
  let crmGate=crm[0].parent
  while(ts.isBinaryExpression(crmGate.parent))crmGate=crmGate.parent
  assert.ok(ts.isJsxExpression(crmGate.parent),'CRM gate remains a direct child of returned JSX')
  for(const activePanel of ['clients','crm','services'])for(const isOwner of [false,true])for(const accountId of [null,'synthetic-account']){
    const rendered=expression(crmGate,file,{activePanel,isOwner,accountId,locale:'en',CrmManager:'crm'})
    const expected=activePanel==='crm'&&isOwner&&Boolean(accountId)
    assert.equal(rendered?.type==='crm',expected,'CRM requires selected panel AND owner AND account ID')
    if(expected){assert.equal(rendered.props.accountId,accountId);assert.equal(rendered.props.locale,'en')}
  }
  const profiles=matches('PractitionerClientProfiles');assert.equal(profiles.length,1,'One actual item-scoped client profile view')
  const requests=[{id:'synthetic-request-a',revision:7},{id:'synthetic-request-b',revision:12}],services=[],calls=[]
  const props=expression(profiles[0],file,{
    requests,services,data:{practitionerTasks:[],practitionerTaskSummary:null},locale:'en',accountId:'synthetic-account',busy:false,isOwner:false,focusRequestId:'',
    PractitionerClientProfiles:'profiles',openOwner:()=>{throw new Error('No administrative action is executed')},load:()=>{},
    act:fn=>fn(),practiceFetch:(path,payload)=>{calls.push([path,payload]);return null},
  }).props
  assert.equal(props.items,requests,'The view receives only its supplied service enquiries')
  assert.equal(props.services,services);assert.equal(props.isOwner,false);assert.equal(props.accountId,'synthetic-account')
  props.onStatus(requests[0],'contacted',{syntheticNote:'fixture'})
  props.onSaveContact(requests[1],{displayName:'Fictional contact'})
  assert.equal(calls.length,2)
  assert.equal(calls[0][0],'/requests/synthetic-request-a')
  assert.deepEqual({...calls[0][1]},{status:'contacted',syntheticNote:'fixture',expectedRevision:7})
  assert.equal(calls[1][0],'/requests/synthetic-request-b')
  assert.deepEqual({...calls[1][1]},{displayName:'Fictional contact'})
}
