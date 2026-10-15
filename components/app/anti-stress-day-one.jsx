'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Eye, HeartHandshake, Leaf, Lightbulb, PauseCircle, Sparkles, Waves, MapPin, BookOpen, CircleHelp, MousePointerClick } from 'lucide-react'
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
    <div className={styles.overline}><PauseCircle size={16}/>{text('ШАГ 09 · МЯГКИЙ ВЫХОД','STEP 09 · GENTLE FINISH')}</div>
    <div className={styles.softIllustration}><PauseCircle size={37}/><span>{text('Завершайте в своём темпе','Finish at your own pace')}</span></div>
    <p className={styles.headline}>{text('Как хотелось бы закончить эту паузу?','How would you like to end this pause?')}</p>
    {choice('exit',[
      {value:'keep',label:text('Остаться с деталью','Stay with the detail'),detail:text('Ещё немного смотреть, если комфортно','Look a little longer if comfortable'),icon:Eye},
      {value:'change',label:text('Сменить ориентир','Change the anchor'),detail:text('Спокойно перевести взгляд','Move my gaze gently'),icon:Compass},
      {value:'stop',label:text('Закончить и отдохнуть','Stop and rest'),detail:text('Не нужно ничего продолжать','Nothing more is required'),icon:PauseCircle},
      {value:'skip',label:text('Не выбирать','Make no choice'),detail:text('Перейти дальше без оценки','Continue without a rating'),icon:CircleHelp},
    ],{cards:true})}
    {answers.exit&&<p className={styles.selectedNotice} role="status"><Check size={16}/>{text('Вы сами выбираете момент завершения.','You are in charge of when to finish.')}</p>}
    {helper}
  </section>

  if(kind==='day1-anchor')return <section className={styles.section} data-day-one-activity="anchor">
    <div className={styles.overline}><Compass size={16}/>{text('ШАГ 10 · СОЗДАЮ КАРТОЧКУ ОПОРЫ','STEP 10 · BUILD MY ANCHOR CARD')}</div>
    <p className={styles.headline}>{text('Что вам было бы проще заметить снова?','Which simple thing could you notice again?')}</p>
    {choice('anchor',[
      {value:'colour',label:text('Цвет','A colour'),detail:text('Один оттенок вокруг','A familiar shade'),icon:Sparkles},
      {value:'shape',label:text('Форма','A shape'),detail:text('Линия или контур','An outline or line'),icon:Compass},
      {value:'object',label:text('Предмет','An object'),detail:text('Что-то реальное рядом','Something real nearby'),icon:MapPin},
      {value:'word',label:text('Слово','A word'),detail:text('Нейтральная подсказка','A neutral reminder'),icon:BookOpen},
      {value:'none',label:text('Пока ничего','Nothing fits yet'),icon:PauseCircle},
      {value:'skip',label:text('Не сохранять','Do not select'),icon:CircleHelp},
    ],{cards:true})}
    {answers.anchor==='colour'&&<div className={styles.swatchPanel} role="group" aria-label={text('Цвет без психологической интерпретации','A neutral colour, with no interpretation')}>
      <span>{text('Можно выбрать оттенок для карточки','Choose a shade for your card')}</span>
      {[
        {value:'blue',label:text('Голубой','Blue')},
        {value:'green',label:text('Зелёный','Green')},
        {value:'sand',label:text('Песочный','Sand')},
      ].map(item=><button type="button" key={item.value} data-tone={item.value}
        disabled={locked} aria-label={item.label} title={item.label}
        aria-pressed={answers.anchorTone===item.value}
        onClick={()=>onAnswer('anchorTone',item.value)}><span className={styles.swatchDot}/>{item.label}</button>)}
    </div>}
    <div className={styles.personalCard} data-anchor-preview>
      <span><Leaf size={16}/>{text('МОЙ НЕЙТРАЛЬНЫЙ ОРИЕНТИР','MY NEUTRAL ANCHOR')}</span>
      <strong>{answers.anchor&&anchorLabels[answers.anchor]?anchorLabels[answers.anchor]
        :text('Пока не выбрано — это нормально','Nothing selected yet — that is okay')}</strong>
      {answers.anchor==='colour'&&answers.anchorTone&&<div className={styles.anchorPreviewTone} data-tone={answers.anchorTone}/>}
      <small>{text('Карточка отражает только ваш выбор, а не значение или диагностику цвета.','This card reflects your choice, not a diagnostic meaning of a colour.')}</small>
    </div>
  </section>

  if(kind==='day1-association')return <section className={styles.section} data-day-one-activity="association">
    <div className={styles.overline}><Sparkles size={16}/>{text('ШАГ 11 · ТВОРЧЕСКАЯ АССОЦИАЦИЯ','STEP 11 · CREATIVE ASSOCIATIONS')}</div>
    <Scene locale={locale} caption={text('Посмотрите на изображение целиком, без поиска скрытого значения.','See the whole picture without looking for hidden meanings.')}/>
    <p className={styles.headline}>{text('Если хочется, напишите до трёх слов, которые приходят в голову','If you wish, write up to three words that come to mind')}</p>
    <div className={styles.wordTokens} role="group" aria-label={text('Три необязательных слова','Three optional words')}>
      {[0,1,2].map(i=><label key={i} className={styles.wordToken}>
        <span>{text('Слово','Word')} {i+1}</span>
        <input type="text" maxLength={40} disabled={locked} value={wordTokens[i]||''}
          placeholder={text('Любая ассоциация','Any association')}
          onChange={event=>changeWord(i,event.target.value)}/>
      </label>)}
    </div>
    <p className={styles.wordCount}>{text('Моих слов:','My words:')} <strong>{wordCount} / 3</strong></p>
    {wordCount>0&&<div className={styles.qualityPanel}>
      <p>{text('Какое качество вам хочется связать с одним из слов?','Which quality, if any, would you connect with a word?')}</p>
      <div className={styles.qualityOptions} role="group" aria-label={text('Необязательное качество','Optional quality')}>
        {[
          {value:'openness',label:text('Простор','Openness')},
          {value:'gentleness',label:text('Мягкость','Gentleness')},
          {value:'clarity',label:text('Ясность','Clarity')},
          {value:'other',label:text('Своё','My own')},
        ].map(item=><button type="button" key={item.value} disabled={locked}
          aria-pressed={wordQuality===item.value} onClick={()=>setWordQuality(item.value)}>{item.label}</button>)}
      </div>
    </div>}
    <p className={styles.hint}>{text('Слова и выбранное качество остаются только в этом открытом упражнении. Они не используются для диагностики и не отправляются в аналитику.','Your words and chosen quality stay in this open exercise. They are not diagnostic or sent to analytics.')}</p>
    {choice('associations',[
      {value:'tried',label:text('Я попробовал(а) упражнение','I tried the exercise')},
      {value:'skip',label:text('Предпочитаю пропустить','Prefer to skip')},
    ],{compact:true})}
  </section>

  if(kind==='day1-independent')return <section className={styles.section} data-day-one-activity="independent">
    <div className={styles.overline}><Eye size={16}/>{text('ШАГ 12 · ПРИМЕНЯЮ НАВЫК','STEP 12 · TRYING THE SKILL')}</div>
    <div className={styles.softIllustration}><Eye size={38}/><span>{text('Моя проба без экзамена','My attempt, not an exam')}</span></div>
    <p className={styles.headline}>{text('Попробуйте выбрать нейтральную деталь без длинной инструкции','Try choosing one neutral detail without a long guide')}</p>
    <p className={styles.hint}>{text('Что было бы проще найти вокруг прямо сейчас?','What would be easiest to find near you now?')}</p>
    {choice('independentCue',[
      {value:'colour',label:text('Цвет','A colour'),icon:Sparkles},
      {value:'shape',label:text('Форму','A shape'),icon:Compass},
      {value:'object',label:text('Предмет','An object'),icon:MapPin},
      {value:'rest',label:text('Лучше отдохнуть','Prefer rest'),icon:PauseCircle},
      {value:'skip',label:text('Не выбирать','No choice'),icon:CircleHelp},
    ],{compact:true})}
    <button type="button" className={styles.hintToggle} disabled={locked}
      aria-expanded={hintOpen} onClick={()=>{setHintOpen(value=>!value);if(!hintOpen)onAnswer('independent','guided')}}>
      <Lightbulb size={18}/>{hintOpen?text('Скрыть подсказку','Hide the hint'):text('Мне нужна подсказка','Show a hint')}
      <ChevronDown size={16} aria-hidden="true"/>
    </button>
    {hintOpen&&<div className={styles.resourceCard} role="status"><Lightbulb size={21}/>
      <span>{text('Посмотрите на ближайший предмет. Можно выбрать один видимый цвет или линию. Дыхание не меняйте специально.',
        'Look at the nearest ordinary object. You may choose one visible colour or line. No need to change your breathing.')}</span>
    </div>}
    <p className={styles.headline}>{text('Как вы попробовали?','How did you try?')}</p>
    {choice('independent',[
      {value:'independent',label:text('Самостоятельно','Independently')},
      {value:'guided',label:text('С подсказкой','With a hint')},
      {value:'deferred',label:text('Попробую позже','I will try later')},
      {value:'skip',label:text('Пропустить','Skip')},
    ],{compact:true})}
    {helper}
  </section>

  if(kind==='day1-experience')return <section className={styles.section} data-day-one-activity="experience">
    <div className={styles.overline}><Sparkles size={16}/>{text('ШАГ 13 · МОЁ НАБЛЮДЕНИЕ','STEP 13 · MY OBSERVATION')}</div>
    <div className={styles.softIllustration}><Sparkles size={36}/><span>{text('Каждый честный ответ подходит','Every honest response is valid')}</span></div>
    <p className={styles.headline}>{text('Что действительно изменилось — или осталось прежним?','What actually changed, or stayed the same?')}</p>
    {choice('experience',[
      {value:'easier',label:text('Мне немного легче','A little easier'),detail:text('Только если вы это действительно заметили','Only if that is what you noticed'),icon:Leaf},
      {value:'more_choice',label:text('Чувство прежнее, выбирать проще','Same feeling, more choice'),detail:text('Это отдельный возможный результат','A separate possible outcome'),icon:Compass},
      {value:'unchanged',label:text('Без изменений','No change'),detail:text('Такой результат тоже нормален','This response is equally valid'),icon:PauseCircle},
      {value:'unsure',label:text('Не могу пока сказать','Not sure yet'),icon:CircleHelp},
      {value:'uncomfortable',label:text('Стало некомфортно','I felt uncomfortable'),icon:HeartHandshake},
      {value:'skip',label:text('Предпочитаю не отвечать','Prefer not to answer'),icon:BookOpen},
    ],{cards:true})}
    {answers.experience&&answers.experience!=='uncomfortable'&&<div className={styles.reflectionCard} role="status">
      <span>{text('Ваше наблюдение — не экзаменационная оценка','Your observation is not a test result')}</span>
      <p>{answers.experience==='easier'?text('Вы отметили некоторое облегчение.','You reported some relief.')
        :answers.experience==='more_choice'?text('Вы отметили больше доступного выбора.','You reported more available choice.')
        :answers.experience==='unchanged'?text('Вы отметили отсутствие заметных изменений.','You reported no noticeable change.')
        :text('Не обязательно знать ответ прямо сейчас.','You do not have to know right now.')}</p>
    </div>}
  </section>

  if(kind==='day1-adapt')return <section className={styles.section} data-day-one-activity="adapt">
    <div className={styles.overline}><HeartHandshake size={16}/>{text('ШАГ 14 · НАСТРАИВАЮ ПРАКТИКУ','STEP 14 · ADJUSTING THE PRACTICE')}</div>
    <div className={styles.softIllustration}><HeartHandshake size={36}/><span>{text('Вы определяете удобный формат','You choose what fits')}</span></div>
    <p className={styles.headline}>{text('Насколько комфортно вам было?','How comfortable did it feel?')}</p>
    {choice('comfort',[
      {value:'comfortable',label:text('Комфортно','Comfortable')},
      {value:'neutral',label:text('Нейтрально','Neutral')},
      {value:'uncomfortable',label:text('Некомфортно','Uncomfortable')},
      {value:'skip',label:text('Не отвечать','Skip')},
    ],{compact:true})}
    <div className={styles.verticalRule}/>
    <p className={styles.headline}>{text('Что оставить для следующего раза?','What would you choose for next time?')}</p>
    {choice('adaptation',[
      {value:'keep',label:text('Оставить','Keep'),detail:text('Тот же способ и темп','Same approach and pace'),icon:Check},
      {value:'simplify',label:text('Упростить','Simplify'),detail:text('Короче и с меньшей нагрузкой','Shorter and with less effort'),icon:PauseCircle},
      {value:'neutral',label:text('Заменить','Replace'),detail:text('Только внешняя нейтральная опора','Only neutral external orientation'),icon:Compass},
      {value:'skip',label:text('Решу позже','Decide later'),icon:CircleHelp},
    ],{cards:true})}
    {answers.adaptation&&!['skip'].includes(answers.adaptation)&&<p className={styles.selectedNotice} role="status">
      <Check size={16}/>{text('Изменение будет применено только после сохранения урока.','This change will apply only after the lesson is saved.')}</p>}
  </section>

  if(kind==='day1-transfer') {
    const cues={
      after_task:text('после окончания обычного дела','after completing an ordinary task'),
      hurry:text('когда замечу внутреннюю спешку','when I notice inner rushing'),
      before_rest:text('перед отдыхом','before resting'),
    }
    const actions={
      look:text('посмотреть на нейтральный предмет','look at a neutral object'),
      pause:text('сделать короткую паузу','take a short pause'),
      rest:text('отдохнуть','rest'),
      ask:text('попросить поддержки','ask for support'),
      none:text('ничего не предпринимать','do nothing'),
    }
    const hasPlan=Boolean(cues[answers.transferCue]&&actions[answers.transferAction])
    return <section className={styles.section} data-day-one-activity="transfer">
      <div className={styles.overline}><Leaf size={16}/>{text('ШАГ 15 · СОЗДАЮ ПЛАН ПОДДЕРЖКИ','STEP 15 · MY SUPPORT PLAN')}</div>
      <p className={styles.headline}>{text('Когда в обычном дне может пригодиться опора?','When might a simple anchor be useful?')}</p>
      {choice('transferCue',[
        {value:'after_task',label:text('После дела','After a task'),icon:Check},
        {value:'hurry',label:text('Когда спешу','When rushing'),icon:Waves},
        {value:'before_rest',label:text('Перед отдыхом','Before rest'),icon:PauseCircle},
        {value:'no_plan',label:text('Пока без плана','No plan now'),icon:HeartHandshake},
        {value:'skip',label:text('Пропустить','Skip'),icon:CircleHelp},
      ],{compact:true})}
      {cues[answers.transferCue]&&<>
        <p className={styles.headline}>{text('Что вы МОЖЕТЕ выбрать?','What COULD you choose?')}</p>
        {choice('transferAction',[
          {value:'look',label:text('Посмотреть вокруг','Look around'),icon:Eye},
          {value:'pause',label:text('Пауза','Pause'),icon:PauseCircle},
          {value:'rest',label:text('Отдых','Rest'),icon:Leaf},
          {value:'ask',label:text('Поддержка','Support'),icon:HeartHandshake},
          {value:'none',label:text('Ничего','Nothing'),icon:CircleHelp},
        ],{compact:true})}
      </>}
      <div className={styles.personalCard} data-personal-transfer-preview>
        <span><Leaf size={16}/>{text('МОЯ ПЕРВАЯ КАРТОЧКА ОПОРЫ','MY FIRST SUPPORT CARD')}</span>
        <strong>{skill}</strong>
        {answers.anchor&&anchorLabels[answers.anchor]&&<p>{text('Мой ориентир: ','My anchor: ')}{anchorLabels[answers.anchor]}</p>}
        {hasPlan?<p className={styles.planSentence}>{text('Когда ','When ')}{cues[answers.transferCue]},
          {text(' я могу ',' I could ')}{actions[answers.transferAction]}.</p>
          :<p className={styles.planSentence}>{text('План пока не выбран. Это допустимо.','No plan selected yet. That is okay.')}</p>}
        <small>{text('Это только возможный план, а не обещание выполнить его. Курс будет сохранён после подтверждения сервера.',
          'This is only a possible plan, not a promise. The course will be saved after server confirmation.')}</small>
      </div>
    </section>
  }


  return null
}
