/**
 * Video Conversation Mind: deterministic, contextual recognition of RU/EN/ES
 * replies. It never calls paid AI, reads profiles, chooses scene IDs or renders.
 * Side effects are performed by the existing Video Director after validation.
 */
export const VIDEO_CHAT_EDIT_STEPS = Object.freeze(['category','topic','scenario','idea','phrase','mood','aspect','duration','music','phrases']);
const LENGTHS = Object.freeze([10,15,20,30,60]);
const clean = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu,' ').slice(0,800);
const short = value => clean(value).toLocaleLowerCase().replace(/[.!?¡¿]+$/gu,'').trim();
const yes = (s,rx) => rx.test(s);
const COMMANDS = {
 reset:/^(?:сначала|заново|нов(?:ое|ый) видео|новый ролик|начать сначала|start over|new (?:video|film)|restart|desde cero|nuevo v[ií]deo)$/iu,
 back:/^(?:назад|вернись назад|предыдущий (?:шаг|вопрос)|back|previous|go back|atr[aá]s|volver)$/iu,
 auto:/^(?:выбери сам(?:а)?|на тво[её] усмотрение|как считаешь лучше|на твой вкус|автоматически|подбери сам|как хочешь|реши сам|surprise me|you choose|choose for me|pick for me|whatever you think|auto(?:matic)?|elige t[uú]|elige por m[ií]|sorpr[eé]ndeme|autom[aá]tico)$/iu,
 skip:/^(?:пропуст(?:и|ить)|дальше|далее|next|continue|continuar|не важно|неважно|без разницы|любой|любая|любое|всё равно|все равно|skip|doesn.t matter|any|either|no preference|saltar|me da igual|cualquiera)$/iu,
 alternate:/^(?:другой (?:вариант|сюжет|сценарий)|покажи другой|ещ[её] (?:вариант|сюжет)|что-нибудь другое|не нравится этот|another (?:one|version|story|option)|show another|different (?:story|option)|otro (?:gui[oó]n|v[ií]deo|opci[oó]n)|otra opci[oó]n)$/iu,
 help:/^(?:помоги|помощь|что можно выбрать|какие варианты|что ты умеешь|почему (?:ты )?выбрал[^.!?]*|объясни|help|what can (?:you|i) (?:do|choose)|why (?:did you )?choose[^.!?]*|ayuda|qu[eé] puedo elegir|expl[ií]came)$/iu,
 repeat:/^(?:повтори(?: вопрос)?|повторить(?: вопрос)?|не понял(?:а)?(?: вопрос)?|repeat(?: the question)?|say again|repite(?: la pregunta)?|no entiendo)$/iu,
 confirm:/^(?:да|ага|угу|ок(?:ей)?|подходит|согласен|согласна|утверждаю|подтверждаю|подтвердить|всё подходит|все подходит|мне нравится|оставь как есть|yes|yep|looks good|i approve|confirm|approved|perfect|looks great|s[ií]|vale|de acuerdo|confirmo|me gusta|perfecto)$/iu,
 create:/^(?:(?:да|yes|s[ií])[, ]+)?(?:(?:давай|please|por favor)\s+)?(?:создавай|сгенерируй|собирай видео|запускай|начинай|сделай(?: этот)? ролик|создай(?: это)? видео|go ahead|make (?:this|the) video|render (?:the )?video|start rendering|generate (?:the )?video|crea (?:el )?v[ií]deo|empieza|genera (?:el )?v[ií]deo)$/iu,
 open:/^(?:открывай|покажи результат|покажи готовый ролик|сохрани(?: видео)?|скачай(?: видео)?|show me the video|show result|save (?:the )?video|download (?:the )?video|abre (?:el )?v[ií]deo|mu[eé]strame|descarga(?: el v[ií]deo)?)$/iu
};
const STAGE_WORDS=[
 ['category',/(?:категори|направлен|цель видео|раздел|category|area|categor[ií]a|direcci[oó]n)/iu],
 ['topic',/(?:тем[уы]|topic|theme|tema)/iu],
 ['scenario',/(?:сценари[йя]|сюжет|истори|story|scenario|script|guion|historia)/iu],
 ['idea',/(?:иде[яюи]|idea|concept|concepto)/iu],
 ['phrase',/(?:фраз|надпис|субтитр|поддерживающ|captions?|affirmations?|frases?|subt[ií]tulos)/iu],
 ['goal',/(?:тем[уы]|иде[юяи]|цел[ьи]|сюжет|сценари[йя]|theme|topic|idea|goal|story|tema|objetivo)/iu],
 ['mood',/(?:настроени|атмосфер|темп|динамик|скорост|mood|pace|vibe|ambiente|ritmo)/iu],
 ['aspect',/(?:формат|ориентаци|соотношени|размер кадра|aspect|format|orientation|formato|orientaci[oó]n)/iu],
 ['duration',/(?:длительност|продолжительност|врем[яени]|секунд|хронометраж|length|duration|seconds?|duraci[oó]n|segundos?)/iu],
 ['music',/(?:музык|мелоди|звук|трек|саунд|music|audio|soundtrack|m[uú]sica|sonido)/iu],
 ['phrases',/(?:фраз|надпис|текст|субтитр|аффирмац|captions?|phrases?|on.screen text|frases?|subt[ií]tul)/iu]
];
function navigateTo(s){
 const nav=/^(?:вернись|перейди|возвращайся|давай к|измен(?:и|ить)|поменяй|настрой|поправь|change|edit|go to|back to|switch to|volver a|cambiar|editar|к выбору|к вопросу)/iu;
 if(!yes(s,nav) || s.length>100)return null;
 return STAGE_WORDS.find(([,rx])=>rx.test(s))?.[0]||null;
}
const ASPECT=[
 ['portrait',/(?:9\s*[:xх×/]\s*16|вертикал\p{L}*|портрет\p{L}*|сторис|рилс|реелс|reels?\b|shorts?\b|stories|story\b|vertical\p{L}*|portrait|retrato|tiktok|тик\s*-?\s*ток|instagram|инстаграм|инста\b)/iu],
 ['landscape',/(?:16\s*[:xх×/]\s*9|горизонтал\p{L}*|широкоформат\p{L}*|widescreen|landscape|horizontal\p{L}*|panor[aá]mic\p{L}*|на\s+(?:телевизор|больш(?:ой|ом) экран))/iu],
 ['square',/(?:1\s*[:xх×/]\s*1|квадрат\p{L}*|square|cuadrad\p{L}*)/iu]
];
const MOOD=[
 ['slow',/(?:спокой\p{L}*|успокаива\p{L}*|нежн\p{L}*|мягк\p{L}*|медленн\p{L}*|плавн\p{L}*|без спешки|расслабля\p{L}*|calm|slow|gentle|soft|sooth\p{L}*|relax\p{L}*|peaceful|tranquil\p{L}*|suav\p{L}*|despacio|seren\p{L}*)/iu],
 ['dynamic',/(?:динамич\p{L}*|энергич\p{L}*|побыстрее|быстрее|поживее|поактивнее|больше движения|драйв\p{L}*|бодр\p{L}*|активн\p{L}*|dynamic|energetic|upbeat|faster|fast.paced|lively|r[aá]pid\p{L}*|din[aá]mic\p{L}*)/iu]
];
function scan(s,items){
 const values=[];
 for(const [value,rx] of items){
   for(const m of s.matchAll(new RegExp(rx.source,rx.flags+'g'))){
     const prefix=s.slice(Math.max(0,m.index-12),m.index);
     if(/(?:^|\s)(?:не|not|no|sin)\s*$/iu.test(prefix))continue;
     values.push(value);
   }
 }
 return [...new Set(values)];
}
function duration(s){
 const matches=[];
 for(const m of s.matchAll(/(\d{1,3})\s*(?:сек(?:унд\p{L}*)?|seconds?|secs?|segundos?|seg\.?|s\b|мин(?:ут\p{L}*)?|minutes?|minutos?|mins?\b)/giu)){
   const unit=m[0].slice(m[1].length).trim().toLowerCase();
   matches.push(/^(?:мин|min)/iu.test(unit)?Number(m[1])*60:Number(m[1]));
 }
 if(/(?:пол\s*минуты|полминуты|half (?:a )?minute|medio minuto)/iu.test(s))matches.push(30);
 if(/(?:четверть минуты|quarter (?:of )?a minute|cuarto de minuto)/iu.test(s))matches.push(15);
 if(/(?:одн[уао]\s+минут[уы]?|one minute|un minuto)/iu.test(s))matches.push(60);
 const spelled={десять:10,пятнадцать:15,двадцать:20,тридцать:30,шестьдесят:60,десяти:10,пятнадцати:15,двадцати:20,тридцати:30,сорок:40,сорока:40,пятьдесят:50};
 for(const m of s.matchAll(/(?:секунд\p{L}*\s+на\s+|на\s+)([а-яё]+)(?:\s+секунд\p{L}*)?|(?:^|\s)([а-яё]+)\s+секунд\p{L}*/giu)){
   if(spelled[m[1]||m[2]])matches.push(spelled[m[1]||m[2]]);
 }
 const values=[...new Set(matches)];
 if(values.length>1)return {kind:'ambiguous'};
 if(values.length===0)return null;
 return LENGTHS.includes(values[0])?{kind:'ok',value:values[0]}:{kind:'unsupported',requested:values[0]};
}
function music(s,stage){
 const none=yes(s,/(?:без\s+(?:музык\p{L}*|мелоди\p{L}*|фоновой музык\p{L}*)|музык\p{L}*\s+не\s+(?:нужн\p{L}*|надо)|не хочу\s+музык\p{L}*|(?:убери|отключи|выключи)\s+музык\p{L}*|тишин[аыеу]\b|no music|without music|without (?:captions?|text|subtitles?) (?:or|and) music|mute music|music off|silent\b|sin m[uú]sica|sin sonido)/iu);
 const love=yes(s,/(?:романтич\p{L}*|любовн\p{L}*|нежн\p{L}*\s+мелоди\p{L}*|romantic(?: music| melody)?|love (?:music|song|melody)|m[uú]sica rom[aá]ntica)/iu);
 const med=yes(s,/(?:медитативн\p{L}*|медитационн\p{L}*|для медитации|meditati\p{L}*|para meditar|meditaci[oó]n)/iu);
 const any=yes(s,/(?:музык\p{L}*|мелоди\p{L}*|музыкальн\p{L}*|soundtrack|music\b|melody|m[uú]sica|armon[ií]a)/iu);
 if(none&&(love||med||yes(s,/(?:с музыкой|with music|con m[uú]sica)/iu)))return {kind:'ambiguous'};
 if(none)return {kind:'ok',value:'none'};
 if((love||med)&&(any||stage==='music'))return {kind:'ok',value:love?'love':'meditation'};
 return any?{kind:'ok',value:'harmony'}:null;
}
function phrases(s,stage){
 const no=yes(s,/(?:фраз\p{L}*\s+не\s+(?:надо|нужн\p{L}*|хочу|показывать)|не\s+хочу\s+(?:фраз\p{L}*|текст\p{L}*|надпис\p{L}*)|без\s+(?:фраз\p{L}*|текст\p{L}*|надпис\p{L}*|субтитр\p{L}*|аффирмац\p{L}*|слов\p{L}*)|не\s+(?:надо|нужн\p{L}*)\s+(?:фраз\p{L}*|текст\p{L}*|надпис\p{L}*|субтитр\p{L}*)|(?:убери|отключи|скрой)\s+(?:фраз\p{L}*|текст\p{L}*|надпис\p{L}*|субтитр\p{L}*)|no (?:captions|text|subtitles|affirmations)|without (?:captions|text|subtitles|words)|no words on screen|sin (?:frases|texto|subt[ií]tulos))/iu);
 const on=yes(s,/(?:добавь|включи|оставь|покажи|хочу|нужн\p{L}*|с|with|add|show|con|a[nñ]ade)\s+(?:(?:коротки\p{L}*|поддерживающ\p{L}*|on.screen|en pantalla)\s+)?(?:фраз\p{L}*|текст\p{L}*|надпис\p{L}*|субтитр\p{L}*|аффирмац\p{L}*|captions?|subtitles?|affirmations?|frases?)(?!\p{L})/iu);
 if(no&&on)return {kind:'ambiguous'};
 if(no)return {kind:'ok',value:false};
 if(on)return {kind:'ok',value:true};
 if(stage==='phrases'){
   if(/^(?:да|ага|угу|конечно|нужно|добавь|включи|yes|sure|add|on|s[ií]|claro|con)/iu.test(s))return {kind:'ok',value:true};
   if(/^(?:нет|не надо|не нужно|убери|выключи|no|off|sin|quita)/iu.test(s))return {kind:'ok',value:false};
 }
 return null;
}
function filters(s,stage){
 const aspects=scan(s,ASPECT), moods=scan(s,MOOD);
 let time=duration(s);
 if(!time&&stage==='duration'){
  const bare=({десять:10,пятнадцать:15,двадцать:20,тридцать:30,шестьдесят:60,
    ten:10,fifteen:15,twenty:20,thirty:30,sixty:60,
    diez:10,quince:15,veinte:20,treinta:30,sesenta:60})[s];
  if(bare)time={kind:'ok',value:bare};
 }
 const sound=music(s,stage), captions=phrases(s,stage);
 if(aspects.length>1||moods.length>1||[time,sound,captions].some(x=>x?.kind==='ambiguous'))return {reason:'ambiguous',filters:{}};
 if(time?.kind==='unsupported')return {reason:'unsupported_duration',requested:time.requested,filters:{}};
 const out={};
 if(aspects.length)out.aspect=aspects[0];
 if(moods.length)out.mood=moods[0];
 if(time?.kind==='ok')out.duration=time.value;
 if(sound?.kind==='ok')out.music=sound.value;
 if(captions?.kind==='ok')out.phrases=captions.value;
 return {reason:null,filters:out};
}
function settingsOnly(s,parsed){
 if(!Object.keys(parsed).length)return false;
 if(yes(s,/(?:\bпро\s+\p{L}|\bо\s+\p{L}|\babout\s+\p{L}|\bsobre\s+\p{L}|любов|близост|работ|карьер|бизнес|деньг|отношен|счаст|стресс|тревог|спокой|расслаб|уверенн|энерг|мечт|вдохнов|семь|природ|лес|океан|мор[ея]|гор[уы]|forest|mountain|love|career|business|stress|anxiety|calm|relax|confidence|amor|bosque|monta[nñ])/iu))return false;
 return true;
}
function goalFrom(s){
 const match=s.match(/(?:^|\s)(?:про|about|sobre|насч[её]т|о том[, ]+как|видео о|ролик о)\s+(.+)/iu);
 if(match){
   const subject=match[1].split(/\s*(?:[,;]|\s+но\s+|\s+but\s+|\s+pero\s+|\s+without\s+|\s+sin\s+|\s+на\s+\d{1,3}\s+(?:сек|мин)|\s+for\s+\d{1,3}\s+(?:sec|min))\s*/iu)[0].trim();
   if(subject.length>=3&&!/^(?:видео|ролик|video|music|музыка)$/iu.test(subject))return subject;
 }
 return null;
}
const generic=/^(?:(?:я|мне|i|yo)\s+)?(?:(?:хочу|сделай|создай|нужен|нужно|давай|want|need|make|create|please|quiero|necesito|haz|crea)\s+)*(?:an?\s+|un\s+|una\s+)?(?:видео(?:ролик)?|ролик|video|v[ií]deo|reel|reels|story|сторис)(?:\s+(?:пожалуйста|please|por favor))?$/iu;
const visual=/^(?:(?:добавь|покажи|добавить|хочу увидеть|вставь|замени сцену|show|add|include|show me|put in|a[nñ]ade|muestra|incluye)(?:\s|$)|(?:без|убери|исключи|no|avoid|sin)\s+(?:мор|лес|гор|вод|дерев|люд|sun|sea|forest|trees?|mountains?|water|bosque|mar|monta[nñ]))/iu;
export function understandVideoChatReply(value,stage='goal'){
 const msg=clean(value),s=short(msg),empty={filters:{}};
 if(!s)return {kind:'clarify',reason:'empty',...empty};
 if(generic.test(s)&&stage!=='category'&&stage!=='goal')return {kind:'reset',...empty};
 if(COMMANDS.reset.test(s))return {kind:'reset',...empty};
 if(COMMANDS.back.test(s)){
   const idx=VIDEO_CHAT_EDIT_STEPS.indexOf(stage);
   return {kind:'navigate',targetStep:stage==='done'||stage==='ready'?'review':idx<=0?'category':VIDEO_CHAT_EDIT_STEPS[idx-1],...empty};
 }
 if(COMMANDS.help.test(s))return {kind:'help',...empty};
 if(COMMANDS.repeat.test(s))return {kind:'repeat',...empty};
 if(COMMANDS.auto.test(s))return {kind:'auto',...empty};
 if(COMMANDS.alternate.test(s)&&['review','ready','done'].includes(stage))return {kind:'alternate',...empty};
 const requested=navigateTo(s);
 if(requested&&(yes(s,/^(?:вернись|перейди|возвращайся|go to|back to|switch to|volver a)/iu)||
  !yes(s,/(?:\s+на\s+\p{L}+|\s+to\s+\p{L}+|\s+без\s+|\s+without\s+|\s+sin\s+)/iu)))
   return {kind:'navigate',targetStep:requested,...empty};
 if(COMMANDS.skip.test(s))return {kind:'skip',...empty};
 if(/^(?:смен(?:ить|и) тему|другая тема|change topic|another topic|cambiar tema|otro tema)$/iu.test(s))return {kind:'navigate',targetStep:'topic',...empty};
 if(/^(?:другая идея|другую идею|поменяй идею|another idea|different idea|otra idea)$/iu.test(s))return {kind:'navigate',targetStep:'idea',...empty};
 if(/^(?:другой сценарий|другой сюжет|другую историю|another scenario|different story|otro guion|otra historia)$/iu.test(s))return {kind:'navigate',targetStep:'scenario',...empty};
 if(COMMANDS.create.test(s)){
   if(stage==='ready')return {kind:'create',...empty};
   if(stage==='review')return {kind:'clarify',reason:'approval_needed',...empty};
 }
 if(COMMANDS.open.test(s)&&stage==='done')return {kind:'open',...empty};
 if(COMMANDS.confirm.test(s)){
   if(stage==='review')return {kind:'confirm',...empty};
   if(stage==='goal'||stage==='category')return {kind:'clarify',reason:'missing_goal',...empty};
   if(stage==='ready'||stage==='done')return {kind:'clarify',reason:'action_needed',...empty};
 }
 if(!/(?:фраз|слов|текст|phrase|caption|frase|texto)/iu.test(s)&&/^(?:(?:сделай|пусть будет|чуть|немного|можно|make it|a bit|un poco)\s+)?(?:по)?короче|^shorter(?: please)?$|m[aá]s corto/iu.test(s))
   return {kind:'relative_duration',direction:-1,...empty};
 if(!/(?:фраз|слов|текст|phrase|caption|frase|texto)/iu.test(s)&&/^(?:(?:сделай|пусть будет|чуть|немного|можно|make it|a bit|un poco)\s+)?(?:по)?длиннее|^longer(?: please)?$|m[aá]s largo/iu.test(s))
   return {kind:'relative_duration',direction:1,...empty};
 const parsed=filters(s,stage);
 if(parsed.reason)return {kind:'clarify',reason:parsed.reason,requested:parsed.requested,...empty};
 const audioRequested=yes(s,/(?:озвуч\p{L}*|голос\p{L}*|диктор\p{L}*|закадров\p{L}*|voiceover|voice narration|narrator|voz en off|locuci[oó]n)/iu);
 if(stage==='goal'||stage==='category'){
   if(generic.test(s))return {kind:'clarify',reason:'missing_goal',...empty};
   if(settingsOnly(s,parsed.filters))return {kind:'settings_only',filters:parsed.filters};
   if(s.length<3||(Object.keys(parsed.filters).length===0&&audioRequested))return {kind:'clarify',reason:'missing_goal',...empty};
   return {kind:'goal',goal:msg,filters:parsed.filters,audioRequested};
 }
 const explicit=goalFrom(s);
 if(explicit)return {kind:'goal',goal:explicit,filters:parsed.filters,audioRequested};
 if(visual.test(s))return {kind:'append_goal',goal:msg,filters:parsed.filters,audioRequested};
 if(Object.keys(parsed.filters).length)return {kind:'edit',filters:parsed.filters,audioRequested};
 if(audioRequested)return {kind:'audio',...empty};
 if(/^(?:нет|неа|no|non|n[oã]o|nada|not really)$/iu.test(s))return {kind:'clarify',reason:'negative',...empty};
 if(s.length>=4&&/(?:видео|ролик|сценари|сюжет|истори|video|v[ií]deo|story|film|scene|лес|горы|океан|мечта|relationship|relaci[oó]n)/iu.test(s))
   return {kind:'goal',goal:msg,filters:{}};
 return {kind:'clarify',reason:'unknown',...empty};
}
