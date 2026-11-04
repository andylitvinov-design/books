'use client'

import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,LockKeyhole,Pause,ShieldCheck,Sparkles,Trophy,X} from 'lucide-react'
import {validateOpora54Signals} from '@/lib/inner-growth/anti-stress-skills-v6'
import {OPORA_EXPERIENCE_PRE_SAVE_KEYS,OPORA_DAY_ONE_RESTORED_KEYS} from '@/lib/inner-growth/course-slide-sequence'
import {dayOneAphorism} from '@/lib/inner-growth/anti-stress-day-one'
import {welcomeFeelingChoices,welcomeFeelingSupport} from '@/lib/inner-growth/course-welcome'
import {oporaExperienceDay,oporaExperienceGuide,oporaExperienceSupport,oporaExperienceTransferChoices,oporaExperienceDepth,OPORA_EXPERIENCE_DESIGN_VERSION} from '@/lib/inner-growth/opora-as56-experience-guides'
import {oporaAs58Day,OPORA_PRIMARY_EMOTIONS,OPORA_EMOTION_DAYS,OPORA_ONE_ACTION_VERSION} from '@/lib/inner-growth/opora-as58-one-action'
import {oporaAs59Day,OPORA_SEVEN_SKILLS_EDITION} from '@/lib/inner-growth/opora-as59-seven-skills'
import {oporaAs60Day,OPORA_EXPERIENTIAL_EDITION} from '@/lib/inner-growth/opora-as60-experiential-practices'
import {oporaAs60Journey,OPORA_EXPERIENCE_SCENES} from '@/lib/inner-growth/opora-as60-integrated-journey'
import OporaOceanOutro from './opora-ocean-outro'
import {oporaEndingCopy} from '@/lib/inner-growth/opora-lesson-outro'
import {oporaGentleCopy,OPORA_GENTLE_INTRO,OPORA_GENTLE_RECAP} from '@/lib/inner-growth/opora-gentle-journey'
import {oporaAs60VariedDay,oporaAs60VariedJourney,oporaAs60DailyInsight,oporaAs60SettlingCue,OPORA_VARIETY_REVISION,OPORA_VARIETY_COPY} from '@/lib/inner-growth/opora-as60-varied-content'
import {needsOporaFirstExerciseConsent,canAdvanceOporaFirstExercise} from '@/lib/inner-growth/opora-first-exercise-consent'
import styles from './opora-experience-player.module.css'

// AS-5.6 presentation of existing AS-5.5/V7 lessons.
// Five persisted moments plus a clear, non-interactive skill rationale at step two.
// Existing server visit keys, practice signals and open sessions are preserved.
const JOURNEY_COPY=Object.freeze({
  ru:{plan:'Мой будущий маленький шаг',tried:'Попробовал(а)',read:'Только прочитал(а)',
    skip:'Не сегодня',optional:'Без оценок. Ваш выбор остаётся только на устройстве до закрытия урока.'},
  en:{plan:'My small future option',tried:'I tried it',read:'Read only',
    skip:'Not today',optional:'No grading. Your choice stays on this device until the lesson closes.'},
  es:{plan:'Un paso futuro posible',tried:'Lo probé',read:'Solo lo leí',
    skip:'Hoy no',optional:'Sin calificaciones. Tu elección queda en este dispositivo hasta cerrar la lección.'},
})
const EXPERIENCE_SCENE_KEY=Object.freeze({
  bodyExperience:'body',emotionExperience:'emotion',mentalExperience:'mental',
  imageryMeditation:'imagery',ritualPractice:'ritual',
})
const EXPERIMENT_WORDS=Object.freeze({
  ru:{title:'ПРАКТИКА-ЭКСПЕРИМЕНТ',step:'Шаг',next:'Следующий шаг',
    firstTitle:'Упражнение № 1. Мой знак опоры',
    firstInvite:'Сегодня исследуем телесный опыт, чувство, мысль и личный образ, затем сделаем маленький ритуал. Мягкая музыка по желанию. Начнём?',
    prompt:'Выберите то, что подходит',note:'Это личный выбор, а не оценка. Отмечайте попытку честно; можно остановиться или пропустить.'},
  en:{title:'TRY A MICRO-EXPERIMENT',step:'Step',next:'Next step',
    firstTitle:'Exercise 1. Find your personal anchor',
    firstInvite:'Today we explore body, feeling, thoughts and a personal image, then try a small ritual. Gentle music is optional. Shall we begin?',
    prompt:'Choose what fits',note:'This is your choice, not a score. Report only what you actually tried; you may stop or skip.'},
  es:{title:'PRUEBA UN MINIEXPERIMENTO',step:'Paso',next:'Siguiente paso',
    firstTitle:'Ejercicio 1. Mi señal de apoyo',
    firstInvite:'Hoy exploramos cuerpo, emoción, pensamiento y una imagen personal, seguidos de un pequeño ritual. La música es opcional. ¿Empezamos?',
    prompt:'Elige lo que te sirva',note:'No es una nota. Cuenta solo lo que probaste; puedes parar o saltarlo.'},
})
const WORDS={
  ru:{
    day:'День',of:'из',pause:'Пауза',close:'Закончить',back:'Назад',next:'Продолжить',
    save:'Сохранить мою практику',saving:'Сохраняем…',finish:'К карте курса',
    minute:'СНАЧАЛА — ВЫ',learn:'Маленькая практика',feel:'Что изменилось?',
    quote:'Афоризм дня',keep:'ПЛАН НА ПОТОМ',
    arriveTitle:'Как вы сейчас себя чувствуете?',
    arriveText:'Выберите то, что ближе. Здесь нет правильного ответа.',
    arriveSkip:'Можно продолжить и без ответа.',
    startFeeling:'В начале занятия',
    moods:[
      {value:'steady',symbol:'🌿',label:'Спокойно',reply:'Спасибо, что поделились. Можно просто побыть с этим состоянием.'},
      {value:'tense',symbol:'☁️',label:'Напряжённо',reply:'Спасибо, что сказали. Здесь не нужно заставлять себя расслабиться.'},
      {value:'low',symbol:'🌙',label:'Мало сил',reply:'Спасибо, что заметили. Можно идти совсем маленькими шагами.'},
      {value:'unsure',symbol:'💭',label:'Не знаю',reply:'Это тоже подходит. Необязательно сразу понимать свои чувства.'},
    ],
    arrivalWarmTitle:'Можно просто побыть здесь',
    arrivalWarmText:'Найдите взглядом одну приятную или нейтральную деталь вокруг.',
    firstExerciseTitle:'Упражнение № 1. Чуть спокойнее',
    firstExerciseInvite:'Предлагаю упражнение на одну минуту. Оно может помочь переключиться с тревожных мыслей на то, что вокруг, и немного снизить напряжение. Хотите попробовать?',
    firstExerciseYes:'Да, готов(а)',firstExerciseNo:'Не сейчас',
    firstExerciseAction:'Посмотрите на три предмета',
    firstExerciseDetail:'Для каждого мысленно назовите цвет или форму. Можно остановиться в любой момент.',
    arriveHint:'Почувствуйте опору сиденья или просто посмотрите на устойчивый предмет. Дыхание менять не нужно.',
    practiceText:'Попробуйте один небольшой шаг, только если вам комфортно.',
    supportKicker:'ЗАЧЕМ ЭТО НУЖНО',stepLabel:'Сегодня можно попробовать',coreKicker:'КЛЮЧЕВОЕ УПРАЖНЕНИЕ · ДЕНЬ 1',
    coreWhy:'ЗАЧЕМ ЭТО НУЖНО',tryPrompt:'Получилось попробовать?',
    start:'Я попробую этот шаг',alternative:'Другой мягкий вариант',tryAfter:'Как прошло?',
    tried:'Я попробовал(а)',partly:'Удалось немного',read:'Сегодня только знакомлюсь',
    gentle:'Если некомфортно, просто посмотрите на нейтральный предмет.',
    feelText:'Заметьте, изменилось ли что-то хотя бы немного.',
    feelingBetter:'Стало немного легче',feelingSame:'Примерно так же',feelingPartial:'Есть небольшие изменения',feelingHard:'Стало некомфортно',
    feelingThanks:'Спасибо, что заметили. Любой ответ подходит; состояние не оценивается баллами.',
    quoteText:'Вы согласны с этой мыслью?',
    agree:'Согласен',unsure:'Нужно подумать',disagree:'Не согласен',
    quoteThanks:'Это только ваша позиция, правильного ответа нет.',
    keepText:'Как применить сегодняшний навык? Выберите один маленький шаг на потом — или пропустите.',
    day4Task:'Перед одним привычным делом вслух назовите чувство, которое замечаете.',
    day4EmotionLabel:'Какое это чувство или эмоция? (необязательно)',
    day4EmotionPlaceholder:'Например, спокойствие',
    day4SavedLabel:'Названное чувство',
    emotionPrompt:'Какая эмоция ближе? (необязательно)',
    emotionOther:'Своя эмоция',
    emotionPlaceholder:'Или напишите, что чувствуете…',
    oneTaskIntro:'Одно действие для обычного дня',
    emotionSummary:'Названная эмоция',
    plan:'Попробую позже',noPlan:'Не сегодня',
    saved:'Ваш момент сохранён',savedText:'Вы уделили себе немного времени.',
    meditationTitle:'Завершающая медитация · 2 минуты',
    meditationKicker:'ДЕНЬ 14 · ТИХОЕ ЗАВЕРШЕНИЕ',
    meditationOptional:'По желанию: можно просто прочитать шаги и продолжить без таймера.',
    meditationSteps:[
      'Сядьте удобно и почувствуйте опору стула или пола. Дышите естественно.',
      'Включите таймер: с волнами или без звука мягко возвращайте внимание к этой опоре.',
      'Когда пройдут две минуты, осмотритесь и назовите про себя один предмет вокруг.',
    ],
    attempted:'Вы попробовали упражнение',readOnly:'Сегодня только ознакомление — выполнение не отмечено',
    takeaway:'Возможный следующий шаг',
    feedback:'Ваше наблюдение',noResult:'Можно закончить без оценок самочувствия.',
    noSave:'Сохранение не подтверждено. Проверьте соединение и повторите.',
    incomplete:'Сначала откройте оставшиеся моменты занятия.',
    safetyTitle:'Здесь можно остановиться',
    safetyBody:'Не нужно продолжать через дискомфорт. По желанию найдите взглядом обычный предмет вокруг. Дышите естественно.',
    neutralAnchor:'Если хочется, посмотрите на один обычный предмет вокруг.',
    neutralSafety:'Можно остановиться; дыхание менять не нужно.',
    safetyNeutral:'Вернуться с нейтральной опорой',safetyBack:'Вернуться',safetyEnd:'Закончить без сохранения',
    ideaTitle:'Афоризм дня',reminderTitle:'Маленький шаг в жизни',feelTitle:'Как сейчас?',
    learnMore:'Показать мягкую подсказку',noMedical:'Самостоятельная практика, не диагностика и не лечение.',
    preview:{
      weekOneKicker:'ДНИ 1–7',weekOneTitle:'Первая неделя: найти опору',
      weekTwoKicker:'ДНИ 8–14',weekTwoTitle:'Вторая неделя: свой опыт',
      weekLead:'Один небольшой шаг каждый день.',
      nextKicker:'МОЯ КАРТА КУРСА',nextTitle:'Ваш путь из 14 дней',
      nextLead:'Пролистайте весь маршрут: темы открыты для просмотра, сами занятия — по расписанию.',
      progress:'Пройдено дней',mapHint:'Нажмите на любой день, чтобы увидеть практику.',
      done:'Пройдено',today:'Сегодня',next:'Следующий',later:'Впереди',
      locked:'Урок откроется в назначенный день.',
      practice:'Практика',completeTitle:'Ваши 14 дней позади',
      completeLead:'Ваши наблюдения сохранены в карте курса.',
      completeNote:'Итоговые тесты можно повторить, когда откроется опрос.',
    },seeProgram:'Посмотреть, что дальше',
    habitTitle:'ОПОРА всегда под рукой',habitKicker:'ПО ЖЕЛАНИЮ · ПОСЛЕ УРОКА',
    habitLead:'Хотите, чтобы уроки были рядом, когда вы открываете YouTube?',
    habitBenefit:'Курс на главном экране и мягкая пауза перед YouTube — только с вашего согласия.',
    habitConfigure:'Настроить',habitLater:'Не сейчас',
    habitFallback:'Настроить можно также на странице курса в Holistic House.',
  },
  en:{
    day:'Day',of:'of',pause:'Pause',close:'End lesson',back:'Back',next:'Continue',
    save:'Save my practice',saving:'Saving…',finish:'My course map',
    minute:'A MOMENT FOR YOU',learn:'A small practice',feel:'What do you notice?',
    quote:'TODAY’S THOUGHT',keep:'A PLAN FOR LATER',
    arriveTitle:'How are you feeling right now?',
    arriveText:'Choose what feels closest. There is no right answer.',
    arriveSkip:'You can continue without answering.',
    startFeeling:'At the start',
    moods:[
      {value:'steady',symbol:'🌿',label:'Calm',reply:'Thank you for sharing. You can begin just as you are.'},
      {value:'tense',symbol:'☁️',label:'Tense',reply:'Thank you for sharing. You do not have to make yourself relax.'},
      {value:'low',symbol:'🌙',label:'Tired',reply:'Thank you for noticing. We can go one small step at a time.'},
      {value:'unsure',symbol:'💭',label:'Not sure',reply:'That is okay, too. You do not have to name a feeling to begin.'},
    ],
    arrivalWarmTitle:'You can arrive just as you are',
    arrivalWarmText:'Find one calm or pleasant detail around you.',
    firstExerciseTitle:'Exercise 1. Find a little calm',
    firstExerciseInvite:'I’d like to offer a one-minute exercise. It may help shift your attention away from stressful thoughts and ease tension a little. Would you like to try it?',
    firstExerciseYes:"Yes, I’m ready",firstExerciseNo:'Not now',
    firstExerciseAction:'Look at three objects',
    firstExerciseDetail:'For each one, notice its colour or shape. You can stop at any time.',
    arriveHint:'Feel the support of your seat, or simply look at a steady object. No need to change your breathing.',
    practiceText:'Try one small step, only if it feels comfortable.',
    supportKicker:'WHY WE PRACTISE',stepLabel:'A gentle step for today',coreKicker:'KEY PRACTICE · DAY 1',
    coreWhy:'WHY IT HELPS',tryPrompt:'Did you try it?',
    start:'I will try this step',alternative:'Another gentle option',tryAfter:'How did that go?',
    tried:'I tried it',partly:'I tried a little',read:'Just reading today',
    gentle:'If uncomfortable, simply look at a neutral object instead.',
    feelText:'Notice whether anything feels a little different.',
    feelingBetter:'A little easier',feelingSame:'About the same',feelingPartial:'A small shift',feelingHard:'Uncomfortable',
    feelingThanks:'Thank you for noticing. There is no score or right answer.',
    quoteText:'Do you agree with this thought?',
    agree:'Agree',unsure:'Need to think',disagree:'Disagree',
    quoteThanks:'Your response is yours. There is no correct answer.',
    keepText:'How might you use today’s skill? Choose one small step for later, or skip.',
    day4Task:'Before one routine task, say aloud the feeling you notice.',
    day4EmotionLabel:'What feeling or emotion is it? (optional)',
    day4EmotionPlaceholder:'For example, calm',
    day4SavedLabel:'Feeling named',
    emotionPrompt:'Which emotion feels closest? (optional)',
    emotionOther:'Your own feeling',
    emotionPlaceholder:'Or write what you feel…',
    oneTaskIntro:'One action for everyday life',
    emotionSummary:'Feeling named',
    plan:'I might try this',noPlan:'Not today',
    saved:'Your moment is saved',savedText:'You made a little space for yourself.',
    meditationTitle:'A gentle two-minute ending',
    meditationKicker:'DAY 14 · A QUIET ENDING',
    meditationOptional:'Optional: you may read the steps and continue without using the timer.',
    meditationSteps:[
      'Sit comfortably and notice the chair or floor supporting you. Breathe naturally.',
      'Start the timer: with waves or in silence, gently bring your attention back to that support.',
      'After two minutes, look around and silently name one object you can see.',
    ],
    attempted:'You reported trying the exercise',readOnly:'Explored the idea only — no attempt recorded',
    takeaway:'Possible next step',feedback:'Your observation',noResult:'You can finish without rating yourself.',
    noSave:'Saving was not confirmed. Check the connection and try again.',
    incomplete:'Please open the remaining moments before saving.',
    safetyTitle:'You may stop here',
    safetyBody:'You do not need to push through discomfort. If you wish, look for an ordinary object around you. Let your breath remain natural.',
    neutralAnchor:'If you wish, look at one ordinary object around you.',
    neutralSafety:'You can stop; no need to change your breathing.',
    safetyNeutral:'Return with a neutral anchor',safetyBack:'Go back',safetyEnd:'End without saving',
    ideaTitle:'Today’s thought',reminderTitle:'A small step in real life',feelTitle:'How do you feel now?',
    learnMore:'Show gentle guidance',noMedical:'Self-guided learning, not diagnosis or treatment.',
    preview:{
      weekOneKicker:'DAYS 1–7',weekOneTitle:'Week 1: Find your supports',
      weekTwoKicker:'DAYS 8–14',weekTwoTitle:'Week 2: Make it your own',
      weekLead:'One small step each day.',
      nextKicker:'MY COURSE MAP',nextTitle:'Your complete 14-day journey',
      nextLead:'Scroll through the whole path. You can preview every topic; lessons unlock on schedule.',
      progress:'Days completed',mapHint:'Tap any day to preview its practice.',
      done:'Completed',today:'Today',next:'Up next',later:'Coming later',
      locked:'This lesson opens on its scheduled day.',
      practice:'Practice',completeTitle:'Your 14 days are complete',
      completeLead:'Your observations are saved in the course map.',
      completeNote:'Optional retesting opens when the final check-in is available.',
    },seeProgram:"See what's next",
    habitTitle:'Keep OPORA close',habitKicker:'OPTIONAL · AFTER YOUR LESSON',
    habitLead:'Would you like a gentle reminder of your lesson before YouTube?',
    habitBenefit:'Add OPORA to your Home Screen and set up the YouTube pause only if you choose.',
    habitConfigure:'Set it up',habitLater:'Not now',
    habitFallback:'You can also set this up from your Holistic House course page.',
  },
}
WORDS.es = {
  ...WORDS.en,
  day:'Día',pause:'Pausa',close:'Cerrar lección',back:'Atrás',next:'Continuar',
  save:'Guardar mi práctica',saving:'Guardando…',finish:'Mapa del curso',
  minute:'UN MOMENTO PARA TI',learn:'Una práctica pequeña',feel:'¿Qué notas?',
  quote:'UNA IDEA PARA HOY',keep:'UN PASO PARA DESPUÉS',
  arriveTitle:'¿Cómo te sientes ahora?',
  arriveText:'Elige lo que más se acerque. No hay respuesta correcta.',
  arriveSkip:'Puedes continuar sin responder.',
  startFeeling:'Al empezar',
  moods:[
    {value:'steady',symbol:'🌿',label:'En calma',reply:'Gracias por compartirlo. Puedes empezar tal como estás.'},
    {value:'tense',symbol:'☁️',label:'Con tensión',reply:'Gracias por contarlo. No tienes que obligarte a relajarte.'},
    {value:'low',symbol:'🌙',label:'Sin energía',reply:'Gracias por notarlo. Podemos ir poco a poco.'},
    {value:'unsure',symbol:'💭',label:'No lo sé',reply:'También está bien. No necesitas definir lo que sientes para empezar.'},
  ],
    arrivalWarmTitle:'Puedes llegar tal como estás',
    arrivalWarmText:'Encuentra con la mirada un detalle agradable o neutro.',
    firstExerciseTitle:'Ejercicio 1. Un poco más de calma',
    firstExerciseInvite:'Te propongo un ejercicio de un minuto. Puede ayudarte a apartar la atención de las preocupaciones y aliviar algo de tensión. ¿Quieres probarlo?',
    firstExerciseYes:'Sí, quiero probar',firstExerciseNo:'Ahora no',
    firstExerciseAction:'Mira tres objetos',
    firstExerciseDetail:'Fíjate en el color o la forma de cada uno. Puedes parar cuando quieras.',
    arriveHint:'Mira un objeto estable a tu alrededor; no necesitas cambiar tu respiración.',
    practiceText:'Prueba un gesto pequeño si te resulta cómodo.',
  supportKicker:'PARA QUÉ PRACTICAMOS',stepLabel:'UN PASO AMABLE',coreKicker:'PRÁCTICA CLAVE · DÍA 1',
  coreWhy:'POR QUÉ AYUDA',tryPrompt:'¿Lo intentaste?',tryAfter:'¿Cómo te fue?',
  tried:'Lo intenté',partly:'Un poquito',read:'Hoy solo leo',
  gentle:'Si te incomoda, mira un objeto neutro.',
  feelText:'Nota si algo cambió, aunque sea un poco.',
  feelingBetter:'Un poco mejor',feelingSame:'Más o menos igual',feelingPartial:'Un pequeño cambio',feelingHard:'Incómodo',
  quoteText:'¿Estás de acuerdo con esta idea?',agree:'De acuerdo',unsure:'Quiero pensarlo',disagree:'En desacuerdo',
  keepText:'¿Cómo podrías usar esta habilidad? Elige un gesto pequeño para más tarde o sáltalo.',plan:'Quizá lo intente',noPlan:'Hoy no',
  day4Task:'Antes de una tarea cotidiana, di en voz alta la emoción que notas.',
  day4EmotionLabel:'¿Qué sentimiento o emoción es? (opcional)',
  day4EmotionPlaceholder:'Por ejemplo, calma',
  day4SavedLabel:'Emoción nombrada',
  emotionPrompt:'¿Qué emoción se acerca más? (opcional)',
  emotionOther:'Tu propia emoción',
  emotionPlaceholder:'O escribe lo que sientes…',
  oneTaskIntro:'Una acción para la vida cotidiana',
  emotionSummary:'Emoción nombrada',
  saved:'Tu momento se ha guardado',savedText:'Te diste un pequeño espacio.',
  meditationTitle:'Meditación final · 2 minutos',
  meditationKicker:'DÍA 14 · UN CIERRE TRANQUILO',
  meditationOptional:'Es opcional: también puedes leer los pasos y continuar sin usar el temporizador.',
  meditationSteps:[
    'Siéntate cómodamente y siente el apoyo de la silla o del suelo. Respira con naturalidad.',
    'Inicia el temporizador: con olas o en silencio, vuelve suavemente a notar ese apoyo.',
    'Al terminar los dos minutos, mira alrededor y nombra mentalmente un objeto.',
  ],
  attempted:'Has indicado que probaste la práctica',readOnly:'Solo exploraste la idea; no registraste un intento',
  takeaway:'Posible siguiente paso',feedback:'Tu sensación',noResult:'Puedes terminar sin evaluarte.',
  noSave:'No se confirmó el guardado. Revisa la conexión e inténtalo otra vez.',
  incomplete:'Abre los momentos restantes antes de guardar.',
  safetyTitle:'Puedes parar aquí',
  safetyBody:'No tienes que seguir si te incomoda. Mira un objeto neutro y respira con naturalidad.',
  neutralAnchor:'Si quieres, mira un objeto neutro a tu alrededor.',
  neutralSafety:'Puedes parar; no necesitas cambiar tu respiración.',
  safetyNeutral:'Volver con una referencia neutra',safetyBack:'Volver',safetyEnd:'Salir sin guardar',
  learnMore:'Ver una pista suave',noMedical:'Aprendizaje personal, no diagnóstico ni tratamiento.',
  preview:{
    weekOneKicker:'DÍAS 1–7',weekOneTitle:'Semana 1: Encuentra tus apoyos',
    weekTwoKicker:'DÍAS 8–14',weekTwoTitle:'Semana 2: Hazlo a tu manera',
    weekLead:'Un paso pequeño cada día.',
    nextKicker:'MI MAPA DEL CURSO',nextTitle:'Tu recorrido completo de 14 días',
    nextLead:'Desliza para ver todos los días. Puedes explorar cada tema; las lecciones se desbloquean según el calendario.',
    progress:'Días completados',mapHint:'Toca un día para ver su práctica.',
    done:'Completado',today:'Hoy',next:'Siguiente',later:'Más adelante',
    locked:'Esta lección se abre en la fecha prevista.',
    practice:'Práctica',completeTitle:'Has completado los 14 días',
    completeLead:'Tus observaciones siguen guardadas en el mapa.',
    completeNote:'Puedes repetir las pruebas cuando se abra el control final.',
  },seeProgram:'Ver qué viene después',
  habitTitle:'OPORA siempre contigo',habitKicker:'OPCIONAL · DESPUÉS DE LA LECCIÓN',
  habitLead:'¿Quieres recordar tu lección antes de abrir YouTube?',
  habitBenefit:'Añade OPORA a la pantalla de inicio y configura la pausa solo si lo deseas.',
  habitConfigure:'Configurar',habitLater:'Ahora no',
  habitFallback:'También puedes configurarlo en la página del curso de Holistic House.',
  ideaTitle:'Idea del día',reminderTitle:'Un paso en la vida real',feelTitle:'¿Cómo estás ahora?',
}
// The five original lesson-one opening screens stay separate, and precede action.
const OPENING={
  en:{
    welcome:'How are you feeling today?',welcomeLead:'What feels closest to you right now?',
    welcomeNote:'There is no right answer. You can simply continue.',
    baseline:'How much inner support do you feel?',baselineLead:'If you wish, rate the support you feel right now.',
    baselineLow:'0 · No support',baselineHigh:'10 · Strong support',
    checkin:'How strong was your concern?',checkinLead:'Over the past 24 hours, how strongly did this concern bother you?',
    checkinLow:'0 · No concern',checkinHigh:'10 · Very strong concern',
    scaleNote:'Optional. This is your observation, not a test.',
    recall:'Remember what helps',recallLead:'What has helped you feel a little steadier before?',
    recallReply:'A familiar source of support can be enough for today.',
    ownSupportLabel:'Or write your own',ownSupportPlaceholder:'Your own answer (optional)',
    supportOptions:[['pause','A short pause'],['rest','A little rest'],['connection','Kind contact'],['orient','Looking around'],['unsure','Not sure yet']],
    thought:'A thought for today',thoughtLead:'How does this idea feel to you?',
    response:'Thank you. Your view is welcome; there is no correct answer.',
    welcomeKicker:'WELCOME · YOUR PACE',baselineKicker:'OPTIONAL · RIGHT NOW',
    checkinKicker:'OPTIONAL · PAST 24 HOURS',recallKicker:'A FAMILIAR RESOURCE',
    thoughtKicker:'A GENTLE THOUGHT',
  },
  ru:{
    welcome:'Как вы себя чувствуете сегодня?',welcomeLead:'Какое состояние вам сейчас ближе?',
    welcomeNote:'Правильного ответа нет. Можно просто продолжить.',
    baseline:'Насколько вы сейчас чувствуете внутреннюю опору?',baselineLead:'Если хотите, оцените силу внутренней опоры сейчас.',
    baselineLow:'0 · Нет опоры',baselineHigh:'10 · Сильная опора',
    checkin:'Насколько сильным было беспокойство?',checkinLead:'Оцените силу беспокойства за последние 24 часа.',
    checkinLow:'0 · Не беспокоило',checkinHigh:'10 · Очень сильно',
    scaleNote:'Это необязательное наблюдение, не тест.',
    recall:'Вспомним знакомую опору',recallLead:'Что раньше помогало вам почувствовать себя немного устойчивее?',
    recallReply:'Можно опереться на то, что вам уже знакомо.',
    ownSupportLabel:'Или напишите свой вариант',ownSupportPlaceholder:'Ваш вариант (необязательно)',
    supportOptions:[['pause','Короткая пауза'],['rest','Немного отдыха'],['connection','Тёплый контакт'],['orient','Осмотреться вокруг'],['unsure','Пока не знаю']],
    thought:'Мысль сегодняшнего дня',thoughtLead:'Как вам откликается эта мысль?',
    response:'Спасибо. Любое отношение подходит; правильного ответа нет.',
    welcomeKicker:'НАЧИНАЕМ · В ВАШЕМ ТЕМПЕ',baselineKicker:'ПО ЖЕЛАНИЮ · СЕЙЧАС',
    checkinKicker:'ПО ЖЕЛАНИЮ · ЗА СУТКИ',recallKicker:'ЗНАКОМАЯ ОПОРА',
    thoughtKicker:'МЯГКАЯ МЫСЛЬ',
  },
  es:{
    welcome:'¿Cómo te sientes hoy?',welcomeLead:'¿Qué sensación se acerca más a la tuya?',
    welcomeNote:'No hay respuesta correcta. Puedes continuar sin responder.',
    baseline:'¿Cuánto apoyo interior sientes?',baselineLead:'Si quieres, valora el apoyo que sientes ahora.',
    baselineLow:'0 · Sin apoyo',baselineHigh:'10 · Mucho apoyo',
    checkin:'¿Qué tan intensa fue tu preocupación?',checkinLead:'En las últimas 24 horas, ¿cuánto te preocupó?',
    checkinLow:'0 · Sin preocupación',checkinHigh:'10 · Muy intensa',
    scaleNote:'Es una observación opcional, no un examen.',
    recall:'Recuerda lo que te ayuda',recallLead:'¿Qué te ha ayudado a sentirte un poco más estable?',
    recallReply:'Puedes apoyarte en algo que ya conoces.',
    ownSupportLabel:'O escribe tu opción',ownSupportPlaceholder:'Tu respuesta (opcional)',
    supportOptions:[['pause','Una pausa'],['rest','Descansar'],['connection','Contacto amable'],['orient','Mirar alrededor'],['unsure','Aún no lo sé']],
    thought:'Una idea para hoy',thoughtLead:'¿Qué te parece esta idea?',
    response:'Gracias. No hay una respuesta correcta.',
    welcomeKicker:'BIENVENIDA · A TU RITMO',baselineKicker:'OPCIONAL · AHORA',
    checkinKicker:'OPCIONAL · ÚLTIMAS 24 H',recallKicker:'UN RECURSO CONOCIDO',
    thoughtKicker:'UNA IDEA AMABLE',
  },
}

function OpeningRating({label,value,onChange,disabled,low,high}){
  return <>
    <div className={styles.ratingGrid} role="group" aria-label={label}>
      {Array.from({length:11},(_,number)=><button key={number} type="button"
        disabled={disabled} aria-pressed={value===number}
        onClick={()=>onChange(number)}>{number}</button>)}
    </div>
    <div className={styles.ratingBounds}><span>{low}</span><span>{high}</span></div>
  </>
}


/**
 * Read-only course roadmap. Previewing a locked card never changes the
 * learner's schedule, progress or server-owned completion state.
 */
function OporaCoursePath({locale,cycle,saved,roadmap,words,oneAction=false,edition59=false,edition60=false}){
  const courseDay=Number.isInteger(cycle.day)?cycle.day:1
  const previouslySaved=new Set((Array.isArray(roadmap)?roadmap:[])
    .filter(item=>item.status==='completed').map(item=>item.day))
  const days=Array.from({length:14},(_,index)=>{
    const day=index+1
    const completed=previouslySaved.has(day)||day<courseDay||(day===courseDay&&saved)
    const status=completed?'completed':day===courseDay?'today':day===courseDay+1?'next':'locked'
    return {day,status,copy:edition60?oporaAs60Day(day,locale):edition59?oporaAs59Day(day,locale):oneAction?oporaAs58Day(day,locale):oporaExperienceDay(day,locale)}
  })
  const count=days.filter(item=>item.status==='completed').length
  const p=words.preview
  const stateLabel={completed:p.done,today:p.today,next:p.next,locked:p.later}
  return <div className={styles.coursePath} data-opora-course-map="all-14-days">
    {courseDay===14&&saved&&<p className={styles.pathFinish}>
      <Trophy size={21} aria-hidden="true"/>
      <span><strong>{p.completeTitle}</strong> {p.completeLead} {p.completeNote}</span>
    </p>}
    <p className={styles.pathIntro}>{p.nextLead}</p>
    <div className={styles.pathProgress}>
      <span>{p.progress} <strong>{count}/14</strong></span>
      <progress max={14} value={count} aria-label={p.progress}/>
    </div>
    <p className={styles.pathHint}>{p.mapHint}</p>
    {Array.from({length:2},(_,week)=>{
      const weekDays=days.slice(week*7,(week+1)*7)
      return <section className={styles.pathChapter} key={week}
        aria-label={week===0?p.weekOneTitle:p.weekTwoTitle}>
        <div className={styles.pathChapterHead}>
          <span>{week===0?p.weekOneKicker:p.weekTwoKicker}</span>
          <h3>{week===0?p.weekOneTitle:p.weekTwoTitle}</h3>
        </div>
        <ol className={styles.pathList} start={week*7+1}>
          {weekDays.map(item=>{
            const Icon=item.day===14?Trophy:item.status==='completed'?CheckCircle2:
              item.status==='today'?Sparkles:item.status==='next'?ArrowRight:LockKeyhole
            return <li key={item.day} className={styles.pathItem}
              data-day-status={item.status} data-opora-journey-day={item.day}>
              <span className={styles.pathNode} aria-hidden="true"><Icon size={21}/></span>
              <details className={styles.pathCard}>
                <summary aria-current={item.status==='today'?'step':undefined}>
                  <span className={styles.pathCardMeta}>
                    {words.day} {item.day}/14 · {stateLabel[item.status]}
                  </span>
                  <strong>{item.copy?.title}</strong>
                  <ChevronDown size={16} aria-hidden="true"/>
                </summary>
                <div className={styles.pathPractice}>
                  <p><strong>{p.practice}:</strong> {item.copy?.practice}</p>
                  {(item.status==='next'||item.status==='locked')&&<small>{p.locked}</small>}
                </div>
              </details>
            </li>
          })}
        </ol>
      </section>
    })}
  </div>
}

// A vocabulary, not a second assignment or a mental-health score.
function EmotionVocabulary({locale,day,choice,textValue,onChoice,onText,disabled,copy}){
  const fieldId='opora-emotion-day-'+day
  const labelId='opora-emotion-choice-label-'+day
  return <div className={styles.emotionPicker} data-opora-emotion-picker="true">
    <p id={labelId} className={styles.emotionPrompt}>{copy.emotionPrompt}</p>
    <div className={styles.emotionChoices} role="group" aria-labelledby={labelId}>
      {OPORA_PRIMARY_EMOTIONS.map(emotion=><button type="button" key={emotion.value}
        disabled={disabled} data-symbol={emotion.symbol}
        aria-pressed={choice===emotion.value}
        onClick={()=>onChoice(emotion.value)}>{emotion.label[locale]}</button>)}
    </div>
    <label className={styles.emotionOwnLabel} htmlFor={fieldId}>
      {day===4?copy.day4EmotionLabel:copy.emotionOther}</label>
    <input id={fieldId} className={styles.emotionOwnInput} type="text"
      maxLength={60} autoComplete="off" disabled={disabled}
      data-opora-transfer-feeling={day===4?'true':undefined}
      data-opora-own-emotion={day===11?'true':undefined}
      value={textValue} placeholder={day===4?copy.day4EmotionPlaceholder:copy.emotionPlaceholder}
      onChange={event=>onText(event.target.value)}/>
  </div>
}

export default function OporaExperiencePlayer({locale='en',data,busy=false,onClose,onFinish,onSession,habitSetupContent=null,reviewOnly=false}){
  const lang=locale==='ru'?'ru':locale==='es'?'es':'en',t=WORDS[lang]
  const lesson=data?.lesson||{},cycle=data?.cycle||{},authored=lesson?.opora54||{}
  const hasSaved=Boolean(data?.currentSession)
  const scenes=cycle.day===1?OPORA_DAY_ONE_RESTORED_KEYS:OPORA_EXPERIENCE_PRE_SAVE_KEYS
  const showIntegratedJourney=!hasSaved||data?.currentSession?.signals?.opora54?.answers?.experienceEdition===OPORA_EXPERIENTIAL_EDITION
  // Day 1 retains the five restored opening screens. Days 2–14 have four
  // extra editorial moments before practice, all private and non-persisted.
  // The existing Today's Practice card now introduces the goal immediately
  // before the actual activity. Keep its editorial key unpersisted and render
  // it only once; the server's visitedSlideKeys retain their original order.
  const openingScenes=scenes.slice(1).flatMap(scene=>
    scene==='practice'?[
      'recapPractice',
      ...(showIntegratedJourney?OPORA_EXPERIENCE_SCENES.slice(0,4):[]),
      scene,
      ...(showIntegratedJourney?OPORA_EXPERIENCE_SCENES.slice(4):[]),
    ]:[scene])
  const displayScenes=cycle.day===1
    ?[scenes[0],'support',...openingScenes]
    :[scenes[0],'support',...OPORA_GENTLE_INTRO,...openingScenes]
  // The optional 2-minute closing meditation belongs near the end of the
  // 14-day programme, not inside every daily practice card. This editorial
  // screen never changes persisted visit keys or reports a practice attempt.
  const flowScenes=[...displayScenes,...OPORA_GENTLE_RECAP.filter(scene=>
    scene!=='recapPractice').flatMap(scene=>
    cycle.day===14&&!showIntegratedJourney&&scene==='recapFeedback'?['closingMeditation',scene]:[scene])]
  const [step,setStep]=useState(reviewOnly?0:hasSaved?flowScenes.length:0)
  const [previewIndex,setPreviewIndex]=useState(-1)
  const [habitSetup,setHabitSetup]=useState(false)
  const [inviteOpen,setInviteOpen]=useState(false)
  const [saved,setSaved]=useState(hasSaved)
  // The session's editorial edition must survive a server-confirmed save and
  // a full refresh. Historic sessions without this key still use old copy.
  const [answers,setAnswers]=useState(()=>{
    const prior=data?.currentSession?.signals?.opora54?.answers||{}
    return hasSaved?prior:{...prior,experienceEdition:OPORA_EXPERIENTIAL_EDITION,contentRevision:OPORA_VARIETY_REVISION}
  })
  const [practiceEmotionChoice,setPracticeEmotionChoice]=useState(
    data?.currentSession?.signals?.practiceEmotion?.choice||null)
  const [practiceEmotionText,setPracticeEmotionText]=useState(
    data?.currentSession?.signals?.practiceEmotion?.customText||
    (cycle.day===4?data?.currentSession?.signals?.opora54?.answers?.transferFeeling:'')||'')
  const [welcomeFeeling,setWelcomeFeeling]=useState(data?.currentSession?.signals?.welcomeFeeling||null)
  const [openingResource,setOpeningResource]=useState(data?.currentSession?.signals?.oporaOpening?.resource??null)
  // Keep the stored lastDayDifficulty key and 0→10 severity direction for existing records.
  const [openingDifficulty,setOpeningDifficulty]=useState(data?.currentSession?.signals?.oporaOpening?.lastDayDifficulty??null)
  const [familiarSupport,setFamiliarSupport]=useState(data?.currentSession?.signals?.oporaOpening?.familiarSupport||null)
  const [familiarSupportText,setFamiliarSupportText]=useState(data?.currentSession?.signals?.oporaOpening?.familiarSupportText||'')
  // Editorial stepper and choice are ephemeral. They are NOT a saved health
  // record and do NOT certify that an exercise was attempted.
  const [microStep,setMicroStep]=useState(0)
  const [microChoice,setMicroChoice]=useState('')
  const [channelAttempts,setChannelAttempts]=useState({})
  const [practiceReport,setPracticeReport]=useState(
    data?.currentSession?.signals?.practiceAttempt==='tried'?'tried':
    data?.currentSession?.signals?.practiceAttempt==='simplified'?'partly':null)
  const [showHelp,setShowHelp]=useState(false)
  const [firstExerciseAccepted,setFirstExerciseAccepted]=useState(false)
  const [neutralSupport,setNeutralSupport]=useState(false)
  const [safety,setSafety]=useState(false)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const operation=useRef(null)
  const visited=useRef(new Set([scenes[0]]))
  const heading=useRef(null),safetyTrigger=useRef(null),safetyPrimary=useRef(null)
  const safetyBack=useRef(null),safetyEnd=useRef(null),wasPaused=useRef(false)
  const locked=Boolean(busy||saving)
  const recap=step>=displayScenes.length&&step<flowScenes.length&&!saved
  const receipt=step>=flowScenes.length&&saved
  // Optional device setup comes after the verified save and the next-day commitment.
  const previewScreens=cycle.day===1?['nextStep','habit']:['nextStep']
  const inPreview=receipt&&previewIndex>=0&&!inviteOpen
  const moment=inviteOpen?'invite':inPreview?previewScreens[previewIndex]:
    receipt?'receipt':flowScenes[step]
  const newDayOneIntro=cycle.day===1&&!hasSaved&&!reviewOnly
  const firstExerciseInvite=needsOporaFirstExerciseConsent({day:cycle.day,moment,hasSaved,reviewOnly})
  const previewTotal=flowScenes.length+2+previewScreens.length
  const previewStep=inviteOpen?previewTotal:inPreview?flowScenes.length+2+previewIndex:
    receipt?flowScenes.length+1:Math.min(step+1,previewTotal)
  const opening=OPENING[lang]
  const c=oporaEndingCopy(lang),j=oporaGentleCopy(lang)
  const dayCopy=oporaExperienceDay(cycle.day,lang)
  // Only unsaved activities or records explicitly marked AS-5.9 use this
  // edition. Old saved receipts keep their original exercise/quotation/plan.
  const showSkill60=showIntegratedJourney
  const showVariety=showSkill60&&answers.contentRevision===OPORA_VARIETY_REVISION
  const editorial=OPORA_VARIETY_COPY[lang]
  const showSkill59=!showSkill60&&answers.experienceEdition===OPORA_SEVEN_SKILLS_EDITION
  const showCurrentSkill=showSkill60||showSkill59
  const dailyPlan=showVariety?oporaAs60VariedDay(cycle.day,lang):
    showSkill60?oporaAs60Day(cycle.day,lang):
    showSkill59?oporaAs59Day(cycle.day,lang):oporaAs58Day(cycle.day,lang)
  const showNewPlan=showCurrentSkill||answers.experienceEdition==='as-5.8-one-action-v1'
  const support=showCurrentSkill
    ?{title:dailyPlan?.purposeTitle,body:dailyPlan?.purpose}
    :oporaExperienceSupport(cycle.day,lang)
  const depth=showCurrentSkill
    ?{why:dailyPlan?.purpose,scenario:dailyPlan?.scenario,
      alternative:dailyPlan?.alternative,everyday:dailyPlan?.transfer}
    :oporaExperienceDepth(cycle.day,lang)
  const journey=showVariety?oporaAs60VariedJourney(cycle.day,lang):
    showSkill60?oporaAs60Journey(cycle.day,lang):null
  const channel=EXPERIENCE_SCENE_KEY[moment]||null
  const channelCard=channel?journey?.[channel]:null
  const practiceGuide=(showNewPlan?dailyPlan?.practice:null)||
    oporaExperienceGuide(cycle.day,lang)||authored.screens?.find(screen=>screen.key==='act')?.text||t.practiceText
  const legacyPlan=dayCopy?.reminder||authored.exercises?.transfer?.choices?.[0]||lesson.workbook?.microPractice||''
  const transferChoices=oporaExperienceTransferChoices(cycle.day,lang)
  const selectedTransfer=transferChoices.find(choice=>choice.value===answers.transferChoice)?.label
  // A version marker keeps old two/three actions readable without retroactively
  // rewriting historical receipts. A planned step is never a completed attempt.
  const plan=answers.transferPlanVersion==='one-v1'?dailyPlan?.transfer||'':
    cycle.day===4&&answers.transferFeeling?.trim()?t.day4Task:
    answers.transferChoice==='one'?legacyPlan:selectedTransfer||''
  const originalQuote=showCurrentSkill?dailyPlan?.quote:
    (lang==='es'?dayCopy?.quote:null)||authored.quote||lesson.aphorism||''
  const quote=showCurrentSkill?originalQuote:
    cycle.day===1&&lang!=='es'?dayOneAphorism(lang,cycle.activeGoal||cycle.primaryGoal,originalQuote):originalQuote
  const rating=answers.reflection
  const vote=answers.aphorism
  const chosenFeeling=t.moods.find(item=>item.value===welcomeFeeling)
  const chosenFeelingLabel=cycle.day===1
    ?welcomeFeelingChoices(cycle.activeGoal||cycle.primaryGoal,lang).find(item=>item.id===welcomeFeeling)?.label
    :chosenFeeling?.label
  const namedEmotion=OPORA_PRIMARY_EMOTIONS.find(item=>item.value===practiceEmotionChoice)?.label[lang]||
    practiceEmotionText.trim()||answers.transferFeeling?.trim()||''
  const ratingText=rating==='useful'?t.feelingBetter:rating==='partly'?t.feelingPartial:
    rating==='unchanged'?t.feelingSame:rating==='uncomfortable'?t.feelingHard:''
  useEffect(()=>{
    if(step<displayScenes.length&&displayScenes[step]!=='support')visited.current.add(displayScenes[step])
    heading.current?.focus?.()
  },[step,receipt,previewIndex,inviteOpen])
  useEffect(()=>{
    if(safety){wasPaused.current=true;safetyPrimary.current?.focus?.()}
    else if(wasPaused.current)safetyTrigger.current?.focus?.()
  },[safety])
  function pauseKeys(event){
    if(event.key==='Escape'){event.preventDefault();setSafety(false);return}
    if(event.key!=='Tab')return
    const nodes=[safetyPrimary.current,safetyBack.current,safetyEnd.current].filter(Boolean)
    const at=nodes.indexOf(event.target)
    if(event.shiftKey&&at<=0){event.preventDefault();nodes[nodes.length-1]?.focus?.()}
    else if(!event.shiftKey&&at===nodes.length-1){event.preventDefault();nodes[0]?.focus?.()}
  }
  function updateEmotionChoice(value){
    if(locked)return
    const nextChoice=practiceEmotionChoice===value?null:value
    setPracticeEmotionChoice(nextChoice)
    setPracticeEmotionText('')
    if(cycle.day===4){
      setAnswers(a=>({...a,transferFeeling:undefined,
        transfer:nextChoice?'planned':undefined,
        transferChoice:nextChoice?'two':undefined,
        transferPlanVersion:nextChoice?'one-v1':undefined}))
    }
  }
  function updateEmotionText(value){
    if(locked)return
    const textValue=value.slice(0,60),entered=Boolean(textValue.trim())
    setPracticeEmotionText(textValue)
    setPracticeEmotionChoice(null)
    if(cycle.day===4){
      setAnswers(a=>({...a,transferFeeling:undefined,
        transfer:entered?'planned':undefined,
        transferChoice:entered?'two':undefined,
        transferPlanVersion:entered?'one-v1':undefined}))
    }
  }
  function tryStatus(value){
    if(locked)return
    // Report the guide as an experience, NOT as having executed the
    // original AS-5.5 multiple-choice exercise. The old exercise answers
    // remain absent so neither the receipt nor analytics invents an action.
    setPracticeReport(value)
  }
  function returnWithNeutralAnchor(){
    // A safety return is separate from voluntarily opening the practice hint.
    setShowHelp(false)
    setNeutralSupport(true)
    setSafety(false)
  }
  function acceptFirstExercise(){
    if(locked||!firstExerciseInvite)return
    setFirstExerciseAccepted(true)
    setError('');setShowHelp(false)
    setStep(s=>Math.min(flowScenes.length-1,s+1))
  }
  function next(){
    if(locked||!canAdvanceOporaFirstExercise({
      day:cycle.day,moment,hasSaved,reviewOnly,ready:firstExerciseAccepted,
    }))return
    setError('')
    setShowHelp(false)
    setStep(s=>Math.min(flowScenes.length-1,s+1))
  }
  function back(){
    if(locked)return
    setError('')
    setShowHelp(false)
    setStep(s=>Math.max(0,s-1))
  }
  function openPreview(){
    if(locked||!receipt)return
    setPreviewIndex(0)
  }
  function advancePreview(){
    if(locked||!inPreview)return
    if(previewIndex===previewScreens.length-1){setPreviewIndex(-1);setInviteOpen(true)}
    else setPreviewIndex(i=>i+1)
  }
  function backFromPreview(){
    if(previewIndex<=0)setPreviewIndex(-1)
    else setPreviewIndex(i=>i-1)
  }
  function changeFeeling(value){
    if(locked)return
    setAnswers(a=>({...a,reflection:value}))
    if(value==='uncomfortable')setSafety(true)
  }
  async function submit(){
    if(reviewOnly){setStep(flowScenes.length);return}
    if(locked||saved)return
    if(step!==flowScenes.length-1||
      scenes.some(key=>!visited.current.has(key))){
      setError(t.incomplete);return
    }
    if(!answers.lessonConfidence){setError(c.required);return}
    let safe
    try{
      // Undefined responses are not saved and an exercise selection alone
      // never proves a practice attempt.
      // Old Day 4 entered text must never be resaved as plaintext opora54 JSON.
      const submitted=Object.fromEntries(Object.entries(answers)
        .filter(([key,value])=>key!=='transferFeeling'&&value!==undefined&&value!==null))
      safe=validateOpora54Signals({answers:submitted,hints:[],ease:null})
    }catch{setError(t.noSave);return}
    setSaving(true);setError('')
    try{
      if(!operation.current)operation.current=crypto.randomUUID()
      const attempted=['tried','partly'].includes(practiceReport)
      const response=await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:operation.current,
        feedback:rating==='uncomfortable'?'uncomfortable':rating==='unchanged'?'neutral':
          rating==='useful'||rating==='partly'?'helped':'skip',
        beforeNow:null,afterNow:null,practiceWindow:'practice_v6',
        aphorismResponse:safe.answers.aphorism||null,
        practiceAttempt:attempted?(practiceReport==='tried'?'tried':'simplified'):null,
        comfort:rating==='uncomfortable'?'uncomfortable':null,
        transferStage:safe.answers.transfer==='planned'?'plan':null,
        welcomeFeeling:welcomeFeeling||null,
        ...(OPORA_EMOTION_DAYS.includes(cycle.day)&&namedEmotion
          ?{practiceEmotion:practiceEmotionChoice
            ?{choice:practiceEmotionChoice}
            :{customText:practiceEmotionText.trim()||answers.transferFeeling?.trim()}}:{}),
        ...(cycle.day===1?{
          oporaOpening:{
            resource:openingResource,
            lastDayDifficulty:openingDifficulty,
            familiarSupport,
            ...(familiarSupport==='other'&&familiarSupportText.trim()
              ?{familiarSupportText:familiarSupportText.trim()}:{}),
          },
        }:{}),
        opora54:safe,visitedSlideKeys:[...scenes],
      })
      if(response){setSaved(true);setStep(flowScenes.length);operation.current=null}
      else setError(t.noSave)
    }catch{setError(t.noSave)}
    finally{setSaving(false)}
  }
  const title=moment==='habit'?t.habitTitle:moment==='recap'?c.recapTitle:
    moment==='recapPractice'?j.practiceOverviewTitle:
    moment==='recapNext'?j.recapNextTitle:
    moment==='closingMeditation'?t.meditationTitle:
    moment==='recapFeedback'?j.recapFeedbackTitle:
    moment==='invite'?(cycle.day===14?c.inviteFinal:c.inviteTitle):
    moment==='nextStep'?t.preview.nextTitle:
    moment==='receipt'?(cycle.day===14?c.congratsFinal:c.congratsTitle.replace('{day}',String(cycle.day))):
    moment==='welcome'?opening.welcome:
    moment==='baseline'?opening.baseline:
    moment==='checkin'?opening.checkin:
    moment==='recall'?opening.recall:
    moment==='arrive'?(cycle.day===1?(newDayOneIntro?(showSkill60?EXPERIMENT_WORDS[lang].firstTitle:t.firstExerciseTitle):t.arrivalWarmTitle):t.arriveTitle):
    moment==='support'?support?.title:
    channelCard?channelCard.title:
    moment==='why'?(showVariety?editorial.whyTitle:j.whyTitle):moment==='story'?j.storyTitle:
    moment==='options'?j.optionsTitle:moment==='settle'?j.settleTitle:
    moment==='practice'?(showSkill60?dailyPlan?.title:newDayOneIntro?t.firstExerciseAction:(showNewPlan?dailyPlan?.title:null)||dayCopy?.title||t.learn):
    moment==='feel'?t.feelTitle:
    moment==='affirmation'?(cycle.day===1?opening.thought:t.ideaTitle):t.reminderTitle
  // One optional helper across the experiential steps; ratings and completion never depend on opening it.
  const guidanceForMoment=moment==='practice'
    ?(lang==='es'?t.gentle:lesson.antiStress?.neutralText||t.gentle)
    :channelCard?channelCard.hint
    :moment==='arrive'&&!newDayOneIntro?t.arriveHint
    :moment==='recall'
      ?(lang==='ru'?'Если ничего не вспоминается, посмотрите на один обычный предмет рядом.'
        :lang==='es'?'Si no recuerdas nada, mira un objeto normal a tu lado.'
        :'If nothing comes to mind, look at one ordinary object nearby.')
    :moment==='feel'
      ?(lang==='ru'?'Можно выбрать «Примерно так же» или продолжить без ответа.'
        :lang==='es'?'Puedes elegir «Más o menos igual» o continuar sin responder.'
        :'You may choose “About the same” or continue without answering.')
    :moment==='save'
      ?(lang==='ru'?'Это возможный план на потом, а не отчёт о выполнении. Можно выбрать «Не сегодня».'
        :lang==='es'?'Es un plan posible, no una tarea completada. Puedes elegir «Hoy no».'
        :'This is a possible plan, not a completed action. You can choose “Not today”.')
    :null
  const reportedAttempt=['tried','partly'].includes(practiceReport)
  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={t.day+' '+cycle.day+': '+(showCurrentSkill?dailyPlan?.title:lesson.title)}
    data-opora-experience-first="as-5.6" data-opora-one-action-version={OPORA_ONE_ACTION_VERSION}
    data-opora-practical-skills-version={showSkill60?OPORA_EXPERIENTIAL_EDITION:showSkill59?OPORA_SEVEN_SKILLS_EDITION:undefined}
    data-opora-restored-opening={cycle.day===1?"five-first-slides":undefined}
    data-opora-content-revision={showVariety?OPORA_VARIETY_REVISION:undefined}
    data-course-one-screen="v3" data-course-visual-theme={OPORA_EXPERIENCE_DESIGN_VERSION}
    data-course-history-review={reviewOnly?'true':undefined}
    data-opora-course-program-preview={inPreview?moment:undefined}
    data-opora-lesson-outro={recap?'recap':inviteOpen?'invite':receipt?'saved':undefined}>
    <div className={styles.frame+' '+(styles[moment]||styles.arrive)}
      inert={safety} aria-hidden={safety?'true':undefined}>
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} onClick={onClose}
          disabled={locked} aria-label={t.close}><X size={21}/></button>
        <div className={styles.progress}>
          <div className={styles.progressCopy}><span>{t.day} {cycle.day}/14</span>
            <span>{previewStep} / {previewTotal}</span></div>
          <div className={styles.track}><div className={styles.fill}
            style={{width:(previewStep/previewTotal*100)+'%'}}/></div>
        </div>
        <button type="button" className={styles.pause} ref={safetyTrigger}
          onClick={()=>setSafety(true)} disabled={locked}><Pause size={16}/>{t.pause}</button>
      </header>
      <main className={styles.stage}>
        {(moment==='welcome'||(moment==='arrive'&&cycle.day!==1))&&
          <div className={styles.arrivalPhoto} aria-hidden="true">
            <img src="/images/holistic-house/report-lighthouse-coast.webp" alt="" loading="eager"/>
          </div>}
        <section className={styles.panel+' '+(
          moment==='welcome'||(moment==='arrive'&&cycle.day!==1)?styles.arrivalPanel:''
        )+(moment==='practice'&&cycle.day===1?' '+styles.corePractice:'')
          +(moment==='practice'&&cycle.day===11&&showNewPlan?' '+styles.emotionPractice:'')}
          aria-live="off" data-opora-current-screen={moment}
          data-opora-first-exercise-consent={firstExerciseInvite?'true':undefined}>
          {inPreview&&<span className={styles.eyebrow}>
            {moment==='habit'?t.habitKicker:t.preview.nextKicker}
            {' · '}{previewIndex+1}/{previewScreens.length}
          </span>}
          {(!receipt||inviteOpen)&&<span className={styles.eyebrow}>
            {moment==='recap'?c.recapKicker:
              moment==='recapPractice'?j.recapPracticeKicker:
              moment==='recapNext'?j.recapNextKicker:
              moment==='closingMeditation'?t.meditationKicker:
              moment==='recapFeedback'?j.recapFeedbackKicker:
              moment==='invite'?c.inviteKicker:
             moment==='welcome'?opening.welcomeKicker:
            moment==='baseline'?opening.baselineKicker:
            moment==='checkin'?opening.checkinKicker:
            moment==='recall'?opening.recallKicker:
            moment==='arrive'?t.minute:moment==='support'?t.supportKicker:
             moment==='why'?(showVariety?editorial.whyKicker:j.whyKicker):moment==='story'?j.storyKicker:
             moment==='options'?j.optionsKicker:moment==='settle'?j.settleKicker:
             moment==='practice'?(cycle.day===1?t.coreKicker:t.stepLabel):
            moment==='feel'?t.feel:moment==='affirmation'?(cycle.day===1?opening.thoughtKicker:t.quote):t.keep}
          </span>}
          <h2 ref={heading} tabIndex={-1} className={styles.title}>{title}</h2>
          {neutralSupport&&<div data-opora-neutral-anchor="true">
            <p className={styles.lead}>{t.neutralAnchor}</p>
            <p className={styles.soft}>{t.neutralSafety}</p>
          </div>}
          {moment==='welcome'&&<>
            <p className={styles.lead}>{opening.welcomeLead}</p>
            <div className={styles.moodChoices} role="group" aria-label={opening.welcome}
              data-opora-start-mood="true">
              {welcomeFeelingChoices(cycle.activeGoal||cycle.primaryGoal,lang).map(({id,label})=>
                <button key={id} type="button" disabled={locked}
                  data-symbol={t.moods.find(item=>item.value===id)?.symbol}
                  aria-pressed={welcomeFeeling===id} onClick={()=>setWelcomeFeeling(id)}>
                  <span>{label}</span>
                </button>)}
            </div>
            {welcomeFeeling
              ?<p className={styles.moodReply} role="status" aria-live="polite">{welcomeFeelingSupport(welcomeFeeling,lang)}</p>
              :<p className={styles.moodOptional}>{opening.welcomeNote}</p>}
          </>}
          {moment==='baseline'&&<>
            <p className={styles.lead}>{opening.baselineLead}</p>
            <OpeningRating label={opening.baseline} value={openingResource}
              onChange={setOpeningResource} disabled={locked}
              low={opening.baselineLow} high={opening.baselineHigh}/>
            <p className={styles.soft}>{opening.scaleNote}</p>
          </>}
          {moment==='checkin'&&<>
            <p className={styles.lead}>{opening.checkinLead}</p>
            <OpeningRating label={opening.checkin} value={openingDifficulty}
              onChange={setOpeningDifficulty} disabled={locked}
              low={opening.checkinLow} high={opening.checkinHigh}/>
            <p className={styles.soft}>{opening.scaleNote}</p>
          </>}
          {moment==='recall'&&<>
            <p className={styles.lead}>{opening.recallLead}</p>
            <div className={styles.chips} role="group" aria-label={opening.recall}>
              {opening.supportOptions.map(([value,label])=><button type="button" key={value}
                disabled={locked} aria-pressed={familiarSupport===value}
                onClick={()=>{setFamiliarSupport(value);setFamiliarSupportText('')}}>{label}</button>)}
            </div>
            <label className={styles.supportLabel} htmlFor="opora-own-resource">{opening.ownSupportLabel}</label>
            <input id="opora-own-resource" className={styles.supportInput}
              data-opora-own-resource="true" type="text" maxLength={160}
              disabled={locked} placeholder={opening.ownSupportPlaceholder}
              value={familiarSupportText} onChange={event=>{
                const value=event.target.value
                setFamiliarSupportText(value)
                setFamiliarSupport(value.trim()?'other':null)
              }}/>
            {familiarSupport&&familiarSupport!=='other'&&<p className={styles.soft} role="status">{opening.recallReply}</p>}
          </>}
          {moment==='arrive'&&!neutralSupport&&<>
            <p className={styles.lead}>{cycle.day===1?(newDayOneIntro?(showSkill60?EXPERIMENT_WORDS[lang].firstInvite:t.firstExerciseInvite):t.arrivalWarmText):t.arriveText}</p>
            {cycle.day!==1&&<>
              <div className={styles.moodChoices} role="group" aria-label={t.arriveTitle}
                data-opora-start-mood="true">
                {t.moods.map(item=><button key={item.value} type="button" disabled={locked}
                  data-symbol={item.symbol} aria-pressed={welcomeFeeling===item.value}
                  onClick={()=>setWelcomeFeeling(item.value)}><span>{item.label}</span></button>)}
              </div>
              {chosenFeeling
                ?<p className={styles.moodReply} role="status" aria-live="polite">{chosenFeeling.reply}</p>
                :<p className={styles.moodOptional}>{t.arriveSkip}</p>}
            </>}
          </>}
          {moment==='support'&&<div className={styles.supportMessage} data-opora-daily-support={cycle.day}>
             <p className={styles.supportBody}>{support?.body}</p>
           </div>}
           {moment==='why'&&!neutralSupport&&<p className={styles.lead} data-opora-daily-insight={cycle.day}>
            {showVariety?oporaAs60DailyInsight(cycle.day,lang):depth?.why}</p>}
          {moment==='story'&&!neutralSupport&&<>
            <p className={styles.lead}>{depth?.scenario}</p>
            <p className={styles.soft}>{j.storyNote}</p>
          </>}
          {moment==='options'&&!neutralSupport&&<>
            <p className={styles.lead}>{j.optionsLead}</p>
            <p className={styles.gentleVariant}>{depth?.alternative}</p>
          </>}
          {moment==='settle'&&!neutralSupport&&<>
            <p className={styles.lead}>{showVariety?oporaAs60SettlingCue(cycle.day,lang):j.settleLead}</p>
            <p className={styles.soft}>{j.settleNote}</p>
          </>}
          {channelCard&&!neutralSupport&&
            <section className={styles.integratedExperience}
              data-opora-integrated-day={cycle.day}
              data-opora-experience-channel={channel}>
              {channel==='imagery'&&<div className={styles.imagerySymbol}
                aria-hidden="true"><Sparkles size={29}/></div>}
              <p className={styles.integratedInstruction}>{channelCard.text}</p>
              {channel==='mental'&&<div className={styles.integratedPlan}>
                <span>{JOURNEY_COPY[lang].plan}</span>
                <p>{channelCard.plan}</p>
              </div>}
              {channel==='imagery'&&<OporaOceanOutro locale={lang} paused={safety} compact/>}
              <p className={styles.integratedHint}>{channelCard.hint}</p>
              <div className={styles.integratedAttemptChoices} role="group"
                aria-label={channelCard.title}>
                {[[JOURNEY_COPY[lang].tried,'tried'],
                  [JOURNEY_COPY[lang].read,'read'],
                  [JOURNEY_COPY[lang].skip,'skip']].map(([label,value])=>
                  <button type="button" key={value} disabled={locked}
                    aria-pressed={channelAttempts[channel]===value}
                    onClick={()=>setChannelAttempts(prior=>({...prior,[channel]:value}))}>
                    {label}
                  </button>)}
              </div>
              <p className={styles.integratedMeta}>{JOURNEY_COPY[lang].optional}</p>
            </section>}
          {moment==='practice'&&<>
            {!neutralSupport&&cycle.day===1&&dayCopy?.purpose&&!newDayOneIntro&&
              <div className={styles.coreWhy} data-opora-core-purpose="true">
                <strong>{t.coreWhy}</strong><p>{dayCopy.purpose}</p>
              </div>}
            {!neutralSupport&&<p className={styles.lead} data-opora-one-daily-practice={cycle.day}>
              {practiceGuide}{newDayOneIntro&&!showSkill60?<span className={styles.practiceDetail}> {t.firstExerciseDetail}</span>:null}
            </p>}
            {!neutralSupport&&showSkill60&&dailyPlan?.experiment&&
              <div className={styles.miniExperiment} data-opora-micro-experiment={cycle.day}>
                <div className={styles.miniExperimentHead}>
                  <strong>{EXPERIMENT_WORDS[lang].title}</strong>
                  <span>{EXPERIMENT_WORDS[lang].step} {microStep+1}/3</span>
                </div>
                <p className={styles.miniExperimentStep} data-opora-micro-step={microStep+1}>
                  {dailyPlan.experiment.steps[microStep]}
                </p>
                {microStep===2&&<>
                  <p className={styles.miniExperimentPrompt}>{dailyPlan.experiment.prompt}</p>
                  <div className={styles.miniExperimentChoices} role="group"
                    aria-label={dailyPlan.experiment.prompt}>
                    {dailyPlan.experiment.choices.map(choice=>
                      <button type="button" key={choice.id} disabled={locked}
                        aria-pressed={microChoice===choice.id}
                        onClick={()=>setMicroChoice(choice.id)}>{choice.label}</button>)}
                  </div>
                </>}
                <div className={styles.miniExperimentNav}>
                  {microStep>0&&<button type="button" disabled={locked}
                    onClick={()=>setMicroStep(value=>Math.max(0,value-1))}>
                    <ArrowLeft size={15}/>{t.back}
                  </button>}
                  {microStep<2&&<button type="button" disabled={locked}
                    onClick={()=>setMicroStep(value=>Math.min(2,value+1))}>
                    {EXPERIMENT_WORDS[lang].next}<ArrowRight size={15}/>
                  </button>}
                </div>
                <p className={styles.miniExperimentNote}>{EXPERIMENT_WORDS[lang].note}</p>
              </div>}
            {!neutralSupport&&cycle.day===11&&showNewPlan&&
              <EmotionVocabulary locale={lang} day={cycle.day} choice={practiceEmotionChoice}
                textValue={practiceEmotionText} onChoice={updateEmotionChoice}
                onText={updateEmotionText} disabled={locked} copy={t}/>}
            <p className={styles.miniLabel}>{cycle.day===1?t.tryPrompt:t.tryAfter}</p>
            <div className={styles.chips} role="group"
              aria-label={cycle.day===1?t.tryPrompt:t.tryAfter}>
              {[[t.tried,'tried'],[t.partly,'partly'],[t.read,'not_attempted']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={practiceReport===value} onClick={()=>tryStatus(value)}>{label}</button>)}
            </div>
          </>}
          {moment==='feel'&&<>
            {!neutralSupport&&<p className={styles.lead}>{t.feelText}</p>}
            <div className={styles.chips+' '+styles.feeling} role="group" aria-label={t.feel}>
              {[[t.feelingBetter,'useful'],[t.feelingPartial,'partly'],
                [t.feelingSame,'unchanged'],[t.feelingHard,'uncomfortable']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={rating===value} onClick={()=>changeFeeling(value)}>{label}</button>)}
            </div>
          </>}
          {moment==='affirmation'&&<>
            <blockquote className={styles.quotation}>{quote}</blockquote>
            <p className={styles.subtle}>{cycle.day===1?opening.thoughtLead:t.quoteText}</p>
            <div className={styles.chips} role="group" aria-label={t.quote}>
              {[[t.agree,'agree'],[t.unsure,'unsure'],[t.disagree,'disagree']].map(([label,value])=>
                <button type="button" key={value} disabled={locked}
                  aria-pressed={vote===value} onClick={()=>setAnswers(a=>({...a,aphorism:value}))}>{label}</button>)}
            </div>
            {vote&&<p className={styles.soft} role="status">{cycle.day===1?opening.response:t.quoteThanks}</p>}
          </>}
          {moment==='save'&&<>
            {showNewPlan
              ?cycle.day===4
                ?<div className={styles.day4Feeling} data-opora-everyday-choice="one-feeling-and-field">
                  <p className={styles.oneTask} data-opora-single-transfer={cycle.day}>{dailyPlan?.transfer||t.day4Task}</p>
                  <EmotionVocabulary locale={lang} day={cycle.day} choice={practiceEmotionChoice}
                    textValue={practiceEmotionText} onChoice={updateEmotionChoice}
                    onText={updateEmotionText} disabled={locked} copy={t}/>
                  <div className={styles.chips+' '+styles.microChoices} role="group" aria-label={t.keep}>
                    <button type="button" disabled={locked}
                      aria-pressed={answers.transfer==='not_planning'}
                      onClick={()=>{
                        setPracticeEmotionChoice(null)
                        setPracticeEmotionText('')
                        setAnswers(a=>({...a,transferFeeling:undefined,transferChoice:undefined,
                          transferPlanVersion:undefined,transfer:'not_planning'}))
                      }}>{t.noPlan}</button>
                  </div>
                </div>
                :<div className={styles.day4Feeling} data-opora-everyday-choice="one-action-or-skip">
                  <p className={styles.oneTask} data-opora-single-transfer={cycle.day}>{dailyPlan?.transfer}</p>
                  <div className={styles.chips+' '+styles.singlePlanChoices} role="group" aria-label={t.oneTaskIntro}>
                    <button type="button" disabled={locked}
                      aria-pressed={answers.transfer==='planned'&&answers.transferPlanVersion==='one-v1'}
                      onClick={()=>setAnswers(a=>({...a,transfer:'planned',transferChoice:'two',
                        transferPlanVersion:'one-v1',transferFeeling:undefined}))}>{t.plan}</button>
                    <button type="button" disabled={locked}
                      aria-pressed={answers.transfer==='not_planning'}
                      onClick={()=>setAnswers(a=>({...a,transfer:'not_planning',
                        transferChoice:undefined,transferPlanVersion:undefined,
                        transferFeeling:undefined}))}>{t.noPlan}</button>
                  </div>
                </div>
              :<>
                <p className={styles.lead}>{t.keepText}</p>
                <div className={styles.chips+' '+styles.microChoices} role="group" aria-label={t.keep}
                  data-opora-everyday-choice="historical-choices-or-skip">
                  {transferChoices.map(choice=><button type="button" key={choice.value} disabled={locked}
                    aria-pressed={answers.transfer==='planned'&&answers.transferChoice===choice.value}
                    onClick={()=>setAnswers(a=>({...a,transferChoice:choice.value,transfer:'planned'}))}>{choice.label}</button>)}
                  <button type="button" disabled={locked}
                    aria-pressed={answers.transfer==='not_planning'}
                    onClick={()=>setAnswers(a=>({...a,transferChoice:undefined,transfer:'not_planning'}))}>{t.noPlan}</button>
                </div>
              </>}
            <p className={styles.soft}>{reportedAttempt?t.attempted:t.readOnly}</p>
          </>}
          {moment==='nextStep'&&<OporaCoursePath locale={lang} cycle={cycle}
            saved={saved} roadmap={data?.roadmap} words={t} oneAction={showNewPlan} edition59={showSkill59} edition60={showSkill60}/>}
          {moment==='habit'&&<>
            <p className={styles.lead}>{t.habitLead}</p>
            {!habitSetup&&<button type="button" className={styles.linkHint}
              data-opora-habit-skip="true" disabled={locked}
              onClick={()=>{setPreviewIndex(-1);setInviteOpen(true)}}>{t.habitLater}</button>}
            {!habitSetup
              ?<p className={styles.habitBenefit} data-opora-first-lesson-habit-invitation>{t.habitBenefit}</p>
              :<div className={styles.habitSetup} data-opora-first-lesson-habit-setup>
                {habitSetupContent||<p className={styles.soft}>{t.habitFallback}</p>}
              </div>}
          </>}
          {moment==='recap'&&<div className={styles.recapSummary} data-opora-lesson-recap="true">
            <div className={styles.summaryItem} data-opora-recap-takeaway="true"><span aria-hidden="true">🌿</span>
              <div><strong>{showNewPlan?dailyPlan?.result:c.notice}</strong>
                <small>{reportedAttempt?t.attempted:t.readOnly}</small></div></div>
          </div>}
          {moment==='recapPractice'&&<>
            <div className={styles.recapSummary} data-opora-practice-overview={cycle.day}>
              <div className={styles.summaryItem}><span aria-hidden="true">☀️</span>
                <div><strong>{(showNewPlan?dailyPlan?.title:null)||dayCopy?.title||t.learn}</strong>
                  <small>{practiceGuide}</small></div></div>
            </div>
            <div className={styles.overviewPurpose} data-opora-overview-purpose="true">
              <strong>{showVariety&&cycle.day!==1?editorial.goalLabel:j.overviewPurposeLabel}</strong>
              <p>{showVariety&&cycle.day!==1?dailyPlan?.result:
                cycle.day===1&&!showSkill60?j.dayOnePurpose:depth?.why}</p>
            </div>
          </>}
          {moment==='recapNext'&&<div className={styles.recapSummary}
            data-opora-daily-homework={cycle.day}>
            <div className={styles.summaryItem} data-opora-recap-takeaway="true"><span aria-hidden="true">✨</span>
              <div>
                <strong>{answers.transfer==='planned'&&plan
                  ?plan:(dailyPlan?.transfer||depth?.everyday||j.noPlan)}</strong>
                <small>{j.homeworkNote}</small>
                {cycle.day===4&&namedEmotion&&
                  <small data-opora-emotional-experience-recap="true">
                    {t.emotionSummary}: {namedEmotion}
                  </small>}
              </div>
            </div>
          </div>}
          {moment==='closingMeditation'&&<div className={styles.closingMeditationBlock}
            data-opora-final-meditation="day-14">
            <div className={styles.meditationGuide} data-opora-guided-meditation="true">
              <ol>{t.meditationSteps.map((instruction,index)=><li key={index}>{instruction}</li>)}</ol>
            </div>
            <OporaOceanOutro locale={lang} paused={safety} compact/>
            <p className={styles.meditationOptional}>{t.meditationOptional}</p>
          </div>}
          {moment==='recapFeedback'&&<>
            <div className={styles.confidenceChoices} role="group" aria-label={c.question}
              data-opora-lesson-confidence="true">
              {c.choices.map(([value,label])=><button type="button" key={value} disabled={locked}
                aria-pressed={answers.lessonConfidence===value}
                onClick={()=>{setError('');setAnswers(a=>({...a,lessonConfidence:value}))}}>{label}</button>)}
            </div>
            <p className={styles.soft}>{c.gentle}</p>
          </>}
          {moment==='receipt'&&<>
            <div className={styles.celebrationMark} aria-hidden="true"><CheckCircle2 size={36}/></div>
            <p className={styles.lead}>{c.congratsLead}</p>
            <p className={styles.soft}>{t.savedText}</p>
            <div className={styles.receiptNote}>
              <ShieldCheck size={22}/><span>{reportedAttempt?t.attempted:t.readOnly}</span>
            </div>
            {chosenFeeling&&<p className={styles.soft}><strong>{t.startFeeling}:</strong> {chosenFeelingLabel}</p>}
            {answers.transfer==='planned'&&<p className={styles.soft}><strong>{t.takeaway}:</strong> {plan}</p>}
             {OPORA_EMOTION_DAYS.includes(cycle.day)&&namedEmotion&&
               <p className={styles.soft}><strong>{t.emotionSummary}:</strong> {namedEmotion}</p>}
            {rating&&<p className={styles.soft}><strong>{t.feedback}:</strong> {ratingText}</p>}
            {!rating&&<p className={styles.soft}>{t.noResult}</p>}
          </>}
          {moment==='invite'&&<>
            <p className={styles.lead}>{cycle.day===14?c.inviteFinalLead:c.inviteLead}</p>
            <nav className={styles.offerList} aria-label={c.inviteKicker}
              data-opora-tomorrow-links="true">
              <a href={'/'+lang+'/tests'}><span aria-hidden="true">🧭</span>{c.tests}<ArrowRight size={19}/></a>
              <a href={'/'+lang+'/academy/principles-of-energywork/learn'}><span aria-hidden="true">🌿</span>{c.reiki}<ArrowRight size={19}/></a>
              <a href={'/'+lang+'/services/free-consultation'}><span aria-hidden="true">🤝</span>{c.consultation}<ArrowRight size={19}/></a>
            </nav>
          </>}
          {/* Historic Day 14 meditation remains for older editions only;
               AS-6.0 has an opt-in guided imagery/music screen daily. */}
          {guidanceForMoment&&
            <div className={styles.guidanceGroup} data-gentle-guidance={moment}>
            <div className={styles.guidanceRow}>
              <img className={styles.guidanceAnimal} src="/images/holistic-house/gentle-owl.svg"
                alt="" aria-hidden="true" width={46} height={46}/>
              <button type="button" className={styles.linkHint} disabled={locked}
                onClick={()=>setShowHelp(value=>!value)} aria-expanded={showHelp}>
                {t.learnMore}<ChevronDown size={17} aria-hidden="true"/>
              </button>
            </div>
            {showHelp&&<p className={styles.soft} data-opora-optional-guidance="true">{guidanceForMoment}</p>}
          </div>}
          {(moment==='welcome'||moment==='arrive'||receipt||inviteOpen)&&<small className={styles.disclaimer}>{t.noMedical}</small>}
        </section>
      </main>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.footer}>
        {firstExerciseInvite?<button type="button" className={styles.back} disabled={locked}
          data-opora-practice-consent-choice="no" onClick={onClose}>{t.firstExerciseNo}</button>:
        inviteOpen?<button type="button" className={styles.back} disabled={locked}
          onClick={()=>{setInviteOpen(false);setPreviewIndex(previewScreens.length-1)}}>
          <ArrowLeft size={17}/>{t.back}</button>:
        receipt?<button type="button" className={styles.back} disabled={locked}
          onClick={moment==='habit'&&habitSetup?()=>setHabitSetup(false)
            :inPreview?backFromPreview:()=>setStep(flowScenes.length-1)}>
          <ArrowLeft size={17}/>{t.back}
        </button>:<button type="button" className={styles.back}
          onClick={step===0?onClose:back} disabled={locked}><ArrowLeft size={17}/>{t.back}</button>}
        {firstExerciseInvite?<button type="button" className={styles.primary} disabled={locked}
          data-opora-practice-consent-choice="yes" onClick={acceptFirstExercise}>
          {t.firstExerciseYes}<ArrowRight size={18}/>
        </button>:<button type="button" className={styles.primary} disabled={locked}
          onClick={inviteOpen?(onFinish||onClose):
            moment==='habit'?(habitSetup?()=>{setPreviewIndex(-1);setInviteOpen(true)}:()=>setHabitSetup(true)):
            inPreview?advancePreview:receipt?openPreview:
            moment==='recapFeedback'?(saved?()=>setStep(flowScenes.length):submit):next}>
          {inviteOpen?t.finish:moment==='habit'?(habitSetup?t.next:t.habitConfigure):
            inPreview?(moment==='nextStep'&&cycle.day===1?c.commit:previewIndex===previewScreens.length-1?c.commit:t.next):
            receipt?t.seeProgram:moment==='recapFeedback'&&!saved?(saving?t.saving:t.save):t.next}
          {inviteOpen||(moment==='recapFeedback'&&!saved)||(moment==='habit'&&habitSetup)?<CheckCircle2 size={18}/>:<ArrowRight size={18}/>}
        </button>}
      </footer>
    </div>
    {safety&&<div className={styles.shade} role="alertdialog" aria-modal="true"
      aria-label={t.safetyTitle} onKeyDown={pauseKeys}>
      <div className={styles.safetyCard}>
        <ShieldCheck size={29}/><h3>{t.safetyTitle}</h3><p>{t.safetyBody}</p>
        <button type="button" ref={safetyPrimary}
          onClick={returnWithNeutralAnchor}>{t.safetyNeutral}</button>
        <button type="button" ref={safetyBack} onClick={()=>setSafety(false)}>{t.safetyBack}</button>
        <button type="button" ref={safetyEnd} className={styles.safetyExit}
          onClick={onClose}>{t.safetyEnd}</button>
      </div>
    </div>}
  </div>
}

