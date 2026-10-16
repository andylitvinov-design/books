import test from 'node:test'
import assert from 'node:assert/strict'
import {mount,nodes,textOf,findButton,dailyView} from './helpers/course-ui-harness.mjs'
import * as model from '../lib/inner-growth/course-model.js'
const version='opora-trauma-1.3-20261015'
function view(moduleId='AS1'){
  return dailyView('course-a','cycle-a',{
    cycle:{id:'cycle-a',day:14,status:'completed',revision:1,durationDays:14,moduleId,moduleRouter:version,preferences:{},primaryGoal:'calm_regulation'},
    continuationGoals:['calm_regulation'],
    moduleMeasurements:{primaryMetric:'hh-module-finder::F2',retestAvailable:true,relevantItems:['F1','F2'],baseline:{answers:{F1:4,F2:5},measuredAt:'2026-10-01T12:00:00Z',locale:'en'},followUp:null,primaryComparison:{comparable:false,reason:'no_follow_up'}},
  })
}
function ui(locale='en'){
  const snapshot=view()
  const h=mount('course-today',{props:{locale,accountId:'owner-a',courseId:'course-a'},extraModules:{'@/lib/inner-growth/course-model':model},
    fetcher:async(_path,_options,body)=>body?{...snapshot,moduleMeasurements:{...snapshot.moduleMeasurements,retestAvailable:false}}:snapshot})
  return h
}
for(const locale of ['en','ru'])test(`F-primary ${locale} UI needs answer or explicit skip; safe next intake is reachable`,async()=>{
  const h=ui(locale);await h.settle()
  const saveLabel=locale==='ru'?'Сохранить итоговые оценки':'Save follow-up scores'
  assert.equal(findButton(h.tree,saveLabel).props.disabled,true)
  const sliders=nodes(h.tree).filter(node=>node.type==='input'&&node.props.type==='range')
  assert.equal(sliders.length,8)
  sliders[0].props.onChange({target:{value:'6'}});await h.settle()
  assert.equal(findButton(h.tree,saveLabel).props.disabled,true,'A secondary answer is insufficient')
  const explicit=nodes(h.tree).find(node=>node.type==='input'&&node.props.type==='checkbox')
  assert.ok(explicit);explicit.props.onChange({target:{checked:true}});await h.settle()
  assert.equal(findButton(h.tree,saveLabel).props.disabled,false)
  findButton(h.tree,saveLabel).props.onClick();await h.settle()
  const command=h.calls.find(call=>call.path.includes('/module-retest?'))
  assert.ok(command);assert.equal(command.body.primarySkipped,true)
  assert.equal(command.body.moduleAnswers.F2,null)
  findButton(h.tree,locale==='ru'?'Подробнее':'Details').props.onClick();await h.settle()
  const link=nodes(h.tree).find(node=>node.props?.href===`/${locale}/app/course?add=1&entry=personal`)
  assert.ok(link,'Existing course add-intake entry is an actual link')
  assert.match(textOf(h.tree),locale==='ru'?/новый вводный опрос/:/fresh intake/)
  h.unmount()
})
