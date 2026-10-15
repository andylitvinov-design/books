'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Eye, HeartHandshake, Leaf, Lightbulb, PauseCircle, Sparkles, Waves, MapPin, BookOpen, CircleHelp, ArrowUpRight, MousePointerClick } from 'lucide-react'
import CoursePracticeVoice from './course-practice-voice'
import styles from './anti-stress-day-one.module.css'

const PHOTO = '/images/holistic-house/course-focus-mountain-boy.webp'

export function DayOneChoices({ label, options, value, onSelect, disabled = false, compact = false, cards = false }) {
  const klass = [compact ? styles.compactChoices : styles.choices,cards ? styles.tileChoices : ''].filter(Boolean).join(' ')
  return <div className={klass} role="group" aria-label={label}>
    {options.map((item,index) => {
      const Glyph=item.icon
      return <button type="button" key={item.value}
        disabled={disabled} aria-pressed={value===item.value} onClick={()=>onSelect(item.value)}>
        {Glyph ? <span className={styles.tileIcon}><Glyph size={19} aria-hidden="true"/></span>
          : cards ? <span className={styles.tileIcon}>{index+1}</span> : null}
        <span className={styles.tileCopy}><strong>{item.label}</strong>
          {item.detail&&<small>{item.detail}</small>}</span>
        {value===item.value?<Check size={18} aria-hidden="true"/>:null}
      </button>
    })}
  </div>
}
const t = (locale,ru,en)=>locale==='ru'?ru:en

function Scene({locale,caption}) {
  return <figure className={styles.scene}>
    <img src={PHOTO} width={705} height={411} alt="" loading="eager" decoding="async"/>
    <figcaption>{caption||t(locale,'Можно смотреть на фотографию или на предметы вокруг.','You may look at the photograph or at objects near you.')}</figcaption>
  </figure>
}

export function DayOneFocusPicker({locale,options=[],value,onSelect,disabled=false}) {
  const choices = options.slice(0,4).map(option=>({
    value:option.id,label:option.label+(option.testTitle?' · '+option.testTitle:''),
  }))
  choices.push({value:'general',label:t(locale,'Сегодня без выбора шкалы','No particular scale today')})
  return <section className={styles.section} data-day-one-focus-picker>
    <p className={styles.headline}>{t(locale,
      'Выберите, что сейчас важнее. Это не новый тест, а тема вашей практики.',
      'Choose what matters today. This is a practice focus, not another test.')}</p>
    {options.length===0&&<p className={styles.hint}>{t(locale,
      'Подходящих результатов тестов пока нет — можно выбрать общий фокус.',
      'No compatible test scales were found. You can choose a general focus.')}</p>}
    <DayOneChoices label={t(locale,'Мой личный фокус','My personal focus')} options={choices}
      value={value} disabled={disabled} onSelect={onSelect}/>
    <p className={styles.hint}>{t(locale,
      'Параметры предлагаются только из ранее выбранных шкал. Выбор не меняет результаты тестов и главную цель курса.',
      'These options come from your previously selected scales. This does not change your test results or primary course goal.')}</p>
  </section>
}

export default function DayOneExercise({
  kind,locale='en',lesson={},answers={},onAnswer,locked=false,
  associationWords='',onAssociationWords,selectedFocus=null,onDiscomfort,
  neutralMode=false,onReturnToPractice,
}) {
  const ru=locale==='ru'
  const text=(a,b)=>t(locale,a,b)
  const [guidedStep,setGuidedStep]=useState(0)
  const [hintOpen,setHintOpen]=useState(false)
  const [wordQuality,setWordQuality]=useState('')
  const wordTokens=associationWords.split('\n').slice(0,3)
  const changeWord=(index,value)=>{
    const tokens=[wordTokens[0]||'',wordTokens[1]||'',wordTokens[2]||'']
    tokens[index]=value.replace(/[\r\n]/g,' ').slice(0,40)
    onAssociationWords(tokens.join('\n'))
  }
  const wordCount=wordTokens.filter(word=>word?.trim()).length
  const choice=(field,options,extra={})=><DayOneChoices label={extra.label||text('Выберите подходящий вариант','Choose what fits')}
    options={options} value={answers[field]} disabled={locked} compact={extra.compact} cards={extra.cards}
    onSelect={value=>{onAnswer(field,value);if((field==='experience'||field==='comfort')&&value==='uncomfortable')onDiscomfort()}}/>
  const photo=<Scene locale={locale}/>
  const helper=<p className={styles.hint}>{text(
    'Правильного ответа нет. Вы можете пропустить шаг или остановиться. Ваши чувства не обязаны измениться.',
    'There is no correct answer. You may skip or stop. Your feelings do not have to change.')}</p>
  const skill=selectedFocus?.label||text('Одна доступная опора','One available anchor')
  const anchorLabels={
    colour:text('цвет','colour'),shape:text('форма','shape'),object:text('предмет','object'),word:text('слово','word'),
  }
  // An explicit safe-stop choice must lead to a genuinely neutral branch,
  // not merely return to the triggering image/audio or exercise.
  if(neutralMode)return <section className={styles.section} data-day-one-activity="neutral-support">
    <div className={styles.visualIcon}><PauseCircle size={42}/></div>
    <p className={styles.headline}>{text('Можно остановиться и просто посмотреть вокруг.','You may stop and simply look around.')}</p>
    <p className={styles.hint}>{text(
      'Оставьте глаза открытыми. Если удобно, заметьте два обычных цвета или формы. Дыхание пусть остаётся естественным. В любой момент можно выйти.',
      'Keep your eyes open. If comfortable, notice two ordinary colours or shapes. Let your breathing stay natural. You may leave at any time.')}</p>
    <DayOneChoices label={text('Безопасный вариант','A safe option')} disabled={locked}
      value={answers.preparation} onSelect={value=>onAnswer('preparation',value)}
      options={[
        {value:'look',label:text('Остаться с нейтральным окружением','Stay with neutral surroundings')},
        {value:'rest',label:text('Отдохнуть','Rest')},
        {value:'skip',label:text('Пропустить упражнение','Skip the exercise')},
      ]}/>
    <button type="button" className={styles.returnAction} disabled={locked}
      onClick={onReturnToPractice}>{text('Вернуться к обычному уроку по желанию','Return to the usual lesson if I choose')}</button>
  </section>
  if(kind==='day1-prepare')return <section className={styles.section} data-day-one-activity="prepare">
    <div className={styles.overline}><Compass size={16}/>{text('ШАГ 06 · ВЫБИРАЮ СВОЙ ФОРМАТ','STEP 06 · I CHOOSE MY FORMAT')}</div>
    <Scene locale={locale}/>
    <p className={styles.headline}>{text('Как вам удобнее начать?','How would you prefer to begin?')}</p>
    <p className={styles.hint}>{text('Выбирайте комфортный способ. Это уже ваше первое решение в практике.','Choose a comfortable approach. This is your first choice in the exercise.')}</p>
    {choice('preparation',[
      {value:'look',label:text('Посмотреть вокруг','Look around'),detail:text('Глаза открыты, внимание на окружающем','Eyes open, noticing the room'),icon:Eye},
      {value:'photo',label:text('Посмотреть на изображение','Look at the picture'),detail:text('Ничего не надо представлять','No need to imagine anything'),icon:MapPin},
      {value:'read',label:text('Только читать','Read only'),detail:text('Собственный темп, без звука','My pace, no audio'),icon:BookOpen},
      {value:'rest',label:text('Сначала отдохнуть','Rest first'),detail:text('Можно ничего не делать','Doing nothing is okay'),icon:PauseCircle},
      {value:'skip',label:text('Сейчас не готов(а)','Not ready yet'),detail:text('Перейти дальше без оценки','Continue without being rated'),icon:CircleHelp},
    ],{cards:true})}
    {answers.preparation&&<p className={styles.selectedNotice} role="status"><Check size={16}/>{text('Ваш выбор принят. Его можно изменить.','Your choice is recorded. You can change it.')}</p>}
  </section>

  if(kind==='day1-notice')return <section className={styles.section} data-day-one-activity="notice">
    <div className={styles.overline}><Eye size={16}/>{text('ШАГ 07 · ИССЛЕДУЮ ИЗОБРАЖЕНИЕ','STEP 07 · EXPLORE THE SCENE')}</div>
    <p className={styles.headline}>{text('Выберите участок изображения, куда хочется направить взгляд','Choose an area you would like to look at')}</p>
    <Scene locale={locale} caption={text('Нажмите на область под изображением — или посмотрите на окружающие предметы.','Tap an area below the picture, or observe your own surroundings.')}/>
    <div className={styles.photoRegions} role="group" aria-label={text('Участок фотографии','Image region')}>
      {[
        {value:'left',label:text('Слева','Left')},
        {value:'center',label:text('В центре','Centre')},
        {value:'right',label:text('Справа','Right')},
      ].map(item=><button key={item.value} type="button" disabled={locked}
        aria-pressed={answers.visualZone===item.value} onClick={()=>onAnswer('visualZone',item.value)}>
        <span className={styles.photoRegionMark}><MousePointerClick size={16}/></span>{item.label}
      </button>)}
    </div>
    <p className={styles.headline}>{text('А что именно вы заметили?','And what did you notice?')}</p>
    {choice('noticed',[
      {value:'colour',label:text('Цвет','A colour'),icon:Sparkles},
      {value:'shape',label:text('Форма','A shape'),icon:Compass},
      {value:'object',label:text('Предмет','An object'),icon:MapPin},
      {value:'nothing',label:text('Пока ничего','Nothing yet'),icon:PauseCircle},
      {value:'skip',label:text('Предпочитаю пропустить','Prefer to skip'),icon:CircleHelp},
    ],{compact:true})}
    {answers.visualZone&&<p className={styles.selectedNotice} role="status"><Check size={16}/>{text('Вы выбрали область для внимания. Это наблюдение, не тест.','You chose where to look. This is an observation, not a test.')}</p>}
    {helper}
  </section>

  if(kind==='day1-practice') {
    const steps=ru?[
      {title:'Оглянитесь',body:'Можно оставить глаза открытыми. Дыхание не нужно менять. Заметьте пространство вокруг.'},
      {title:'Найдите нейтральную деталь',body:'Выберите обычный предмет или цвет. Если удобно, обратите внимание на форму и края.'},
      {title:'Выберите свой темп',body:'Останьтесь на этой детали или спокойно переведите взгляд. Никаких обязательных секунд.'},
      {title:'Решите, продолжать ли',body:'Можете отдохнуть, остановиться или мягко оглядеть комнату. Всё это допустимые результаты.'},
    ]:[
      {title:'Look around',body:'You may keep your eyes open. No need to change your breathing. Notice the space around you.'},
      {title:'Find a neutral detail',body:'Choose an ordinary object or colour. If comfortable, notice its shape and edges.'},
      {title:'Set your own pace',body:'Stay with the detail or gently move your gaze. There is no required number of seconds.'},
      {title:'Choose how to finish',body:'You can rest, stop or look around again. Each is an acceptable outcome.'},
    ]
    return <section className={styles.section} data-day-one-activity="practice">
      <div className={styles.overline}><Waves size={16}/>{text('ШАГ 08 · ГЛАВНАЯ ПРАКТИКА','STEP 08 · MAIN PRACTICE')}</div>
      <div className={styles.practiceHeading}><Waves size={23}/><strong>{text('Одна опора в настоящем','One anchor in the present')}</strong></div>
      <p className={styles.headline}>{text('Вы можете выполнять инструкцию в своём темпе','You can practise at your own pace')}</p>
      <DayOneChoices compact label={text('Как удобнее заниматься','Choose a format')}
        disabled={locked} value={answers.practiceMode||'text'}
        onSelect={value=>onAnswer('practiceMode',value)}
        options={[
          {value:'text',label:text('Пошаговый текст','Step-by-step text'),icon:BookOpen},
          {value:'audio',label:text('Системная озвучка','Device voice'),icon:Waves},
        ]}/>
      {answers.practiceMode==='audio'&&<CoursePracticeVoice key={locale+'-'+String(answers.practiceMode)}
        locale={locale} text={lesson.sections?.find(part=>part.kind==='meditation')?.text}/>}
      <div className={styles.practiceStepper} data-interactive-practice-stepper>
        <div className={styles.practiceStepHeader}><small>{text('ЭТАП','STEP')} {guidedStep+1} / {steps.length}</small>
          <div className={styles.stepDots} aria-hidden="true">{steps.map((item,i)=><i key={item.title} data-active={i===guidedStep}/>)}</div>
        </div>
        <strong>{steps[guidedStep].title}</strong>
        <p>{steps[guidedStep].body}</p>
        <div className={styles.stepControls}>
          <button type="button" disabled={locked||guidedStep===0} onClick={()=>setGuidedStep(value=>Math.max(0,value-1))}><ChevronLeft size={17}/>{text('Назад','Back')}</button>
          <button type="button" disabled={locked} onClick={()=>setGuidedStep(value=>(value+1)%steps.length)}>
            {guidedStep===steps.length-1?text('Повторить шаги','Repeat steps'):text('Следующий шаг','Next step')}<ChevronRight size={17}/>
          </button>
        </div>
      </div>
      <details className={styles.transcript}><summary>{text('Полная текстовая инструкция','Complete written guide')} <ChevronDown size={16}/></summary>
        <p>{lesson.sections?.find(part=>part.kind==='meditation')?.text}</p></details>
      <p className={styles.headline}>{text('Как прошла ваша попытка?','How did the attempt go?')}</p>
      {choice('practiceAttempt',[
        {value:'tried',label:text('Попробовал(а)','I tried it')},
        {value:'partly',label:text('Только часть','Only part of it')},
        {value:'stopped',label:text('Остановил(а)','I stopped')},
        {value:'skip',label:text('Не пробовал(а)','Did not try')},
      ],{compact:true})}
      {helper}
    </section>
  }

  if(kind==='day1-exit')return <section className={styles.section} data-day-one-activity="exit">
    <div className={styles.visualIcon}><PauseCircle size={42}/></div>
    <p className={styles.headline}>{text(
      'Как вы хотели бы завершить эту короткую паузу?',
      'How would you like to complete this short pause?')}</p>
    {choice('exit',[
      {value:'keep',label:text('Ещё немного посмотреть на выбранную деталь','Stay with my chosen detail a little longer')},
      {value:'change',label:text('Сменить предмет и спокойно оглядеться','Choose another object and look around')},
      {value:'stop',label:text('Закончить и отдохнуть','Finish and rest')},
      {value:'skip',label:text('Ничего не выбирать','No choice for now')},
    ])}
    {helper}
  </section>

  if(kind==='day1-anchor')return <section className={styles.section} data-day-one-activity="anchor">
    <div className={styles.visualIcon}><Compass size={42}/></div>
    <p className={styles.headline}>{text(
      'Что могло бы стать вашей простой точкой опоры?',
      'What might be a simple anchor for you?')}</p>
    {choice('anchor',[
      {value:'colour',label:text('Один нейтральный цвет','An ordinary colour')},
      {value:'shape',label:text('Форма или контур','A shape or outline')},
      {value:'object',label:text('Знакомый предмет','A familiar object')},
      {value:'word',label:text('Небольшое слово-подсказка','A simple cue word')},
      {value:'none',label:text('Пока ничего не подходит','Nothing fits yet')},
      {value:'skip',label:text('Не сохранять опору','No anchor today')},
    ])}
    {answers.anchor&&['colour','shape','object','word'].includes(answers.anchor)&&
      <div className={styles.resourceCard}><Leaf size={19}/>{text('Мой вариант: ','My choice: ')}<strong>{anchorLabels[answers.anchor]}</strong></div>}
  </section>

  if(kind==='day1-association')return <section className={styles.section} data-day-one-activity="association">
    {photo}
    <p className={styles.headline}>{text(
      'Какие три слова приходят вам в голову, когда вы смотрите на это изображение?',
      'Which three words come to mind when you look at this scene?')}</p>
    <label className={styles.wordsLabel}>
      <span>{text('Мои слова · необязательно','My words · optional')}</span>
      <textarea rows={3} maxLength={160} value={associationWords} disabled={locked}
        placeholder={text('Например: простор, тишина, дерево','For example: space, stillness, tree')}
        onChange={event=>onAssociationWords(event.target.value)}/>
    </label>
    <p className={styles.hint}>{text(
      'Это упражнение на свободные ассоциации — не психологический тест. Написанные слова остаются на этом экране и не передаются в аналитику.',
      'This is an open association exercise, not a psychological test. These words stay on this screen and are not sent to analytics.')}</p>
    {choice('associations',[
      {value:'tried',label:text('Я отметил(а) свои слова','I noted my words')},
      {value:'skip',label:text('Не хочу писать','I prefer not to write')},
    ])}
  </section>

  if(kind==='day1-independent')return <section className={styles.section} data-day-one-activity="independent">
    <div className={styles.visualIcon}><Eye size={42}/></div>
    <p className={styles.headline}>{text(
      'Попробуйте ещё раз найти нейтральную деталь без длинной инструкции.',
      'Try finding an ordinary neutral detail once again, without a long guide.')}</p>
    {choice('independent',[
      {value:'independent',label:text('Выбрал(а) ориентир самостоятельно','I chose an anchor independently')},
      {value:'guided',label:text('Мне нужна подсказка','I would like a hint')},
      {value:'deferred',label:text('Лучше попробую в другой раз','I would rather try later')},
      {value:'skip',label:text('Пропустить','Skip')},
    ])}
    {answers.independent==='guided'&&<div className={styles.resourceCard} role="status">
      <Lightbulb size={20}/><span>{text(
        'С открытыми глазами заметить одну форму или цвет вокруг — уже подходящий первый шаг.',
        'Noticing one shape or colour around you with eyes open is a valid first step.')}</span></div>}
    {helper}
  </section>

  if(kind==='day1-experience')return <section className={styles.section} data-day-one-activity="experience">
    <div className={styles.visualIcon}><Sparkles size={42}/></div>
    <p className={styles.headline}>{text('Что вы действительно заметили?','What did you actually notice?')}</p>
    {choice('experience',[
      {value:'easier',label:text('Мне стало немного легче','I feel a little easier')},
      {value:'more_choice',label:text('Состояние прежнее, но выбрать стало проще','I feel the same, but choosing feels easier')},
      {value:'unchanged',label:text('Ничего не изменилось','Nothing changed')},
      {value:'unsure',label:text('Пока трудно сказать','I am not sure yet')},
      {value:'uncomfortable',label:text('Мне стало некомфортно','I felt uncomfortable')},
      {value:'skip',label:text('Не хочу отвечать','I prefer not to answer')},
    ])}
    {helper}
  </section>

  if(kind==='day1-adapt')return <section className={styles.section} data-day-one-activity="adapt">
    <div className={styles.visualIcon}><HeartHandshake size={42}/></div>
    <p className={styles.headline}>{text('Насколько комфортной была практика?','How comfortable was the practice?')}</p>
    {choice('comfort',[
      {value:'comfortable',label:text('Комфортно','Comfortable')},
      {value:'neutral',label:text('Нейтрально или терпимо','Neutral or tolerable')},
      {value:'uncomfortable',label:text('Некомфортно','Uncomfortable')},
      {value:'skip',label:text('Не хочу оценивать','Prefer not to rate')},
    ])}
    <p className={styles.headline}>{text(
      'Что сделать с практикой на будущее? Это ваш выбор.',
      'What would you choose for next time? It is up to you.')}</p>
    {choice('adaptation',[
      {value:'keep',label:text('Оставить как есть','Keep it as it is')},
      {value:'simplify',label:text('Сделать короче и проще','Make it shorter and simpler')},
      {value:'neutral',label:text('Выбрать внешнюю нейтральную опору','Choose a neutral external anchor')},
      {value:'skip',label:text('Пока не выбирать','No choice now')},
    ])}
  </section>

  if(kind==='day1-transfer')return <section className={styles.section} data-day-one-activity="transfer">
    <div className={styles.visualIcon}><Leaf size={42}/></div>
    <p className={styles.headline}>{text(
      'В какой обычный момент вы могли бы вспомнить свою опору?',
      'When might you remember your anchor during an ordinary day?')}</p>
    {choice('transferCue',[
      {value:'after_task',label:text('После завершения обычного дела','After finishing an ordinary task')},
      {value:'hurry',label:text('Когда замечу внутреннюю спешку','When I notice rushing')},
      {value:'before_rest',label:text('Перед коротким отдыхом','Before taking a break')},
      {value:'no_plan',label:text('Пока ничего не планирую','I am not planning anything yet')},
      {value:'skip',label:text('Пропустить','Skip')},
    ])}
    {answers.transferCue&&!['no_plan','skip'].includes(answers.transferCue)&&<>
      <p className={styles.headline}>{text('Что вы могли бы выбрать?','What might you choose?')}</p>
      {choice('transferAction',[
        {value:'look',label:text('Посмотреть на нейтральный предмет','Look at an ordinary object')},
        {value:'pause',label:text('Сделать короткую паузу','Take a short pause')},
        {value:'rest',label:text('Отдохнуть','Rest')},
        {value:'ask',label:text('Попросить поддержки человека','Ask another person for support')},
        {value:'none',label:text('Пока ничего','Nothing for now')},
      ])}
    </>}
    <div className={styles.personalCard}>
      <span>{text('Моя первая карточка опоры','My first anchor card')}</span>
      <strong>{skill}</strong>
      {answers.anchor&&anchorLabels[answers.anchor]&&<p>{text('Мой ориентир: ','My anchor: ')}{anchorLabels[answers.anchor]}</p>}
      <small>{text('План — приглашение, а не обязательство. Сохранение подтвердит сервер после нажатия кнопки ниже.',
        'A plan is an invitation, not a commitment. The server will confirm your lesson after you tap Save below.')}</small>
    </div>
  </section>

  return null
}
