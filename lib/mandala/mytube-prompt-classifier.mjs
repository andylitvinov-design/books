/**
 * Local-only brief → existing MyTube taxonomy. No external AI, raw-text
 * persistence, invented topics, diagnoses, or automatic rendering.
 * Explicit user confirmation is still required before export.
 */
import {getMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";

const TOPIC_HINTS={
 "constant-anxiety":["тревож","тревог","беспокоюсь","anxious","anxiety","worr","ansiedad","ansios","preocup"],
 "anxiety-no-reason":["без причины","без повода","without a reason","for no reason","sin motivo","sin razón"],
 "stress-relief":["стресс","напряжен","стрессов","stress","estrés","estres"],
 "chronic-stress":["постоянный стресс","длительный стресс","chronic stress","estrés crónico"],
 "work-stress":["стресс на работе","work stress","estrés laboral","estres laboral"],
 "burnout":["выгоран","burnout","agotamiento"],
 "self-confidence":["уверен","неуверен","смелост","confident","confidence","confianza en mí","confianza en mi"],
 "low-self-esteem":["самооценк","не ценю себя","low self esteem","autoestima baja"],
 "self-acceptance":["принимать себя","принять себя","self acceptance","aceptarme"],
 "calm-presence":["сохранять спокойствие","спокойствие перед","спокойным перед","calm in","peaceful before","mantener la calma"],
 "emotional-intimacy":["близост","closeness","intimacy","cercanía","cercania","intimidad"],
 "fear-intimacy":["страх близости","боюсь сближаться","fear intimacy","miedo intimidad"],
 "couple-conflict":["ссор","конфликт с партнер","arguing with my partner","peleas con mi pareja"],
 "rebuilding-trust":["измен","предательств","восстановить доверие","rebuild trust","recuperar la confianza"],
 "loneliness":["одинок","одиночеств","lonely","loneliness","soledad"],
 "low-energy":["нет сил","нет энергии","не хватает сил","low energy","no energy","sin energía","sin energia"],
 "motivation-drive":["мотивац","вдохновен","motivation","motivación","motivacion"],
 "muscle-relaxation":["зажим","напряжение в теле","напряжены мышцы","muscle tension","tensión muscular"],
 "breathing-practices":["дыхани","дышать","breath","respiración","respiracion"],
 "income-growth":["доход","заработат","increase income","earn more","aumentar ingresos"],
 "financial-stability":["финансовая стабильность","финансовая безопасность","financial security","estabilidad financiera"],
 "entrepreneurship":["бизнес","предпринимат","starting a business","emprendimiento"],
 "procrastination":["прокрастинац","откладываю дела","procrastinat","posponer"],
 "finding-self":["найти себя","потерял себя","find myself","encontrarme"],
 "life-purpose":["предназначени","призвани","purpose in life","propósito de vida"],
 "personal-growth":["личностный рост","личностное развитие","personal growth","desarrollo personal"],
 "find-love":["найти любовь","найти партнера","найти партнёра","find love","encontrar pareja"],
 "panic-attacks":["паническ","приступ паник","panic attack","ataque de pánico"],
 "apathy":["апати","ничего не хочется","apathy","apatía"],
 "low-mood":["подавлен","грусти","грустно","low mood","tristeza"],
 "family-relationships":["семь","родител","семейные отношения","family relations","relaciones familiares"]
};
const STOP=new Set(
 "хочу чтобы меня мой моя моё мои мне себя себе нужно надо меньше больше очень сейчас сегодня просто сделать быть стать есть для по как когда кто ещё еще может уже это такой такая такое свои свою своё где почему помоги пожалуйста видео ролик фильм создать ощущать чувствовать почувствовать хотелось would want need please video make film create with from feel more less now today quiero quisiera hacer para una este esta soy siento menos más mas sobre por favor pelicula vídeo".split(" ")
);
const clean=value=>String(value??"").normalize("NFKC").toLocaleLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const stem=word=>word.slice(0,word.length>=7?6:word.length>=5?5:word.length);
const meaningful=phrase=>new Set(clean(phrase).split(" ")
 .filter(word=>word.length>=4&&!STOP.has(word)).map(stem));

export function classifyMyTubeRequest(query,locale="ru"){
 if(typeof query!=="string"||!query.trim())return null;
 const text=clean(query.slice(0,480));
 if(!text)return null;
 const full=" "+text+" ",words=text.split(" "),wordStems=meaningful(text),ranked=[];
 for(const category of getMyTubeTaxonomy().categories)
  for(const subcategory of category.subcategories)
   for(const topic of subcategory.topics){
    const phrases=["ru","en","es"].flatMap(lang=>
     [topic.label[lang],...topic.searchIntent[lang]]).filter(Boolean);
    let exact=0,synonym=0;
    const topicStems=new Set();
    for(const phrase of phrases){
     const candidate=clean(phrase);
     if(!candidate)continue;
     if(full.includes(" "+candidate+" "))
      exact=Math.max(exact,candidate.includes(" ")?34:22);
     for(const part of meaningful(candidate))topicStems.add(part);
    }
    for(const hint of TOPIC_HINTS[topic.id]||[]){
     const candidate=clean(hint);
     if(candidate.includes(" ")?full.includes(" "+candidate+" "):
        words.some(word=>word.startsWith(candidate)))
      synonym=Math.max(synonym,candidate.includes(" ")?28:25);
    }
    const overlap=[...topicStems].filter(part=>wordStems.has(part)).length;
    // A lone generic word such as "спокойствие" cannot define a topic.
    if(!exact&&!synonym&&overlap<2)continue;
    const score=Math.max(exact,synonym)+Math.min(9,overlap*3);
    if(score>=6)ranked.push({
     categoryId:category.id,subcategoryId:subcategory.id,topicId:topic.id,score
    });
   }
 ranked.sort((a,b)=>b.score-a.score||a.topicId.localeCompare(b.topicId));
 if(!ranked.length)return null;
 const first=ranked[0],second=ranked[1],gap=first.score-(second?.score||0);
 const confidence=first.score>=34&&gap>=8?"high":
  first.score>=22&&gap>=6?"medium":"low";
 return {categoryId:first.categoryId,subcategoryId:first.subcategoryId,
  topicId:first.topicId,confidence,score:first.score,
  alternativeTopicId:gap<6?second?.topicId||null:null};
}
