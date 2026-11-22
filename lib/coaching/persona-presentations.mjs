// Original voice-first introductions for the eight fictional AI coaches.
// Only authored public character text; no user data, provider API or storage.
const C=(en,ru,es)=>Object.freeze({en,ru,es});
export const COACH_PRESENTATIONS=Object.freeze({
  mira: Object.freeze({intro:C("Hello, I'm Mira. My style is gentle clarity: when everything feels too much, we slow down, find breathing room, and choose one manageable step. Nothing has to be perfect here. Would you like to have a session with me today?","Привет, я Мира. Мой стиль — бережная ясность. Когда всего слишком много, мы замедляемся, ищем опору и выбираем один посильный шаг. Здесь не нужно быть идеальным. Хотите провести со мной коучинг-сессию сегодня?","Hola, soy Mira. Mi estilo es la claridad amable: cuando todo pesa, bajamos el ritmo, encontramos apoyo y elegimos un paso posible. Aquí no hay que hacerlo perfecto. ¿Te gustaría tener una sesión conmigo hoy?"),
    style:C("Gentle, unhurried, permission to pause","Бережно, неспешно, с правом на паузу","Con calma, amabilidad y permiso para pausar"),
    voice:Object.freeze({rate:0.9,pitch:1.05,slot:0})}),
  max: Object.freeze({intro:C("Hey, I'm Max. I like decisions that become action, not endless analysis. I'll help you name one result, cut through distractions and design a small test. We'll be direct and practical. Would you like to work together in a coaching session today?","Привет! Я Макс. Мне важны решения, которые превращаются в действия, а не бесконечные размышления. Вместе выберем один результат и придумаем конкретный эксперимент. Будем коротко и по делу. Хотите провести со мной практическую коучинг-сессию сегодня?","¡Hola! Soy Max. Me gustan las decisiones que se convierten en acción, no las vueltas interminables. Definiremos un resultado y probaremos un experimento concreto. Iremos al grano. ¿Quieres que tengamos una sesión de coaching hoy?"),
    style:C("Direct, energetic, focused on action","Прямо, энергично, с фокусом на результат","Directo, enérgico y orientado a la acción"),
    voice:Object.freeze({rate:1.09,pitch:0.93,slot:1})}),
  sofia: Object.freeze({intro:C("Hello, I'm Sofia. I work with relationships, needs and personal boundaries. We'll distinguish what happened from what it felt like, make room for different perspectives and look for words that are honest without blame. Would you like to explore this together in a session today?","Здравствуйте, я София. Моя тема — отношения, потребности и личные границы. Мы отделим факты от переживаний, дадим место разным точкам зрения и подберём слова без обвинений. Хотите сегодня провести со мной бережную коучинг-сессию?","Hola, soy Sofía. Me centro en los vínculos, las necesidades y los límites personales. Separaremos los hechos de las emociones, escucharemos distintas perspectivas y buscaremos palabras sin culpas. ¿Te gustaría explorar esto conmigo en una sesión hoy?"),
    style:C("Warm, attentive to feelings and boundaries","Тепло, внимательно к чувствам и границам","Cálido, atento a las emociones y los límites"),
    voice:Object.freeze({rate:0.94,pitch:1.1,slot:2})}),
  alex: Object.freeze({intro:C("Good to meet you. I'm Alex, and I think in options, constraints and consequences. For work or business decisions we'll clarify the outcome, compare real trade-offs and find a low-risk test. I won't promise easy answers. Would you like to have a focused coaching session with me today?","Рад встрече. Я Алекс и люблю ясную структуру: варианты, ограничения и последствия. В вопросах карьеры и бизнеса мы проясним цель, сравним реальные компромиссы и найдём безопасную проверку. Хотите провести со мной структурированную коучинг-сессию сегодня?","Encantado. Soy Alex y pienso en opciones, límites y consecuencias. En carrera o negocio aclararemos el objetivo, compararemos alternativas realistas y elegiremos una prueba de bajo riesgo. ¿Quieres tener una sesión de coaching estructurada conmigo hoy?"),
    style:C("Structured, strategic and realistic","Структурно, стратегически и реалистично","Estructurado, estratégico y realista"),
    voice:Object.freeze({rate:0.99,pitch:0.9,slot:3})}),
  merlin: Object.freeze({intro:C("Hello, I'm Merlin. I offer a calm space for questions that call for perspective, not quick answers. Stories and images can help us notice what matters, but they don't foretell the future. We can explore your choices without rushing. Would you like to explore this in a session with me today?","Здравствуйте, я Мерлин. Я люблю спокойные беседы о смысле, переменах и жизненном выборе. Образы и истории помогают увидеть новое, но не предсказывают будущее. Мы можем разобраться без спешки. Хотите сегодня провести со мной исследовательскую сессию?","Hola, soy Merlín. Me gusta conversar con calma sobre los cambios y las preguntas importantes. Las imágenes ayudan a reflexionar, no a predecir. Podemos explorar tus opciones sin prisa. ¿Te gustaría tener una sesión para explorarlo hoy?"),
    style:C("Thoughtful, patient, gently philosophical","Спокойно, глубоко, с уважением к вашему опыту","Reflexivo, paciente y sereno"),
    voice:Object.freeze({rate:0.9,pitch:0.9,slot:8})}),
  harry: Object.freeze({intro:C("Hi, I'm Harry Potter. Being brave does not mean you are never scared. Sometimes it means asking a friend for help, looking at the real options and taking one careful step. We can explore your challenge without pretending there is a magic solution. Would you like to try a coaching session with me today?","Привет, я Гарри Поттер. Быть смелым — не значит никогда не бояться. Иногда смелость — попросить помощи, увидеть реальные варианты и сделать один осторожный шаг. Мы не будем искать волшебных решений. Хочешь попробовать сегодня провести со мной коучинг-сессию?","Hola, soy Harry Potter. Ser valiente no significa no sentir miedo. A veces es pedir ayuda, observar las opciones reales y dar un paso con cuidado. No necesitamos soluciones mágicas para explorar lo que te preocupa. ¿Quieres probar hoy una sesión de coaching conmigo?"),
    style:C("Brave, friendly, down-to-earth and collaborative","Дружелюбно, смело, без пафоса и с опорой на друзей","Valiente, cercano, práctico y colaborativo"),
    voice:Object.freeze({rate:1.06,pitch:1.0,slot:9})}),
  lea: Object.freeze({intro:C("Hi, I'm Lea. I care about values, meaning and the direction that feels genuinely yours. Images and metaphors can help us notice something new, but they aren't diagnoses or predictions. We'll explore without rushing. Would you like to explore that with me in a session today?","Привет, я Лея. Мне близки вопросы смысла, ценностей и своего жизненного пути. Образы и метафоры помогут посмотреть на ситуацию по-новому, но не станут диагнозами или предсказаниями. Будем исследовать без спешки. Хотите исследовать это со мной на сессии сегодня?","Hola, soy Lea. Me interesan los valores, el sentido y el rumbo que se siente propio. Las imágenes y metáforas pueden abrir otra perspectiva, pero no diagnostican ni predicen nada. Exploraremos sin prisa. ¿Quieres explorarlo conmigo en una sesión hoy?"),
    style:C("Reflective, imaginative, values-led","Созерцательно, образно, с опорой на ценности","Reflexivo, imaginativo y guiado por valores"),
    voice:Object.freeze({rate:0.87,pitch:1.14,slot:4})}),
  noah: Object.freeze({intro:C("Hi, I'm Noah. I'm here for sustainable habits, not perfect discipline. We'll find a simple cue, a two-minute action and a kind way to notice progress. A missed day is information, not a verdict on you. Would you like a short session together today?","Привет, я Ной. Я про устойчивые привычки, а не идеальную дисциплину. Найдём простой сигнал, двухминутное действие и спокойный способ замечать прогресс. Пропущенный день — это информация, не приговор. Хотите сегодня попробовать короткую сессию со мной?","Hola, soy Noé. Me importan los hábitos sostenibles, no la disciplina perfecta. Buscaremos una señal sencilla, una acción de dos minutos y una manera amable de revisar el progreso. Un día perdido es información, no un fracaso. ¿Quieres probar una sesión breve conmigo hoy?"),
    style:C("Friendly, practical, no perfectionism","Дружелюбно, практично, без перфекционизма","Cercano, práctico y sin perfeccionismo"),
    voice:Object.freeze({rate:1.03,pitch:0.99,slot:5})}),
  iris: Object.freeze({intro:C("I'm glad you're here. I'm Iris, and I look for strengths that are already present. We'll notice the moments when a problem was smaller, understand what worked and build on that without denying difficulties. Would you like to look at that together in a session today?","Рада знакомству, я Ирис. Я помогаю замечать сильные стороны, которые уже есть. Мы вспомним моменты, когда трудность отступала, поймём, что тогда работало, и попробуем опереться на это, не отрицая сложностей. Хотите попробовать сессию, чтобы вместе это исследовать?","Me alegra conocerte. Soy Iris y me fijo en las fortalezas que ya tienes. Veremos cuándo el problema fue algo menor, qué funcionó y cómo aprovecharlo sin negar las dificultades. ¿Te gustaría explorarlo conmigo en una sesión hoy?"),
    style:C("Encouraging, resource-oriented, observant","Ободряюще, с вниманием к ресурсам","Alentador, atento a los recursos"),
    voice:Object.freeze({rate:0.97,pitch:1.08,slot:6})}),
  ray: Object.freeze({intro:C("Hey there, I'm Ray. I like surprising ideas, fresh perspectives and the freedom to try things without needing to be right the first time. We'll open several possibilities and choose one safe, playful experiment. Would you like to try a creative coaching session with me today?","Эй, привет! Я Рэй. Люблю неожиданные идеи, свежие ракурсы и свободу пробовать без страха ошибиться. Сначала откроем несколько возможностей, затем выберем один безопасный творческий эксперимент. Хотите попробовать сегодня творческую коучинг-сессию?","¡Hey, hola! Soy Ray. Me gustan las ideas inesperadas, los enfoques frescos y la libertad de probar sin tener razón a la primera. Abriremos varias posibilidades y elegiremos un experimento creativo y seguro. ¿Quieres probar una sesión creativa de coaching hoy?"),
    style:C("Playful, imaginative, open to experiments","Игриво, образно, с открытостью к экспериментам","Lúdico, imaginativo y abierto a experimentar"),
    voice:Object.freeze({rate:1.08,pitch:1.17,slot:7})}),
});
const locales=['en','ru','es'];
export function getCoachPresentation(id,locale='en'){
  if(typeof id!=='string'||!Object.hasOwn(COACH_PRESENTATIONS,id))return null;
  const p=COACH_PRESENTATIONS[id];
  const lang=locales.includes(locale)?locale:'en';
  return Object.freeze({text:p.intro[lang],style:p.style[lang],voice:p.voice});
}
// Presentation runs only after a user Play gesture. It prefers installed
// device voices for the language; distinct pitch and pace also work with
// a single voice installed. The browser controls actual voice availability.
export function coachPresentationVoice(id,locale='en',voices=[]){
  const p=getCoachPresentation(id,locale);
  if(!p)return null;
  const lang=locales.includes(locale)?locale:'en';
  const exactLang={en:'en-GB',ru:'ru-RU',es:'es-ES'}[lang];
  const eligible=Array.isArray(voices)?voices.filter(v=>v&&typeof v.lang==='string'&&v.lang.toLowerCase().startsWith(lang+'-')):[];
  const exact=eligible.filter(v=>v.lang.toLowerCase()===exactLang.toLowerCase());
  const matched=exact.length?exact:eligible;
  // Prefer an enhanced/natural system voice when the visitor installed one.
  // The utterance is still authored static text; no personal conversation
  // is sent to any extra provider by this presentation feature.
  const enhanced=matched.filter(v=>/enhanced|premium|neural|natural/i.test(v.name||''));
  const installed=enhanced.filter(v=>v.localService===true);
  const local=matched.filter(v=>v.localService===true);
  const pool=installed.length?installed:enhanced.length?enhanced:local.length?local:matched;
  return Object.freeze({lang:exactLang,rate:p.voice.rate,pitch:p.voice.pitch,
    voice:pool.length?pool[p.voice.slot%pool.length]:null});
}
