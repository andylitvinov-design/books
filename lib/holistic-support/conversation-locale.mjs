/** Detect the language of one message without storing or sending it to a model. */
export function detectConversationLocale(message,fallback="en"){
  const current=["ru","en","es"].includes(fallback)?fallback:"en";
  if(typeof message!=="string"||!message.trim())return current;
  const text=message.trim().replace(/https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+/gi," ");
  const cyr=(text.match(/[а-яё]/giu)||[]).length,latin=(text.match(/[a-z]/giu)||[]).length;
  const russianCue=/(?:^|[^\p{L}])(?:я|мне|меня|хочу|нужно|нужен|помоги|пожалуйста|почему|как|что|да|нет)(?=$|[^\p{L}])/iu.test(text);
  const englishCue=/\b(?:i|i'm|my|me|we|you|your|want|need|can|could|please|how|why|what|where|when|help|money|income|love|work|business|hello|hi|yes|thanks|thank)\b/iu.test(text);
  const spanishCue=/[¿¡ñáéíóúü]/iu.test(text)||/\b(?:quiero|necesito|estoy|ayuda|hola|gracias|dinero|trabajo|relaciones|por favor)\b/iu.test(text);
  if(cyr>0){
    if(russianCue||(cyr>=2&&(!latin||cyr>=latin*1.75||(!englishCue&&cyr>=latin*.55))))return "ru";
    if(englishCue&&latin>=3)return "en";
    return current;
  }
  if(spanishCue)return "es";
  if(englishCue)return "en";
  const words=text.match(/\b[a-z]{2,}\b/gi)||[];
  if(latin>=5&&words.length>=2&&current!=="es")return "en";
  return current;
}
