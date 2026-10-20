// Public, original educational curriculum outline. The actual per-day wording
// is sourced directly from the versioned Anti-Stress lesson library.
import { antiStressDay, antiStressSkillCards } from './anti-stress-outcomes-v3.js'
import { DAY_ONE_SLIDES } from './anti-stress-day-one.js'

export const ANTISTRESS_SCREEN_ROLES = Object.freeze([
  'welcome','baseline','checkin','recall','idea','phrase','arrival','main-practice',
  'return-to-present','ritual','transfer','symbol','reflection','moment','feedback',
  'saved-result','participation-xp','course-map',
])
const SCALE_LABELS = Object.freeze({
  'weekly.load':{ru:'Стресс и нагрузка',en:'Stress and load',es:'Estrés y sobrecarga'},
  'weekly.tension':{ru:'Тревога и напряжение',en:'Anxiety and tension',es:'Ansiedad y tensión'},
  'weekly.recovery':{ru:'Восстановление',en:'Recovery',es:'Recuperación'},
  'weekly.functioning':{ru:'Повседневные дела',en:'Daily functioning',es:'Actividad diaria'},
  'weekly.connection':{ru:'Связь и поддержка',en:'Connection and support',es:'Conexión y apoyo'},
  'weekly.mood':{ru:'Эмоциональное состояние',en:'Mood',es:'Estado emocional'},
  'weekly.energy':{ru:'Доступная энергия',en:'Energy',es:'Energía'},
  'weekly.clarity':{ru:'Ясность мышления',en:'Mental clarity',es:'Claridad mental'},
  'gad-7':{ru:'Тревожные симптомы · GAD-7',en:'Anxiety symptoms · GAD-7',es:'Síntomas de ansiedad · GAD-7'},
  'resource.self_support':{ru:'Самоподдержка',en:'Self-support',es:'Autocuidado'},
  'resource.agency':{ru:'Возможность выбирать действия',en:'Ability to choose',es:'Capacidad de elegir'},
  'resource.support':{ru:'Доступность помощи',en:'Available support',es:'Apoyo disponible'},
})
const DAY_ONE_REACTIONS=Object.freeze({
  ru:[
    'Выбирает настроение или пропускает', 'По желанию отмечает состояние сейчас',
    'Выбирает удобный формат практики', 'Выбирает шкалу из пройденных тестов или общий фокус',
    'Соглашается, сомневается, не соглашается или пропускает',
    'Выбирает чтение, фотографию, внешний объект, отдых или пропуск',
    'Замечает цвет, форму, предмет или выбирает ничего не отмечать',
    'Пробует ориентировку, часть упражнения, остановку или пропуск',
    'Решает, как безопасно завершить упражнение',
    'Выбирает один нейтральный зрительный или словесный ориентир',
    'По желанию пишет три ассоциации к изображению или пропускает',
    'Пробует повторить самостоятельно, просит подсказку или откладывает',
    'Честно отмечает изменение, отсутствие изменения или дискомфорт',
    'Отмечает комфортность и выбирает оставить, упростить или заменить',
    'Выбирает необязательное повседневное напоминание и завершает',
  ],
  es:[
    'Describe su estado o salta', 'Observa su estado actual de forma opcional',
    'Elige un formato cómodo', 'Elige un enfoque personal o general',
    'Acepta, duda, discrepa o salta', 'Elige mirar, leer, descansar o saltar',
    'Identifica un color, una forma o un objeto neutro',
    'Prueba el ejercicio o decide detenerse', 'Elige cómo terminar con calma',
    'Elige un punto de apoyo simple', 'Anota asociaciones opcionales',
    'Prueba la orientación con ayuda o sin ella', 'Describe su experiencia real',
    'Evalúa su comodidad y adapta la práctica', 'Elige un recordatorio cotidiano opcional',
  ],
})
const DEFINED_SECTIONS = Object.freeze({
  ru: [
    'Выбирает комфортное состояние или пропуск',
    'Отмечает качество дня по желанию, без диагностики',
    'Выбирает комфортную длину и формат практики',
    'Вспоминает знакомый ориентир или просит подсказку',
    'Отмечает отношение к мысли: согласен / не знаю / не согласен',
    'Выбирает подходящую бережную фразу или нейтральный вариант',
    'Пробует короткую внешнюю ориентировку',
    'Выполняет основную практику или выбирает Stop',
    'Возвращает внимание к комнате, завершает упражнение',
    'Закрепляет упражнение; в контрольные дни выбирает ответ в новом сценарии',
    'По желанию выбирает применимый маленький шаг',
    'Выбирает слова или образ, без обязательной визуализации',
    'Записывает одно личное наблюдение или пропускает',
    'Смотрит только фактически записанные показатели',
    'Выбирает комфортность, полезность и адаптацию или пропускает',
    'Получает подтверждение серверного сохранения',
    'Получает XP только за сохранённое участие',
    'Видит 14 дней и реальный учебный прогресс',
  ],
  en: [
    'Selects how they feel or skips the greeting',
    'May rate the day quality, not a diagnosis',
    'Chooses a comfortable practice length and format',
    'Recalls an anchor or requests a hint',
    'Responds agree / not sure / disagree to the thought',
    'Selects a credible phrase or neutral alternative',
    'Tries a short visual orientation',
    'Attempts the main exercise or chooses Stop',
    'Returns attention to the surroundings',
    'Integrates the activity; on check days chooses in a new scenario',
    'May choose one practical small next step',
    'Chooses words or imagery without mandatory visualization',
    'Writes a private observation or skips',
    'Sees only measurements actually recorded',
    'May give separate comfort, usefulness and adaptation feedback',
    'Receives server-confirmed lesson completion',
    'Receives XP for participation only',
    'Reviews the fourteen-day map and actual progress',
  ],
})
const DAY_ES = Object.freeze([
  ['Estoy aquí y puedo elegir','Elegir una orientación visual neutra'],
  ['Puedo devolver mi atención al presente','Probar de nuevo una orientación visual'],
  ['Reconozco mis primeras señales de sobrecarga','Identificar una señal temprana'],
  ['Cuando tengo demasiada presión o poca energía','Elegir un apoyo adecuado a la situación'],
  ['Una pausa amable para el cuerpo y la atención','Probar una pausa cómoda y breve'],
  ['Puedo ajustar el esfuerzo y descansar','Elegir la duración y un descanso posible'],
  ['Mis apoyos reales y una exigencia manejable','Crear un mapa de recursos reales'],
  ['Una imagen de apoyo y descanso real','Elegir una palabra, imagen u objeto útil'],
  ['Un pensamiento inquietante no es un hecho','Separar un pensamiento de la reacción'],
  ['Hecho, suposición y un paso posible','Distinguir los hechos de las suposiciones'],
  ['Un límite sin confrontación','Preparar una frase respetuosa'],
  ['Las personas también pueden ser un apoyo','Elegir una vía de ayuda realista'],
  ['Elijo el apoyo apropiado para hoy','Elegir una práctica en una situación nueva'],
  ['Mi plan personal OPORA','Crear un plan breve de apoyo personal'],
])
const SKILLS_ES=Object.freeze([
  'Orientación y libertad de elección','Señales tempranas de sobrecarga',
  'Regulación y ritmo amable','Recursos reales y personales',
  'Flexibilidad ante los pensamientos','Límites y apoyo humano',
  'Aplicar los recursos de forma autónoma',
])
export function antiStressPublicPlan(locale='en') {
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  return Array.from({length:14},(_,i)=>{
    const source=antiStressDay(i+1,lang==='es'?'en':lang)
    return {
      day:source.day, skillId:source.skillId,
      title:lang==='es'?DAY_ES[i][0]:source.title,
      exercise:lang==='es'?DAY_ES[i][1]:source.action,
      result:lang==='es'?DAY_ES[i][1]:source.outcome,
      scales:source.scales.map(id=>({id,label:SCALE_LABELS[id]?.[lang]||id})),
      skill:lang==='es'?SKILLS_ES[Math.floor(i/2)]:source.skill,
      checkDay:Boolean(source.probe),
      screens:(i===0 ? [
        ...DAY_ONE_SLIDES.map((row,index)=>({
          number:index+1,role:row.kind,
          expected:lang==='en'?row.expectedResponse:DAY_ONE_REACTIONS[lang][index],
        })),
        ...ANTISTRESS_SCREEN_ROLES.slice(15).map((role,index)=>({
          number:index+16,role,expected:DEFINED_SECTIONS[lang==='es'?'en':lang][index+15],
        })),
      ] : ANTISTRESS_SCREEN_ROLES.map((role,index)=>({
        number:index+1,role,expected:DEFINED_SECTIONS[lang==='es'?'en':lang][index],
      }))),
    }
  })
}
export function antiStressPublicSkills(locale='en') {
  if(locale==='es')return SKILLS_ES.map((title,i)=>({id:'S'+(i+1),days:[i*2+1,i*2+2],title}))
  return antiStressSkillCards(locale)
}
export function antiStressMeasuredAxis(key,locale='en') {
  return SCALE_LABELS[key]?.[locale]||key
}


// AS-5.0 public contract. Legacy antiStressPublicPlan and 15-screen detail are
// intentionally retained for earlier, version-pinned learners and QA.
import { oporaSkillForDay, oporaSkillCards, OPORA_SEVEN_SKILLS } from './anti-stress-skills-v5.js'

const AS5_ES_SKILLS = Object.freeze([
  'Consciencia del estrés','Orientación al presente','Regulación corporal',
  'Estabilidad emocional','Flexibilidad mental','Límites y apoyo','Recuperación autónoma',
])
const AS5_ES_TITLES = Object.freeze([
  'Detecto señales de estrés','Una referencia en el presente','Hago una pausa amable',
  'Puedo nombrar lo que siento','El pensamiento no siempre es un hecho',
  'Puedo pedir espacio y ayuda','Construyo mis recursos de recuperación',
  'Reconozco señales antes de sobrecargarme','Vuelvo al presente ante la presión cotidiana',
  'Elijo el apoyo adecuado','Me mantengo junto a mis sentimientos',
  'Elijo acciones frente a la preocupación','Practico los límites en el diálogo',
  'Mi plan personal OPORA',
])
const AS5_ES_RESULTS = Object.freeze([
  'Reconocer una señal temprana y elegir una respuesta posible.',
  'Volver la atención a un objeto o detalle neutro.',
  'Elegir un movimiento suave, una referencia externa o descanso.',
  'Nombrar una emoción y elegir apoyo amable.',
  'Separar pensamientos de hechos y elegir el siguiente paso.',
  'Ensayar un límite respetuoso o una petición de ayuda.',
  'Crear y practicar una secuencia personal de apoyo.',
])
const AS5_ROLES = Object.freeze(['welcome','checkin','guided','ritual','transfer','reflection','feedback'])
const AS5_ES_EXERCISES = Object.freeze([
  'Observa tres detalles a tu alrededor. En un ejemplo cotidiano, identifica una señal temprana de estrés y elige una pausa, descanso o apoyo posible.',
  'Elige un color y dos objetos neutros. Cambia suavemente tu atención entre ellos; puedes parar o descansar.',
  'Elige una postura cómoda. Si te apetece, haz un movimiento pequeño, respira de manera natural o mira un objeto externo.',
  'En una situación ficticia, nombra una emoción suave, elige una frase amable y vuelve la atención al entorno.',
  'Separa los hechos de las suposiciones en un ejemplo simple. Practica decir: «Tengo el pensamiento de que…».',
  'Imagina una petición cotidiana. Ensaya una frase de límite o una solicitud de ayuda, sin contactar con nadie.',
  'Construye una tarjeta breve: señal temprana → apoyo disponible → descanso o alternativa.',
  'En dos ejemplos cotidianos, reconoce la señal, elige una opción y vuelve a practicar con menos ayuda.',
  'Ensaya la orientación hacia tres detalles externos en un momento ficticio de incertidumbre suave.',
  'Compara demasiadas demandas con poca energía y elige un apoyo diferente para cada caso.',
  'Nombra una emoción suave, observa también el entorno y decide si necesitas pausa o ayuda.',
  'Separa hecho, suposición y valor personal; elige un paso pequeño sin obligarte a pensar en positivo.',
  'Ensaya una frase de límite, una petición concreta y una opción de apoyo alternativa.',
  'Crea y repite tu plan personal de señal → apoyo → pequeño paso → opción de reserva.',
])
export function antiStressPublicSkillsV5(locale='en'){
  if(locale==='es')return OPORA_SEVEN_SKILLS.map((row,i)=>({
    id:row.id,title:AS5_ES_SKILLS[i],days:[i+1,i+8],result:AS5_ES_RESULTS[i],
    description:AS5_ES_RESULTS[i],measureIds:row.scales,
  }))
  return oporaSkillCards(locale).map((row,i)=>({...row,
    description:OPORA_SEVEN_SKILLS[i].result[locale==='ru'?'ru':'en'],
    measureIds:OPORA_SEVEN_SKILLS[i].scales,
  }))
}
export function antiStressPublicPlanV5(locale='en'){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  return Array.from({length:14},(_,i)=>{
    const day=i+1,source=oporaSkillForDay(day,lang==='es'?'en':lang)
    const skillIndex=i%7,skills=antiStressPublicSkillsV5(lang),es=lang==='es'
    const exercise=es?AS5_ES_EXERCISES[i]:source.guide
    const result=es?AS5_ES_RESULTS[skillIndex]:source.outcome
    return {
      day,week:source.week,skillId:source.skillId,skill:skills[skillIndex].title,
      title:es?AS5_ES_TITLES[i]:source.title,
      exercise,result,scales:source.scales.map(id=>({id,label:SCALE_LABELS[id]?.[lang]||id})),
      checkDay:day>7,practiceMode:source.practiceMode,
      screens:AS5_ROLES.map((role,index)=>({
        number:index+1,role,
        expected:(es ? [
          'Elegir un inicio cómodo','Conocer el objetivo concreto del día',
          'Probar un ejercicio con opción de parar','Indicar si se intentó',
          'Elegir un uso cotidiano voluntario','Reflexionar sin juicio',
          'Guardar con confirmación del servidor',
        ] : lang==='ru'?[
          'Выбрать комфортное начало','Увидеть конкретный навык урока',
          'Попробовать главную практику или остановиться','Честно отметить попытку',
          'Выбрать необязательное применение в жизни','Кратко оценить опыт',
          'Сохранить результат после подтверждения сервера',
        ]:[
          'Choose a comfortable start','See the specific skill for today',
          'Try the main practice or stop','Report an actual attempt',
          'Choose optional everyday use','Reflect without grading',
          'Save only after server confirmation',
        ])[index]
      }))
    }
  })
}


// AS-5.4 public overview for NEW AS2 (version-pinned V6) only.
// The saved AS-5.0 and older plans above remain available unchanged.
import {opora54Day,OPORA54_PRE_SAVE_KEYS} from './anti-stress-skills-v6.js'
import {opora55Day} from './anti-stress-skills-v7.js'

const AS54_ES_SCREEN_HINTS=Object.freeze([
  'Inicio voluntario y meta concreta','Autoobservación breve opcional',
  'Elegir el ritmo y las ayudas','Un enfoque personal o general',
  'Reflexión sobre el aforismo: tres opiniones','Ver un ejemplo realista',
  'Preparación segura y cómoda','Detectar una señal o detalle',
  'Practicar una acción pequeña','Volver a intentar con ayuda opcional',
  'Elegir en una nueva situación ficticia','Crear un plan cotidiano opcional',
  'Valorar la experiencia, sin juicios','Revisar y guardar respuestas reales',
  'Ver progreso tras la confirmación',
])
export function antiStressPublicPlanV6(locale='en'){
  const lang=['ru','en','es'].includes(locale)?locale:'en'
  const old=antiStressPublicPlanV5(lang)
  return old.map((row,index)=>{
    const source=opora54Day(index+1,lang==='es'?'en':lang)
    const screens=OPORA54_PRE_SAVE_KEYS.map((key,i)=>({
      number:i+1,role:key,
      expected:lang==='es'?AS54_ES_SCREEN_HINTS[i]:source.screens[i].text,
    }))
    screens.push({number:15,role:'receipt',expected:lang==='es'
      ?AS54_ES_SCREEN_HINTS[14]:lang==='ru'
      ?'Сохранённый отчёт, реальный статус практики и возвращение на карту курса'
      :'Saved learning record, truthful attempt status and course map'})
    return {
      ...row,title:lang==='es'?row.title:source.title,
      exercise:lang==='es'?row.exercise:source.guide,
      result:lang==='es'?row.result:source.outcome,
      methodStatus:'implemented',screens,
    }
  })
}

// Current AS-5.5 public preview for new AS2 only. Older V5/V6 public
// curriculum functions remain available for version-pinned historical views.
export function antiStressPublicPlanV7(locale='en'){
  const lang=['ru','en','es'].includes(locale)?locale:'en'
  const older=antiStressPublicPlanV6(lang)
  return older.map((row,index)=>{
    if(lang==='es')return {...row,methodStatus:'implemented',methodVersion:'AS-5.5'}
    const updated=opora55Day(index+1,lang)
    return {...row,title:updated.title,exercise:updated.guide,result:updated.outcome,
      methodStatus:'implemented',methodVersion:'AS-5.5',
      screens:[...updated.screens.map((screen,i)=>({
        number:i+1,role:screen.key,expected:screen.text
      })),{number:15,role:'receipt',expected:lang==='ru'
        ?'Результат после подтверждённого сохранения; без оценки психического здоровья'
        :'Receipt after confirmed save; never a mental-health score'}],
    }
  })
}
