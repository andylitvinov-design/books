import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {validUuid} from '../../lib/clients/delivery-model.js'
import {parseReportProgressScore} from '../../lib/documents/report-progress.js'

const {parse}=createRequire(import.meta.url)('next/dist/compiled/babel/parser')
const ast=code=>parse(code,{sourceType:'module',plugins:['jsx']})
function nodes(root,predicate){
  const result=[]
  function visit(node){
    if(!node||typeof node!=='object')return
    if(predicate(node))result.push(node)
    for(const value of Object.values(node)){
      if(Array.isArray(value))value.forEach(visit)
      else if(value&&typeof value==='object')visit(value)
    }
  }
  visit(root);return result
}
function one(found,label){assert.equal(found.length,1,label);return found[0]}
const elements=(root,name)=>nodes(root,n=>n.type==='JSXElement'&&n.openingElement.name.name===name)
const attr=(node,name)=>node.openingElement.attributes.find(a=>a.type==='JSXAttribute'&&a.name.name===name)
const expression=(node,name)=>attr(node,name)?.value?.expression

export function assertSavedLocaleAssignment(code,fallback){
  const tree=ast(code)
  const binding=one(nodes(tree,n=>n.type==='VariableDeclarator'&&n.id.name==='reportLocale'),'one reportLocale binding')
  const assignments=nodes(tree,n=>n.type==='AssignmentExpression'&&n.left.name==='reportLocale')
  assert.equal(nodes(tree,n=>n.type==='UpdateExpression'&&n.argument.name==='reportLocale').length,0)
  let resolved=binding.init
  if(resolved?.type==='Identifier'){
    assert.equal(resolved.name,fallback,'only the requested locale may initialize the guest fallback')
    const assignment=one(assignments,'one saved report locale resolution')
    assert.equal(assignment.operator,'=')
    assert.ok(assignment.start>binding.end)
    resolved=assignment.right
  }else assert.equal(assignments.length,0,'resolved locale must not be overwritten')
  assert.equal(resolved?.type,'CallExpression');assert.equal(resolved.callee.name,'resolveSavedReportLocale')
  assert.deepEqual(resolved.arguments.map(a=>a.type==='Identifier'?a.name:null),['record',fallback])
}
export function assertProtectedConsultationForm(code){
  const tree=ast(code),form=one(elements(tree,'form'),'one consultation form')
  assert.equal(attr(form,'id')?.value?.value,'consultation-report-form')
  assert.equal(expression(form,'action')?.name,'submit')
  const handler=expression(form,'onSubmit')
  assert.equal(handler?.type,'ArrowFunctionExpression')
  const progress=one(nodes(tree,n=>n.type==='VariableDeclarator'&&n.id?.name==='progressScoresInvalid'),'one progress validation binding')
  const readProgress=new Function('parseReportProgressScore','progressBefore','progressAfter',
    `return (${code.slice(progress.init.start,progress.init.end)})`)
  for(const [before,after,invalid] of [
    ['', '', false], ['0', '10', false], ['6,5', '4.1', false],
    ['-1', '4', true], ['4', '11', true], ['3.25', '3', true],
    ['Infinity', '4', true], ['4', 'not a score', true],
  ]) assert.equal(readProgress(parseReportProgressScore,before,after),invalid,'both actual progress fields use strict score parsing')
  // Exhaust document, row and score states, including invoice-only saving.
  const flags=[false,true].flatMap(includeRecommendation=>[false,true].flatMap(includeInvoice=>
    [false,true].flatMap(validRows=>[false,true].flatMap(progressScoresInvalid=>
      [false,true].map(daoScoreInvalid=>({includeRecommendation,includeInvoice,validRows,progressScoresInvalid,daoScoreInvalid}))))))
  for(const uiLocale of ['ru','en']) for(const {includeRecommendation,includeInvoice,validRows,progressScoresInvalid,daoScoreInvalid} of flags){
    const errors=[],items=[],validation=[],prevented=[]
    const labels={noDocumentError:'NO_DOCUMENT',chooseError:'CHOOSE_REMEDY',progressError:'INVALID_PROGRESS'}
    const expectedError=!includeRecommendation&&!includeInvoice?labels.noDocumentError:
      includeRecommendation&&!validRows?labels.chooseError:
      includeRecommendation&&progressScoresInvalid?labels.progressError:
      includeRecommendation&&daoScoreInvalid?
        (uiLocale==='ru'?'Укажите балл У-син от 0 до 10 с одним знаком после запятой.':'Enter a Wu Xing score from 0 to 10 with at most one decimal place.') : ''
    const run=new Function('includeRecommendation','includeInvoice','validateConsultationRows','items','progressScoresInvalid','daoScoreInvalid','setError','labels','uiLocale',
      `return (${code.slice(handler.start,handler.end)})`)(includeRecommendation,includeInvoice,
      value=>{validation.push(value);return validRows},items,progressScoresInvalid,daoScoreInvalid,value=>errors.push(value),labels,uiLocale)
    run({preventDefault(){prevented.push(true)}})
    assert.equal(prevented.length,expectedError?1:0,'invalid submissions must be prevented exactly once')
    assert.deepEqual(errors,[expectedError],'preserve document → rows → progress → Dao rejection priority')
    assert.deepEqual(validation,includeRecommendation?[items]:[],'only recommendation submissions validate their own rows')
  }
  const binding=one(nodes(tree,n=>n.type==='VariableDeclarator'&&n.init?.callee?.name==='useActionState'),'one protected action binding')
  assert.deepEqual(binding.id.elements.map(n=>n.name),['state','submit','pending'])
  assert.equal(binding.init.arguments[0].name,'action')
}
export function assertOptionalClinicalFields(code){
  const details=one(elements(ast(code),'details').filter(n=>attr(n,'className')?.value?.value==='consultation-advanced-remedy'),'one optional remedy details block')
  assert.equal(attr(details,'open'),undefined,'details must start closed')
  one(elements(details,'summary'),'optional details need an accessible summary')
  one(nodes(details,n=>n.type==='CallExpression'&&n.callee?.object?.name==='consultationClinicalFields'&&n.callee?.property?.name==='map'),'saved clinical fields stay editable')
  const controls=[...elements(details,'input'),...elements(details,'textarea')]
  assert.equal(controls.length,3,'mapped text/input alternatives plus notes')
  for(const control of controls){
    const value=expression(control,'value')
    assert.equal(value?.type,'LogicalExpression');assert.equal(value.operator,'??')
    assert.equal(value.left?.object?.name,'item');assert.equal(value.right?.value,'')
    const change=expression(control,'onChange')
    assert.equal(change?.type,'ArrowFunctionExpression')
    const call=change.body
    assert.equal(call.type,'CallExpression');assert.equal(call.callee.name,'update')
    assert.equal(call.arguments[0].name,'index')
    const property=one(call.arguments[1].properties,'one edited saved field')
    assert.equal(property.computed,value.left.computed)
    assert.equal(property.key.name,value.left.property.name)
    assert.equal(property.value?.object?.object?.name,'event')
    assert.equal(property.value.object.property.name,'target');assert.equal(property.value.property.name,'value')
  }
}
export function assertStudioDeliveryOrder(code){
  const tree=ast(code),sections=elements(tree,'section')
  const byId=id=>one(sections.filter(n=>attr(n,'id')?.value?.value===id),id)
  const byLabel=(ru,en)=>one(sections.filter(n=>{
    const e=expression(n,'aria-label')
    return e?.type==='ConditionalExpression'&&e.test.name==='ru'&&e.consequent.value===ru&&e.alternate.value===en
  }),en)
  const detail=label=>one(elements(tree,'details').filter(n=>elements(n,'summary').some(s=>nodes(s,a=>a.type==='StringLiteral'&&a.value===label).length)) ,label)
  const blocks={
    first:byId('session-attached-report'),
    recorder:byLabel('Персональные записи консультации','Private session recordings'),
    personal:detail('Личное сопроводительное сообщение (необязательно)'),
    optional:detail('Дополнительные заметки и упражнения (необязательно)'),
    materials:byLabel('Общие материалы из библиотеки','Shared library materials'),
    publication:byId('session-publication'),
  }
  const positions=Object.fromEntries(Object.entries(blocks).map(([key,node])=>[key,node.start]))
  const order=Object.values(positions)
  assert.ok(order.every((value,index)=>index===0||value>order[index-1]),'report → private recordings → optional notes → shared Materials → publication')
  one(elements(blocks.materials,'SessionMaterialPicker'),'picker belongs to shared Materials')
  assert.equal(elements(tree,'SessionMaterialPicker').length,1,'one shared picker')
  return positions
}
export async function assertPrivateReportRedirect(code){
  const fn=one(nodes(ast(code),n=>n.type==='ExportDefaultDeclaration'),'one route export').declaration
  assert.equal(fn.type,'FunctionDeclaration');assert.equal(fn.async,true)
  const body=code.slice(fn.start,fn.end)
  const id='123e4567-e89b-42d3-a456-426614174000'
  const cases=[
    [true,{clientId:id},`/admin/consultations/new?clientId=${id}`],
    [true,{},'/admin/consultations/new'],
    [true,undefined,'/admin/consultations/new'],
    [true,{clientId:'not-a-uuid'},'/admin/consultations/new'],
    [true,{clientId:[id]},'/admin/consultations/new'],
    [false,{then(){throw new Error('unauthorized query read')}},'/admin/login'],
  ]
  for(const [authorized,query,url] of cases){
    const redirects=[],marker=Symbol('redirect'),checks=[]
    const route=new Function('redirect','requireAdminRequest','validUuid',body+`;return ${fn.id.name}`)(
      target=>{redirects.push(target);throw marker},async()=>{checks.push('auth');return authorized},validUuid)
    await assert.rejects(route({searchParams:query}),error=>error===marker)
    assert.deepEqual(checks,['auth']);assert.deepEqual(redirects,[url])
  }
}
