import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {
  oporaExperienceSupport, oporaExperienceSupportValid,
} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs59Day} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const next={en:'Continue',ru:'Продолжить',es:'Continuar'}
const back={en:'Back',ru:'Назад',es:'Atrás'}
const kicker={en:'WHY WE PRACTISE',ru:'ЗАЧЕМ ЭТО НУЖНО',es:'PARA QUÉ PRACTICAMOS'}
const today={en:/Today/,ru:/Сегодня/u,es:/Hoy/}
// A distinct daily explanation, not a generic reassurance or an extra task.
const skillHint={
  en:[/three nearby objects/,/edge of a nearby object/,/chair supports us/,
    /mild emotion/,/having the thought that/,/answer later/,/short pause/,
    /early sign/,/straight line/,/grip of one hand/,/mild feeling/,
    /thought, not an order/,/need a little time/,/supportive action/],
  ru:[/три предмета/,/край одного предмета/,/стул поддерживает/,
    /несильную эмоцию/,/Мне пришла мысль/,/ответить позже/,/посильную паузу/,
    /ранний признак/,/прямую линию/,/хват одной руки/,/несильное чувство/,
    /Это мысль, не приказ/,/Мне нужно немного времени/,/поддерживающее действие/],
  es:[/tres objetos cercanos/,/borde de un objeto cercano/,/nos sostiene la silla/,
    /emoción leve/,/teniendo el pensamiento/,/Puedo responder después/,/pausa breve/,
    /primera señal/,/línea recta/,/aflojar un poco una mano/,/emoción leve/,
    /un pensamiento, no una orden/i,/Necesito un poco de tiempo/,/acción de apoyo/],
}

// Merged #1804 explains the daily skill; #1413 still forbids an assigned task
// or proof of practice here. Spanish "siguiente tarea" means the next everyday
// task, exactly like the EN/RU Day 8 rationale, not homework for this screen.
function assertNonTaskSupport(copy,locale='es') {
  const text=copy.title+' '+copy.body
  assert.doesNotMatch(text,/\?|\b(how did that go|i tried it|you should|you must|your task)\b/iu)
  // JavaScript \b is ASCII-oriented: keep the existing Cyrillic bans effective.
  assert.doesNotMatch(text,/(?<!\p{L})(?:задание|оцените|сделайте|попробуйте)(?!\p{L})/iu)
  if(locale!=='es')return
  assert.doesNotMatch(text,/(?<!\p{L})(?:tu tarea|su tarea|vuestra tarea|la tarea de hoy|tarea para hoy|tarea\s*:|debes|deberías|tienes que|hay que)(?!\p{L})/iu,
    'Support explains why; it does not assign Spanish homework')
  const imperative=/(?:^|[.!?;:,]\s+)(?:Hoy[,;:]?\s+)?(?:haz|haga|realiza|realice|completa|complete|practica|practique|mira|mire|elige|elija|prueba|pruebe|nota|note|respira|respire|escribe|escriba|evalúa|evalúe|califica|califique|describe|describa|marca|marque|confirma|confirme)(?!\p{L})/iu
  for(const value of [copy.title,copy.body])assert.doesNotMatch(value,imperative,
    'No Spanish task command at the start of a title, sentence or clause')
}

test('support is authored for 14 days in EN/RU/ES, with no homework or performance question',()=>{
  assert.equal(oporaExperienceSupportValid(),true)
  let checked=0
  for(const locale of ['en','ru','es']){
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceSupport(day,locale)
      assert.ok(copy?.title&&copy?.body,locale+' '+day)
      assert.ok(copy.title.length<=54&&copy.body.length<=225,'One-screen reading budget '+locale+':'+day)
      assert.match(copy.body,today[locale],'Missing explicit daily purpose '+locale+':'+day)
      assert.match(copy.body,skillHint[locale][day-1],'Second screen does not explain actual skill '+locale+':'+day)
      assertNonTaskSupport(copy,locale)
      checked++
    }
  }
  assert.equal(checked,42,'All 14 historical rationales in all three locales')
  for(const invalid of [0,15,-1,1.5,null,undefined,'2']){
    assert.equal(oporaExperienceSupport(invalid),null)
  }
})

test('Day 8 everyday-task context is not an assignment, while commands and performance questions remain forbidden',()=>{
  for(const [locale,context] of [
    ['en','choose a pause before the next task'],
    ['ru','сделать паузу до следующего дела'],
    ['es','elegir una pausa antes de la siguiente tarea'],
  ]){
    const copy=oporaExperienceSupport(8,locale)
    assert.ok(copy.body.includes(context),'Preserve the authored Day 8 meaning in '+locale)
    assertNonTaskSupport(copy,locale)
  }
  for(const instruction of [
    'Tu tarea es mirar tres objetos.','La tarea de hoy es observar.','Tarea para hoy: observa.','Tarea: observa.',
    'Hoy debes escribir una respuesta.','Tienes que elegir una opción.','Hoy, escribe lo que notas.',
    'Completa la tarea antes de continuar.','Practica ahora.','Mira un objeto.','Confirma que lo has hecho.',
    '¿Cómo te ha ido?','How did that go?','I tried it','You should try now.','You must answer.','Your task is to look.',
    'Оцените результат.','Сделайте упражнение.','Попробуйте сейчас.','Ваше задание: ответить.',
  ]) assert.throws(()=>assertNonTaskSupport({title:'Why we practise',body:instruction}),{code:'ERR_ASSERTION'},instruction)
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
        assert.ok(textOf(h.tree).includes(kicker[locale]),'Missing WHY label '+locale)
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).purposeTitle))
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).purpose))
        assert.ok(!textOf(h.tree).includes(oporaAs59Day(day,locale).practice),'Task shown too early')
        assert.ok(!nodes(h.tree).some(x=>x.props?.['data-gentle-guidance']==='support'),'Support is not a hint')
        assert.equal(nodes(h.tree).filter(x=>x.props?.['aria-pressed']!==undefined).length,0,
          'No rating, answer, task confirmation or engagement choice on screen two')
        assert.equal(nodes(supporting[0]).filter(x=>['button','input','select','textarea'].includes(x.type)).length,0,
          'The support panel itself has no task or answer control')
        assert.equal(writes,0)
        findButton(h.tree,back[locale]).props.onClick();await h.settle()
        assert.equal(textOf(h.tree),before,'Back returns to unchanged arrival')
        findButton(h.tree,next[locale]).props.onClick();await h.settle()
        await advanceOporaTo(h,'practice',next[locale])
        assert.equal(nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']).length,0)
        assert.ok(textOf(h.tree).includes(oporaAs59Day(day,locale).practice),
          'Single authored daily practice must be reachable after the support screen')
        assert.equal(writes,0,'Reading support must not persist practice or health data')
      }finally{h.unmount()}
    }
  }
})

test('Saved AS-5.8 review keeps all 42 historical rationales, including everyday-task Spanish, without adding a response',async()=>{
  for(const locale of ['en','ru','es'])for(let day=1;day<=14;day++){
    const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    const data={cycle:{id:'00000000-0000-4000-8000-000000001058',day,durationDays:14},lesson,programme:{id:'stress'},
      currentSession:{signals:{opora54:{answers:{experienceEdition:'as-5.8-one-action-v1'}}}}}
    let writes=0
    const h=mount('opora-experience-player',{locale,data,reviewOnly:true,onClose(){},onFinish(){},onSession:async()=>{writes++;return true}})
    try{
      findButton(h.tree,next[locale]).props.onClick();await h.settle()
      const supporting=nodes(h.tree).filter(x=>x.props?.['data-opora-daily-support']===day)
      assert.equal(supporting.length,1)
      const copy=oporaExperienceSupport(day,locale)
      assert.ok(textOf(h.tree).includes(copy.title),locale+':'+day+' historical heading')
      assert.ok(textOf(supporting[0]).includes(copy.body))
      assert.equal(nodes(supporting[0]).filter(x=>['button','input','select','textarea'].includes(x.type)||x.props?.['aria-pressed']!==undefined).length,0)
      assert.equal(writes,0,'Reviewing a rationale does not persist a practice attempt')
    }finally{h.unmount()}
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
