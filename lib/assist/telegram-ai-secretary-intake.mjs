// Private Telegram Business AI-secretary PRODUCT intake.
// Deterministic, one-question-per-message: no external model call, no
// implicit marketing, no booking or payment, no raw sender IDs in CRM.
const QUESTIONS=Object.freeze({
 ru:Object.freeze([
  'Какой у вас бизнес и чем вы помогаете клиентам?',
  'Откуда приходят обращения: Telegram, WhatsApp, сайт или другие каналы?',
  'Какие задачи поручить AI-секретарю в первую очередь: ответы, заявки, запись или поддержка?',
  'Примерно сколько обращений в день и на каких языках нужно отвечать?',
  'Куда передавать сложные вопросы человеку и с чем нужно связать систему (CRM, календарь или другое)?',
 ]),
 en:Object.freeze([
  'What kind of business do you run, and what do you offer customers?',
  'Where do customers write: Telegram, WhatsApp, your website or other channels?',
  'What should the AI secretary handle first: FAQs, enquiries, bookings or support?',
  'Roughly how many enquiries arrive daily, and in which languages?',
  'When should a human take over, and what should be connected (CRM, calendar or other tools)?',
 ]),
 es:Object.freeze([
  '¿Qué tipo de negocio tienes y qué ofreces a tus clientes?',
  '¿Por dónde te escriben: Telegram, WhatsApp, sitio web u otros canales?',
  '¿Qué tareas debe atender primero el asistente: preguntas, solicitudes, reservas o soporte?',
  '¿Cuántas consultas recibes al día, aproximadamente, y en qué idiomas?',
  '¿Cuándo debe intervenir una persona y qué sistemas conectar (CRM, calendario u otros)?',
 ]),
});
export const TELEGRAM_AI_SECRETARY_STEPS=5;
export function telegramAiSecretaryQuestion(locale,index){
 const questions=QUESTIONS[locale]||QUESTIONS.en;
 return Number.isInteger(index)&&index>=0&&index<questions.length?questions[index]:null;
}
export function telegramAiSecretaryStep(stage){
 const match=/^ai_q([1-5])$/.exec(String(stage||''));
 return match?Number(match[1]):null;
}
export function telegramAiSecretaryAnswer(input){
 if(typeof input!=='string')return null;
 const text=input.trim().replace(/\s+/gu,' ');
 if(text.length<2||text.length>600||/^(?:\/|!)/.test(text)||
    /\[HH-REQ:/i.test(text)||
    /^(?:confirm|confirmar|подтвердить|подтверждаю|cancel|cancelar|отмена|отменить|stop|стоп|да|yes|si|sí)$/iu.test(text))
   return null;
 // Intake is about business processes. Never ask for or preserve credentials.
 if(/\b(?:password|passcode|api\s*key|secret\s*key|credit\s*card|passport|private\s*key)\b|парол|номер\s+карты|приватн\w*\s+ключ/iu.test(text))
   return null;
 return text;
}
export function telegramAiSecretarySummary(locale,answers){
 if(!Array.isArray(answers)||answers.length!==TELEGRAM_AI_SECRETARY_STEPS||
    answers.some(text=>telegramAiSecretaryAnswer(text)!==text))return null;
 return QUESTIONS[locale]||QUESTIONS.en;
}

/** Explicit customer intent in an ordinary @holistichouse message may start
 * this business-product enquiry even without a site-generated service code.
 * Do not treat ordinary personal or clinical messages as an order.
 */
export function telegramAiSecretaryIntent(input){
 if(typeof input!=='string'||input.length>400)return null;
 const raw=input.trim();
 const product=/(?:ai[\s-]*секретар|ии[\s-]*секретар|ai[\s-]*secretary|virtual\s+receptionist|asistente\s+(?:de\s+)?ia\s+(?:para\s+)?(?:mi\s+)?negocio)/iu;
 const asking=/(?:хочу|нужен|нужна|интересу|подключ|настро|заказ|как получить|want|need|interested|looking for|setup|set up|configure|quiero|necesito|interesa|configurar)/iu;
 if(!product.test(raw)||!asking.test(raw))return null;
 const locale=/[а-яё]/iu.test(raw)?'ru':/(?:quiero|necesito|interesa|asistente|negocio|configurar)/iu.test(raw)?'es':'en';
 return {service:'ai_secretary',locale};
}
