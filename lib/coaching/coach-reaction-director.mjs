// Local reaction director. Read-only visual observer: never drives microphone, speech, transport, storage or model calls.
// Exact acting inventory, not inferred emotion labels. Each camera is locked for the session.
import {planEmpathyTurn} from '../holistic-support/empathy-mind.mjs'
export const COACH_REACTION_PROFILES=Object.freeze({
  "primary": {
    "mira": {
      "presence": [
        "MIR-01"
      ],
      "listening": [
        "MIR-02",
        "MIR-01"
      ],
      "speaking": [
        "MIR-01"
      ],
      "greeting": [
        "MIR-01"
      ],
      "farewell": [
        "MIR-01"
      ],
      "thinking": [
        "MIR-01"
      ],
      "interest": [
        "MIR-02"
      ],
      "understanding": [
        "MIR-01"
      ],
      "encouragement": [
        "MIR-01"
      ],
      "closure": [
        "MIR-01"
      ]
    },
    "alex": {
      "presence": [
        "ALX-01"
      ],
      "listening": [
        "ALX-01",
        "ALX-02"
      ],
      "speaking": [
        "ALX-01"
      ],
      "greeting": [
        "ALX-01"
      ],
      "farewell": [
        "ALX-01"
      ],
      "thinking": [
        "ALX-01"
      ],
      "interest": [
        "ALX-02"
      ],
      "understanding": [
        "ALX-02"
      ],
      "encouragement": [
        "ALX-01"
      ],
      "closure": [
        "ALX-01"
      ]
    },
    "sofia": {
      "presence": [
        "SOF-02"
      ],
      "listening": [
        "SOF-02"
      ],
      "speaking": [
        "SOF-02"
      ],
      "greeting": [
        "SOF-02"
      ],
      "farewell": [
        "SOF-02"
      ],
      "thinking": [
        "SOF-01"
      ],
      "interest": [
        "SOF-02"
      ],
      "understanding": [
        "SOF-02"
      ],
      "encouragement": [
        "SOF-02"
      ],
      "closure": [
        "SOF-02"
      ]
    },
    "max": {
      "presence": [
        "MAX-01"
      ],
      "listening": [
        "MAX-02",
        "MAX-01"
      ],
      "speaking": [
        "MAX-01"
      ],
      "greeting": [
        "MAX-01"
      ],
      "farewell": [
        "MAX-01"
      ],
      "thinking": [
        "MAX-01"
      ],
      "interest": [
        "MAX-02"
      ],
      "understanding": [
        "MAX-02"
      ],
      "encouragement": [
        "MAX-01"
      ],
      "closure": [
        "MAX-01"
      ]
    },
    "merlin": {
      "presence": [],
      "listening": [],
      "speaking": [],
      "greeting": [
        "MER-01"
      ],
      "farewell": [
        "MER-01"
      ],
      "thinking": [],
      "interest": [],
      "understanding": [],
      "encouragement": [],
      "closure": []
    },
    "harry": {
      "presence": [
        "HAR-01"
      ],
      "listening": [
        "HAR-01"
      ],
      "speaking": [
        "HAR-01"
      ],
      "greeting": [
        "HAR-03A"
      ],
      "farewell": [
        "HAR-02"
      ],
      "thinking": [
        "HAR-01"
      ],
      "interest": [
        "HAR-01"
      ],
      "understanding": [
        "HAR-01"
      ],
      "encouragement": [
        "HAR-02",
        "HAR-03B",
        "HAR-03C"
      ],
      "closure": [
        "HAR-01"
      ]
    },
    "genie": {
      "presence": [
        "SAM-01"
      ],
      "listening": [
        "SAM-02",
        "SAM-01"
      ],
      "speaking": [
        "SAM-01"
      ],
      "greeting": [
        "SAM-01"
      ],
      "farewell": [
        "SAM-01"
      ],
      "thinking": [
        "SAM-02"
      ],
      "interest": [
        "SAM-02"
      ],
      "understanding": [
        "SAM-02"
      ],
      "encouragement": [
        "SAM-03B",
        "SAM-03A"
      ],
      "closure": [
        "SAM-01"
      ]
    }
  },
  "alternate": {
    "mira": {
      "presence": [
        "MIR-A01"
      ],
      "listening": [
        "MIR-A01"
      ],
      "speaking": [
        "MIR-A01"
      ],
      "greeting": [
        "MIR-A01"
      ],
      "farewell": [
        "MIR-A01"
      ],
      "thinking": [
        "MIR-A01"
      ],
      "interest": [
        "MIR-A02"
      ],
      "understanding": [
        "MIR-A01"
      ],
      "encouragement": [
        "MIR-A01"
      ],
      "closure": [
        "MIR-A01"
      ]
    },
    "alex": {
      "presence": [
        "ALX-A01"
      ],
      "listening": [
        "ALX-A01"
      ],
      "speaking": [
        "ALX-A01"
      ],
      "greeting": [
        "ALX-A01"
      ],
      "farewell": [
        "ALX-A01"
      ],
      "thinking": [
        "ALX-A01"
      ],
      "interest": [
        "ALX-A01"
      ],
      "understanding": [
        "ALX-A02"
      ],
      "encouragement": [
        "ALX-A01"
      ],
      "closure": [
        "ALX-A01"
      ]
    },
    "sofia": {
      "presence": [
        "SOF-A01"
      ],
      "listening": [
        "SOF-A01"
      ],
      "speaking": [
        "SOF-A01"
      ],
      "greeting": [
        "SOF-A01"
      ],
      "farewell": [
        "SOF-A01"
      ],
      "thinking": [
        "SOF-A01"
      ],
      "interest": [
        "SOF-A01"
      ],
      "understanding": [
        "SOF-A02"
      ],
      "encouragement": [
        "SOF-A01"
      ],
      "closure": [
        "SOF-A01"
      ]
    },
    "max": {
      "presence": [
        "MAX-A01"
      ],
      "listening": [
        "MAX-A01"
      ],
      "speaking": [
        "MAX-A01"
      ],
      "greeting": [
        "MAX-A01"
      ],
      "farewell": [
        "MAX-A01"
      ],
      "thinking": [
        "MAX-A02"
      ],
      "interest": [
        "MAX-A01"
      ],
      "understanding": [
        "MAX-A01"
      ],
      "encouragement": [
        "MAX-A01"
      ],
      "closure": [
        "MAX-A01"
      ]
    },
    "merlin": {
      "presence": [
        "MER-A01"
      ],
      "listening": [
        "MER-A01"
      ],
      "speaking": [
        "MER-A01"
      ],
      "greeting": [
        "MER-A01"
      ],
      "farewell": [
        "MER-A01"
      ],
      "thinking": [
        "MER-A02"
      ],
      "interest": [
        "MER-A01"
      ],
      "understanding": [
        "MER-A01"
      ],
      "encouragement": [
        "MER-A01"
      ],
      "closure": [
        "MER-A01"
      ]
    },
    "harry": {
      "presence": [
        "HAR-A01"
      ],
      "listening": [
        "HAR-A01"
      ],
      "speaking": [
        "HAR-A01"
      ],
      "greeting": [
        "HAR-A01"
      ],
      "farewell": [
        "HAR-A01"
      ],
      "thinking": [
        "HAR-A01"
      ],
      "interest": [
        "HAR-A01"
      ],
      "understanding": [
        "HAR-A01"
      ],
      "encouragement": [
        "HAR-A01"
      ],
      "closure": [
        "HAR-A01"
      ]
    },
    "genie": {
      "presence": [
        "SAM-A01"
      ],
      "listening": [
        "SAM-A01"
      ],
      "speaking": [
        "SAM-A01"
      ],
      "greeting": [
        "SAM-A01"
      ],
      "farewell": [
        "SAM-A01"
      ],
      "thinking": [
        "SAM-A01"
      ],
      "interest": [
        "SAM-A01"
      ],
      "understanding": [
        "SAM-A01"
      ],
      "encouragement": [
        "SAM-A02"
      ],
      "closure": [
        "SAM-A01"
      ]
    }
  }
})

export function initialCoachMicActivity(){return {active:false,highSince:null,lowSince:null,lastSample:null}}

export function stepCoachMicActivity(previous,level,at,phase){
  if(phase!=='listening'||!Number.isFinite(at))return initialCoachMicActivity()
  let s=previous||initialCoachMicActivity()
  if(s.lastSample===null||at<s.lastSample||at-s.lastSample>750)s=initialCoachMicActivity()
  const value=Number.isFinite(level)?Math.min(1,Math.max(0,level)):0
  if(!s.active){
    const highSince=value>=0.15?(s.highSince??at):null
    return {active:highSince!==null&&at-highSince>=120,highSince,lowSince:null,lastSample:at}
  }
  const lowSince=value<=0.08?(s.lowSince??at):null
  const active=lowSince===null||at-lowSince<450
  return {active,highSince:null,lowSince:active?lowSince:null,lastSample:at}
}

function explicitDistressCue(text){
  // Conservative visual veto only. Shared explicit self-report policy, not a diagnosis.
  const clauses=[text,...text.split(/[.!;]+|\b(?:but|however|pero|aunque)\b|(?:^|\s)(?:но|однако)(?=\s)/iu).map(x=>x.trim())].slice(0,12);
  return clauses.some(message=>{
    const cue=planEmpathyTurn({message,role:'coach',safety:{status:'clear'}});
    return cue?.evidence==='explicit_current_self_report'&&cue.certainty==='explicit'&&['fear','shame','sad','anger','overload'].includes(cue.emotion);
  });
}

function ambiguousPositiveCue(text){
  // Quotation, another person's words, possibility, question or correction
  // is insufficient evidence for a celebration.
  return /[?？"«»“”]|\b(?:if|maybe|perhaps|suppose|hypothetically|not sure|never said|didn't say|did not say|thought i|wish i|they said|he said|she said|told me|no lo|tal vez|si yo|dijo|no dije)\b|(?:^|[^\p{L}])(?:quiz[aá]s?|pens[eé] que)(?=$|[^\p{L}])|(?:если бы|если я|может быть|возможно|не уверен|не уверена|не говори[лв]|не сказа[лв]|думал(?:а)?[,\s]+что|мне сказали|он сказал|она сказала|не получилось|не удалось|не смог)/iu.test(text);
}

export function classifyClientReactionText(text){
  const value=typeof text==='string'?text.toLocaleLowerCase().slice(-1400):''
  // These are conservative textual cues, not a person's actual emotion, diagnosis or sentiment score.
  // Protect distress before considering progress, questions or celebrations.
  if(explicitDistressCue(value))return 'distress'
  if(/\b(afraid|scared|overwhelmed|hurt|painful|grief|lonely|terrified|hopeless|panic|sad|anxious|difficult|not okay|not happy|not proud)\b|страшн|больно|больн|тревог|тревож|тяжело|груст|одинок|отча[яе]|паник|потеря|горе|не рад|не справ|трудн|miedo|dolor|triste|duelo|ansiedad|dif[ií]cil|abrumad|no estoy bien|no estoy feliz/u.test(value))return 'distress'
  if(!ambiguousPositiveCue(value)&&(/\b(i (did it|made it|managed|succeeded|am proud)|i've (done it|made progress)|i achieved|i am happy about)\b|я справил|у меня получилось|я смог|мне удалось|я горжусь|я достиг|я рада, что|я рад, что|lo (logr[eé]|consegu[ií])|estoy orgullos|he logrado/u.test(value)))return 'progress'
  if(/\b(i realize|i understand now|now i see|i've realized)\b|я осозна|теперь понимаю|я понял|я поняла|мне стало ясно|ahora entiendo|me doy cuenta/u.test(value))return 'insight'
  if(/[?？]/u.test(value)||/\b(i wonder|i am curious|i'm curious)\b|мне интересно|мне любопытно|me interesa|tengo curiosidad/u.test(value))return 'interest'
  return 'neutral'
}

// Explicit farewell only; summarizing is not a farewell.
export function coachExplicitFarewell(text){
  const s=typeof text==='string'?text.toLocaleLowerCase().trim().slice(-800):''
  return /(?:^|[.!?]\s+|[,;]\s*)(?:до свидания|до встречи|до следующей встречи|хорошего (?:дня|вечера)|goodbye|see you (?:next time|soon)|take care|have a (?:good|lovely) day|hasta (?:luego|pronto|la próxima)|adiós|cuídate|que tengas un buen día)(?=$|[!.?,;\s])/u.test(s)
}
export function coachReactionIntent({phase='idle',micActive=false,clientText='',coachScene='calm',stage='',turnKey=0,paused=false,opening=false,closing=false,coachText=''}={}){
  const turn=Number.isSafeInteger(turnKey)&&turnKey>=0?turnKey:0
  const make=(kind,speaker,scene,reason)=>({kind,speaker,scene,reason,turnKey:turn})
  if(paused||phase==='paused')return make('hold','none','calm','paused')
  const speaker=phase==='speaking'?'coach':phase==='listening'&&micActive?'client':'none'
  if(stage==='safety')return make('hold',speaker,'empathy','safety')
  const clientCue=classifyClientReactionText(clientText)
  if(clientCue==='distress'||(speaker==='coach'&&coachScene==='empathy'))
    return make('empathy',speaker,'empathy','conservative-text-cue')
  if(speaker==='coach'){
    if(coachExplicitFarewell(coachText)||closing)return make('farewell','coach','closure','actual-closing')
    if(opening)return make('greeting','coach','welcome','opening')
    if(coachScene==='closure')return make('closure','coach','closure','summary-not-exit')
    if(['encourage','action'].includes(coachScene)&&clientCue==='progress')
      return make('encouragement','coach','encourage','explicit-client-progress')
    if(coachScene==='insight'||clientCue==='insight')return make('understanding','coach','insight','reply-cue')
    if(coachScene==='curiosity')return make('interest','coach','curiosity','reply-question')
    return make('speaking','coach',['action','explain'].includes(coachScene)?coachScene:'explain','default-coach-output')
  }
  if(phase==='thinking'||phase==='loading')return make('thinking','none','calm','waiting-for-reply')
  if(phase==='listening'){
    if(speaker!=='client')return make('presence','none','calm','open-mic-silence')
    if(clientCue==='insight')return make('understanding','client','insight','client-insight')
    return make(clientCue==='interest'?'interest':'listening','client',clientCue==='interest'?'curiosity':'attentive','client-voice-active')
  }
  if(phase==='greeting'||opening)return make('greeting','none','welcome','opening')
  return make('presence','none','calm','quiet')
}

export function chooseCoachReaction(persona,intent,available,used=[],options={}){
  const group=options.group==='alternate'?'alternate':'primary'
  const profiles=COACH_REACTION_PROFILES[group]
  const p=Object.hasOwn(profiles,persona)?profiles[persona]:null
  if(!p||!intent||['hold','empathy'].includes(intent.kind))return null
  const allowed=new Set(Array.isArray(available)?available:[])
  const oneShot=['greeting','farewell','encouragement','understanding','closure'].includes(intent.kind)
  const turn=Number.isSafeInteger(intent.turnKey)&&intent.turnKey>=0?intent.turnKey:0
  const key=oneShot?persona+':'+intent.kind+':'+(['greeting','farewell'].includes(intent.kind)?'session':turn):null
  const consumed=oneShot&&used.includes(key)
  if(consumed&&intent.kind==='farewell')return null
  const fallback=intent.speaker==='client'?'listening':intent.speaker==='coach'?'speaking':'presence'
  let candidates=consumed?[]:(p[intent.kind]||[]).filter(id=>allowed.has(id))
  const configured=candidates.length>0
  if(!candidates.length)candidates=(p[fallback]||p.presence||[]).filter(id=>allowed.has(id))
  if(!candidates.length)return null
  const once=Boolean(configured&&oneShot&&!consumed)
  let id=candidates[once?turn%candidates.length:0]
  if(!once&&candidates.length>1&&id===options.previousId)id=candidates.find(x=>x!==options.previousId)||id
  return {id,once,key:once?key:null}
}

export function coachReactionCanStart({enabled=true,playing=false,atBoundary=false,ready=false,sameAnchor=false}={}){
  return enabled&&(!playing||atBoundary)&&ready&&sameAnchor
}
