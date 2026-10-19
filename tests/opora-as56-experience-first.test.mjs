import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {COURSE_ANTISTRESS_SKILLS_V6,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {oporaExperienceGuide,oporaExperienceGuidesValid} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,buildCourseSlides,verifyCourseSlideVisitOrder} from '../lib/inner-growth/course-slide-sequence.js'
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

test('five lived moments replace quizzes; 28 RU/EN lessons save a truthful result',async()=>{
  assert.deepEqual([...OPORA_EXPERIENCE_PRE_SAVE_KEYS],['arrive','practice','feel','affirmation','save'])
  assert.equal(oporaExperienceGuidesValid(),true)
  for(const lang of ['ru','en'])for(let day=1;day<=14;day++){
    const f=fixture(lang,day),h=f.h,d=t[lang]
    assert.match(textOf(h.tree),lang==='ru'?/Как вы сейчас себя чувствуете\?/:/How are you feeling right now\?/)
    assert.doesNotMatch(textOf(h.tree),/Choose your pace|Today's focus|A simple example|Prepare gently/)
    await click(h,d.next)
    // The participant sees concrete day-specific ACTION guidance, not a quiz
    // about correctly interpreting hypothetical answers.
    assert.ok(textOf(h.tree).includes(oporaExperienceGuide(day,lang)))
    await click(h,d.try)
    await click(h,d.next)
    await click(h,d.unchanged)
    await click(h,d.next)
    assert.ok(textOf(h.tree).includes(f.lesson.aphorism))
    await click(h,d.vote)
    await click(h,d.next)
    await click(h,d.plan)
    await click(h,d.save)
    assert.equal(f.requests,1,'Exactly one save for '+lang+' day '+day)
    assert.equal(f.payload.lessonId,f.lesson.id)
    assert.equal(f.payload.practiceWindow,'practice_v6')
    assert.deepEqual(f.payload.visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
    assert.deepEqual(validateOpora54Signals(f.payload.opora54).answers,f.payload.opora54.answers)
    assert.equal(f.payload.opora54.answers.act,undefined) // AS-5.5 action was not necessarily done
    assert.equal(f.payload.opora54.answers.actChoice,undefined) // guided moment is recorded separately
    assert.equal(f.payload.opora54.answers.reflection,'unchanged')
    assert.equal(f.payload.opora54.answers.aphorism,'unsure')
    assert.equal(f.payload.opora54.answers.transfer,'planned')
    assert.equal(f.payload.practiceAttempt,'tried')
    assert.match(textOf(h.tree),new RegExp(d.saved))
    h.unmount()
  }
})

test('opening asks about feelings before any task and answers with genuine feedback (EN/RU/ES)',async()=>{
  const variants=[
    {lang:'en',question:/How are you feeling right now/,label:'Tense',
      response:/do not have to make yourself relax/},
    {lang:'ru',question:/Как вы сейчас себя чувствуете/,label:'Напряжённо',
      response:/не нужно заставлять себя расслабиться/},
    {lang:'es',question:/Cómo te sientes ahora/,label:'Con tensión',
      response:/No tienes que obligarte a relajarte/},
  ]
  for(const item of variants){
    const f=fixture(item.lang),h=f.h
    assert.match(textOf(h.tree),item.question)
    assert.ok(findButton(h.tree,item.label),'Feeling must be an actual choice')
    assert.ok(!textOf(h.tree).includes('Find one calm or pleasant detail around you.'))
    await click(h,item.label)
    assert.match(textOf(h.tree),item.response,'Feedback must appear on the SAME slide')
    const selection=nodes(h.tree).find(node=>node.type==='button'&&
      textOf(node).includes(item.label))
    assert.equal(selection?.props['aria-pressed'],true)
    for(let i=0;i<4;i++)await click(h,item.lang==='ru'?'Продолжить':
      item.lang==='es'?'Continuar':'Continue')
    await click(h,item.lang==='ru'?'Сохранить мою практику':
      item.lang==='es'?'Guardar mi práctica':'Save my practice')
    assert.equal(f.payload.welcomeFeeling,'tense','Authenticated session must receive chosen feeling')
    assert.match(textOf(h.tree),item.lang==='ru'?/В начале занятия/:
      item.lang==='es'?/Al empezar/:/At the start/)
    h.unmount()
  }
})

test('no action, vote, future plan or better feeling is required to finish',async()=>{
  const f=fixture('en',1),h=f.h
  // View the concrete step without claiming to perform it.
  for(let i=0;i<4;i++)await click(h,t.en.next)
  await click(h,t.en.save)
  assert.equal(f.requests,1)
  assert.equal(f.payload.practiceAttempt,null)
  assert.equal(f.payload.welcomeFeeling,null,'Unanswered welcome cannot be recorded as a feeling')
  assert.equal(f.payload.opora54.answers.act,undefined)
  assert.equal(f.payload.opora54.answers.aphorism,undefined)
  assert.equal(f.payload.opora54.answers.reflection,undefined)
  assert.equal(f.payload.opora54.answers.transfer,undefined)
  assert.match(textOf(h.tree),/Explored the idea only/)
  assert.doesNotMatch(textOf(h.tree),/100%|trauma healed|clinically cured/)
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
  assert.match(server,/as-5\.6-five-moments-v1/)
  assert.match(server,/verifyCourseSlideVisitOrder\(requiredSlides,input\.visitedSlideKeys\)/)
  assert.match(today,/data\?\.lesson\?\.version===COURSE_ANTISTRESS_SKILLS_V7/)
  assert.match(today,/<OporaExperiencePlayer/)
  assert.match(today,/<OporaV6SlidePlayer/)
  assert.match(css,/100dvh/)
  assert.match(css,/report-lighthouse-coast\.webp/)
  assert.match(css,/course-focus-mountain-boy\.webp/)
  assert.match(css,/reiki-practitioner-sunrise\.webp/)
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
