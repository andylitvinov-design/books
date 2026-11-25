/** Pure, side-effect-free response adaptor. The CALLER must perform owner auth,
 * current consent and safety checks, and pass only already-authorized facts.
 * This never sends personal data to an LLM, and never creates new memory. */
const MESSAGES = {
 ru: {
   goal:'Ранее вы сохранили цель', continue:'Хотите продолжить работу над ней или обсудить что-то другое?',
   found:'Вот что вы разрешили мне помнить',none:'У меня нет сохранённых вами записей, которые можно показать.',
   next:'Ваш следующий согласованный шаг',noTasks:'Пока нет принятых практик. Можем выбрать небольшой следующий шаг.',
   footer:'Вы можете изменить или удалить память в «Моём доме».',taskExists:'Есть принятая практика. Откройте её в «Моём доме».',stop:'Хорошо, я не буду сохранять это как память.'},
 en: {
   goal:'You previously saved this goal',continue:'Would you like to continue with it or talk about something else?',
   found:'Here is what you allowed me to remember',none:'I have no saved entries to show.',
   next:'Your next agreed step',noTasks:'There are no accepted practices yet. We can choose a small next step.',
   footer:'You can edit or delete saved memories in My House.',taskExists:'You have an accepted practice. Open it in My House.',stop:'Understood. I will not save this as memory.'},
 es: {
   goal:'Antes guardaste este objetivo',continue:'¿Quieres continuar con ello o hablar de otra cosa?',
   found:'Esto es lo que me permitiste recordar',none:'No tengo recuerdos guardados que mostrar.',
   next:'Tu siguiente paso acordado',noTasks:'Aún no hay prácticas aceptadas. Podemos elegir un pequeño paso.',
   footer:'Puedes editar o eliminar recuerdos en Mi Casa.',taskExists:'Tienes una práctica aceptada. Ábrela en Mi Casa.',stop:'Entendido. No guardaré esto en la memoria.'},
}
function intent(message) {
  const s=(message||'').toLocaleLowerCase().trim().slice(0,300)
  if (/(?:не запоминай|не сохраняй это|do not remember|don't remember this|no guardes esto|no recuerdes)/iu.test(s))return 'never_save'
  if (/(?:что (?:ты )?(?:обо мне )?помнишь|покажи (?:мою )?память|what do you remember|show (?:my )?memory|qué recuerdas|que recuerdas|mostrar memoria)/iu.test(s))return 'list'
  if (/(?:какой (?:у меня )?следующий шаг|мои задания|что мне делать дальше|what should i do next|my tasks|my next step|qué hago ahora|mis tareas)/iu.test(s))return 'next'
  if (/^(?:привет|здравствуй(?:те)?|добрый день|hello|hi|hey|hola)[!?.\s]*$/iu.test(s))return 'hello'
  return null
}
const isSafeQuote=value=>typeof value==='string'&&value.length<=300&&
   !/[\u0000-\u001f]/u.test(value)
export function memoryAwareReply({locale='en',message='',memories=[],tasks=[],allowTaskDetails=false}={}){
 const t=MESSAGES[locale]||MESSAGES.en
 const action=intent(message)
 if(!action)return null
 // Only a small, explicitly confirmed excerpt can fit a mobile dialogue turn.
 // Avoid partially quoting a long private goal as though it were complete.
 const safe=Array.isArray(memories)?memories.filter(m=>m&&isSafeQuote(m.value)&&
     !['sensitive','private'].includes(m.privacyClass)).slice(0,8):[]
 const brief=safe.filter(m=>m.value.length<=110)
 const current=Array.isArray(tasks)?tasks.filter(x=>x&&
    ['accepted','in_progress','self_reported','paused'].includes(x.status)&&
    isSafeQuote(x.title)).slice(0,3):[]
 let reply,ids=[]
 if(action==='never_save') reply=t.stop
 else if(action==='list'){
   ids=brief.slice(0,2).map(x=>x.id)
   reply=brief.length?`${t.found}: ${brief.slice(0,2).map(x=>'«'+x.value+'»').join('; ')}. ${t.footer}`:safe.length?t.footer:t.none
 }else if(action==='next'){
   reply=current.length?(allowTaskDetails?`${t.next}: ${current[0].title}. ${t.continue}`:t.taskExists):t.noTasks
 }else{
   const goal=brief.find(x=>x.category==='goal')
   if(!goal)return null // Leave the ordinary welcome response unchanged.
   ids=[goal.id]
   reply=`${t.goal}: «${goal.value}». ${t.continue}`
 }
 return {status:'clarify',reply,modelUsed:false,source:'consented-client-memory',
   memorySaved:false,userAuthorized:true,suggestions:[],
   usedSavedTestEvidence:false,usedSavedVideoHistory:false,
   browserModelAllowed:false,usedSavedMemoryIds:ids,
   decision:{status:'clarify',message:reply,question:null,suggestions:[]}}
}
