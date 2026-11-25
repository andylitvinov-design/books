import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, nodes, course } from './helpers/course-ui-harness.mjs'

test('public add intent reuses verified capacity once without creating, charging or changing entitlement', async () => {
  for (const locale of ['en', 'ru']) for (const [tier, limit, count, enabled, allowed] of [
    ['free',1,1,true,false], ['start',1,1,true,false],
    ['advanced',5,2,true,true], ['premium',5,4,true,true],
    ['advanced',5,5,true,false], ['premium',5,5,true,false],
    ['premium',5,1,false,false],
  ]) {
    let added=0,opened=0
    const access={tier,activeCourseLimit:limit,activeCourseCount:count,multiCourseEnabled:enabled}
    const before=JSON.stringify(access)
    const props={accountId:'owner-a',locale,course:course('course-a',1),access,onAdd(){added++},onOpen(){opened++}}
    const h=mount('course-entry-selector',{search:'?add=1',props,fetcher(){throw Error('An intent must not request or mutate')}})
    await h.settle()
    const dialog=nodes(h.tree).find(node=>node.type==='dialog' && node.props['data-course-subscription-dialog']!==undefined)
    assert.equal(added,allowed?1:0);assert.equal(opened,0)
    assert.equal(dialog.props.ref.current.open,!allowed)
    dialog.props.ref.current.close();h.render({...props,onAdd(){added++}});await h.settle()
    assert.equal(added,allowed?1:0);assert.equal(dialog.props.ref.current.open,false)
    assert.equal(h.calls.length,0);assert.equal(JSON.stringify(access),before)
    h.unmount()
  }
})

test('an add URL cannot carry authority to another account or course, or promote later capacity', async () => {
  for(const change of ['account','course','capacity']){
    let added=0
    const props={accountId:'owner-a',course:course('course-a',1),access:{tier:'free',activeCourseLimit:1,activeCourseCount:1,multiCourseEnabled:true},onAdd(){added++},onOpen(){throw Error('No automatic creation')}}
    const h=mount('course-entry-selector',{search:'?add=1',props,fetcher(){throw Error('No intent request')}})
    await h.settle();nodes(h.tree).find(node=>node.type==='dialog' && node.props['data-course-subscription-dialog']!==undefined).props.ref.current.close()
    h.render({...props,accountId:change==='account'?'owner-b':props.accountId,course:change==='course'?course('course-b',1):props.course,
      access:{tier:'premium',activeCourseLimit:5,activeCourseCount:1,multiCourseEnabled:true}})
    await h.settle();assert.equal(added,0);assert.equal(h.calls.length,0)
    assert.equal(nodes(h.tree).find(node=>node.type==='dialog' && node.props['data-course-subscription-dialog']!==undefined).props.ref.current.open,false);h.unmount()
  }
})

test('missing initial identity or course cannot turn an old add intent into a new creation', async()=>{
  for(const initial of [{accountId:undefined,course:course('course-a',1)},{accountId:'owner-a',course:null}]){
    let added=0,opened=0
    const props={...initial,access:{tier:'premium',activeCourseLimit:5,activeCourseCount:1,multiCourseEnabled:true},onAdd(){added++},onOpen(){opened++}}
    const h=mount('course-entry-selector',{search:'?add=1',props,fetcher(){throw Error('No intent request')}})
    await h.settle();h.render({...props,accountId:'owner-b',course:course('course-b',1)});await h.settle()
    assert.equal(added,0);assert.equal(opened,0);assert.equal(h.calls.length,0);h.unmount()
  }
})

test('add intent is removed before leaving the selector and cannot reopen after remount',async()=>{
  for(const tier of ['free','advanced']){
    let added=0
    const props={accountId:'owner-a',course:course('course-a',1),access:{tier,activeCourseLimit:tier==='free'?1:5,activeCourseCount:1,multiCourseEnabled:true},onAdd(){added++},onOpen(){}}
    const h=mount('course-entry-selector',{search:'?courseId=course-a&add=1&from=public#my-plan',props,fetcher(){throw Error('No intent request')}})
    await h.settle();assert.equal(h.navigations.length,1)
    const consumed=new URL(h.navigations[0],'https://local.example')
    assert.equal(consumed.searchParams.has('add'),false);assert.equal(consumed.searchParams.get('courseId'),'course-a')
    assert.equal(consumed.searchParams.get('from'),'public');assert.equal(consumed.hash,'#my-plan')
    assert.equal(added,tier==='free'?0:1);h.unmount()
    const returned=mount('course-entry-selector',{search:consumed.search+consumed.hash,props,fetcher(){throw Error('No return request')}})
    await returned.settle();assert.equal(added,tier==='free'?0:1)
    assert.equal(nodes(returned.tree).find(node=>node.type==='dialog' && node.props['data-course-subscription-dialog']!==undefined).props.ref.current.open,false)
    assert.equal(returned.calls.length,0);returned.unmount()
  }
})
