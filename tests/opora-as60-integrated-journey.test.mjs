import test from 'node:test'
import assert from 'node:assert/strict'
import {
  oporaAs60Journey,oporaAs60JourneyValid,
  OPORA_EXPERIENCE_CHANNELS,OPORA_EXPERIENCE_SCENES,
} from '../lib/inner-growth/opora-as60-integrated-journey.js'
import {oporaAs60Day,OPORA_EXPERIENTIAL_EDITION} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const labels={ru:'Продолжить',en:'Continue',es:'Continuar'}
const make=(locale,day,session=null)=>{
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  let writes=0
  const h=mount('opora-experience-player',{
    locale,reviewOnly:Boolean(session),
    data:{cycle:{id:'00000000-0000-4000-8000-000000060000',day,durationDays:14},
      programme:{id:'stress'},lesson,currentSession:session},
    onClose(){},onFinish(){},async onSession(){writes++;return true},
  })
  return {h,getWrites:()=>writes}
}

test('AS-6.0 offers five original complementary channels for all 14 days in three languages',()=>{
  assert.equal(oporaAs60JourneyValid(),true)
  assert.deepEqual(OPORA_EXPERIENCE_CHANNELS,['body','emotion','mental','imagery','ritual'])
  assert.equal(OPORA_EXPERIENCE_SCENES.length,5)
  for(const locale of Object.keys(labels)){
    const copy=new Set()
    for(let day=1;day<=14;day++){
      const channel=oporaAs60Journey(day,locale)
      assert.equal(channel.day,day)
      for(const type of OPORA_EXPERIENCE_CHANNELS){
        assert.ok(channel[type].title)
        assert.ok(channel[type].text.length>=35)
        assert.ok(channel[type].hint)
        copy.add(type+':'+channel[type].text)
      }
      assert.ok(channel.mental.plan.length>=35)
    }
    assert.equal(copy.size,70)
  }
  assert.equal(oporaAs60Journey(0,'ru'),null)
  assert.equal(oporaAs60Journey(15,'ru'),null)
})

test('new AS-6.0 sessions present five optional channel cards and 3-step practice, without saving a click',async()=>{
  for(const locale of Object.keys(labels)){
    const {h,getWrites}=make(locale,1)
    try{
      await advanceOporaTo(h,'bodyExperience',labels[locale])
      const plan=oporaAs60Journey(1,locale)
      assert.ok(textOf(h.tree).includes(plan.body.text))
      let card=nodes(h.tree).find(node=>node.props?.['data-opora-experience-channel']==='body')
      assert.ok(card)
      await advanceOporaTo(h,'imageryMeditation',labels[locale])
      card=nodes(h.tree).find(node=>node.props?.['data-opora-experience-channel']==='imagery')
      assert.ok(card)
      assert.ok(textOf(h.tree).includes(plan.imagery.text))
      await advanceOporaTo(h,'practice',labels[locale])
      assert.ok(textOf(h.tree).includes(oporaAs60Day(1,locale).practice))
      assert.ok(nodes(h.tree).some(node=>node.props?.['data-opora-micro-step']===1))
      assert.equal(getWrites(),0)
      await advanceOporaTo(h,'ritualPractice',labels[locale])
      assert.ok(textOf(h.tree).includes(plan.ritual.text))
      assert.equal(getWrites(),0,'No attempt or session completion inferred from navigating channels')
    }finally{h.unmount()}
  }
})

test('AS-5.9 historical receipts never show AS-6.0 integrated scenes',async()=>{
  const stored={signals:{opora54:{answers:{experienceEdition:'as-5.9-seven-skills-v1'}}}}
  const {h}=make('en',2,stored)
  try{
    assert.equal(nodes(h.tree).some(node=>node.props?.['data-opora-practical-skills-version']===OPORA_EXPERIENTIAL_EDITION),false)
    await advanceOporaTo(h,'practice','Continue')
    assert.equal(nodes(h.tree).some(node=>node.props?.['data-opora-micro-experiment']===2),false)
  }finally{h.unmount()}
})
