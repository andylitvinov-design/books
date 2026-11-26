// Local reaction director. Read-only visual observer: never drives microphone, speech, transport, storage or model calls.
const PROFILES=Object.freeze({
  "mira": {
    "presence": "MIR-01",
    "listening": "MIR-02",
    "interest": "MIR-02"
  },
  "alex": {
    "presence": "ALX-01",
    "listening": "ALX-01",
    "interest": "ALX-02"
  },
  "sofia": {
    "presence": "SOF-02",
    "listening": "SOF-02",
    "thinking": "SOF-01"
  },
  "max": {
    "presence": "MAX-01",
    "listening": "MAX-02",
    "interest": "MAX-02"
  },
  "merlin": {
    "greeting": "MER-01"
  },
  "harry": {
    "presence": "HAR-01",
    "listening": "HAR-01",
    "greeting": "HAR-03A",
    "encouragement": ["HAR-02","HAR-03B","HAR-03C"]
  },
  "genie": {
    "presence": "SAM-01",
    "listening": "SAM-02",
    "greeting": "SAM-01",
    "encouragement": ["SAM-03B","SAM-03A"]
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

export function classifyClientReactionText(text){
  const value=typeof text==='string'?text.toLocaleLowerCase().slice(-1400):''
  // These are conservative textual cues, not a person's actual emotion, diagnosis or sentiment score.
  // Protect distress before considering progress, questions or celebrations.
  if(/\b(afraid|scared|overwhelmed|hurt|painful|grief|lonely|terrified|hopeless|panic|sad|anxious|difficult|not okay|not happy|not proud)\b|страшн|больно|больн|тревог|тревож|тяжело|груст|одинок|отча[яе]|паник|потеря|горе|не рад|не справ|трудн|miedo|dolor|triste|duelo|ansiedad|dif[ií]cil|abrumad|no estoy bien|no estoy feliz/u.test(value))return 'distress'
  if(/\b(i (did it|made it|managed|succeeded|am proud)|i've (done it|made progress)|i achieved|i am happy about)\b|я справил|у меня получилось|я смог|мне удалось|я горжусь|я достиг|я рада, что|я рад, что|lo (logr[eé]|consegu[ií])|estoy orgullos|he logrado/u.test(value))return 'progress'
  if(/\b(i realize|i understand now|now i see|i've realized)\b|я осозна|теперь понимаю|я понял|я поняла|мне стало ясно|ahora entiendo|me doy cuenta/u.test(value))return 'insight'
  if(/[?？]/u.test(value)||/\b(i wonder|i am curious|i'm curious)\b|мне интересно|мне любопытно|me interesa|tengo curiosidad/u.test(value))return 'interest'
  return 'neutral'
}

export function coachReactionIntent({phase='idle',micActive=false,clientText='',coachScene='calm',stage='',turnKey=0,paused=false,opening=false}={}){
  const turn=Number.isSafeInteger(turnKey)&&turnKey>=0?turnKey:0
  const make=(kind,speaker,scene,reason)=>({kind,speaker,scene,reason,turnKey:turn})
  if(paused||phase==='paused')return make('hold','none','calm','paused')
  const speaker=phase==='speaking'?'coach':phase==='listening'&&micActive?'client':'none'
  const clientCue=classifyClientReactionText(clientText)
  if(stage==='safety'||clientCue==='distress'||(speaker==='coach'&&coachScene==='empathy'))
    return make('empathy',speaker,'empathy','conservative-text-or-safety-cue')
  if(speaker==='coach'){
    if(opening)return make('greeting','coach','welcome','opening')
    if(['encourage','action'].includes(coachScene)&&clientCue==='progress')
      return make('encouragement','coach','encourage','explicit-client-progress')
    if(coachScene==='insight')return make('understanding','coach','insight','reply-cue')
    if(coachScene==='curiosity')return make('interest','coach','curiosity','reply-question')
    return make('speaking','coach',['action','closure','explain'].includes(coachScene)?coachScene:'explain','actual-coach-output')
  }
  if(phase==='thinking'||phase==='loading')return make('thinking','none','calm','waiting-for-reply')
  if(phase==='listening'){
    // An open mic alone is not speech. Never reuse an old coach reply here.
    if(speaker!=='client')return make('presence','none','calm','open-mic-silence')
    return make(clientCue==='interest'?'interest':'listening','client',clientCue==='interest'?'curiosity':'attentive','client-voice-active')
  }
  if(phase==='greeting'||opening)return make('greeting','none','welcome','opening')
  return make('presence','none','calm','quiet')
}

export function chooseCoachReaction(persona,intent,available,used=[]){
  const p=Object.hasOwn(PROFILES,persona)?PROFILES[persona]:null
  if(!p||!intent||['hold','empathy'].includes(intent.kind))return null
  const allowed=new Set(Array.isArray(available)?available:[])
  const oneShot=['greeting','encouragement'].includes(intent.kind)
  const key=oneShot?`${persona}:${intent.kind}:${intent.kind==='greeting'?'session':intent.turnKey}`:null
  const configured=p[intent.kind]
  const variants=(Array.isArray(configured)?configured:[configured]).filter(id=>allowed.has(id))
  const variantIndex=Number.isSafeInteger(intent.turnKey)&&intent.turnKey>=0?intent.turnKey:0
  let id=oneShot&&used.includes(key)?null:variants[variantIndex%variants.length]
  const once=Boolean(id&&oneShot)
  // No fabricated empathy/understanding takes. Use only an approved available
  // primary block, or the anchor. Never select a smile on an unrelated turn.
  if(!id||!allowed.has(id)){
    id=intent.speaker==='client'?p.listening:p.presence
    return id&&allowed.has(id)?{id,once:false,key:null}:null
  }
  return {id,once,key:once?key:null}
}

export function coachReactionCanStart({enabled=true,playing=false,atBoundary=false,ready=false,sameAnchor=false}={}){
  return enabled&&(!playing||atBoundary)&&ready&&sameAnchor
}
