import test from 'node:test'
import assert from 'node:assert/strict'
import {mount,nodes,textOf,account,access} from './helpers/course-ui-harness.mjs'

test('real first-week component renders seven topics and never invokes consent during render', async()=>{
  for(const locale of ['en','ru','es']){
    let accepts=0
    const h=mount('opora-first-week-invite',{props:{locale,onAccept(){accepts++}},fetcher(){assert.fail('No request allowed')}})
    await h.settle()
    assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-preview-day']!==undefined).length,7)
    const button=nodes(h.tree).find(n=>n.props?.['data-opora-week-one-accept']!==undefined)
    assert.equal(button.type,'button')
    assert.equal(button.props.disabled,false)
    assert.ok(textOf(button).trim())
    assert.equal(accepts,0)
    assert.equal(h.calls.length,0)
    button.props.onClick()
    assert.equal(accepts,1)
    h.unmount()
  }
})

test('real course parent shows the actual invite without implicit POST or enrolment', async()=>{
  const h=mount('my-course',{props:{data:account('synthetic-owner'),locale:'en'},search:'?program=stress',
    fetcher:()=>({course:null,courses:[],assessments:{},access:{...access,activeCourseCount:0}})})
  await h.settle()
  const buttons=nodes(h.tree).filter(n=>n.props?.['data-opora-fast-consent']!==undefined)
  assert.equal(buttons.length,1)
  assert.match(textOf(buttons[0]),/Yes, I'd like to enrol/)
  assert.equal(h.calls.filter(call=>call.body).length,0)
  await h.settle()
  assert.equal(h.calls.filter(call=>call.body).length,0)
  h.unmount()
})

test('actual invite preserves disabled and busy button guards without accepting', async()=>{
  for(const flags of [{disabled:true},{busy:true}]){
    let accepts=0
    const h=mount('opora-first-week-invite',{props:{...flags,onAccept(){accepts++}},fetcher(){assert.fail('No request allowed')}})
    await h.settle()
    const button=nodes(h.tree).find(n=>n.props?.['data-opora-week-one-accept']!==undefined)
    assert.equal(button.props.disabled,true)
    assert.equal(accepts,0)
    h.unmount()
  }
})
