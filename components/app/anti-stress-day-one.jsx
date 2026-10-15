'use client'

import { Check, ChevronDown, Compass, Eye, HeartHandshake, Leaf, Lightbulb, PauseCircle, Sparkles, Waves } from 'lucide-react'
import CoursePracticeVoice from './course-practice-voice'
import styles from './anti-stress-day-one.module.css'

const PHOTO = '/images/holistic-house/course-focus-mountain-boy.webp'

export function DayOneChoices({ label, options, value, onSelect, disabled = false, compact = false }) {
  return <div className={compact ? styles.compactChoices : styles.choices} role="group" aria-label={label}>
    {options.map(item => <button type="button" key={item.value}
      disabled={disabled} aria-pressed={value===item.value} onClick={()=>onSelect(item.value)}>
      <span>{item.label}</span>{value===item.value&&<Check size={18} aria-hidden="true"/>}
    </button>)}
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
  const choice=(field,options,extra={})=><DayOneChoices label={extra.label||text('Выберите подходящий вариант','Choose what fits')}
    options={options} value={answers[field]} disabled={locked}
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
    {photo}
    <p className={styles.headline}>{text('Выберите, как вам удобнее начать','Choose your most comfortable starting point')}</p>
    {choice('preparation',[
      {value:'look',label:text('Оглядеться вокруг с открытыми глазами','Look around with eyes open')},
      {value:'photo',label:text('Смотреть на спокойную фотографию','Look at the calm photograph')},
      {value:'read',label:text('Только читать инструкции','Read the instructions only')},
      {value:'rest',label:text('Сначала сделать маленькую паузу','Take a little rest first')},
      {value:'skip',label:text('Пока не готов(а) — перейти дальше','Not ready, continue')},
    ])}
    {helper}
  </section>

  if(kind==='day1-notice')return <section className={styles.section} data-day-one-activity="notice">
    {photo}
    <p className={styles.headline}>{text(
      'Посмотрите на фотографию или вокруг себя. Какая нейтральная деталь привлекла внимание?',
      'Look at the picture or around you. Which ordinary detail did you notice?')}</p>
    {choice('noticed',[
      {value:'colour',label:text('Цвет','A colour')},
      {value:'shape',label:text('Форма или контур','A shape or outline')},
      {value:'object',label:text('Обычный предмет','An ordinary object')},
      {value:'nothing',label:text('Пока ничего не заметил(а)','Nothing in particular')},
      {value:'skip',label:text('Не хочу выбирать','I prefer not to choose')},
    ])}
    {helper}
  </section>

  if(kind==='day1-practice')return <section className={styles.section} data-day-one-activity="practice">
    <div className={styles.practiceHeading}><Waves size={23}/><strong>{text(
      'Мягкое ориентирование · основная практика','Gentle orientation · main practice')}</strong></div>
    <p className={styles.headline}>{text('Попробуйте найти одну нейтральную точку в настоящем.','Try to find one neutral point in the present.')}</p>
    <DayOneChoices compact label={text('Способ практики','Practice format')} disabled={locked}
      value={answers.practiceMode||'text'} onSelect={value=>onAnswer('practiceMode',value)}
      options={[
        {value:'text',label:text('Читать в своём темпе','Read at your pace')},
        {value:'audio',label:text('Слушать системную озвучку','Listen using device voice')},
      ]}/>
    {answers.practiceMode==='audio'&&<CoursePracticeVoice key={locale+'-'+String(answers.practiceMode)}
      locale={locale} text={lesson.sections?.find(part=>part.kind==='meditation')?.text}/>}
    <ol className={styles.guidedList}>
      {(ru?[
        'Оставьте глаза открытыми. Не меняйте дыхание специально.',
        'Найдите один обычный предмет или цвет рядом. Заметьте его форму и края.',
        'Если комфортно, обратите внимание на расположение предмета в пространстве.',
        'Можно выбрать другой предмет, отвести взгляд, отдохнуть или закончить в любой момент.',
      ]:[
        'Keep your eyes open. There is no need to change your breathing.',
        'Find one ordinary object or colour nearby. Notice its edges and shape.',
        'If comfortable, notice where it is located in the room.',
        'You can switch objects, look away, rest, or stop whenever you choose.',
      ]).map((line,index)=><li key={line}><span>{index+1}</span>{line}</li>)}
    </ol>
    <details className={styles.transcript}><summary>{text('Полный текст практики','Full practice transcript')} <ChevronDown size={16}/></summary>
      <p>{lesson.sections?.find(part=>part.kind==='meditation')?.text}</p></details>
    <p className={styles.headline}>{text('Как прошла ваша попытка?','How did this attempt go?')}</p>
    {choice('practiceAttempt',[
      {value:'tried',label:text('Попробовал(а) упражнение','I tried the exercise')},
      {value:'partly',label:text('Попробовал(а) только часть','I tried part of it')},
      {value:'stopped',label:text('Остановил(а) практику','I stopped the practice')},
      {value:'skip',label:text('Пока не пробовал(а)','I did not try it yet')},
    ])}
    {helper}
  </section>

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
