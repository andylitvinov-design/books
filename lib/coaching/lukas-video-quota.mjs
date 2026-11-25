/** Pure quota policy; inputs must be server-authenticated and transactionally read. */
export const VIDEO_LIMITS=Object.freeze({personal:300,customer:2400,total:3000,reserve:600,concurrent:1})
const whole=n=>Number.isSafeInteger(n)&&n>=0
const denied=code=>({allowed:false,code})
export function planVideoStart({googleVerified=false,ownerExempt=false,enabled=false,privacyApproved=false,hardStopVerified=false,sharedLedgerVerified=false,providerCycleVerified=false,busy,personalUsed,customerUsed,totalUsed,providerRemaining,secondsToMonthEnd,secondsToCycleEnd,overheadSeconds}={}) {
  if(googleVerified!==true)return denied('AUTH_REQUIRED')
  if(![enabled,privacyApproved,hardStopVerified,sharedLedgerVerified,providerCycleVerified].every(x=>x===true))return denied('UNAVAILABLE')
  if(typeof busy!=='boolean'||![personalUsed,customerUsed,totalUsed,providerRemaining,secondsToMonthEnd,secondsToCycleEnd,overheadSeconds].every(whole)||customerUsed>totalUsed)return denied('UNAVAILABLE')
  if(ownerExempt!==true&&personalUsed>=VIDEO_LIMITS.personal)return denied('PERSONAL_QUOTA_EXHAUSTED')
  if(busy)return denied('BUSY')
  const providerBudget=Math.min(ownerExempt===true?VIDEO_LIMITS.total:VIDEO_LIMITS.customer-customerUsed,VIDEO_LIMITS.total-totalUsed,providerRemaining,secondsToMonthEnd,secondsToCycleEnd)
  const videoSeconds=Math.min(ownerExempt===true?VIDEO_LIMITS.total:VIDEO_LIMITS.personal-personalUsed,providerBudget-overheadSeconds)
  if(videoSeconds<=0)return denied('GLOBAL_QUOTA_EXHAUSTED')
  return {allowed:true,videoSeconds,providerReserved:videoSeconds+overheadSeconds}
}
/** Only server-verified provider receipts may refund reservations. */
export function settleVideoReservation(reservation,receipt) {
  if(!reservation||!whole(reservation.videoSeconds)||!whole(reservation.providerReserved)||reservation.videoSeconds>reservation.providerReserved)throw Error('INVALID_RESERVATION')
  if(reservation.state==='settled')return reservation
  if(!['reserved','uncertain'].includes(reservation.state))throw Error('INVALID_STATE')
  if(!receipt||receipt.verified!==true||receipt.ended!==true||receipt.sessionId!==reservation.sessionId||!whole(receipt.videoSeconds)||!whole(receipt.providerSeconds)||receipt.videoSeconds>receipt.providerSeconds)return {...reservation,state:'uncertain'}
  // Never erase real provider usage above our reservation; report an overrun and
  // block further starts via the actual ledger totals (even if provider misbehaved).
  return {...reservation,state:'settled',videoCharged:Math.min(receipt.videoSeconds,reservation.videoSeconds),providerCharged:receipt.providerSeconds,overrun:receipt.providerSeconds>reservation.providerReserved||receipt.videoSeconds>reservation.videoSeconds}
}
/** Busy and exhausted clients keep their own chat; no second allocation. */
export const VIDEO_STATUS_COPY=Object.freeze({
 ru:{BUSY:'Лукас сейчас на другом видеозвонке. Вы можете пообщаться с ним голосом. Ваши видеоминуты сохранятся.',AUTH_REQUIRED:'Войдите через Google, чтобы получить доступ к видео.',PERSONAL_QUOTA_EXHAUSTED:'Бесплатные видеоминуты этого месяца закончились. Продолжим голосом?',GLOBAL_QUOTA_EXHAUSTED:'Видео временно недоступно. Ваш остаток сохраняется.',UNAVAILABLE:'Видео пока недоступно.',voice:'Общаться голосом',later:'Попробовать видео позже',available:'Видео снова доступно',warning:'Осталось 30 секунд видео. Мы можем продолжить голосом.'},
 en:{BUSY:'Lucas is on another video call. You can talk by voice. Your video minutes will be saved.',AUTH_REQUIRED:'Sign in with Google to access video.',PERSONAL_QUOTA_EXHAUSTED:'Your free video time for this month is used. Continue by voice?',GLOBAL_QUOTA_EXHAUSTED:'Video is temporarily unavailable. Your balance is saved.',UNAVAILABLE:'Video is not available yet.',voice:'Talk by voice',later:'Try video later',available:'Video is available again',warning:'30 seconds of video remain. We can continue by voice.'},
 es:{BUSY:'Lucas está en otra videollamada. Puedes hablar por voz. Tus minutos de vídeo se conservarán.',AUTH_REQUIRED:'Inicia sesión con Google para acceder al vídeo.',PERSONAL_QUOTA_EXHAUSTED:'Se agotaron tus minutos de vídeo gratuitos de este mes. ¿Continuamos por voz?',GLOBAL_QUOTA_EXHAUSTED:'El vídeo no está disponible temporalmente. Tu saldo se conserva.',UNAVAILABLE:'El vídeo aún no está disponible.',voice:'Hablar por voz',later:'Intentar vídeo más tarde',available:'El vídeo vuelve a estar disponible',warning:'Quedan 30 segundos de vídeo. Podemos continuar por voz.'}
})
