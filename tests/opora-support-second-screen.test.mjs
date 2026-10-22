import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {
  oporaExperienceSupport, oporaExperienceSupportValid, oporaExperienceGuide,
  oporaExperienceDay, oporaDailySkillBrief,
} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const back={en:'Back',ru:'Назад',es:'Atrás'}

test('support is authored for 14 days in EN/RU/ES, with no homework or performance question',()=>{
  assert.equal(oporaExperienceSupportValid(),true)
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceSupport(day,locale)
      assert.ok(copy?.title&&copy?.body,locale+' '+day)
      assert.doesNotMatch(copy.title+' '+copy.body,/\?|\b(how did that go|i tried it|you should|you must|your task|tarea|задание|оцените|сделайте|попробуйте)\b/iu)
    }
  }
  for(const invalid of [0,15,-1,1.5,null,undefined,'2']){
    assert.equal(oporaExperienceSupport(invalid),null)
  }
})

test('support is the SECOND visible screen of each of 14 days in all 3 languages, not a practice report',async()=>{
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
      const data={cycle:{id:'00000000-0000-4000-8000-000000001058',day,durationDays:14},lesson,programme:{id:'stress'},currentSession:null}
      let writes=0
      const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
        onSession:async()=>{writes++;return true}})
      try{
        const before=textOf(h.tree)
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        const supporting=nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']===day)
        assert.equal(supporting.length,1,'Missing supportive step '+locale+':'+day)
        assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,locale).title))
        assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,locale).body))
        assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,locale)),'Daily practice must be introduced before the exercise')
        assert.ok(nodes(h.tree).some(x=>x.props?.['data-opora-today-skill']==='true'),
          'Daily skill must be explicit on the post-mood briefing')
        assert.ok(!nodes(h.tree).some(x=>x.props?.['data-gentle-guidance']==='support'),'Support is not a hint')
        assert.equal(nodes(h.tree).filter(x=>x.props?.['aria-pressed']!==undefined).length,0,
          'No rating, answer, task confirmation or engagement choice on screen two')
        assert.equal(writes,0)
        findButton(h.tree,back[locale]).props.onClick();await h.settle()
        assert.equal(textOf(h.tree),before,'Back returns to unchanged arrival')
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        if(day!==1) assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,locale)),
          'Optional practice must still be available on screen three')
        assert.equal(writes,0,'Reading support must not persist practice or health data')
      }finally{h.unmount()}
    }
  }
})

test('the acceptance screen does not change backend visit-key shape',()=>{
  assert.deepEqual(OPORA_EXPERIENCE_PRE_SAVE_KEYS,
    ['arrive','practice','feel','affirmation','save'])
  assert.deepEqual(OPORA_DAY_ONE_RESTORED_KEYS,
    ['welcome','baseline','checkin','recall','affirmation','arrive','practice','feel','save'])
  for(const keys of [OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS]){
    assert.ok(!keys.includes('support'),'Support is not a fabricated lesson or practice signal')
  }
})


test('day 3 briefing recaps genuinely saved days 1–2, then states today's skill and concrete exercise',async()=>{
  for(const locale of ['en','ru','es']){
    const data={
      cycle:{id:'00000000-0000-4000-8000-000000001059',day:3,durationDays:14},
      lesson:lessonFor('calm_regulation',3,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7),
      programme:{id:'stress'},currentSession:null,
      roadmap:[
        {day:1,status:'completed',workbookSkill:'Saved skill one'},
        {day:2,status:'completed',workbookSkill:'Saved skill two'},
        {day:3,status:'current',workbookSkill:'Body regulation today'},
        {day:4,status:'upcoming',workbookSkill:'Future skill'},
      ],
    };
    const brief=oporaDailySkillBrief(3,locale,data.roadmap);
    assert.deepEqual(brief.previous.map(x=>x.day),[1,2]);
    assert.equal(brief.practice,oporaExperienceGuide(3,locale));
    assert.equal(brief.skill,locale==='es'?oporaExperienceDay(3,locale).title:'Body regulation today');

    let writes=0;
    const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
      onSession:async()=>{writes++;return true}});
    try{
      findButton(h.tree,next[locale]).props.onClick(); await h.settle();
      const card=nodes(h.tree).find(x=>x.props?.['data-opora-skill-briefing']===3);
      assert.ok(card,'Second screen must contain the skill recap');
      assert.deepEqual(nodes(card).filter(x=>x.props?.['data-opora-previous-skill-day']!==undefined)
        .map(x=>x.props['data-opora-previous-skill-day']),[1,2]);
      const all=textOf(card);
      assert.ok(all.includes(brief.previous[0].skill));
      assert.ok(all.includes(brief.previous[1].skill));
      assert.ok(all.includes(brief.skill));
      assert.ok(all.includes(brief.practice));
      assert.ok(!all.includes('Future skill'));
      const currentCard=nodes(card).find(x=>x.props?.['data-opora-today-skill']==='true');
      assert.ok(currentCard,'Main skill is not distinguishable from older skills');
      const currentText=textOf(currentCard);
      assert.ok(currentText.includes(brief.skill));
      assert.ok(currentText.includes(brief.practice));
      assert.equal(writes,0,'Orientation must not count as a performed practice');
    }finally{h.unmount()}
  }
});

test('unsaved, future and invalid course days are never claimed as previous skills',()=>{
  for(const locale of ['en','ru','es']){
    assert.equal(oporaDailySkillBrief(0,locale,[]),null);
    assert.equal(oporaDailySkillBrief(15,locale,[]),null);
    assert.deepEqual(oporaDailySkillBrief(1,locale,[]).previous,[]);
    const rows=[
      {day:1,status:'current',title:'NOT SAVED'},
      {day:2,status:'upcoming',title:'NOT FINISHED'},
      {day:3,status:'current',title:'TODAY'},
      {day:4,status:'completed',title:'LATER'},
    ];
    assert.deepEqual(oporaDailySkillBrief(3,locale,rows).previous,[],
      'No past day may be inferred completed from the current day number');
    const days=[...rows,{day:2,status:'completed',title:'DUPLICATE'}];
    assert.deepEqual(oporaDailySkillBrief(3,locale,days).previous,[],
      'A conflicting duplicate roadmap day must not grant completion');
  }
});

test('all 14 days, all locales: past recap never includes today/future or unsaved days',()=>{
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const rows=Array.from({length:14},(_,i)=>({
        day:i+1,status:i+1<day&&i%2===0?'completed':'upcoming',
        workbookSkill:'Skill '+(i+1),
      }));
      const recap=oporaDailySkillBrief(day,locale,rows);
      assert.ok(recap.skill&&recap.practice,locale+':'+day);
      assert.deepEqual(recap.previous.map(item=>item.day),
        rows.filter(item=>item.day<day&&item.status==='completed').map(item=>item.day));
      assert.ok(recap.previous.every(item=>item.day<day));
    }
  }
});
