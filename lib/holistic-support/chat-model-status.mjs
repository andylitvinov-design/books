// No provider call: an honest answer about the current turn, not a capability probe.
// Limit matching to an explicit question about this assistant's model.
export function isChatModelStatusQuestion(value){
 if(typeof value!=='string'||value.length>350)return false;
 const t=value.normalize('NFKC').toLowerCase().replace(/ё/gu,'е').replace(/\s+/gu,' ').trim();
 if(!/gemini|джемини|гемини|джеминай|геминай/u.test(t)&&
    !/(?:какая|какую|на какой|какой)\s+(?:у тебя |ты используешь |языковую )?(?:ии[ -]?)?модел[ьи]|what (?:ai |language )?model|which (?:ai |language )?model|qu[eé] modelo|cu[aá]l es tu modelo/u.test(t))return false;
 if(/(?:не хочу жить|суицид|самоубийств|не могу дышать|боль в груди|want to die|kill myself|chest pain|cannot breathe|quiero morir|dolor en el pecho)/u.test(t))return false;
 return /(?:ты|тебя|твой|вы|вас|ваш|бот|самир|чат|подключ[её]н|работаешь|используешь|модель|модели|you|your|assistant|chatbot|using|connected|model|funcionas|usas|utilizas|conectado|modelo)/u.test(t)&&
  /[?¿]|(?:работаешь|работаете|используешь|используете|подключ[её]н|какая модель|какую модель|what model|which model|are you|do you use|usas|utilizas|qu[eé] modelo)/u.test(t);
}
export function chatModelStatusReply({locale='en',lastGemini=false,geminiReady=false}={}){
 const messages={
  ru:['Этот ответ я сформировал встроенным алгоритмом Holistic House, не Gemini.','Предыдущий ответ был получен от Gemini.','Отдельный режим Gemini готов к запросу, но в этой реплике я его не вызывал.','Когда ответ действительно получен от Gemini, под ним будет указано «Gemini · Free API».'],
  en:['This reply was produced by the built-in Holistic House logic, not Gemini.','The previous reply came from Gemini.','The separate Gemini mode is ready for a request, but was not called for this reply.','A verified Gemini response will be labelled “Gemini · Free API”.'],
  es:['Esta respuesta la generó la lógica de Holistic House, no Gemini.','La respuesta anterior vino de Gemini.','El modo Gemini separado está listo para una solicitud, pero no se utilizó en esta respuesta.','Una respuesta verificada de Gemini mostrará “Gemini · Free API”.']
 };
 const m=messages[locale]||messages.en;
 return [m[0],lastGemini?m[1]:geminiReady?m[2]:'',m[3]].filter(Boolean).join(' ');
}
