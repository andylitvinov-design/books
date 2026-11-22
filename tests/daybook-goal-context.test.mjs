import test from 'node:test'
import assert from 'node:assert/strict'
import {journalGoalContext} from '../lib/app/daybook-goal-context.mjs'
test('no implicit goal selection or AI proposals presented as accepted goals',()=>{
 const data={goals:[{id:'a',title:'Active',status:'active'},{id:'p',title:'Proposal',status:'proposed'},{id:'c',title:'Completed',status:'completed'}],actions:[]}
 assert.deepEqual(journalGoalContext(data,null).goals.map(x=>x.id),['a'])
 assert.equal(journalGoalContext(data,null).selected,null)
 assert.deepEqual(journalGoalContext(data,'c').goals.map(x=>x.id),['a','c'])
 assert.equal(journalGoalContext(data,'missing').selected,null)
})
test('actions belong to explicit selected goal and require confirmed acceptance',()=>{
 const data={goals:[{id:'a',title:'Active',status:'active'}],actions:[
  {id:'yes',goalId:'a',status:'accepted',clientConfirmedAt:'2026-11-22T12:00:00Z',description:'A chosen step'},
  {id:'other',goalId:'b',status:'accepted',clientConfirmedAt:'2026-11-22T12:00:00Z',description:'Other goal'},
  {id:'proposed',goalId:'a',status:'proposed',clientConfirmedAt:null,description:'AI proposal'},
  {id:'done',goalId:'a',status:'completed',clientConfirmedAt:'2026-11-22T12:00:00Z',description:'Already done'},
  {id:'unconfirmed',goalId:'a',status:'accepted',clientConfirmedAt:null,description:'Not confirmed'},
 ]}
 assert.deepEqual(journalGoalContext(data,'a').actions.map(x=>x.id),['yes'])
 assert.deepEqual(journalGoalContext(data,null).actions,[])
 assert.deepEqual(journalGoalContext(null,null),{goals:[],selected:null,actions:[]})
})
