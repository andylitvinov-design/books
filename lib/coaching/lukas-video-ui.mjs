import {VIDEO_STATUS_COPY} from './lukas-video-quota.mjs'
const availableCodes=new Set(['AUTH_REQUIRED','CONSENT_REQUIRED','BUSY','PERSONAL_QUOTA_EXHAUSTED','GLOBAL_QUOTA_EXHAUSTED','UNAVAILABLE','AVAILABLE'])
const words={ru:{title:'Видео с Лукасом',check:'Проверить доступность видео',checking:'Проверяем…',allowance:'Бесплатно: до 5 минут в месяц',balance:'Осталось в этом месяце',owner:'Без личного лимита',unknown:'Остаток ещё не подтверждён',consent:'Для видео завершите настройку личного кабинета.',text:'Продолжить в чате',start:'Начать видео'},en:{title:'Video with Lucas',check:'Check video availability',checking:'Checking…',allowance:'Complimentary: up to 5 minutes a month',balance:'Remaining this month',owner:'No personal time limit',unknown:'Balance not confirmed yet',consent:'Complete your account setup to use video.',text:'Continue in chat',start:'Start video'},es:{title:'Vídeo con Lucas',check:'Comprobar disponibilidad',checking:'Comprobando…',allowance:'Gratis: hasta 5 minutos al mes',balance:'Restante este mes',owner:'Sin límite personal',unknown:'Saldo aún no confirmado',consent:'Completa la configuración de tu cuenta para usar el vídeo.',text:'Continuar en el chat',start:'Iniciar vídeo'}}
export function videoAccessView(status,{locale='en',voiceSupported=false,authenticated=false}={}){
 const t=words[locale]||words.en, copy=VIDEO_STATUS_COPY[locale]||VIDEO_STATUS_COPY.en
 const code=authenticated?(availableCodes.has(status?.code)?status.code:'UNAVAILABLE'):'AUTH_REQUIRED'
 const owner=authenticated&&status?.eligible===true&&status?.ownerExempt===true&&status?.personalLimitSeconds===null
 const seconds=authenticated&&!owner&&status?.eligible===true&&Number.isInteger(status?.remainingSeconds)&&status.remainingSeconds>=0&&status.remainingSeconds<=300?status.remainingSeconds:null
 const balance=owner?t.owner:seconds===null?t.unknown:`${t.balance}: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`
 const canStart=authenticated&&status?.eligible===true&&status.videoAvailable===true&&code==='AVAILABLE'&&(owner||seconds>0)
 return {code,title:t.title,check:t.check,checking:t.checking,allowance:owner?t.owner:t.allowance,balance,
    message:code==='CONSENT_REQUIRED'?t.consent:code==='AVAILABLE'?(canStart?copy.available:copy.UNAVAILABLE):copy[code]||copy.UNAVAILABLE,
    signIn:code==='AUTH_REQUIRED',canStart,canVoice:voiceSupported===true,voice:copy.voice,later:copy.later,text:t.text,start:t.start}
}
