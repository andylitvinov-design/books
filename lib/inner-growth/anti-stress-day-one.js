// OPORA Anti-Stress day 1 — interactive lesson specification, AS-1.8.
// Educational UX, not a clinical assessment or trauma treatment.
// Keep slides 1–5 in their established order. Redesign only slides 6–15.
export const DAY_ONE_SLIDES = Object.freeze([
  {key:'welcome',kind:'welcome',expectedResponse:'Self-description or conscious skip',intent:'Contact without judgment'},
  {key:'baseline',kind:'baseline',expectedResponse:'Optional state rating',intent:'Notice today, not repeat a test'},
  {key:'checkin',kind:'checkin',expectedResponse:'Choose practice format or continue',intent:'Safe control over pacing'},
  {key:'recall',kind:'recall',expectedResponse:'Choose a verified personal focus or general option',intent:'Personal relevance'},
  {key:'idea',kind:'idea',expectedResponse:'Agree, unsure, disagree, or skip',intent:'Dialogue without forced agreement'},
  {key:'day1-prepare',kind:'day1-prepare',expectedResponse:'Choose a comfortable first step',intent:'Permission and readiness'},
  {key:'day1-notice',kind:'day1-notice',expectedResponse:'Notice a real or pictured detail or decline',intent:'Present-moment orientation'},
  {key:'day1-practice',kind:'day1-practice',expectedResponse:'Select text/audio and report the attempt honestly',intent:'Try one grounding practice'},
  {key:'day1-exit',kind:'day1-exit',expectedResponse:'Choose how to finish without forcing a feeling',intent:'Agency over stopping'},
  {key:'day1-anchor',kind:'day1-anchor',expectedResponse:'Choose one available neutral anchor',intent:'Accessible resource'},
  {key:'day1-association',kind:'day1-association',expectedResponse:'Optional three associations, no diagnosis',intent:'Personal meaning-making'},
  {key:'day1-independent',kind:'day1-independent',expectedResponse:'Try alone, ask for a hint, or defer',intent:'Gentle retrieval of the same skill'},
  {key:'day1-experience',kind:'day1-experience',expectedResponse:'Honestly describe change or no change',intent:'Non-evaluative integration'},
  {key:'day1-adapt',kind:'day1-adapt',expectedResponse:'Rate comfort optionally; keep, simplify or change',intent:'User-controlled adaptation'},
  {key:'day1-transfer',kind:'day1-transfer',expectedResponse:'Choose optional everyday cue and explicitly save',intent:'Voluntary daily-life transfer'},
].map(item => Object.freeze(item)))

export const DAY_ONE_ALLOWED = Object.freeze({
  quote: ['agree','unsure','disagree','skip'],
  focusId: ['general'], // plus verified user-owned selected scale IDs
  preparation: ['look','photo','read','rest','skip'],
  noticed: ['colour','shape','object','nothing','skip'],
  practiceMode: ['audio','text'],
  practiceAttempt: ['tried','partly','stopped','skip'],
  exit: ['keep','change','stop','skip'],
  anchor: ['colour','shape','object','word','none','skip'],
  associations: ['tried','skip'],
  independent: ['independent','guided','deferred','skip'],
  experience: ['easier','more_choice','unchanged','unsure','uncomfortable','skip'],
  comfort: ['comfortable','neutral','uncomfortable','skip'],
  adaptation: ['keep','simplify','neutral','skip'],
  transferCue: ['after_task','hurry','before_rest','no_plan','skip'],
  transferAction: ['look','pause','rest','ask','none','skip'],
})

export function validateDayOneAnswers(raw, verifiedFocusIds = []) {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_DAY_ONE_ANSWERS')
  const allowedFocus = new Set(['general', ...(Array.isArray(verifiedFocusIds) ? verifiedFocusIds : [])])
  const clean = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(DAY_ONE_ALLOWED, key)) throw new Error('INVALID_DAY_ONE_FIELD')
    if (typeof value !== 'string' || value.length > 120) throw new Error('INVALID_DAY_ONE_CHOICE')
    if (key === 'focusId' ? !allowedFocus.has(value) : !DAY_ONE_ALLOWED[key].includes(value)) throw new Error('INVALID_DAY_ONE_CHOICE')
    clean[key] = value
  }
  return clean
}

const QUOTES = Object.freeze({
  en: {
    calm_regulation:'I can look for one steady point without forcing myself to relax.',
    energy_agency:'Even when I feel tired, a very small pause may be available.',
    attention_clarity:'Noticing one simple detail is already an act of attention.',
    emotional_flexibility:'I can notice how I feel without needing to change it first.',
    inner_support:'I am allowed to choose the kind of support that fits me.',
    connection_boundaries:'I am allowed to slow down and choose what feels comfortable.',
  },
  ru: {
    calm_regulation:'Мне можно найти одну устойчивую точку, не заставляя себя расслабляться.',
    energy_agency:'Даже когда сил мало, небольшая пауза может быть доступна.',
    attention_clarity:'Заметить одну простую деталь — уже направить своё внимание.',
    emotional_flexibility:'Я могу замечать свои чувства, не требуя немедленно их изменить.',
    inner_support:'Я могу выбирать ту поддержку, которая подходит именно мне.',
    connection_boundaries:'Мне можно замедлиться и выбрать комфортную дистанцию.',
  },
})
export function dayOneAphorism(locale='en',goal=null,fallback='') {
  return QUOTES[locale==='ru'?'ru':'en'][goal] || fallback
}
