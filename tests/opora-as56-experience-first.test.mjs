import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {COURSE_ANTISTRESS_SKILLS_V6,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {oporaExperienceDay,oporaExperienceGuide,oporaExperienceGuidesValid,oporaExperienceSupport,oporaExperienceSupportValid} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS,buildCourseSlides,verifyCourseSlideVisitOrder} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const t={
  en:{next:'Continue',start:'I will try this step',try:'I tried it',
    unchanged:'About the same',vote:'Not sure yet',plan:'Keep this reminder',
    save:'Save my practice',saved:'Your moment is saved',noPlan:'No plan today',
    pause:'Pause',return:'Go back'},
  ru:{next:'Продолжить',start:'Я попробую этот шаг',try:'Я попробовал(а)',
    unchanged:'Примерно так же',vote:'Пока не уверен(а)',plan:'Хочу запомнить этот вариант',
    save:'Сохранить мою практику',saved:'Ваш момент сохранён',noPlan:'Пока без плана',
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
      assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,lang).body))
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
    assert.match(textOf(h.tree),lang==='ru'?(day===1?/Можно просто побыть здесь/:/Как вы сейчас себя чувствуете/):
      (day===1?/You can arrive just as you are/:/How are you feeling right now/))
    await click(h,d.next)
    if(day!==1){
      assert.ok(textOf(h.tree).includes(oporaExperienceSupport(day,lang).body))
      assert.ok(!findButton(h.tree,d.try),'Step two must never ask for practice proof')
      await click(h,d.next)
    }
    // Practical work always comes after the voluntary acceptance screen.
    assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,lang)))
    await click(h,d.try)
    await click(h,d.next)
    await click(h,d.unchanged)
    await click(h,d.next)
    if(day!==1){
      assert.ok(textOf(h.tree).includes(f.lesson.aphorism))
      await click(h,d.vote)
      await click(h,d.next)
    }
    await click(h,d.plan)
    await click(h,d.next)
    assert.match(textOf(h.tree),lang==='ru'?/Что вы освоили сегодня/:/What you learned today/)
    assert.ok(textOf(h.tree).includes(oporaExperienceDay(day,lang).title))
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
    assert.match(textOf(h.tree),new RegExp(d.saved))
    assert.match(textOf(h.tree),lang==='ru'?/Поздравляем/:/Congratulations/)
    await click(h,lang==='ru'?'Послушать волны':'Relax with waves')
    assert.match(textOf(h.tree),lang==='ru'?/Две минуты спокойствия/:/Two quiet minutes/)
    await click(h,lang==='ru'?'Посмотреть, что дальше':"See what's next")
    if(day===1){
      assert.match(textOf(h.tree),lang==='ru'?/Первая неделя/:/Week 1/)
      await click(h,d.next)
      assert.match(textOf(h.tree),lang==='ru'?/Вторая неделя/:/Week 2/)
      await click(h,d.next)
    }
    if(day<14)assert.ok(textOf(h.tree).includes(oporaExperienceDay(day+1,lang).title))
    else assert.match(textOf(h.tree),lang==='ru'?/Ваши 14 дней позади/:/Your 14 days are complete/)
    await click(h,"I'm committed")
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

test('the restored five opening screens remain fully optional, with no false practice claim',async()=>{
  const f=fixture('en',1),h=f.h
  for(let i=0;i<10;i++)await click(h,t.en.next)
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
  for(let i=0;i<10;i++)await click(h,'Continuar')
  await click(h,'Hoy solo las exploré')
  await click(h,'Guardar mi práctica')
  assert.equal(f.payload.welcomeFeeling,'tense')
  assert.equal(f.payload.opora54.answers.lessonConfidence,'explored')
  assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
  h.unmount()
})

test('a missing recap selection never sends a completion receipt or invented action',async()=>{
  const f=fixture('en',2),h=f.h
  for(let i=0;i<6;i++)await click(h,t.en.next)
  assert.match(textOf(h.tree),/What you learned today/)
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
  assert.match(today,/data\?\.lesson\?\.version===COURSE_ANTISTRESS_SKILLS_V7/)
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
