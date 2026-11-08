/**
 * Five offline editorial phrases using the existing eight meaning-axis IDs.
 * No test results, medical records, model calls or persistence.
 */
export const MEANING_LINES=Object.freeze({
 ru:{
  anchor:["Я нахожу опору в себе","Мне можно замедлиться","Я выбираю спокойный шаг","Я могу попросить поддержки","Я бережно отношусь к себе","Я замечаю то, что помогает"],
  connection:["Я могу быть в контакте","Мне важно быть услышанным","Я выбираю открытый диалог","Я могу говорить о своих чувствах","Я уважаю свои границы","Близость начинается с доверия"],
  freedom:["У меня есть пространство выбора","Я могу выбрать свой темп","Мне можно менять направление","Я замечаю новые возможности","Я делаю шаг к свободе","Я разрешаю себе быть собой"],
  agency:["Я могу сделать первый шаг","Мои действия имеют значение","Я вижу доступный мне выбор","Я двигаюсь постепенно","Я могу попробовать снова","Мне по силам маленький шаг"],
  dignity:["Я отношусь к себе с уважением","Мои чувства имеют значение","Я имею право на границы","Мне можно говорить нет","Я ценю свой опыт","Я выбираю путь с уважением"],
  wholeness:["Я замечаю разные части себя","Я могу быть разным","Мне можно быть настоящим","Я соединяю мысли и чувства","Я принимаю сегодняшний день","Я выбираю внутренний баланс"],
  meaning:["Я замечаю важное для меня","У моего выбора есть смысл","Я ищу своё направление","Я исследую свои ценности","Я выбираю то, что важно","Мой следующий шаг имеет смысл"],
  growth:["Я могу учиться постепенно","Каждый шаг даёт мне опыт","Мне можно пробовать новое","Я замечаю свой прогресс","Я развиваюсь в своём темпе","Я открыт новым возможностям"]
 },
 en:{
  anchor:["I can find steady ground","I may slow down","I choose a gentle step","I can ask for support","I treat myself with care","I notice what supports me"],
  connection:["I can make a connection","My voice deserves to be heard","I choose an open dialogue","I can share how I feel","I respect my boundaries","Trust helps connection grow"],
  freedom:["I have room to choose","I can choose my own pace","I may change direction","I notice new possibilities","I take a step toward freedom","I can be myself"],
  agency:["I can take a first step","My actions matter","I see choices within reach","I move step by step","I can try again","One small step is enough"],
  dignity:["I treat myself with respect","My feelings matter","I have a right to boundaries","I may say no","I value my experience","I choose my path with respect"],
  wholeness:["I notice all parts of me","I can hold different feelings","I may be genuine","I connect thought and feeling","I accept today as it is","I choose inner balance"],
  meaning:["I notice what matters to me","My choices can have meaning","I explore my direction","I can explore my values","I choose what matters","My next step can have meaning"],
  growth:["I can learn step by step","Each step offers experience","I may try something new","I notice my progress","I grow at my own pace","I welcome new possibilities"]
 },
 es:{
  anchor:["Encuentro apoyo en mí","Puedo bajar el ritmo","Elijo un paso tranquilo","Puedo pedir apoyo","Me trato con cuidado","Observo lo que me ayuda"],
  connection:["Puedo crear vínculos","Mi voz merece ser escuchada","Elijo dialogar con apertura","Puedo expresar lo que siento","Respeto mis límites","La confianza crea cercanía"],
  freedom:["Tengo espacio para elegir","Elijo mi propio ritmo","Puedo cambiar de rumbo","Veo nuevas posibilidades","Doy un paso hacia la libertad","Puedo ser yo mismo"],
  agency:["Puedo dar el primer paso","Mis acciones cuentan","Veo opciones a mi alcance","Avanzo poco a poco","Puedo intentarlo de nuevo","Un pequeño paso es suficiente"],
  dignity:["Me trato con respeto","Mis sentimientos importan","Tengo derecho a mis límites","Puedo decir que no","Valoro mi experiencia","Elijo mi camino con respeto"],
  wholeness:["Observo todas mis partes","Puedo sentir cosas distintas","Puedo ser auténtico","Uno pensamientos y emociones","Acepto el día de hoy","Elijo equilibrio interior"],
  meaning:["Observo lo que me importa","Mis decisiones tienen sentido","Exploro mi rumbo","Puedo explorar mis valores","Elijo lo que importa","Mi próximo paso tiene sentido"],
  growth:["Puedo aprender paso a paso","Cada paso aporta experiencia","Puedo probar algo nuevo","Observo mi progreso","Crezco a mi ritmo","Recibo nuevas posibilidades"]
 }
});
const desired=Object.freeze({
 ru:{calm:"Я могу выбрать спокойствие",confidence:"Я могу действовать увереннее",self_acceptance:"Я могу быть добрее к себе",boundaries:"Я уважаю свои границы",vitality:"Я замечаю свои силы",connection:"Я выбираю живой контакт",clarity:"Я нахожу ясность в шаге",hope:"Я оставляю место надежде"},
 en:{calm:"I can choose a calmer moment",confidence:"I can act with confidence",self_acceptance:"I can be kind to myself",boundaries:"I respect my boundaries",vitality:"I notice my energy",connection:"I choose genuine contact",clarity:"I find clarity in one step",hope:"I make room for hope"},
 es:{calm:"Puedo elegir un momento de calma",confidence:"Puedo actuar con confianza",self_acceptance:"Me trato con más amabilidad",boundaries:"Respeto mis límites",vitality:"Observo mi energía",connection:"Elijo un contacto auténtico",clarity:"Veo claridad en un paso",hope:"Doy espacio a la esperanza"}
});
export function suggestMeaningPhrases(locale="ru",axisIds=["anchor"],now="fatigue",want="calm",strength=4,energy=6,revision=0,count=5){
 const lang=Object.hasOwn(MEANING_LINES,locale)?locale:"ru",groups=MEANING_LINES[lang];
 const ids=[...new Set(Array.isArray(axisIds)?axisIds:[])].filter(id=>Object.hasOwn(groups,id));
 const picked=ids.length?ids:["anchor"],first=groups[picked[0]],second=groups[picked[1]||picked[0]];
 const mood=["anxiety","shame","anger","fatigue","loneliness","confusion","helplessness","sadness"].indexOf(now);
 const shift=((energy<=3?0:energy>=8?3:1)+(strength>=8?1:0)+(mood<0?0:mood)+Math.max(0,revision))%6;
 const variants=[first[shift],second[(shift+2)%6],desired[lang][want],first[(shift+3)%6],second[(shift+4)%6],
   ...picked.slice(2).flatMap(id=>groups[id]),...first,...second];
 return [...new Set(variants.filter(v=>typeof v==="string"&&v.trim().length&&Array.from(v).length<=36))].slice(0,Math.min(7,Math.max(5,count)));
}
