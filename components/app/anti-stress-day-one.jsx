'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Eye, HeartHandshake, Leaf, Lightbulb, PauseCircle, Sparkles, Waves, MapPin, BookOpen, CircleHelp, MousePointerClick } from 'lucide-react'
import CoursePracticeVoice from './course-practice-voice'
import { DAY_ONE_PRACTICE_GUIDE } from '@/lib/inner-growth/anti-stress-day-one'
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
  neutralMode=false,onReturnToPractice,onStopPractice,
}) {
  const ru=locale==='ru'
  const text=(a,b)=>t(locale,a,b)
  const [guidedStep,setGuidedStep]=useState(0)
  const [hintOpen,setHintOpen]=useState(false)
  const [hintEverUsed,setHintEverUsed]=useState(answers.hintUsed==='yes')
  const [wordQuality,setWordQuality]=useState('')
  const wordTokens=associationWords.split('\n').slice(0,3)
  const changeWord=(index,value)=>{
    const tokens=[wordTokens[0]||'',wordTokens[1]||'',wordTokens[2]||'']
    tokens[index]=value.replace(/[\r\n]/g,' ').slice(0,40)
    onAssociationWords(tokens.join('\n'))
  }
  const wordCount=wordTokens.filter(word=>word?.trim()).length
  const choice=(field,options,extra={})=><DayOneChoices label={extra.label||text('Выберите подходящий вариант','Choose what fits')}
    options={options.filter(item=>item.value!=='skip')} value={answers[field]} disabled={locked} compact={extra.compact} cards={extra.cards}
    onSelect={value=>{onAnswer(field,value);if((field==='experience'||field==='comfort')&&value==='uncomfortable')onDiscomfort()}}/>
  const helper=<p className={styles.hint}>{text(
    'Правильного ответа нет. Можно просто продолжить или остановиться. Ваши чувства не обязаны измениться.',
    'There is no correct answer. You can simply continue or stop. Your feelings do not have to change.')}</p>
  const skill=selectedFocus?.label||text('Осознанная пауза и поддержка','A mindful pause and support')
  const anchorLabels={
    colour:text('цвет','colour'),shape:text('форма','shape'),object:text('предмет','object'),word:text('слово','word'),
  }
  const signalLabels={
    tension:text('напряжение','tension'),rushing:text('внутренняя спешка','inner rushing'),
    fatigue:text('усталость','tiredness'),steady:text('ровное состояние','a steady state'),
    unclear:text('пока трудно определить','not clear yet'),
  }
  const needLabels={
    space:text('чуть больше пространства','a little more space'),
    rest:text('отдых','rest'),support:text('поддержка','support'),
    clarity:text('ясность','clarity'),none:text('пока не знаю','not sure yet'),
  }
  const actionLabels={
    orient:text('заметить предмет вокруг','notice something around me'),
    pause:text('сделать мягкую паузу','take a gentle pause'),
    rest:text('отдохнуть','rest'),
    ask:text('обратиться за поддержкой','ask for support'),
    none:text('ничего не менять сейчас','change nothing right now'),
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
  // Calm-first redesign: these two screens explain and support a practice;
  // they are not questionnaires. Older answer codes remain server-compatible.
  if(kind==='day1-prepare')return <section className={styles.section} data-day-one-activity="prepare" data-day-one-calm="true">
    <p className={styles.calmHeadline}>{text('Начнём спокойно. Просто посмотрите вокруг.','Let’s begin gently. Simply look around.')}</p>
    <div className={styles.calmPhoto} aria-hidden="true">
      <img src={PHOTO} width={705} height={411} alt="" loading="eager" decoding="async"/>
    </div>
    <p className={styles.calmLead}>{text(
      'Можете посмотреть на комнату или фотографию. Не нужно ничего чувствовать по-особенному.',
      'You can look around the room or at the picture. Nothing needs to feel different.'
    )}</p>
    {choice('preparation',[
      {value:'look',label:text('Посмотрю вокруг','Look around'),icon:Eye},
      {value:'photo',label:text('Посмотрю на фото','Use the picture'),icon:MapPin},
      {value:'read',label:text('Пока просто почитаю','Just read for now'),icon:BookOpen},
    ],{cards:true,label:text('Удобный способ начать','A gentle way to begin')})}
    {answers.preparation==='rest'&&<p className={styles.calmResponse} role="status">{text(
      'Вы выбрали отдых. Можно продолжить в удобном темпе.',
      'You chose rest. You can continue at your own pace.'
    )}</p>}
    <details className={styles.calmMore}>
      <summary><Leaf size={16}/>{text('Можно отдохнуть вместо упражнения','Rest is also an option')}<ChevronDown size={16}/></summary>
      <button type="button" disabled={locked} className={styles.calmRest}
        onClick={()=>onAnswer('preparation','rest')}>{text('Сегодня выбираю отдых','I choose to rest today')}</button>
    </details>
  </section>

  if(kind==='day1-notice')return <section className={styles.section} data-day-one-activity="notice" data-day-one-calm="true">
    <p className={styles.calmHeadline}>{text('Заметьте одну обычную деталь.','Notice one ordinary detail.')}</p>
    <p className={styles.calmLead}>{text(
      'Например, цвет, форму или предмет рядом. Если хочется, посмотрите на фотографию. Не нужно искать тревогу.',
      'Perhaps a colour, a shape or an object near you. You can use the picture. No need to look for stress.'
    )}</p>
    <div className={styles.calmPhoto} aria-hidden="true">
      <img src={PHOTO} width={705} height={411} alt="" loading="eager" decoding="async"/>
    </div>
    {choice('noticed',[
      {value:'colour',label:text('Цвет','Colour'),icon:Sparkles},
      {value:'shape',label:text('Форма','Shape'),icon:Compass},
      {value:'object',label:text('Предмет','Object'),icon:MapPin},
    ],{cards:true,label:text('Что заметили? (необязательно)','What did you notice? (optional)')})}
    {answers.noticed&&answers.noticed!=='skip'&&<p className={styles.calmResponse} role="status">
      <Check size={16}/>{text('Этой небольшой попытки достаточно.','One little observation is enough.')}
    </p>}
    <details className={styles.calmMore}>
      <summary><Eye size={16}/>{text('Если хотите, можно заметить и своё состояние','If you wish, notice how you feel')}<ChevronDown size={16}/></summary>
      <p>{text(
        'Этот дополнительный шаг необязателен. Не нужно усиливать ощущения или вспоминать трудные события.',
        'This extra step is optional. You do not need to intensify sensations or recall difficult events.'
      )}</p>
      {choice('innerSignal',[
        {value:'tension',label:text('Есть напряжение','Some tension'),icon:Waves},
        {value:'fatigue',label:text('Мало сил','Low energy'),icon:Leaf},
        {value:'steady',label:text('В целом ровно','Fairly steady'),icon:HeartHandshake},
        {value:'unclear',label:text('Пока непонятно','Not sure yet'),icon:CircleHelp},
      ],{compact:true,label:text('Только если вам комфортно','Only if this feels comfortable')})}
    </details>
  </section>

  if(kind==='day1-practice') {
    const steps=ru?[
      {title:'Замечаю',body:'Вспомните одно слово о своём состоянии — или пропустите внутреннее наблюдение. Не ищите причину и не заставляйте себя расслабляться.'},
      {title:'Ориентируюсь',body:'Если удобно, на миг посмотрите на обычный предмет вокруг. Заметьте его форму или цвет. Глаза можно оставить открытыми.'},
      {title:'Выбираю поддержку',body:'Спросите себя: чего мне сейчас чуть-чуть не хватает — паузы, отдыха, пространства или помощи? Можно не отвечать.'},
      {title:'Делаю небольшой выбор',body:'Если хочется, сделайте маленькое доступное действие. Затем просто заметьте свой опыт. Он может не измениться — и это нормально.'},
    ]:[
      {title:'Notice',body:'Use one word for your present state — or skip checking inside. Do not search for causes or force relaxation.'},
      {title:'Orient',body:'If comfortable, briefly look at an ordinary object. Notice its shape or colour. Keep your eyes open if you prefer.'},
      {title:'Choose support',body:'Ask yourself: would a pause, rest, space or help be useful right now? You may leave that unanswered.'},
      {title:'Make a small choice',body:'If you wish, try one manageable response, then simply notice your experience. It may stay unchanged, and that is okay.'},
    ]
    return <section className={styles.section} data-day-one-activity="practice">
      <div className={styles.overline}><Waves size={16}/>{text('ШАГ 08 · ОСНОВНАЯ ПРАКТИКА','STEP 08 · MAIN PRACTICE')}</div>
      <div className={styles.practiceHeading}><HeartHandshake size={23}/><strong>{text('Состояние → потребность → доступная поддержка','State → need → possible support')}</strong></div>
      <p className={styles.hint}>{text('Это короткая проба внимания и выбора, не упражнение на обязательное успокоение. Каждый шаг можно пропустить.',
        'This is a brief experiment in awareness and choice, not a demand to become calm. You can skip any step.')}</p>
      <DayOneChoices compact label={text('Как удобнее заниматься','Choose a format')}
        disabled={locked} value={answers.practiceMode||'text'}
        onSelect={value=>onAnswer('practiceMode',value)}
        options={[
          {value:'text',label:text('Пошаговый текст','Step-by-step text'),icon:BookOpen},
          {value:'audio',label:text('Системная озвучка','Device voice'),icon:Waves},
        ]}/>
      {answers.practiceMode==='audio'&&<CoursePracticeVoice key={locale+'-'+String(answers.practiceMode)}
        locale={locale} text={DAY_ONE_PRACTICE_GUIDE[ru?'ru':'en']}/>}
      <div className={styles.practiceStepper} data-interactive-practice-stepper>
        <div className={styles.practiceStepHeader}><small>{text('ЭТАП','STEP')} {guidedStep+1} / {steps.length}</small>
          <div className={styles.stepDots} aria-hidden="true">{steps.map((item,i)=><i key={item.title} data-active={i===guidedStep}/>)}</div>
        </div>
        <strong>{steps[guidedStep].title}</strong>
        <p>{steps[guidedStep].body}</p>
        <div className={styles.stepControls}>
          <button type="button" disabled={locked||guidedStep===0} onClick={()=>setGuidedStep(value=>Math.max(0,value-1))}><ChevronLeft size={17}/>{text('Назад','Back')}</button>
          <button type="button" disabled={locked} onClick={()=>setGuidedStep(value=>(value+1)%steps.length)}>
            {guidedStep===steps.length-1?text('Повторить по желанию','Repeat if useful'):text('Следующий шаг','Next step')}<ChevronRight size={17}/>
          </button>
        </div>
      </div>
      <button type="button" disabled={locked} onClick={onStopPractice} data-day-one-stop-practice>
        <PauseCircle size={17}/>{text('Закончить практику','Stop practice')}
      </button>
      <p className={styles.headline}>{text('Какую поддержку вы решили попробовать — если пробовали?','What support did you choose to try, if any?')}</p>
      {choice('innerAction',[
        {value:'pause',label:text('Небольшая пауза','A small pause'),icon:PauseCircle},
        {value:'orient',label:text('Нейтральный ориентир','An ordinary object'),icon:Eye},
        {value:'rest',label:text('Отдых','Rest'),icon:Leaf},
        {value:'ask',label:text('Идея попросить помощи','Consider asking for help'),icon:HeartHandshake},
        {value:'none',label:text('Ничего не менял(а)','No action taken'),icon:Compass},
        {value:'skip',label:text('Не отвечать','Skip'),icon:CircleHelp},
      ],{compact:true})}
      <details className={styles.transcript}><summary>{text('Полная текстовая инструкция','Full written guide')} <ChevronDown size={16}/></summary>
        <p>{DAY_ONE_PRACTICE_GUIDE[ru?'ru':'en']}</p></details>
      <p className={styles.headline}>{text('Насколько вы участвовали?','How much did you try?')}</p>
      {choice('practiceAttempt',[
        {value:'tried',label:text('Попробовал(а)','I tried')},
        {value:'partly',label:text('Часть шагов','Some steps')},
        {value:'stopped',label:text('Остановил(а)','I stopped')},
        {value:'skip',label:text('Не пробовал(а)','I did not try')},
      ],{compact:true})}
      {helper}
    </section>
  }

  if(kind==='day1-exit')return <section className={styles.section} data-day-one-activity="exit">
    <div className={styles.overline}><PauseCircle size={16}/>{text('ШАГ 09 · ЗАВЕРШАЮ БЕРЕЖНО','STEP 09 · END GENTLY')}</div>
    <div className={styles.softIllustration}><PauseCircle size={37}/><span>{text('Вы сами выбираете момент остановки','You decide when to finish')}</span></div>
    <p className={styles.headline}>{text('Что подходит вашему состоянию сейчас?','What suits your state right now?')}</p>
    {choice('exit',[
      {value:'keep',label:text('Ещё мгновение побыть здесь','Stay for another moment'),icon:Eye},
      {value:'change',label:text('Перевести внимание наружу','Move attention to the room'),icon:Compass},
      {value:'stop',label:text('Закончить и отдохнуть','Finish and rest'),icon:PauseCircle},
      {value:'skip',label:text('Перейти дальше','Move on'),icon:CircleHelp},
    ],{cards:true})}
    {answers.exit&&<p className={styles.selectedNotice} role="status"><Check size={16}/>{text('Ваш выбор важнее длительности или «правильного» результата.','Your choice matters more than duration or a “correct” result.')}</p>}
    {helper}
  </section>

  if(kind==='day1-anchor')return <section className={styles.section} data-day-one-activity="anchor">
    <div className={styles.overline}><HeartHandshake size={16}/>{text('ШАГ 10 · МОЯ МАЛЕНЬКАЯ ОПОРА','STEP 10 · MY SMALL SUPPORT')}</div>
    <p className={styles.headline}>{text('Что вашему состоянию сейчас больше всего нужно?','What might help your present state?')}</p>
    {choice('innerNeed',[
      {value:'space',label:text('Пространство и меньше спешки','More space and less rushing'),icon:Compass},
      {value:'rest',label:text('Отдых','Rest'),icon:Leaf},
      {value:'support',label:text('Чья-то поддержка','Someone’s support'),icon:HeartHandshake},
      {value:'clarity',label:text('Немного ясности','A bit of clarity'),icon:Lightbulb},
      {value:'none',label:text('Пока не знаю','Not sure yet'),icon:CircleHelp},
      {value:'skip',label:text('Не выбирать','Skip'),icon:PauseCircle},
    ],{cards:true})}
    <details className={styles.transcript}>
      <summary>{text('Необязательный внешний ориентир','Optional external anchor')} <ChevronDown size={16}/></summary>
      <p>{text('Если смотреть внутрь неприятно, можно просто сохранить нейтральный предмет, цвет, форму или слово.','If inner awareness is uncomfortable, you can keep an ordinary object, colour, shape or word instead.')}</p>
      {choice('anchor',[
        {value:'colour',label:text('Цвет','A colour'),icon:Sparkles},
        {value:'shape',label:text('Форма','A shape'),icon:Compass},
        {value:'object',label:text('Предмет','An object'),icon:MapPin},
        {value:'word',label:text('Слово','A word'),icon:BookOpen},
        {value:'none',label:text('Пока ничего','Nothing yet'),icon:PauseCircle},
        {value:'skip',label:text('Не выбирать','Skip'),icon:CircleHelp},
      ],{compact:true})}
      {answers.anchor==='colour'&&<div className={styles.swatchPanel} role="group" aria-label={text('Цвет без толкования','Colour without interpretation')}>
        <span>{text('Необязательный оттенок для напоминания','An optional shade for your reminder')}</span>
        {[
          {value:'blue',label:text('Голубой','Blue')},
          {value:'green',label:text('Зелёный','Green')},
          {value:'sand',label:text('Песочный','Sand')},
        ].map(item=><button type="button" key={item.value} data-tone={item.value} disabled={locked}
          aria-label={item.label} title={item.label} aria-pressed={answers.anchorTone===item.value}
          onClick={()=>onAnswer('anchorTone',item.value)}><span className={styles.swatchDot}/>{item.label}</button>)}
      </div>}
    </details>
    <div className={styles.personalCard} data-anchor-preview>
      <span><HeartHandshake size={16}/>{text('МОЯ КАРТА СОСТОЯНИЯ И ОПОРЫ','MY STATE AND SUPPORT CARD')}</span>
      <strong>{signalLabels[answers.innerSignal]||text('Можно начать с любого состояния','Any starting state is okay')}</strong>
      {needLabels[answers.innerNeed]&&<p>{text('Мне сейчас могло бы помочь: ','What might help me: ')}{needLabels[answers.innerNeed]}</p>}
      {actionLabels[answers.innerAction]&&<p>{text('Возможный ответ: ','A possible response: ')}{actionLabels[answers.innerAction]}</p>}
      {anchorLabels[answers.anchor]&&<small>{text('Внешний ориентир: ','External anchor: ')}{anchorLabels[answers.anchor]}</small>}
      {answers.anchor==='colour'&&answers.anchorTone&&<div className={styles.anchorPreviewTone} data-tone={answers.anchorTone}/>}
      <small>{text('Это ваши добровольные наблюдения и выборы — не диагноз и не обещание перемен.',
        'These are your own observations and choices, not a diagnosis or a promise of change.')}</small>
    </div>
  </section>

  if(kind==='day1-association')return <section className={styles.section} data-day-one-activity="association">
    <div className={styles.overline}><Sparkles size={16}/>{text('ШАГ 11 · СОЕДИНЯЮ ТРИ ПОДСКАЗКИ','STEP 11 · CONNECT THREE CUES')}</div>
    <p className={styles.headline}>{text('Если хочется, запишите по одному короткому слову: что со мной, что мне нужно и что доступно',
      'If you wish, use one short word for how you feel, what you need and what is available')}</p>
    <p className={styles.hint}>{text('Например: «спешка — пространство — пауза». Это не скрытые символы и не психологический тест. Если писать не хочется, просто прочитайте пример.',
      'For example: “rushing — space — pause”. These are not hidden symbols or a personality test. Reading the example is enough.')}</p>
    <div className={styles.wordTokens} role="group" aria-label={text('Три необязательных слова о моём состоянии','Three optional words about my state')}>
      {[0,1,2].map(i=><label key={i} className={styles.wordToken}>
        <span>{[text('Что замечаю','What I notice'),text('Что мне нужно','What I need'),text('Что доступно','What I can try')][i]}</span>
        <input type="text" maxLength={40} disabled={locked} value={wordTokens[i]||''}
          placeholder={[text('Напряжение','Tension'),text('Пауза','Pause'),text('Отдых','Rest')][i]}
          onChange={event=>changeWord(i,event.target.value)}/>
      </label>)}
    </div>
    <p className={styles.wordCount}>{text('Заполнено:','Filled:')} <strong>{wordCount} / 3</strong></p>
    {wordCount>0&&<div className={styles.qualityPanel}>
      <p>{text('Какую бережную интонацию вы бы добавили к этим словам?','What kind tone would you add to these words?')}</p>
      <div className={styles.qualityOptions} role="group" aria-label={text('Необязательная интонация','Optional kind tone')}>
        {[
          {value:'openness',label:text('Простор','Space')},
          {value:'gentleness',label:text('Мягкость','Gentleness')},
          {value:'clarity',label:text('Ясность','Clarity')},
          {value:'other',label:text('Свою','My own')},
        ].map(item=><button type="button" key={item.value} disabled={locked}
          aria-pressed={wordQuality===item.value} onClick={()=>setWordQuality(item.value)}>{item.label}</button>)}
      </div>
    </div>}
    <p className={styles.hint}>{text('Эти личные слова остаются на открытом экране и не отправляются на сервер. В кабинете сохраняются только явно выбранные коды поддержки.',
      'These personal words stay on this open screen and are not sent to the server. Only explicitly selected support choices are saved.')}</p>
    {choice('associations',[
      {value:'tried',label:text('Попробовал(а)','I tried')},
      {value:'skip',label:text('Пропустить','Skip')},
    ],{compact:true})}
  </section>

  if(kind==='day1-independent')return <section className={styles.section} data-day-one-activity="independent">
    <div className={styles.overline}><Eye size={16}/>{text('ШАГ 12 · ПРОБУЮ САМ(А)','STEP 12 · TRY IT MYSELF')}</div>
    <div className={styles.softIllustration}><HeartHandshake size={38}/><span>{text('Три простых движения внимания','Three simple choices')}</span></div>
    <p className={styles.headline}>{text('Можно попробовать без подробных подсказок: заметить состояние → спросить, что нужно → выбрать поддержку',
      'Try without detailed instructions: notice your state → consider what you need → choose one support')}</p>
    <p className={styles.hint}>{text('Несколько комфортных мгновений достаточно. Внутреннее наблюдение можно заменить внешним предметом.',
      'A few comfortable moments are enough. You may use an ordinary object instead of looking inward.')}</p>
    {choice('independentCue',[
      {value:'pause',label:text('Выбрал(а) паузу','Chose a pause'),icon:PauseCircle},
      {value:'support',label:text('Подумал(а) о поддержке','Considered support'),icon:HeartHandshake},
      {value:'colour',label:text('Заметил(а) цвет','Noticed colour'),icon:Sparkles},
      {value:'shape',label:text('Заметил(а) форму','Noticed shape'),icon:Compass},
      {value:'object',label:text('Заметил(а) предмет','Noticed an object'),icon:MapPin},
      {value:'rest',label:text('Выбрал(а) отдых','Chose rest'),icon:Leaf},
      {value:'skip',label:text('Пока без пробы','Not trying now'),icon:CircleHelp},
    ],{compact:true})}
    <button type="button" className={styles.hintToggle} disabled={locked}
      aria-expanded={hintOpen} onClick={()=>{setHintOpen(value=>!value);if(!hintOpen){setHintEverUsed(true);onAnswer('hintUsed','yes')}}}>
      <Lightbulb size={18}/>{hintOpen?text('Скрыть подсказку','Hide the hint'):text('Мне нужна подсказка','Show a hint')}
      <ChevronDown size={16} aria-hidden="true"/>
    </button>
    {hintOpen&&<div className={styles.resourceCard} role="status"><Lightbulb size={21}/>
      <span>{text('Можно заметить один сигнал — или только предмет в комнате. Затем решить: пауза, отдых, поддержка или ничего. Результат не обязан быть приятным.',
        'Notice one cue — or only an object nearby. Then choose a pause, rest, support or no action. The experience does not have to be pleasant.')}</span>
    </div>}
    <p className={styles.headline}>{text('Как прошла эта самостоятельная попытка?','How did this personal attempt go?')}</p>
    {choice('independent',[
      ...(!hintEverUsed?[{value:'independent',label:text('Без подсказки','Without a hint')}]:[]),
      {value:'guided',label:text('С подсказкой','With a hint')},
      {value:'deferred',label:text('Оставил(а) на потом','Deferred')},
      {value:'skip',label:text('Не пробовал(а)','Did not try')},
    ],{compact:true})}
    {helper}
  </section>

  if(kind==='day1-experience')return <section className={styles.section} data-day-one-activity="experience">
    <div className={styles.overline}><HeartHandshake size={16}/>{text('ШАГ 13 · ЗАМЕЧАЮ ИТОГ ВНУТРИ','STEP 13 · NOTICE THE INNER EXPERIENCE')}</div>
    <div className={styles.softIllustration}><Leaf size={36}/><span>{text('Любой честный ответ подходит','Every honest answer is valid')}</span></div>
    <p className={styles.headline}>{text('Что вы замечаете в своём состоянии сейчас?','What do you notice about your state now?')}</p>
    <p className={styles.hint}>{text('Это добровольное наблюдение после упражнения, не повторный диагностический тест. Причину изменений определять не нужно.',
      'This is an optional observation after the exercise, not another diagnostic test. You do not need to explain any change.')}</p>
    {choice('experience',[
      {value:'clearer',label:text('Лучше понимаю, что со мной','I understand my state better'),detail:text('Появилось название или ясность','A clearer name or sense of it'),icon:Lightbulb},
      {value:'more_choice',label:text('Могу выбрать следующий шаг','I have a little more choice'),detail:text('Даже если чувство осталось','Even if the feeling is unchanged'),icon:Compass},
      {value:'easier',label:text('Стало немного легче','I feel a little better'),detail:text('Если действительно так ощущается','Only if that is what you feel'),icon:Leaf},
      {value:'unchanged',label:text('Осталось примерно так же','It feels about the same'),detail:text('Это тоже полезное наблюдение','That is also useful information'),icon:PauseCircle},
      {value:'unsure',label:text('Не могу определить','Not sure'),icon:CircleHelp},
      {value:'uncomfortable',label:text('Стало неприятнее','It felt uncomfortable'),icon:HeartHandshake},
      {value:'skip',label:text('Не хочу оценивать','Prefer not to answer'),icon:BookOpen},
    ],{cards:true})}
    {answers.experience&&answers.experience!=='uncomfortable'&&answers.experience!=='skip'&&<div className={styles.reflectionCard} role="status">
      <span>{text('Ваше наблюдение, не доказательство эффекта','Your observation, not proof of an effect')}</span>
      <p>{answers.experience==='clearer'?text('Вы отметили больше ясности о своём состоянии.','You reported clearer awareness of your state.')
        :answers.experience==='more_choice'?text('Вы отметили, что выбор стал доступнее.','You reported more choice.')
        :answers.experience==='easier'?text('Вы отметили некоторое облегчение.','You reported some relief.')
        :answers.experience==='unchanged'?text('Вы отметили отсутствие заметных изменений.','You reported no noticeable change.')
        :text('Не обязательно знать прямо сейчас.','You do not have to know right now.')}</p>
    </div>}
  </section>

  if(kind==='day1-adapt')return <section className={styles.section} data-day-one-activity="adapt">
    <div className={styles.overline}><HeartHandshake size={16}/>{text('ШАГ 14 · УЧИТЫВАЮ СВОИ ГРАНИЦЫ','STEP 14 · RESPECT MY LIMITS')}</div>
    <p className={styles.headline}>{text('Подошёл ли вам способ замечать состояние?','Did this way of noticing your state suit you?')}</p>
    {choice('comfort',[
      {value:'comfortable',label:text('Подошёл','It suited me')},
      {value:'neutral',label:text('Нейтрально','Neutral')},
      {value:'uncomfortable',label:text('Не подошёл','It did not suit me')},
      {value:'skip',label:text('Не отвечать','Skip')},
    ],{compact:true})}
    <div className={styles.verticalRule}/>
    <p className={styles.headline}>{text('Что было бы бережнее в следующий раз?','What would be gentler next time?')}</p>
    {choice('adaptation',[
      {value:'keep',label:text('Оставить','Keep'),detail:text('Тот же темп и выбор','Same pace and choice'),icon:Check},
      {value:'simplify',label:text('Сделать короче','Make it shorter'),detail:text('Меньше внимания к ощущениям','Less attention to sensations'),icon:PauseCircle},
      {value:'neutral',label:text('Только внешний ориентир','External anchor only'),detail:text('Без обращения внутрь','No inward awareness needed'),icon:Eye},
      {value:'skip',label:text('Решу позже','Decide later'),icon:CircleHelp},
    ],{cards:true})}
    {answers.adaptation&&answers.adaptation!=='skip'&&<p className={styles.selectedNotice} role="status">
      <Check size={16}/>{text('Ваш выбор будет учтён после сохранения урока.','Your choice is applied only once the lesson is saved.')}</p>}
  </section>

  if(kind==='day1-transfer') {
    const cues={
      after_task:text('я закончу обычное дело','I finish an ordinary task'),
      hurry:text('я замечу внутреннюю спешку','I notice inner rushing'),
      before_rest:text('я соберусь отдохнуть','I am about to rest'),
      tension:text('я замечу напряжение','I notice tension'),
      fatigue:text('я замечу усталость','I notice tiredness'),
    }
    const actions={
      look:text('найти нейтральный ориентир','find an ordinary anchor'),
      pause:text('сделать короткую паузу','take a brief pause'),
      rest:text('отдохнуть','rest'),
      ask:text('попросить поддержки','ask for support'),
      none:text('ничего не предпринимать','take no action for now'),
    }
    const hasPlan=Boolean(cues[answers.transferCue]&&actions[answers.transferAction])
    return <section className={styles.section} data-day-one-activity="transfer">
      <div className={styles.overline}><Leaf size={16}/>{text('ШАГ 15 · ЗАБИРАЮ НАВЫК С СОБОЙ','STEP 15 · TAKE THIS SKILL WITH ME')}</div>
      <p className={styles.headline}>{text('Когда внутреннее состояние подскажет, что нужна поддержка?','When might your inner state signal that support could help?')}</p>
      {choice('transferCue',[
        {value:'tension',label:text('Когда чувствую напряжение','When I feel tension'),icon:Waves},
        {value:'hurry',label:text('Когда внутри спешка','When I feel rushed'),icon:Compass},
        {value:'fatigue',label:text('Когда мало сил','When I feel tired'),icon:Leaf},
        {value:'after_task',label:text('После обычного дела','After a task'),icon:Check},
        {value:'before_rest',label:text('Перед отдыхом','Before resting'),icon:PauseCircle},
        {value:'no_plan',label:text('Пока без плана','No plan now'),icon:HeartHandshake},
        {value:'skip',label:text('Пропустить','Skip'),icon:CircleHelp},
      ],{compact:true})}
      {cues[answers.transferCue]&&<>
        <p className={styles.headline}>{text('Какой небольшой ответ был бы доступен?','What small response might be possible?')}</p>
        {choice('transferAction',[
          {value:'pause',label:text('Небольшая пауза','A brief pause'),icon:PauseCircle},
          {value:'look',label:text('Внешний ориентир','An outside anchor'),icon:Eye},
          {value:'rest',label:text('Отдых','Rest'),icon:Leaf},
          {value:'ask',label:text('Обратиться за помощью','Ask for help'),icon:HeartHandshake},
          {value:'none',label:text('Пока ничего','Nothing for now'),icon:CircleHelp},
        ],{compact:true})}
      </>}
      <div className={styles.personalCard} data-personal-transfer-preview>
        <span><HeartHandshake size={16}/>{text('МОЯ КАРТОЧКА: СОСТОЯНИЕ → ПОДДЕРЖКА','MY CARD: STATE → SUPPORT')}</span>
        <strong>{skill}</strong>
        {signalLabels[answers.innerSignal]&&<p>{text('Замечаю: ','I notice: ')}{signalLabels[answers.innerSignal]}</p>}
        {needLabels[answers.innerNeed]&&<p>{text('Мне может помочь: ','What could help: ')}{needLabels[answers.innerNeed]}</p>}
        {actionLabels[answers.innerAction]&&<p>{text('Пробовал(а) или выбрал(а): ','I considered or chose: ')}{actionLabels[answers.innerAction]}</p>}
        {anchorLabels[answers.anchor]&&<p>{text('Внешняя опора: ','External anchor: ')}{anchorLabels[answers.anchor]}</p>}
        {hasPlan?<p className={styles.planSentence}>{text('Когда ','When ')}{cues[answers.transferCue]},
          {text(' я могу ',' I could ')}{actions[answers.transferAction]}.</p>
          :<p className={styles.planSentence}>{text('План пока не выбран. Сохранить урок всё равно можно.',
            'No plan chosen yet. You can still save the lesson.')}</p>}
        <small>{text('Это план, а не обещание действий или лечения. Сохранение подтвердится после ответа сервера.',
          'This is a plan, not a promise of action or treatment. Saving is confirmed by the server.')}</small>
      </div>
    </section>
  }


  return null
}
