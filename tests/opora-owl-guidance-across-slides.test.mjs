import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,findButton} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const tips={en:'Show gentle guidance',ru:'Показать мягкую подсказку',es:'Ver una pista suave'}
const next={en:'Continue',ru:'Продолжить',es:'Continuar'}

test('owl has a local, network-free decorative illustration and the three versions of the exercise player share it',()=>{
  const owl=read('public/images/holistic-house/gentle-owl.svg')
  assert.match(owl,/<svg /)
  assert.match(owl,/viewBox="0 0 96 96"/)
  assert.doesNotMatch(owl,/<script|(?:href|src)=[\"']https?:\/\//i)
  for(const name of ['opora-experience-player','opora-v6-slide-player','course-slide-player']){
    const source=read('components/app/'+name+'.jsx')
    assert.match(source,/gentle-owl\.svg/)
    assert.match(source,/data-gentle-guidance/)
  }
})
for(const locale of ['en','ru','es']){
  test('experience player '+locale+' shows optional help and owl across all fourteen exercises, without saving a fake attempt',async()=>{
    for(let day=1;day<=14;day++){
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const data={cycle:{id:'00000000-0000-4000-8000-000000001057',day,durationDays:14},lesson,programme:{id:'stress'},currentSession:null}
      let saves=0
      const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},onSession(){saves++;return true}})
      try{
        for(let i=0;i<(day===1?7:2);i++){findButton(h.tree,next[locale]).props.onClick();await h.settle()}
        const section=nodes(h.tree).find(n=>n.props?.['data-gentle-guidance']==='practice')
        assert.ok(section,'missing practice guidance on '+locale+' day '+day)
        assert.ok(nodes(section).some(n=>n.type==='img'&&n.props?.src==='/images/holistic-house/gentle-owl.svg'))
        const button=findButton(h.tree,tips[locale])
        assert.ok(button)
        assert.equal(button.props['aria-expanded'],false)
        button.props.onClick();await h.settle()
        assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-optional-guidance']==='true'))
        assert.equal(saves,0)
      }finally{h.unmount()}
    }
  })
  test('additional helpful moments are voluntary and reset when advancing ('+locale+')',async()=>{
    const day=2,lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    const h=mount('opora-experience-player',{locale,data:{cycle:{day},lesson,programme:{id:'stress'},currentSession:null},
      onClose(){},onFinish(){},onSession(){throw new Error('unexpected write')}})
    try{
      for(const moment of ['arrive','support','practice','feel','affirmation','save']){
        // The pure acceptance slide is deliberately not a hint or another exercise.
        if(moment==='support')assert.ok(!nodes(h.tree).some(n=>n.props?.['data-gentle-guidance']))
        if(['arrive','practice','feel','save'].includes(moment)){
          assert.ok(nodes(h.tree).some(n=>n.props?.['data-gentle-guidance']===moment),moment)
          const button=findButton(h.tree,tips[locale]);assert.ok(button)
          button.props.onClick();await h.settle()
          assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-optional-guidance']==='true'))
        }
        if(moment!=='save'){
          findButton(h.tree,next[locale]).props.onClick();await h.settle()
          assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-optional-guidance']==='true').length,0)
        }
      }
    }finally{h.unmount()}
  })
}
