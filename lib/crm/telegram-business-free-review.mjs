// Deterministic acknowledgement of a public Free Personal Express Review
// service-draft sent to the *human* @holistichouse Telegram Business chat.
// This is not a medical questionnaire, LLM prompt, CRM lead or payment.
const PATTERNS=Object.freeze({
  en:/^Hello! I am interested in «Free personal express review»\. Could you help me make a request\?$/iu,
  ru:/^Здравствуйте! Меня интересует «(?:Бесплатный экспресс-разбор|Бесплатный личный экспресс-разбор)»\. Подскажите, как оформить запрос\.$/iu,
  es:/^¡Hola! Me interesa «(?:Revisión personal exprés gratuita|Análisis personal exprés gratuito)»\. ¿Cómo puedo solicitarlo\?$/iu,
});
const COPY=Object.freeze({
  ru:{
    text:'Здравствуйте! Я Ali, автоматический помощник Holistic House 🌿 Вижу ваш запрос на бесплатный личный экспресс-разбор. Чтобы передать Андрею сам вопрос и материалы защищённо, откройте анкету на сайте. Пока у нас только сообщение в Telegram — заявка ещё не оформлена. Андрей также может ответить здесь лично. Не присылайте медицинские документы в чат.',
    button:'Открыть защищённую анкету',
  },
  en:{
    text:'Hello! I’m Ali, the Holistic House automated assistant 🌿 I can help you request a free personal express review. Please open the secure website form to share your question with Andrey. Your Telegram message alone has not yet created a CRM enquiry. Andrey can also reply here personally. Please do not send medical records in chat.',
    button:'Open the secure request form',
  },
  es:{
    text:'¡Hola! Soy Ali, el asistente automático de Holistic House 🌿 Puedo ayudarte a pedir una revisión personal gratuita. Abre el formulario seguro del sitio web para enviar tu consulta a Andrey. Tu mensaje en Telegram todavía no ha creado una solicitud en el CRM. Andrey también puede responder aquí personalmente. No envíes documentos médicos por el chat.',
    button:'Abrir el formulario seguro',
  },
});
export function matchTelegramFreeReviewDraft(value){
 if(typeof value!=='string'||value.length>300)return null;
 const text=value.trim();
 for(const [locale,pattern] of Object.entries(PATTERNS)){
  if(pattern.test(text))return {kind:'free_review',locale};
 }
 return null;
}
export function telegramFreeReviewAcknowledgement(locale){
 const l=COPY[locale]?locale:'en';
 return {handled:true,kind:'free_review',text:COPY[l].text,
   buttons:[{text:COPY[l].button,
     url:'https://holistichouse.vercel.app/'+l+'/services/free-situation-review'}]};
}
