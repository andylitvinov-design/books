/**
 * Versioned GROW dialogue guidance. Metadata is curated in the private
 * app_private.coaching_dialogue_questions_v1 catalog; this checked-in snapshot
 * intentionally avoids additional DB or model calls in the live voice loop.
 * Only the existing Director may grant progress from CLIENT evidence.
 */
export const GROW_DIALOGUE_QUESTION_BANK_VERSION='hh-grow-dialogue-question-bank-v1'
export const GROW_SOFT_STAGE_WINDOWS=Object.freeze({
 goal:Object.freeze([0,3]),reality:Object.freeze([3,12]),
 options:Object.freeze([12,16]),way_forward:Object.freeze([16,18]),
 review:Object.freeze([18,20])
})
const moves=Object.freeze({
 goal:'clarify_goal',reality:'ground_in_example',options:'surface_options',
 way_forward:'explore_client_owned_step',review:'confirm_client_summary'
})
export const GROW_DIALOGUE_QUESTIONS=Object.freeze([
  {
    "key": "grow_dialogue_goal_focus_01_v1",
    "modelKey": "grow_v1",
    "stepId": "goal",
    "dbStepKey": "goal",
    "interventionId": "clarify_goal",
    "evidenceKey": "goalRestated",
    "cues": [
      "focus"
    ],
    "priority": 10,
    "texts": {
      "en": "What would you most like to understand or change in this conversation?",
      "ru": "Что вам хотелось бы лучше понять или изменить в этом разговоре?",
      "es": "¿Qué te gustaría comprender o cambiar en esta conversación?"
    },
    "windowMinutes": [
      0,
      3
    ]
  },
  {
    "key": "grow_dialogue_goal_worth_02_v1",
    "modelKey": "grow_v1",
    "stepId": "goal",
    "dbStepKey": "goal",
    "interventionId": "clarify_goal",
    "evidenceKey": "goalRestated",
    "cues": [
      "outcome"
    ],
    "priority": 8,
    "texts": {
      "en": "What would make this conversation useful for you?",
      "ru": "Что сделало бы этот разговор полезным для вас?",
      "es": "¿Qué haría útil esta conversación para ti?"
    },
    "windowMinutes": [
      0,
      3
    ]
  },
  {
    "key": "grow_dialogue_goal_priority_03_v1",
    "modelKey": "grow_v1",
    "stepId": "goal",
    "dbStepKey": "goal",
    "interventionId": "clarify_goal",
    "evidenceKey": "workingFocusEstablished",
    "cues": [
      "focus"
    ],
    "priority": 7,
    "texts": {
      "en": "Which part of this matters most to you right now?",
      "ru": "Что в этой теме для вас сейчас важнее всего?",
      "es": "¿Qué parte de esto te importa más ahora mismo?"
    },
    "windowMinutes": [
      0,
      3
    ]
  },
  {
    "key": "grow_dialogue_goal_sign_04_v1",
    "modelKey": "grow_v1",
    "stepId": "goal",
    "dbStepKey": "goal",
    "interventionId": "clarify_goal",
    "evidenceKey": "goalRestated",
    "cues": [
      "outcome"
    ],
    "priority": 6,
    "texts": {
      "en": "What would be a small sign that things are moving in the right direction?",
      "ru": "Какой небольшой признак покажет, что ситуация меняется к лучшему?",
      "es": "¿Qué pequeña señal mostraría que las cosas van mejorando?"
    },
    "windowMinutes": [
      0,
      3
    ]
  },
  {
    "key": "grow_dialogue_goal_example_05_v1",
    "modelKey": "grow_v1",
    "stepId": "goal",
    "dbStepKey": "goal",
    "interventionId": "clarify_goal",
    "evidenceKey": "workingFocusEstablished",
    "cues": [
      "example"
    ],
    "priority": 9,
    "texts": {
      "en": "Is there one recent moment that shows why this matters to you?",
      "ru": "Есть ли недавний эпизод, который показывает, почему это для вас важно?",
      "es": "¿Hay algún momento reciente que muestre por qué esto te importa?"
    },
    "windowMinutes": [
      0,
      3
    ]
  },
  {
    "key": "grow_dialogue_reality_last_01_v1",
    "modelKey": "grow_v1",
    "stepId": "reality",
    "dbStepKey": "reality",
    "interventionId": "ground_in_example",
    "evidenceKey": "keyFactsCaptured",
    "cues": [
      "example"
    ],
    "priority": 9,
    "texts": {
      "en": "When did you last notice this happening?",
      "ru": "Когда вы в последний раз заметили, что это происходит?",
      "es": "¿Cuándo fue la última vez que notaste que esto ocurría?"
    },
    "windowMinutes": [
      3,
      12
    ]
  },
  {
    "key": "grow_dialogue_reality_detail_02_v1",
    "modelKey": "grow_v1",
    "stepId": "reality",
    "dbStepKey": "reality",
    "interventionId": "ground_in_example",
    "evidenceKey": "keyFactsCaptured",
    "cues": [
      "example"
    ],
    "priority": 10,
    "texts": {
      "en": "What exactly happened in that particular moment?",
      "ru": "Что именно произошло в тот момент?",
      "es": "¿Qué ocurrió exactamente en aquel momento?"
    },
    "windowMinutes": [
      3,
      12
    ]
  },
  {
    "key": "grow_dialogue_reality_control_03_v1",
    "modelKey": "grow_v1",
    "stepId": "reality",
    "dbStepKey": "reality",
    "interventionId": "ground_in_example",
    "evidenceKey": "constraintsReviewed",
    "cues": [
      "barrier"
    ],
    "priority": 9,
    "texts": {
      "en": "What is within your influence here, and what is not?",
      "ru": "На что здесь вы можете повлиять, а на что нет?",
      "es": "¿En qué puedes influir aquí y en qué no?"
    },
    "windowMinutes": [
      3,
      12
    ]
  },
  {
    "key": "grow_dialogue_reality_difficulty_04_v1",
    "modelKey": "grow_v1",
    "stepId": "reality",
    "dbStepKey": "reality",
    "interventionId": "ground_in_example",
    "evidenceKey": "constraintsReviewed",
    "cues": [
      "emotion",
      "barrier"
    ],
    "priority": 10,
    "texts": {
      "en": "What made that moment particularly difficult?",
      "ru": "Что именно сделало этот момент особенно трудным?",
      "es": "¿Qué hizo que aquel momento fuera especialmente difícil?"
    },
    "windowMinutes": [
      3,
      12
    ]
  },
  {
    "key": "grow_dialogue_reality_help_05_v1",
    "modelKey": "grow_v1",
    "stepId": "reality",
    "dbStepKey": "reality",
    "interventionId": "ground_in_example",
    "evidenceKey": "constraintsReviewed",
    "cues": [
      "resource"
    ],
    "priority": 7,
    "texts": {
      "en": "What has helped even a little in situations like this?",
      "ru": "Что уже помогало вам хотя бы немного в похожих ситуациях?",
      "es": "¿Qué te ha ayudado, aunque sea un poco, en situaciones parecidas?"
    },
    "windowMinutes": [
      3,
      12
    ]
  },
  {
    "key": "grow_dialogue_options_first_01_v1",
    "modelKey": "grow_v1",
    "stepId": "options",
    "dbStepKey": "options",
    "interventionId": "surface_options",
    "evidenceKey": "optionsExplored",
    "cues": [
      "alternative"
    ],
    "priority": 10,
    "texts": {
      "en": "What possible ways forward do you see, without deciding yet?",
      "ru": "Какие возможные пути вы видите, пока ничего не выбирая?",
      "es": "¿Qué caminos posibles ves, sin decidir todavía?"
    },
    "windowMinutes": [
      12,
      16
    ]
  },
  {
    "key": "grow_dialogue_options_another_02_v1",
    "modelKey": "grow_v1",
    "stepId": "options",
    "dbStepKey": "options",
    "interventionId": "surface_options",
    "evidenceKey": "optionsExplored",
    "cues": [
      "alternative"
    ],
    "priority": 9,
    "texts": {
      "en": "What is another possibility you have not explored yet?",
      "ru": "Какую ещё возможность вы пока не рассматривали?",
      "es": "¿Qué otra posibilidad aún no has explorado?"
    },
    "windowMinutes": [
      12,
      16
    ]
  },
  {
    "key": "grow_dialogue_options_view_03_v1",
    "modelKey": "grow_v1",
    "stepId": "options",
    "dbStepKey": "options",
    "interventionId": "surface_options",
    "evidenceKey": "optionsExplored",
    "cues": [
      "perspective"
    ],
    "priority": 8,
    "texts": {
      "en": "Is there another way to look at this situation?",
      "ru": "Можно ли посмотреть на эту ситуацию с другой стороны?",
      "es": "¿Hay otra manera de mirar esta situación?"
    },
    "windowMinutes": [
      12,
      16
    ]
  },
  {
    "key": "grow_dialogue_options_small_04_v1",
    "modelKey": "grow_v1",
    "stepId": "options",
    "dbStepKey": "options",
    "interventionId": "surface_options",
    "evidenceKey": "optionsExplored",
    "cues": [
      "experiment"
    ],
    "priority": 7,
    "texts": {
      "en": "What small and reversible experiment could be worth considering?",
      "ru": "Какой небольшой и обратимый эксперимент стоило бы рассмотреть?",
      "es": "¿Qué pequeño experimento reversible podría valer la pena considerar?"
    },
    "windowMinutes": [
      12,
      16
    ]
  },
  {
    "key": "grow_dialogue_will_choice_01_v1",
    "modelKey": "grow_v1",
    "stepId": "way_forward",
    "dbStepKey": "will",
    "interventionId": "explore_client_owned_step",
    "evidenceKey": "clientActionApproved",
    "cues": [
      "ready"
    ],
    "priority": 10,
    "texts": {
      "en": "Would you like to choose something small to try, or leave it open for now?",
      "ru": "Хотите выбрать что-то небольшое для пробы или пока оставить вопрос открытым?",
      "es": "¿Te gustaría elegir algo pequeño para probar o dejarlo abierto por ahora?"
    },
    "windowMinutes": [
      16,
      18
    ]
  },
  {
    "key": "grow_dialogue_will_realistic_02_v1",
    "modelKey": "grow_v1",
    "stepId": "way_forward",
    "dbStepKey": "will",
    "interventionId": "explore_client_owned_step",
    "evidenceKey": "clientActionApproved",
    "cues": [
      "ready"
    ],
    "priority": 9,
    "texts": {
      "en": "If you do choose to try something, what would feel realistic to you?",
      "ru": "Если вы решите что-то попробовать, какой вариант будет для вас реалистичным?",
      "es": "Si decides probar algo, ¿qué opción te parecería realista?"
    },
    "windowMinutes": [
      16,
      18
    ]
  },
  {
    "key": "grow_dialogue_will_when_03_v1",
    "modelKey": "grow_v1",
    "stepId": "way_forward",
    "dbStepKey": "will",
    "interventionId": "explore_client_owned_step",
    "evidenceKey": "timingSpecified",
    "cues": [
      "ready"
    ],
    "priority": 9,
    "texts": {
      "en": "When might it fit naturally into your life?",
      "ru": "Когда это могло бы естественно вписаться в вашу жизнь?",
      "es": "¿Cuándo podría encajar de forma natural en tu vida?"
    },
    "windowMinutes": [
      16,
      18
    ]
  },
  {
    "key": "grow_dialogue_will_barrier_04_v1",
    "modelKey": "grow_v1",
    "stepId": "way_forward",
    "dbStepKey": "will",
    "interventionId": "explore_client_owned_step",
    "evidenceKey": "feasibilityChecked",
    "cues": [
      "barrier"
    ],
    "priority": 10,
    "texts": {
      "en": "What might make this step difficult?",
      "ru": "Что может затруднить этот шаг?",
      "es": "¿Qué podría dificultar ese paso?"
    },
    "windowMinutes": [
      16,
      18
    ]
  },
  {
    "key": "grow_dialogue_will_own_05_v1",
    "modelKey": "grow_v1",
    "stepId": "way_forward",
    "dbStepKey": "will",
    "interventionId": "explore_client_owned_step",
    "evidenceKey": "clientActionApproved",
    "cues": [
      "ready"
    ],
    "priority": 7,
    "texts": {
      "en": "Does that step feel like your own choice, or someone else’s expectation?",
      "ru": "Этот шаг ощущается вашим выбором или скорее чужим ожиданием?",
      "es": "¿Ese paso se siente como tu elección o como una expectativa ajena?"
    },
    "windowMinutes": [
      16,
      18
    ]
  },
  {
    "key": "grow_dialogue_review_clarity_01_v1",
    "modelKey": "grow_v1",
    "stepId": "review",
    "dbStepKey": "review",
    "interventionId": "confirm_client_summary",
    "evidenceKey": "summaryReviewed",
    "cues": [
      "reflection"
    ],
    "priority": 10,
    "texts": {
      "en": "What feels clearer to you after this conversation?",
      "ru": "Что после этого разговора стало для вас яснее?",
      "es": "¿Qué te queda más claro después de esta conversación?"
    },
    "windowMinutes": [
      18,
      20
    ]
  },
  {
    "key": "grow_dialogue_review_takeaway_02_v1",
    "modelKey": "grow_v1",
    "stepId": "review",
    "dbStepKey": "review",
    "interventionId": "confirm_client_summary",
    "evidenceKey": "summaryReviewed",
    "cues": [
      "reflection"
    ],
    "priority": 9,
    "texts": {
      "en": "What would you like to take away from today?",
      "ru": "Что вам хотелось бы унести с собой из сегодняшнего разговора?",
      "es": "¿Qué te gustaría llevarte de la conversación de hoy?"
    },
    "windowMinutes": [
      18,
      20
    ]
  },
  {
    "key": "grow_dialogue_review_open_03_v1",
    "modelKey": "grow_v1",
    "stepId": "review",
    "dbStepKey": "review",
    "interventionId": "confirm_client_summary",
    "evidenceKey": "summaryReviewed",
    "cues": [
      "reflection"
    ],
    "priority": 8,
    "texts": {
      "en": "What, if anything, still feels unresolved?",
      "ru": "Что, если что-то осталось, пока не прояснилось?",
      "es": "¿Qué, si acaso, sigue sin quedar claro?"
    },
    "windowMinutes": [
      18,
      20
    ]
  },
  {
    "key": "grow_dialogue_review_pause_04_v1",
    "modelKey": "grow_v1",
    "stepId": "review",
    "dbStepKey": "review",
    "interventionId": "confirm_client_summary",
    "evidenceKey": "summaryReviewed",
    "cues": [
      "reflection"
    ],
    "priority": 6,
    "texts": {
      "en": "Would you prefer to stop here, pause, or carry on?",
      "ru": "Хотите здесь закончить, сделать паузу или продолжить?",
      "es": "¿Prefieres terminar aquí, hacer una pausa o continuar?"
    },
    "windowMinutes": [
      18,
      20
    ]
  }
])
const cues=Object.freeze({
 focus:/(?:важн|хочу|запрос|цель|тема|need|want|goal|matter|topic|quiero|objetivo|tema)/iu,
 outcome:/(?:измен|результат|лучше|получ|result|change|better|hope|mejor|cambi|resultado)/iu,
 example:/(?:вчера|сегодня|недел|когда|было|случай|yesterday|last|when|happen|ayer|cuando|pas[oó])/iu,
 barrier:/(?:меша|сложн|трудн|невозмож|препятств|because|difficult|stuck|limit|dif[ií]cil|impide)/iu,
 emotion:/(?:чувств|страшн|злюсь|груст|боюсь|feel|afraid|angry|sad|siento|miedo|triste)/iu,
 resource:/(?:помога|удавал|ресурс|поддержк|helped|worked|support|ayud|funcion)/iu,
 alternative:/(?:вариант|альтернат|можно|выбор|option|could|alternative|opci[oó]n|alternativ)/iu,
 perspective:/(?:взгляд|понима|иначе|смысл|view|perspective|understand|mirada|perspectiv)/iu,
 experiment:/(?:попроб|эксперимент|риск|try|experiment|risk|probar|experiment)/iu,
 ready:/(?:готов|выбира|сделаю|решил|tomorrow|will|ready|choose|har[eé]|listo|decid)/iu,
 reflection:/(?:понял|ясн|важн|вывод|realiz|learn|clear|clar|aprend|entend)/iu
})
const tokens=s=>new Set(String(s||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(' ').filter(x=>x.length>2))
function repeated(a,b){
 const x=tokens(a),y=tokens(b)
 if(!x.size||!y.size)return false
 let hits=0
 for(const token of x)if(y.has(token))hits++
 return hits/Math.min(x.size,y.size)>=0.78
}
/** Optional ranking within the Director-selected step; cannot promote a step. */
export function selectGrowDialogueQuestions(directive,input={},limit=2){
 if(directive?.methodId!=='grow'||directive?.allowQuestion!==true||
    directive?.interventionId!==moves[directive?.methodStepId?.split(':')[1]]||
    !Number.isInteger(limit)||limit<1||limit>4)return []
 const stepId=directive.methodStepId.split(':')[1]
 const missing=new Set(directive.readiness?.missing||[])
 const latest=String(input.message||'').slice(0,1200)
 const previous=(Array.isArray(input.turns)?input.turns:[])
   .filter(t=>t?.role==='assistant'&&typeof t.content==='string')
   .slice(-3).map(t=>t.content)
 const lang=['en','ru','es'].includes(directive.locale)?directive.locale:'en'
 const seconds=directive.timebox?.elapsedSeconds
 const min=typeof seconds==='number'&&Number.isFinite(seconds)?seconds/60:null
 return GROW_DIALOGUE_QUESTIONS.filter(q=>q.stepId===stepId)
  .filter(q=>!(stepId==='way_forward'&&
    ['timingSpecified','feasibilityChecked'].includes(q.evidenceKey)&&
    directive.evidence?.clientActionApproved!==true))
  .filter(q=>!previous.some(p=>repeated(p,q.texts[lang])))
  .map(q=>{
    let score=q.priority+(missing.has(q.evidenceKey)?8:-5)
    if(q.cues.some(cue=>cues[cue]?.test(latest)))score+=3
    // Advisory time ranking ONLY after the Director locks the step.
    if(min!==null&&min>=q.windowMinutes[0]&&min<=q.windowMinutes[1])score++
    return {q,score}
  }).sort((a,b)=>b.score-a.score||a.q.key.localeCompare(b.q.key))
  .slice(0,limit).map(({q})=>q)
}
/** A suggestion to the natural-language model, never a mandatory question. */
export function growDialogueQuestionGuidance(directive,input={}){
 const selected=selectGrowDialogueQuestions(directive,input)
 if(!selected.length)return ''
 const lang=['en','ru','es'].includes(directive.locale)?directive.locale:'en'
 const window=selected[0].windowMinutes
 return [
  'Curated GROW prompts='+GROW_DIALOGUE_QUESTION_BANK_VERSION+'.',
  'Stay in Director-authorized step='+selected[0].stepId+'. Missing client evidence='+
    (directive.readiness?.missing||[]).join(', ')+'.',
  'Optional pacing target: minutes '+window[0]+'–'+window[1]+
    ' of 20; timing is NOT a deadline or permission to skip a stage.',
  'Potential phrasings (not a questionnaire): '+
    selected.map(q=>q.key+': '+q.texts[lang]).join(' | ')+'.',
  'Choose at most ONE helpful question idea, or NONE, in a fresh personal voice.',
  'Respond to the latest client first. Never repeat a prior question, push a plan, or announce stage completion.',
  'Never show question IDs. Only client-authored evidence grants stage progress.'
 ].join(' ')
}
