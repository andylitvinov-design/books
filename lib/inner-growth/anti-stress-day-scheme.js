// Public, original educational curriculum outline. The actual per-day wording
// is sourced directly from the versioned Anti-Stress lesson library.
import { antiStressDay, antiStressSkillCards } from './anti-stress-outcomes-v3.js'

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
      screens:ANTISTRESS_SCREEN_ROLES.map((role,index)=>({
        number:index+1, role,expected:DEFINED_SECTIONS[lang==='es'?'en':lang][index],
        // This plan describes a potential client action, not proof it happened.
      })),
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
