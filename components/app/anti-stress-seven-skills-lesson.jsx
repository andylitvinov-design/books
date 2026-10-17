'use client'
// One meaningful learner action per screen. No auto-sound, fabricated improvement or clinical inference.
import { useState } from 'react'
import { CheckCircle2, Compass, Eye, Lightbulb, PauseCircle, ShieldCheck } from 'lucide-react'
import { antiStressSevenSkillCards } from '@/lib/inner-growth/anti-stress-seven-skills-v1'
import CourseGuidedTimer from './course-guided-timer'
import CoursePracticeVoice from './course-practice-voice'
import styles from './anti-stress-seven-skills-lesson.module.css'

const COPY={
 ru:{
  first:'НЕДЕЛЯ 1 · ОСВАИВАЕМ',second:'НЕДЕЛЯ 2 · УГЛУБЛЯЕМ',
  mapTitle:'7 навыков за 14 дней',mapIntro:'Каждый день — один понятный навык. За первую неделю узнаём семь способов. Во вторую повторяем каждый самостоятельно в новом бытовом примере.',
  purpose:'Сегодня тренируем',outcome:'Что унесём из урока',intro:'Здесь не нужно оценивать себя. Важна доступная попытка, а не обязательно хорошее самочувствие.',
  prepare:'Начните с доступной опоры',prepareText:'Посмотрите вокруг и найдите один обычный предмет. Заметьте его цвет. Затем выберите удобный способ участия.',
  look:'Смотреть вокруг',read:'Читать без аудио',rest:'Нужен отдых',readNote:'Можно оставить глаза открытыми и не менять дыхание. Любой шаг можно пропустить.',
  practiceIntro:'Главная практика',practiceNote:'Четыре конкретных действия. Примерно по 1–1½ минуты на каждое. Можно двигаться быстрее, остановиться или попросить подсказку.',
  step:'Действие',previous:'Предыдущее',next:'Следующее действие',timer:'Необязательная подсказка времени',try:'Теперь попробуйте сами',
  tryIntro:'Повторите одно доступное действие из практики или только его короткую часть. Подсказки можно вернуть.',
  attempted:'Попробовал(а)',short:'Попробовал(а) часть',outside:'Попробовал(а) внешний ориентир',notNow:'Пока не пробовал(а)',
  hint:'Показать подсказку',hintText:'Выберите одну из четырёх инструкций, повторите её по-своему. Можно просто посмотреть на предмет и остановиться.',
  scenario:'Применим в обычной ситуации',scenarioHelp:'Выберите посильный вариант для этого примера — только как тренировку. Ничего делать в реальной жизни необязательно.',
  choosePause:'Короткая пауза',chooseAnchor:'Внешний ориентир',chooseThought:'Проверить мысль',chooseRest:'Отдых',chooseHelp:'Поддержка человека',chooseLater:'Не выбирать сейчас',
  reflect:'Как подошёл способ?',fit:'Подошёл',neutral:'Нейтрально',notFit:'Было некомфортно',noAnswer:'Не хочу отвечать',
  reflectNote:'Состояние может не измениться. Это не тест и не оценка эффективности лечения.',
  result:'Что удалось потренировать',resultHelp:'Сохраняем только ваш честный ответ о попытке — не предполагаем освоение по нажатию кнопки.',
  noAttempt:'Пока без подтверждённой попытки',yourChoice:'Мой вариант для ситуации',application:'Где попробовать',saved:'Нажмите «Завершить и сохранить» внизу: урок зачтётся только после подтверждения сервера.',
  stopping:'Мне некомфортно — остановиться',safety:'Все упражнения добровольные. Не нужно вспоминать болезненные события или управлять дыханием.',
 },
 en:{
  first:'WEEK 1 · LEARN',second:'WEEK 2 · GO DEEPER',
  mapTitle:'7 skills over 14 days',mapIntro:'One concrete skill per day. Learn seven options in week one, then revisit each one with more independence and a new everyday example in week two.',
  purpose:'Your skill today',outcome:'Your takeaway',intro:'This is not a test. An honest attempt matters; feeling better is not required.',
  prepare:'Start with what is available',prepareText:'Look around and find one ordinary object. Notice its colour. Then choose a way to participate.',
  look:'Look around',read:'Read without audio',rest:'Rest first',readNote:'Eyes may stay open and breathing natural. You may skip any step.',
  practiceIntro:'Main practice',practiceNote:'Four concrete actions, about 1–1½ minutes each. Move sooner, stop or ask for a hint whenever you wish.',
  step:'Action',previous:'Previous',next:'Next action',timer:'Optional timing aid',try:'Now try it yourself',
  tryIntro:'Try one manageable part of the practice on your own. You can always bring hints back.',
  attempted:'I tried it',short:'I tried part',outside:'I tried an external anchor',notNow:'Not tried yet',
  hint:'Show a hint',hintText:'Pick one of the four instructions and try it in your own way. You can simply look at an object and stop.',
  scenario:'Try an everyday situation',scenarioHelp:'Pick a manageable response for this fictional practice scenario. No real-world action is required.',
  choosePause:'Brief pause',chooseAnchor:'External anchor',chooseThought:'Check a thought',chooseRest:'Rest',chooseHelp:'Ask a person',chooseLater:'Not choosing now',
  reflect:'How did this suit you?',fit:'It suited me',neutral:'Neutral',notFit:'Uncomfortable',noAnswer:'Prefer not to say',
  reflectNote:'Your feelings may stay the same. This is not a clinical test or evidence of treatment.',
  result:'Your practised skill',resultHelp:'Only your honest attempt is saved. We do not infer skill mastery from clicking Next.',
  noAttempt:'No reported attempt yet',yourChoice:'My choice for this example',application:'Where this may help',saved:'Use “Finish and save” below. Completion requires a confirmed server save.',
  stopping:'Uncomfortable? Stop now',safety:'All activities are optional. No painful memories or controlled breathing are required.',
 }
}
const OPTIONS=[['pause','choosePause'],['anchor','chooseAnchor'],['thought','chooseThought'],['rest','chooseRest'],['person','chooseHelp'],['later','chooseLater']]
export default function AntiStressSevenSkillsSlide({
 kind,locale='en',lesson={},locked=false,attempt='',onAttempt,
 comfort='skip',onComfort,transferStage='skip',onTransferStage,
 practiceChoice='',onPracticeChoice,preparation='',onPreparation,
 onDiscomfort,
}){
 const w=COPY[locale]||COPY.en
 const data=lesson.antiStress?.sevenSkillsV1
 const [step,setStep]=useState(0)
 const [hint,setHint]=useState(false)
 if(!data)return null
 const skills=antiStressSevenSkillCards(locale)
 const isFirst=data.day===1
 const btn=(id,label,selected,click)=><button type="button" key={id} className={styles.choice}
   aria-pressed={selected} disabled={locked} onClick={click}>
   <span>{label}</span>{selected?<CheckCircle2 size={18} aria-hidden="true"/>:null}
 </button>
 const safe=<button className={styles.stop} type="button" disabled={locked} onClick={onDiscomfort}>
   <ShieldCheck size={15}/>{w.stopping}</button>
 if(kind==='skill-intro')return <section className={styles.root} data-seven-skills-intro>
   <div className={styles.week}>{data.depth==='learn'?w.first:w.second} · {data.day}/14</div>
   <h3>{isFirst?w.mapTitle:data.skillTitle}</h3>
   <p className={styles.lead}>{isFirst?w.mapIntro:data.skillDescription}</p>
   {isFirst&&<div className={styles.skillList} role="list">{skills.map((s,i)=><div role="listitem" className={styles.skillItem} key={s.id}>
     <span className={styles.skillIndex}>{i+1}</span><strong>{s.title}</strong><small>{i+1} / {i+8}</small>
   </div>)}</div>}
   <div className={styles.takeaway}><Compass size={21} aria-hidden="true"/><span><b>{w.purpose}:</b> {data.skillTitle}
     <small>{w.outcome}: {data.outcome}</small></span></div>
   {!isFirst&&<p className={styles.small}>{w.intro}</p>}
 </section>
 if(kind==='skill-prepare')return <section className={styles.root} data-seven-skills-preparation>
   <div className={styles.week}><Eye size={17}/>{w.purpose} · {data.skillTitle}</div>
   <h3>{w.prepare}</h3><p className={styles.lead}>{w.prepareText}</p>
   <div className={styles.choices}>
     {btn('look',w.look,preparation==='look',()=>onPreparation('look'))}
     {btn('read',w.read,preparation==='read',()=>onPreparation('read'))}
     {btn('rest',w.rest,preparation==='rest',()=>onPreparation('rest'))}
   </div><p className={styles.small}>{w.readNote}</p>{safe}
 </section>
 if(kind==='skill-practice')return <section className={styles.root} data-seven-skills-practice>
   <div className={styles.week}><Compass size={17}/>{data.skillTitle}</div>
   <h3>{w.practiceIntro}</h3><p className={styles.small}>{w.practiceNote}</p>
   <div className={styles.practice}>
     <div className={styles.stepMeta}>{w.step} {step+1} / 4
       <div className={styles.dots} aria-hidden="true">{data.steps.map((_,i)=><i key={i} data-active={i===step}/>)}</div>
     </div>
     <p className={styles.stepText}>{data.steps[step]}</p>
     <CourseGuidedTimer key={'seven-timer-'+step} seconds={90} locale={locale}/>
     {preparation!=='read'&&<details className={styles.voiceDetail}>
       <summary>{locale==='ru'?'Прослушать эту инструкцию':'Listen to this instruction'}</summary>
       <CoursePracticeVoice key={'voice-'+step} locale={locale} text={data.steps[step]}/>
     </details>}
     <div className={styles.stepNav}>
       <button type="button" disabled={locked||step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>{w.previous}</button>
       <button type="button" disabled={locked||step===3} onClick={()=>setStep(s=>Math.min(3,s+1))}>{w.next}</button>
     </div>
   </div>{safe}
 </section>
 if(kind==='skill-repeat')return <section className={styles.root} data-seven-skills-repeat>
   <div className={styles.week}><Compass size={17}/>{data.skillTitle}</div>
   <h3>{w.try}</h3><p className={styles.lead}>{w.tryIntro}</p>
   <details className={styles.hints} open={hint} onToggle={event=>setHint(event.currentTarget.open)}>
     <summary><Lightbulb size={17}/>{w.hint}</summary>
     <p>{w.hintText}</p><ol>{data.steps.map((item,i)=><li key={i}>{item}</li>)}</ol>
   </details>
   <div className={styles.choices}>
     {btn('tried',w.attempted,attempt==='tried',()=>onAttempt('tried'))}
     {btn('simplified',w.short,attempt==='simplified',()=>onAttempt('simplified'))}
     {btn('neutral',w.outside,attempt==='neutral',()=>onAttempt('neutral'))}
     {btn('skip',w.notNow,attempt==='skip',()=>onAttempt('skip'))}
   </div>{safe}
 </section>
 if(kind==='skill-scenario')return <section className={styles.root} data-seven-skills-scenario>
   <div className={styles.week}><Compass size={17}/>{data.skillTitle}</div>
   <h3>{w.scenario}</h3>
   <p className={styles.scenarioText}>{data.scenario}</p>
   <p className={styles.small}>{w.scenarioHelp}</p>
   <div className={styles.choices}>{OPTIONS.map(([id,name])=>
     btn(id,w[name],practiceChoice===id,()=>{onPracticeChoice(id);onTransferStage(id==='later'?'skip':'plan')})
   )}</div>{safe}
 </section>
 if(kind==='skill-review')return <section className={styles.root} data-seven-skills-review>
   <div className={styles.week}><PauseCircle size={17}/>{data.skillTitle}</div>
   <h3>{w.reflect}</h3><p className={styles.small}>{w.reflectNote}</p>
   <div className={styles.choices}>
     {btn('comfortable',w.fit,comfort==='comfortable',()=>onComfort('comfortable'))}
     {btn('neutral',w.neutral,comfort==='neutral',()=>onComfort('neutral'))}
     {btn('uncomfortable',w.notFit,comfort==='uncomfortable',()=>{onComfort('uncomfortable');onDiscomfort()})}
     {btn('skip',w.noAnswer,comfort==='skip',()=>onComfort('skip'))}
   </div>{safe}
 </section>
 if(kind==='skill-result')return <section className={styles.root} data-seven-skills-result>
   <div className={styles.week}><CheckCircle2 size={17}/>{data.skillTitle}</div>
   <h3>{w.result}</h3>
   <div className={styles.takeaway}><CheckCircle2 size={24}/><span><b>{data.skillTitle}</b>
     <small>{data.outcome}</small></span></div>
   <p className={styles.lead}>{w.resultHelp}</p>
   <div className={styles.resultLine}><strong>{attempt&&attempt!=='skip'?
     ({tried:w.attempted,simplified:w.short,neutral:w.outside}[attempt]||w.noAttempt):w.noAttempt}</strong>
   </div>
   {practiceChoice&&practiceChoice!=='later'&&<p className={styles.resultLine}>{w.yourChoice}: {w[(OPTIONS.find(([id])=>id===practiceChoice)||[])[1]]||''}</p>}
   <p className={styles.small}><b>{w.application}:</b> {data.transfer}</p>
   <p className={styles.saving}>{w.saved}</p><p className={styles.safety}>{w.safety}</p>{safe}
 </section>
 return null
}
