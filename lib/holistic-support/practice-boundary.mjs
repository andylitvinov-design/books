/** Shared nonclinical pause/worsening boundary for guest and verified server paths.
 * Pure lexical evidence: no I/O, diagnosis, profile, booking or model request.
 */
export const PRACTICE_BOUNDARY_VERSION="hi-practice-boundary-v1";
const norm=value=>String(value??"").toLocaleLowerCase().normalize("NFKC")
 .replace(/ё/g,"е").replace(/[’']/g,"").replace(/[áàä]/g,"a")
 .replace(/[éèêë]/g,"e").replace(/[íìï]/g,"i")
 .replace(/[óòö]/g,"o").replace(/[úùü]/g,"u")
 .replace(/\s+/gu," ").trim().slice(0,1200);
const NEGATED_STOP=/(?:не хочу останавливаться|не хочу остановиться|мне не страшно продолжать|i (?:dont|do not) want to stop|i am not afraid to continue|im not scared to continue)/u;
const PAUSE=/(?:^|[.!? ]+)(?:мне страшно продолжать|(?:я )?хочу остановиться|не хочу продолжать(?: (?:медитацию|упражнение|практику))?|боюсь продолжать (?:медитацию|упражнение|практику)|(?:im|i am) (?:scared|afraid) to continue|please stop(?: the (?:meditation|practice|exercise))?|i (?:want to stop|dont want to continue) (?:the )?(?:meditation|practice|exercise)|no quiero continuar)(?:$|[.!? ]+)/u;
const WORSENING=/(?:после (?:практики|медитации|упражнения).{0,60}(?:хуже|ухудш|плохо)|(?:мне стало хуже)(?: после (?:практики|медитации|упражнения))?|(?:the )?(?:practice|meditation|exercise).{0,50}(?:made me feel worse|made things worse|worsened)|(?:i feel worse|i felt worse) after (?:the )?(?:practice|meditation|exercise)|despues de (?:la )?(?:meditacion|practica|ejercicio).{0,50}(?:peor|mal))/u;
const REPLIES={
 ru:{
  pause:"Хорошо, остановимся. Не нужно продолжать то, что вызывает страх. Я не буду предлагать упражнения или услуги. Если вам становится хуже, обратитесь за помощью к специалисту.",
  worsening:"Если вам стало хуже, не продолжайте практику или упражнение, вызывающее ухудшение. Обратитесь за медицинской помощью, особенно если состояние ухудшается. При непосредственной опасности вызовите экстренную службу."
 },
 en:{
  pause:"Understood, we'll stop. You don't need to continue something that scares you. I won't suggest exercises or services. If you're feeling worse, please seek help from a qualified professional.",
  worsening:"If you feel worse, do not continue a practice or exercise causing that discomfort. Seek medical advice, especially if symptoms are worsening. If you are in immediate danger, contact emergency services."
 },
 es:{
  pause:"De acuerdo, paramos. No tienes que continuar algo que te asusta. No sugeriré ejercicios ni servicios. Si te encuentras peor, busca ayuda profesional.",
  worsening:"Si te sientes peor, no continúes una práctica o ejercicio que empeore tu estado. Busca ayuda médica, especialmente si empeoras. Si hay peligro inmediato, llama a emergencias."
 }
};
export function reviewPracticeBoundary(message,locale="en"){
 if(typeof message!=="string"||!message.trim()||message.length>3000)return null;
 const text=norm(message);
 const kind=WORSENING.test(text)?"worsening":!NEGATED_STOP.test(text)&&PAUSE.test(text)?"pause":null;
 if(!kind)return null;
 const lang=Object.hasOwn(REPLIES,locale)?locale:"en";
 return {id:"guest_practice_"+kind,kind,locale:lang,reply:REPLIES[lang][kind],
  modelUsed:false,memorySaved:false,actionExecuted:false};
}
