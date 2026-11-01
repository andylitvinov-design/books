import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {COURSE_ANTISTRESS_SKILLS_V6,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {oporaExperienceDay,oporaExperienceGuidesValid,oporaExperienceSupportValid,oporaExperienceTransferChoices} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaGentleCopy} from '../lib/inner-growth/opora-gentle-journey.js'
import {oporaEndingCopy} from '../lib/inner-growth/opora-lesson-outro.js'
import {oporaAs58Valid,OPORA_PRIMARY_EMOTIONS} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaAs60Day} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60VariedDay} from '../lib/inner-growth/opora-as60-varied-content.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS,buildCourseSlides,verifyCourseSlideVisitOrder} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const t={
  en:{next:'Continue',start:'I will try this step',try:'I tried it',
    unchanged:'About the same',vote:'Need to think',
    save:'Save my practice',saved:'Your moment is saved',noPlan:'Not today',plan:'I might try this',
    pause:'Pause',return:'Go back'},
  ru:{next:'Продолжить',start:'Я попробую этот шаг',try:'Я попробовал(а)',
    unchanged:'Примерно так же',vote:'Нужно подумать',
    save:'Сохранить мою практику',saved:'Ваш момент сохранён',noPlan:'Не сегодня',plan:'Попробую позже',
    pause:'Пауза',return:'Вернуться'},
}
function fixture(locale='en',day=1){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000001056',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let payload=null,requests=0
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
    onSession:async value=>{requests++;payload=structuredClone(value);return true}})
  return {h,lesson,get payload(){return payload},get requests(){return requests}}
}
async function click(h,label){
  const control=findButton(h.tree,label)
  assert.ok(control,'Missing '+label+' in '+textOf(h.tree).slice(0,450))
  control.props.onClick()
  await h.settle()
}

test('day one restores five opening screens and all days add untracked support at step two',async()=>{
  assert.deepEqual([...OPORA_EXPERIENCE_PRE_SAVE_KEYS],['arrive','practice','feel','affirmation','save'])
  assert.deepEqual([...OPORA_DAY_ONE_RESTORED_KEYS],
    ['welcome','baseline','checkin','recall','affirmation','arrive','practice','feel','save'])
  assert.equal(oporaExperienceGuidesValid(),true)
  assert.equal(oporaAs58Valid(),true)
  assert.equal(oporaExperienceSupportValid(),true)
  for(const lang of ['ru','en'])for(let day=1;day<=14;day++){
    const f=fixture(lang,day),h=f.h,d=t[lang]
    if(day===1){
      assert.match(textOf(h.tree),lang==='ru'?/Как вы себя чувствуете сегодня/:/How are you feeling today/)
      // Reuse the original four personal responses and their tailored support.
      const choice=lang==='ru'?'Чувствую напряжение':'I feel tense'
      await click(h,choice)
      assert.match(textOf(h.tree),lang==='ru'?/Не нужно сразу менять своё состояние/:/Nothing needs to change right away/)
      await click(h,d.next)
      assert.ok(textOf(h.tree).includes(oporaAs60VariedDay(day,lang).purpose))
      assert.ok(!findButton(h.tree,d.try),'No exercise reporting on support screen')
      await click(h,d.next)
      assert.match(textOf(h.tree),lang==='ru'?/Насколько вы сейчас чувствуете внутреннюю опору/:/How much inner support do you feel/)
      await click(h,'4')
      await click(h,d.next)
      assert.match(textOf(h.tree),lang==='ru'?/Насколько сильным было беспокойство/:/How strong was your concern/)
      await click(h,'5')
      await click(h,d.next)
      assert.match(textOf(h.tree),lang==='ru'?/Вспомним знакомую опору/:/Remember what helps/)
      await click(h,lang==='ru'?'Короткая пауза':'A short pause')
      await click(h,d.next)
      assert.match(textOf(h.tree),lang==='ru'?/Мысль сегодняшнего дня/:/A thought for today/)
      await click(h,d.vote)
      await click(h,d.next)
    }
    assert.match(textOf(h.tree),lang==='ru'?(day===1?/Упражнение № 1/:/Как вы сейчас себя чувствуете/):
      (day===1?/Exercise 1/:/How are you feeling right now/))
    if(day===1)await click(h,lang==='ru'?'Да, готов(а)':"Yes, I’m ready")
    else await click(h,d.next)
    if(day!==1){
      assert.ok(textOf(h.tree).includes(oporaAs60VariedDay(day,lang).purpose))
      assert.ok(!findButton(h.tree,d.try),'Step two must never ask for practice proof')
      await advanceOporaTo(h,'recapPractice',d.next)
    }
    // The same practice overview appears before (not after) the activity,
    // with a clear purpose in the learner's language, never an attempt claim.
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-practice-overview']===day))
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-overview-purpose']==='true'))
    const goal=day===1?oporaAs60VariedDay(day,lang).purpose:oporaAs60VariedDay(day,lang).result
    assert.ok(textOf(h.tree).includes(goal))
    assert.ok(textOf(h.tree).includes(oporaAs60VariedDay(day,lang).practice))
    assert.ok(!findButton(h.tree,d.try),'Overview is an invitation, not a practice report')
    await advanceOporaTo(h,'practice',d.next)
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-current-screen']==='practice'))
    // Practical work always comes after the voluntary acceptance and overview.
    assert.ok(textOf(h.tree).includes(oporaAs60VariedDay(day,lang).practice))
    assert.ok(!nodes(h.tree).some(n=>n.props?.['data-opora-guided-meditation']==='true'),
      'Early meditation must not appear on an everyday practice card')
    assert.ok(!nodes(h.tree).some(n=>n.props?.['data-opora-inline-practice-audio']==='true'),
      'No expandable timer remains in the daily practice')
    if(day===11){
      const picker=nodes(h.tree).find(n=>n.props?.['data-opora-emotion-picker']==='true')
      assert.ok(picker,'Day 11 has an optional eight-emotion vocabulary')
      assert.equal(nodes(picker).filter(n=>n.type==='button').length,8)
      await click(h,lang==='ru'?'Грусть':'Sadness')
    }
    await click(h,d.try)
    await advanceOporaTo(h,'feel',d.next)
    await click(h,d.unchanged)
    await click(h,d.next)
    if(day!==1){
      assert.ok(textOf(h.tree).includes(oporaAs60Day(day,lang).quote))
      await click(h,d.vote)
      await click(h,d.next)
    }
    // Only one aphorism/feedback appears. This distinct screen asks for
    // a concrete future action, never another inspirational statement.
    const options=oporaExperienceTransferChoices(day,lang)
    // Newly authored lessons use the variety-v1 overlay for days 2 and 9.
    // Assert the effective learner-facing copy, not the historical base wording.
    const daily=oporaAs60VariedDay(day,lang)
    const spokenFeeling=lang==='ru'?'Спокойствие':'Calm'
    const transferText=textOf(h.tree)
    assert.ok(transferText.includes(daily.transfer),
      'One specific future task per day and locale')
    assert.ok(!transferText.includes(options[0].label) &&
      !transferText.includes(options[1].label),
      'Historic alternatives cannot appear in the new learner UI')
    assert.ok(nodes(h.tree).filter(n=>n.props?.['data-opora-single-transfer']===day).length===1)
    if(day===4){
      const field=nodes(h.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true')
      assert.ok(field,'Day 4 has an optional emotion field')
      assert.equal(field.props.maxLength,60)
      assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-emotion-picker']==='true').length,1)
      assert.equal(nodes(h.tree).filter(n=>n.type==='button'&&
        OPORA_PRIMARY_EMOTIONS.some(e=>e.label[lang]===textOf(n))).length,8)
      field.props.onChange({target:{value:spokenFeeling}})
      await h.settle()
    }else await click(h,d.plan)
    assert.ok(!textOf(h.tree).includes(oporaExperienceDay(day,lang).reminder))
    assert.ok(!textOf(h.tree).includes(f.lesson.aphorism))
    await click(h,d.next)
    // Each takeaway now has its own screen; the practice preview was earlier.
    assert.match(textOf(h.tree),lang==='ru'?/Что вы освоили сегодня/:/What you learned today/)
    assert.ok(textOf(h.tree).includes(daily.result))
    assert.ok(!textOf(h.tree).includes(daily.practice))
    await click(h,d.next)
    assert.ok(textOf(h.tree).includes(daily.transfer))
    assert.ok(!nodes(h.tree).some(n=>n.props?.['data-opora-practice-overview']===day),
      'Practice preview must not repeat after the actual exercise')
    if(day===4)assert.ok(textOf(h.tree).includes(spokenFeeling))
    await click(h,d.next)
    if(day===14){
      assert.equal(nodes(h.tree).some(n=>n.props?.['data-opora-final-meditation']==='day-14'),false,
        'AS-6.0 already offers one imagery meditation; no duplicate closing track')
    }
    assert.ok(textOf(h.tree).includes(lang==='ru'?'Как вам было?':'How was this for you?'))
    await click(h,lang==='ru'?'Получилось немного':'I managed a little')
    assert.equal(f.requests,0,'No save until the recap is explicitly completed')
    await click(h,d.save)
    assert.equal(f.requests,1,'Exactly one save for '+lang+' day '+day)
    assert.equal(f.payload.lessonId,f.lesson.id)
    assert.equal(f.payload.practiceWindow,'practice_v6')
    assert.deepEqual(f.payload.visitedSlideKeys,
      day===1?[...OPORA_DAY_ONE_RESTORED_KEYS]:[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
    assert.deepEqual(validateOpora54Signals(f.payload.opora54).answers,f.payload.opora54.answers)
    assert.equal(f.payload.opora54.answers.act,undefined)
    assert.equal(f.payload.opora54.answers.actChoice,undefined)
    assert.equal(f.payload.opora54.answers.reflection,'unchanged')
    assert.equal(f.payload.opora54.answers.aphorism,'unsure')
    assert.equal(f.payload.opora54.answers.transfer,'planned')
    assert.equal(f.payload.opora54.answers.transferChoice,'two')
    assert.equal(f.payload.opora54.answers.transferFeeling,undefined)
    assert.equal(f.payload.opora54.answers.transferPlanVersion,'one-v1')
    assert.equal(f.payload.opora54.answers.experienceEdition,'as-6.0-experiments-v1')
    assert.deepEqual(f.payload.practiceEmotion,day===4?{customText:spokenFeeling}:
      day===11?{choice:'sadness'}:undefined)
    assert.equal(f.payload.opora54.answers.lessonConfidence,'some')
    assert.equal(f.payload.practiceAttempt,'tried')
    if(day===1){
      assert.equal(f.payload.welcomeFeeling,'tense')
      assert.deepEqual(f.payload.oporaOpening,
        {resource:4,lastDayDifficulty:5,familiarSupport:'pause'})
    }else{
      assert.equal(f.payload.oporaOpening,undefined)
      // Skipping the optional mood choice is represented as null, never a fabricated feeling.
      assert.equal(f.payload.welcomeFeeling,null)
    }
    assert.ok(textOf(h.tree).includes(oporaEndingCopy(lang).congratsLead),'Saved receipt uses current supportive wording')
    assert.ok(textOf(h.tree).includes(daily.transfer),'Confirmed receipt shows the one selected step')
    assert.match(textOf(h.tree),lang==='ru'?/Поздравляем/:/Congratulations/)
    assert.ok(!findButton(h.tree,lang==='ru'?'Послушать волны':'Relax with waves'),
      'The inline grounding timer must not repeat after congratulations')
    await click(h,lang==='ru'?'Посмотреть, что дальше':"See what's next")
    // A single long route replaces the duplicated 3-day teaser and two
    // disconnected weekly lists. All 14 previews remain visible and read-only.
    const map=nodes(h.tree).find(n=>n.props?.['data-opora-course-map']==='all-14-days')
    assert.ok(map,'The whole route must be visible after a confirmed save')
    const cards=nodes(map).filter(n=>n.props?.['data-opora-journey-day']!==undefined)
    assert.equal(cards.length,14,'All 14 days in one scrollable path')
    for(let n=1;n<=14;n++){
      const card=cards.find(node=>node.props['data-opora-journey-day']===n)
      assert.ok(card,'Missing day '+n)
      assert.ok(textOf(card).includes(oporaAs60Day(n,lang).title))
      assert.ok(textOf(card).includes(oporaAs60Day(n,lang).practice))
      assert.equal(card.props['data-day-status'],
        n<=day?'completed':n===day+1?'next':'locked')
    }
    assert.ok(textOf(map).includes(lang==='ru'?'Пройдено дней':'Days completed'))
    if(day===14)assert.match(textOf(map),lang==='ru'?/Ваши 14 дней позади/:/Your 14 days are complete/)
    if(day===1){
      assert.equal(cards[0].props['data-day-status'],'completed')
      assert.equal(cards[1].props['data-day-status'],'next')
    }
    await click(h,"I'm committed")
    if(day===1){
      assert.match(textOf(h.tree),/Keep OPORA close|ОПОРА всегда под рукой/)
      await click(h,lang==='ru'?'Не сейчас':'Not now')
    }
    assert.match(textOf(h.tree),day===14
      ?(lang==='ru'?/Ваш курс завершён/:/Your course is complete/)
      :(lang==='ru'?/Увидимся завтра/:/See you tomorrow/))
    assert.deepEqual(nodes(h.tree).filter(n=>n.type==='a').map(n=>n.props?.href),[
      '/'+lang+'/tests','/'+lang+'/academy/principles-of-energywork/learn',
      '/'+lang+'/services/free-consultation'])
    assert.equal(f.requests,1,'Later screens must not create duplicate save')
    h.unmount()
  }
})

test('two unique optional action ideas per day, in EN/RU/ES, without rewriting legacy reminders',()=>{
  for(let day=1;day<=14;day++)for(const locale of ['en','ru','es']){
    const options=oporaExperienceTransferChoices(day,locale)
    const legacy=oporaExperienceDay(day,locale).reminder
    assert.deepEqual(options.map(item=>item.value),['two','three'])
    assert.ok(options.every(item=>item.label!==legacy))
    assert.notEqual(options[0].label,options[1].label)
  }
  assert.deepEqual(oporaExperienceTransferChoices(15,'en'),[])
})

test('Day 4 spoken feeling is optional, localized and cleared by Not today',async()=>{
  for(const [lang,next,skip] of [
    ['en','Continue','Not today'],
    ['ru','Продолжить','Не сегодня'],
    ['es','Continuar','Hoy no'],
  ]){
    const f=fixture(lang,4),h=f.h
    await advanceOporaTo(h,'save',next)
    const single=nodes(h.tree).find(n=>n.props?.['data-opora-everyday-choice']==='one-feeling-and-field')
    assert.ok(single,'one and only one learning task for '+lang)
    assert.ok(textOf(h.tree).includes(oporaAs60Day(4,lang).transfer))
    const field=nodes(h.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true')
    assert.ok(field)
    field.props.onChange({target:{value:'calma'}})
    await h.settle()
    assert.equal(nodes(h.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true').props.value,'calma')
    await click(h,skip)
    assert.equal(nodes(h.tree).find(n=>n.type==='input'&&n.props?.['data-opora-transfer-feeling']==='true').props.value,'')
    await advanceOporaTo(h,'recapFeedback',next)
    await click(h,lang==='ru'?'Получилось немного':lang==='es'?'Pude hacerlo un poco':'I managed a little')
    await click(h,lang==='ru'?'Сохранить мою практику':lang==='es'?'Guardar mi práctica':'Save my practice')
    assert.equal(f.payload.opora54.answers.transferFeeling,undefined)
    assert.equal(f.payload.opora54.answers.transfer,'not_planning')
    assert.equal(f.payload.opora54.answers.transferChoice,undefined)
    h.unmount()
  }
})

test('Day 4 feeling is limited to a short validated label, with no PII-like strings',()=>{
  for(const feeling of ['calm','спокойствие','añoranza']){
    const result=validateOpora54Signals({answers:{
      transfer:'planned',transferChoice:'two',transferFeeling:feeling},hints:[],ease:null})
    assert.equal(result.answers.transferFeeling,feeling)
  }
  for(const feeling of ['', '  ', 'x'.repeat(61), 'me@example.com', 'http://example.com',
    'fear\\nprivate', 'calm/unsafe', 'feeling 123']){
    assert.throws(()=>validateOpora54Signals({answers:{
      transfer:'planned',transferChoice:'two',transferFeeling:feeling},hints:[],ease:null}),/INVALID_OPORA54_ANSWER/)
  }
  assert.throws(()=>validateOpora54Signals({answers:{
    transfer:'not_planning',transferFeeling:'calm'},hints:[],ease:null}),/INVALID_OPORA54_TRANSFER/)
})

test('one action gets a version marker while historic options remain meaningful',async()=>{
  const f=fixture('en',3),h=f.h
  await advanceOporaTo(h,'save',t.en.next)
  const [first,second]=oporaExperienceTransferChoices(3,'en')
  const focused=oporaAs60Day(3,'en').transfer
  assert.ok(textOf(h.tree).includes(focused))
  assert.ok(!textOf(h.tree).includes(first.label))
  assert.ok(!textOf(h.tree).includes(second.label))
  await click(h,t.en.plan)
  await advanceOporaTo(h,'recapFeedback',t.en.next)
  await click(h,'I managed a little')
  await click(h,t.en.save)
  assert.equal(f.payload.opora54.answers.transferChoice,'two')
  assert.equal(f.payload.opora54.answers.transfer,'planned')
  assert.equal(f.payload.opora54.answers.transferPlanVersion,'one-v1')
  assert.ok(textOf(h.tree).includes(focused))
  h.unmount()

  const lesson=lessonFor('calm_regulation',3,'en','standard',COURSE_ANTISTRESS_SKILLS_V7)
  for(const [oldChoice,oldText] of [
    ['one',oporaExperienceDay(3,'en').reminder],['three',second.label],
  ]){
    const historical=mount('opora-experience-player',{
      locale:'en',
      data:{cycle:{id:'00000000-0000-4000-8000-000000001056',day:3,durationDays:14},
        programme:{id:'stress'},lesson,
        currentSession:{signals:{opora54:{answers:{transfer:'planned',transferChoice:oldChoice}}}}},
      onClose(){},onFinish(){},onSession:async()=>{throw Error('Archived session cannot write')},
    })
    assert.ok(textOf(historical.tree).includes(oldText))
    assert.ok(!textOf(historical.tree).includes(focused))
    historical.unmount()
  }
})

test('the restored five opening screens remain fully optional, with no false practice claim',async()=>{
  const f=fixture('en',1),h=f.h
  await advanceOporaTo(h,'recapFeedback',t.en.next)
  await click(h,'I only explored them today')
  await click(h,t.en.save)
  assert.equal(f.requests,1)
  assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
  assert.deepEqual(f.payload.oporaOpening,
    {resource:null,lastDayDifficulty:null,familiarSupport:null})
  assert.equal(f.payload.welcomeFeeling,null)
  assert.equal(f.payload.practiceAttempt,null)
  assert.equal(f.payload.opora54.answers.lessonConfidence,'explored')
  assert.equal(f.payload.opora54.answers.act,undefined)
  assert.equal(f.payload.opora54.answers.aphorism,undefined)
  assert.equal(f.payload.opora54.answers.reflection,undefined)
  assert.equal(f.payload.opora54.answers.transfer,undefined)
  assert.match(textOf(h.tree),/Explored the idea only/)
  assert.doesNotMatch(textOf(h.tree),/100%|trauma healed|clinically cured/)
  h.unmount()
})

test('photo-first feelings and optional feedback work in ES without changing validated scores',async()=>{
  const f=fixture('es',1),h=f.h
  assert.match(textOf(h.tree),/¿Cómo te sientes hoy\?/)
  assert.ok(findButton(h.tree,'Me siento tenso/a'))
  await click(h,'Me siento tenso/a')
  assert.match(textOf(h.tree),/No necesitas cambiar nada de inmediato/)
  const selection=nodes(h.tree).find(node=>node.type==='button'&&textOf(node).includes('Me siento tenso/a'))
  assert.equal(selection?.props['aria-pressed'],true)
  assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-start-mood']==='true').length,1)
  await advanceOporaTo(h,'recapFeedback','Continuar')
  await click(h,'Hoy solo las exploré')
  await click(h,'Guardar mi práctica')
  assert.equal(f.payload.welcomeFeeling,'tense')
  assert.equal(f.payload.opora54.answers.lessonConfidence,'explored')
  assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
  h.unmount()
})

test('a missing recap selection never sends a completion receipt or invented action',async()=>{
  const f=fixture('en',2),h=f.h
  await advanceOporaTo(h,'recapFeedback',t.en.next)
  assert.match(textOf(h.tree),/How was this for you\?/)
  await click(h,t.en.save)
  assert.equal(f.requests,0)
  assert.match(textOf(h.tree),/Choose the card closest to your experience/)
  await click(h,'I need more practice')
  await click(h,t.en.save)
  assert.equal(f.requests,1)
  assert.equal(f.payload.opora54.answers.lessonConfidence,'practice_more')
  assert.equal(f.payload.practiceAttempt,null)
  assert.match(textOf(h.tree),/Congratulations! Lesson 2 complete!/)
  h.unmount()
})

test('a pause is safe, accessible and does not report a fake practice',async()=>{
  const f=fixture('ru',2),h=f.h
  await click(h,t.ru.pause)
  const dialog=nodes(h.tree).find(x=>x.props?.role==='alertdialog')
  assert.ok(dialog)
  assert.equal(dialog.props['aria-modal'],'true')
  assert.equal(typeof dialog.props.onKeyDown,'function')
  assert.equal(nodes(dialog).filter(x=>x.type==='button').length,3)
  const frame=nodes(h.tree).find(x=>x.type==='div'&&x.props?.inert===true)
  assert.ok(frame)
  assert.equal(frame.props['aria-hidden'],'true')
  let prevented=false
  dialog.props.onKeyDown({key:'Escape',preventDefault(){prevented=true}})
  await h.settle()
  assert.equal(prevented,true)
  assert.equal(nodes(h.tree).some(x=>x.props?.role==='alertdialog'),false)
  assert.equal(f.requests,0)
  h.unmount()
})

test('only active V7 can submit five moments; old 14-step lesson sequences stay intact',()=>{
  const server=read('lib/app/growth-daily.js')
  const today=read('components/app/course-today.jsx')
  const js=read('components/app/opora-experience-player.jsx')
  const css=read('components/app/opora-experience-player.module.css')
  assert.match(server,/practiceWindow==='practice_v6'&&version!==COURSE_ANTISTRESS_SKILLS_V7/)
  assert.match(server,/OPORA_EXPERIENCE_PRE_SAVE_KEYS\.map/)
  assert.match(server,/OPORA_DAY_ONE_RESTORED_KEYS\.map/)
  assert.match(server,/oporaOpening/)
  assert.match(server,/as-5\.6-five-moments-v1/)
  assert.match(server,/verifyCourseSlideVisitOrder\(requiredSlides,input\.visitedSlideKeys\)/)
  assert.match(today,/playerData\?\.lesson\?\.version===COURSE_ANTISTRESS_SKILLS_V7/)
  assert.match(today,/<OporaExperiencePlayer/)
  assert.match(today,/<OporaV6SlidePlayer/)
  assert.match(css,/100dvh/)
  assert.match(css,/report-lighthouse-coast\.webp/)
  assert.match(css,/hero-olive-incense\.webp/)
  assert.match(css,/reiki-approved-sunrise-v3\.webp/)
  assert.doesNotMatch(css,/course-start-heron\.webp|reiki-practitioner-sunrise\.webp/)
  assert.match(css,/prefers-reduced-motion/)
  assert.match(js,/inert=\{safety\}/)
  assert.match(js,/onClick=\{\(\)=>tryStatus\(value\)\}/)
  const parsed=ts.createSourceFile('opora-experience-player.jsx',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[])
  for(const lang of ['ru','en']){
    const old=lessonFor('calm_regulation',1,lang,'standard',COURSE_ANTISTRESS_SKILLS_V6)
    assert.equal(buildCourseSlides(old).length,14)
    assert.equal(verifyCourseSlideVisitOrder(buildCourseSlides(old),OPORA_EXPERIENCE_PRE_SAVE_KEYS),false)
  }
})
