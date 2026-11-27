import test from 'node:test'
import assert from 'node:assert/strict'
import {APPROVED_COURSE_SALES,courseOffer,coachCourseOffer,restoreCourseCart,quoteCourseCart,courseCartPath,courseCheckoutEnabled} from '../lib/commerce/course-cart.mjs'

const item=(id,amountMinor,extra={})=>({id,title:{en:id,ru:id,es:id},currency:'EUR',amountMinor,available:true,...extra})
const fixture=[item('one',1990),item('two',500),item('preview',1990,{available:false}),item('free',0)]
test('planned, free and unavailable courses do not become payable',()=>{
 assert.equal(APPROVED_COURSE_SALES.length,0)
 for(const id of ['clarity','business','love','health'])assert.equal(coachCourseOffer(id),null)
 assert.equal(courseOffer('one'),null)
 assert.deepEqual(restoreCourseCart('["coach-business"]'),[])
 assert.throws(()=>quoteCourseCart(['coach-business']))
})
test('course cart accepts only known payable SKUs and deduplicates storage',()=>{
 assert.deepEqual(restoreCourseCart('["one","preview","one","two","free","x"]',fixture),['one','two'])
 assert.deepEqual(restoreCourseCart('{"one":1990}',fixture),[])
 assert.equal(quoteCourseCart(['two','one'],'ru',fixture).totalMinor,2490)
 assert.throws(()=>quoteCourseCart(['one','one'],'en',fixture))
 assert.throws(()=>quoteCourseCart(['one','preview'],'en',fixture))
 assert.throws(()=>quoteCourseCart([{id:'one',amountMinor:1}],'en',fixture))
 assert.throws(()=>quoteCourseCart(['free'],'en',fixture))
 assert.equal(courseCartPath('ru',['one','two']),'/ru/cart?courses=one%2Ctwo')
})
test('activation requires each separate approval and respects PayPal kill switch',()=>{
 const approved={HH_COURSE_CHECKOUT_ENABLED:'true',HH_COURSE_CHECKOUT_SCHEMA_APPROVED:'true',HH_COURSE_CHECKOUT_FULFILLMENT_APPROVED:'true',HH_COURSE_PAYPAL_APPROVED:'true'}
 assert.equal(courseCheckoutEnabled({}),false)
 for(const key of Object.keys(approved))assert.equal(courseCheckoutEnabled({...approved,[key]:'false'}),false)
 assert.equal(courseCheckoutEnabled(approved),true)
 assert.equal(courseCheckoutEnabled({...approved,HH_PAYPAL_PERSONAL_DISABLED:'true'}),false)
})
