/**
 * Event-specific picture vocabulary for a story-board sketch.
 * Text from the selected screenplay is always authoritative. These pictograms
 * are a drafting aid, not AI-generated stills and never evidence of licensed MP4.
 * No provider, network call, user data storage or automatic stock selection.
 */
const clean=value=>String(value??"").normalize("NFKC")
 .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,500);

// Physical props outrank locations and moods. The action sentence outranks
// editorial search keywords, so a generic stock tag never replaces a prop.
const OBJECTS=Object.freeze([
 ["luggage",/suitcase|luggage|valise|\bcase\b|maleta|equipaje|чемодан|багаж/iu],
 ["chair",/chairs?|stools?|asient[oa]s?|sillas?|стул|стуль|кресл/iu],
 ["photograph",/photograph|photos?|pictures?|snapshots?|fotograf[ií]a|fotos?|фотограф|снимок|фотокарточ/iu],
 ["shelf",/shel(?:f|ves)|estanter[ií]a|estantes?|полк[аеуи]|полочку/iu],
 ["invitation",/invit(?:e|ation)|invitaci[oó]n|приглашен|приглаша|приглас/iu],
 ["phone",/smartphone|cellphone|mobile phone|phones?|m[oó]vil|tel[eé]fono|смартфон|телефон/iu],
 ["message",/messages?|repl(?:y|ies)|notification|mensaje|respuesta|сообщен|уведомлен|ответ/iu],
 ["letter",/letters?|envelopes?|correspondencia|cartas?|sobre|письм|конверт/iu],
 ["notebook",/notebooks?|sketchbooks?|cuadernos?|альбом|блокнот|тетрад/iu],
 ["pencil",/pencils?|crayons?|l[aá]piz|карандаш|ластик|eraser|borrador/iu],
 ["paper",/paper|pages?|sheets?|papel|hojas?|лист[а-я]* бума|бумаг|страниц/iu],
 ["drawing",/drawings?|sketches?|dibuj|рисунк|эскиз/iu],
 ["box",/boxes?|cartons?|cajas?|коробк|ящик/iu],
 ["notes",/notes?|post-its?|sticky|notas?|записк|заметк/iu],
 ["calendar",/calendars?|calendariz|календар|calendario|расписани/iu],
 ["clock",/clocks?|wristwatch|relojes?|reloj|час[ыа]|циферблат/iu],
 ["transit",/crowded transport|public transport|transport|commut(?:e|er)|bus(?:es)?|subway|metro|trams?|transporte|autob[uú]s|tranv[ií]a|транспорт|автобус|метро|трамва|электричк/iu],
 ["rain",/rains?|rainy|rainfall|lluvia|llueve|дожд[а-я]*|дождлив/iu],
 ["breath",/exhal|breath|inhal|respir|дых|выдых|выдох|вдох/iu],
 ["typing",/\btype\b|typing|typed|erase|erasing|delete|write|writing|escribe|escribir|borrar|набир|стир|стёр|стер|пис[а-я]*|пиш[а-я]*/iu],
 ["smile",/smil|sonr|улыб/iu],
 ["money",/wallet|coins?|money|cash|monedas?|dinero|кошел|монет|деньг|купюр/iu],
 ["computer",/computers?|laptops?|ordenador|computadora|port[aá]til|компьютер|ноутбук/iu],
 ["desk",/desks?|workstations?|escritorios?|рабочий стол|письменн[а-я]* стол/iu],
 ["lamp",/lamps?|linternas?|l[aá]mparas?|ламп|фонар/iu],
 ["light",/sunlight|sunrise|morning light|dawn|sunshine|amanecer|luz de la ma[nñ]ana|рассвет|утренн[а-я]* свет|солнечн/iu],
 ["door",/doors?|doorways?|puertas?|двер|порог/iu],
 ["window",/windows?|ventanas?|окн[аоуе]|окошк/iu],
 ["house",/home|apartment|houses?|homes?|casas?|hogar|apartamento|квартир|домой|дома|дом[аеу]/iu],
 ["bridge",/bridges?|puentes?|мост[аеу]|мостик/iu],
 ["train",/trains?|trenes?|поезд|электричк/iu],
 ["car",/cars?|autom[oó]vil|coche|машин|автомобил/iu],
 ["street",/streets?|roads?|calles?|caminos?|улиц|дорог/iu],
 ["book",/books?|libros?|книг/iu],
 ["cup",/cups?|mugs?|tazas?|чашк|кружк/iu],
 ["table",/tables?|mesas?|стол[аеуы]|столе/iu],
 ["flower",/flowers?|blossoms?|flores?|цвет[а-я]*|бутон/iu],
 ["plant",/plants?|seedlings?|sprouts?|plantas?|semillas?|ростк|семен|растени/iu],
 ["tree",/trees?|branches?|[aá]rbol(?:es)?|ramas?|дерев[а-я]*|ветк/iu],
 ["water",/rivers?|lakes?|oceans?|water|r[ií]os?|lagos?|mares?|вода|вод[оеу]|мор[ея]|река|океан/iu],
 ["mountain",/mountains?|peaks?|monta[nñ]as?|гор[аыеу]|вершин/iu],
 ["fabric",/fabric|clothes?|clothing|garment|costura|tela|ropa|одежд|ткан|шов|нитк|игл/iu],
 ["scissors",/scissors?|tijeras?|ножниц/iu],
 ["camera",/cameras?|c[aá]mara|камер|фотоаппарат/iu],
 ["food",/meals?|bread|foods?|comida|pan\b|ед[ау]|хлеб|тарелк/iu],
 ["handshake",/handshake|shake hands|apret[oó]n|рукопожат|пожимают руки/iu],
 ["heart",/hearts?|coraz[oó]n|сердц/iu],
 ["key",/keys?|llaves?|ключ[а-я]*/iu],
 ["map",/maps?|mapas?|карт[ауеы]/iu],
 ["target",/targets?|goals?|metas?|objetivos?|цел[ьи]|мишен/iu],
 ["music",/music|melody|m[uú]sica|мелоди|музык/iu]
]);
const MOTIONS=Object.freeze([
 ["walking",/walk|leav|steps?|goes|caminar|salir|pasos?|ид[её]т|шага|уход|выход/iu],
 ["hands",/hands?|palms?|finger|manos?|dedos?|рук[аиу]|ладон|пальц/iu],
 ["people",/people|person|friend|couple|visitors?|personas?|amig[oa]s?|люди|человек|друг|пара|герой/iu],
 ["meeting",/meeting|encounter|reuni[oó]n|встреч|знакомств/iu],
 ["choice",/chooses?|decid|выбира|решени|выбор|elige|decide/iu]
]);

// Prefer the order of actual events, but foreground props before incidental
// setting words. Thus "suitcase on chair" draws suitcase+chair; "case to
// shelf; chair now free" draws luggage+shelf, never a generic table.
const collect=(text,words)=>words.map(([id,re])=>({id,at:text.search(re)}))
 .filter(x=>x.at>=0).sort((a,b)=>a.at-b.at).map(x=>x.id);
const BACKDROP=new Set(["table","house","street","light","window",
 "water","mountain","tree","plant","flower","desk","cup"]);
const SHOT_PROPS=new Set(["luggage","chair","photograph","shelf","phone",
 "transit","rain","breath","typing","smile","message","invitation","clock"]);
const selectCues=direct=>{
 const acting=direct.filter(id=>SHOT_PROPS.has(id));
 const foreground=direct.filter(id=>!BACKDROP.has(id));
 return [...new Set([...acting,...foreground,...direct])].slice(0,2);
};

export function describeStoryboardSceneGraphic({action="",visualSubject="",keywords=[]}={}){
 const sourceAction=clean(action);
 const direct=collect(sourceAction,OBJECTS);
 // Strong foreground objects come first; background only fills spare slots.
 // Neither is inferred from unrelated footage catalogue tags.
 const cueIds=selectCues(direct);
 if(cueIds.length<2){
  const motion=collect(sourceAction,MOTIONS);
  for(const id of motion)if(!cueIds.includes(id)&&cueIds.length<2)cueIds.push(id);
 }
 if(!cueIds.length){
  const editorial=clean([visualSubject,...(Array.isArray(keywords)?keywords.slice(0,6):[])].join(" "));
  for(const id of [...collect(editorial,OBJECTS),...collect(editorial,MOTIONS)]){
   if(!cueIds.includes(id)&&cueIds.length<2)cueIds.push(id);
  }
 }
 return Object.freeze({
  sourceAction,
  cueIds:Object.freeze(cueIds),
  hasLiteralObjectEvidence:direct.length>0,
  visualStatus:"editorial_scene_sketch_unverified"
 });
}
