// OPORA Anti-Stress day 1 — state-first guided self-support, compatible with AS-1.8 saved answers.
// Educational UX, not a clinical assessment or trauma treatment.
// Keep slides 1–5 in their established order. Redesign only slides 6–15.
export const DAY_ONE_SLIDES = Object.freeze([
  {key:'welcome',kind:'welcome',mode:'state_cards',methodId:'feeling_choice',expectedResponse:'Self-description or conscious skip',intent:'Contact without judgment'},
  {key:'baseline',kind:'baseline',mode:'optional_rating',methodId:'feeling_choice',expectedResponse:'Optional state rating, not diagnostic score',intent:'Notice present condition, not retake a test'},
  {key:'checkin',kind:'checkin',mode:'format_picker',methodId:'pace_picker',expectedResponse:'Choose a comfortable practice pace',intent:'Control over workload'},
  {key:'recall',kind:'recall',mode:'verified_focus',methodId:'focus_from_tests',expectedResponse:'Choose a verified scale or a general focus',intent:'Personal relevance'},
  {key:'idea',kind:'idea',mode:'thought_dialogue',methodId:'thought_dialogue',expectedResponse:'Agree, unsure, disagree or skip an idea',intent:'Reflect without compulsory agreement'},
  {key:'day1-prepare',kind:'day1-prepare',mode:'choice_tiles',methodId:'comfort_adjust',expectedResponse:'Choose a comfortable entry format or decline',intent:'Safety and readiness'},
  {key:'day1-notice',kind:'day1-notice',mode:'picture_region',methodId:'visual_scan',expectedResponse:'Optionally identify one current internal signal and an external visual anchor',intent:'Gentle awareness without forced interoception'},
  {key:'day1-practice',kind:'day1-practice',mode:'guided_stepper',methodId:'guided_steps',expectedResponse:'Try notice → orient → choose support → observe, or skip without penalty',intent:'Practise a small personally chosen response'},
  {key:'day1-exit',kind:'day1-exit',mode:'choice_tiles',methodId:'gentle_transition',expectedResponse:'Choose to stay, switch, rest or skip',intent:'Agency over ending a practice'},
  {key:'day1-anchor',kind:'day1-anchor',mode:'resource_builder',methodId:'anchor_card',expectedResponse:'Choose an actual need and an accessible support, or leave the card blank',intent:'Recognise what would help the present state'},
  {key:'day1-association',kind:'day1-association',mode:'three_word_tokens',methodId:'creative_words',expectedResponse:'Optionally express state, need and supportive response in three private words',intent:'Integrate awareness and a realistic response'},
  {key:'day1-independent',kind:'day1-independent',mode:'recall_with_hint',methodId:'retrieval_try',expectedResponse:'Try noticing a state and choosing one supportive response, with help or later',intent:'Independent self-support without a test'},
  {key:'day1-experience',kind:'day1-experience',mode:'honest_response_tiles',methodId:'reality_check',expectedResponse:'Name only self-reported clarity, agency, relief, no change or discomfort',intent:'Honestly reflect on the internal experience'},
  {key:'day1-adapt',kind:'day1-adapt',mode:'adaptive_choice',methodId:'comfort_adjust',expectedResponse:'Report comfort and confirm keep, simplify or replace',intent:'Personal adjustment without pressure'},
  {key:'day1-transfer',kind:'day1-transfer',mode:'if_then_builder',methodId:'if_then_card',expectedResponse:'Optionally connect an inner cue to a feasible support action, or skip',intent:'Leave with a usable state → response reminder'},
].map(item => Object.freeze(item)))

export const DAY_ONE_ALLOWED = Object.freeze({
  quote: ['agree','unsure','disagree','skip'],
  visualZone: ['left','center','right','skip'],
  anchorTone: ['blue','green','sand'],
  independentCue: ['colour','shape','object','pause','support','rest','skip'],
  hintUsed: ['yes'],
  focusId: ['general'], // plus verified user-owned selected scale IDs
  preparation: ['look','photo','read','rest','skip'],
  noticed: ['colour','shape','object','nothing','skip'],
  innerSignal: ['tension','rushing','fatigue','steady','unclear','skip'],
  innerNeed: ['space','rest','support','clarity','none','skip'],
  innerAction: ['orient','pause','rest','ask','none','skip'],
  practiceMode: ['audio','text'],
  practiceAttempt: ['tried','partly','stopped','skip'],
  exit: ['keep','change','stop','skip'],
  anchor: ['colour','shape','object','word','none','skip'],
  associations: ['tried','skip'],
  independent: ['independent','guided','deferred','skip'],
  experience: ['easier','clearer','more_choice','unchanged','unsure','uncomfortable','skip'],
  comfort: ['comfortable','neutral','uncomfortable','skip'],
  adaptation: ['keep','simplify','neutral','skip'],
  transferCue: ['after_task','hurry','before_rest','tension','fatigue','no_plan','skip'],
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
  if(clean.anchorTone && clean.anchor!=='colour')throw new Error('INVALID_DAY_ONE_DEPENDENCY')
  if(clean.hintUsed==='yes'&&clean.independent==='independent')throw new Error('INVALID_DAY_ONE_DEPENDENCY')
  if(clean.transferAction && !['after_task','hurry','before_rest','tension','fatigue'].includes(clean.transferCue))
    throw new Error('INVALID_DAY_ONE_DEPENDENCY')
  return clean
}

const QUOTES = Object.freeze({
  en: {
    calm_regulation:'An anchor begins with noticing how I feel, not forcing calm.',
    energy_agency:'Even when I am tired, I can notice what I need and choose one small response.',
    attention_clarity:'I can recognise my present state and gently choose where to put my attention.',
    emotional_flexibility:'My feelings can be present without deciding my next action for me.',
    inner_support:'I can meet my present state with a small, realistic act of care.',
    connection_boundaries:'I can notice my limits and choose a pause or support.',
  },
  ru: {
    calm_regulation:'Опора начинается с того, что я замечаю своё состояние, а не заставляю себя успокоиться.',
    energy_agency:'Даже когда я устал(а), я могу заметить потребность и выбрать маленький шаг.',
    attention_clarity:'Я могу замечать своё состояние и мягко выбирать, куда направить внимание.',
    emotional_flexibility:'Чувство может оставаться со мной, не решая за меня, как действовать.',
    inner_support:'Я могу ответить на своё состояние небольшим реальным действием заботы.',
    connection_boundaries:'Я могу замечать свои границы и выбирать паузу или поддержку.',
  },
})
export function dayOneAphorism(locale='en',goal=null,fallback='') {
  return QUOTES[locale==='ru'?'ru':'en'][goal] || fallback
}

/**
 * Presentation-only guided practice for the updated first-day player.
 * Never mutate the canonical anti-stress-outcomes-v3 lesson body: existing
 * enrolments pin that version and its immutable serialized payload.
 * This spoken/text guide must be voluntary and compatible with open eyes.
 */
export const DAY_ONE_PRACTICE_GUIDE = Object.freeze({
  ru: 'Попробуйте короткую практику. Сначала мягко отметьте, как вы сейчас: напряжение, усталость, внутренняя спешка, ровное состояние или пока непонятно. Не нужно искать причину или усиливать ощущения. Если внимание к себе неприятно, оставайтесь с обычной комнатой вокруг. Найдите глазами нейтральный предмет, отметьте его цвет или форму. Теперь спросите: чего мне сейчас немного не хватает — пространства, отдыха, ясности или поддержки? Если хочется, выберите один действительно доступный шаг: короткую паузу, отдых, внешний ориентир или возможность попросить помощи. Ничего делать тоже можно. Посмотрите, стало ли яснее, что вы чувствуете, или проще выбрать следующий шаг. Возможно, изменений нет. Это нормально. Закончите в своём темпе. Дыхание менять не нужно.',
  en: 'Try a short, gentle practice. First, notice one simple thing about your present state: tension, tiredness, inner rushing, feeling steady, or not knowing yet. There is no need to search for a cause or intensify any sensation. If looking inward feels uncomfortable, stay with the ordinary room around you. Look at a neutral object and notice its colour or shape. Now consider what might help a little: more space, rest, clarity, or support from someone. If you wish, choose one genuinely manageable response: a short pause, some rest, an external anchor, or the possibility of asking for help. Doing nothing is an option too. Notice whether your state feels clearer or another choice is more available. You might notice no change at all. That is okay. End in your own time, without changing your breathing.',
});
