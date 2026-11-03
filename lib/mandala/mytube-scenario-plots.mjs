/**
 * MyTube 64 × 4 × 4 × 4 editorial story plots.
 *
 * Four hand-authored four-shot stories per topic in RU/EN/ES; each scenario
 * adapts them through a distinct directing lens. 1024 selectable proposals.
 * A storyboard is NOT a verified MP4: no source, render, payment or XP claims.
 */
import {getMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";
import goals from "../../data/video-catalog/mytube-plot-seeds-goals-money-v1.json" with {type:"json"};
import love from "../../data/video-catalog/mytube-plot-seeds-love-relationships-v1.json" with {type:"json"};
import energy from "../../data/video-catalog/mytube-plot-seeds-energy-confidence-v1.json" with {type:"json"};
import stress from "../../data/video-catalog/mytube-plot-seeds-stress-recovery-v1.json" with {type:"json"};
import newer from "../../data/video-catalog/mytube-plot-seeds-v3-new-topics.json" with {type:"json"};

export const MYTUBE_PLOT_COUNTS=Object.freeze({
  categories:4,subcategories:16,topics:64,scenarios:256,plotsPerScenario:4,
  plots:1024,shots:4096,
});
const LOCALES=["ru","en","es"];
const localeOf=value=>LOCALES.includes(value)?value:"ru";
const TOPIC_ALIASES=Object.freeze({
  "life-transitions":"life-change",
  "goal-follow-through":"goal-achievement",
  "financial-stability":"financial-security",
  "fear-being-alone":"fear-alone",
  "choosing-partner":"partner-choice",
  "everyday-overload":"constant-fatigue",
  "evening-fatigue":"sleep-rest",
  "mental-tiredness":"mental-fatigue",
  "recovery-after-load":"physical-fatigue",
  "breathing-practices":"breathing",
  "motivation-drive":"vitality",
  "phobias":"specific-phobias",
  "low-mood":"depressed-mood",
});
const SOURCES=new Map([
  ["goals-money",goals.topics],
  ["love-relationships",love.topics],
  ["energy-confidence",energy.topics],
  ["stress-anxiety",stress.topics],
]);
const GENRES=Object.freeze({
  everyday:{ru:"Жизненная история",en:"Everyday story",es:"Historia cotidiana"},
  nature:{ru:"Природная метафора",en:"Nature metaphor",es:"Metáfora natural"},
  symbolic:{ru:"Символическая притча",en:"Symbolic parable",es:"Parábola simbólica"},
  practice:{ru:"Шаг в реальной жизни",en:"Real-life step",es:"Paso en la vida real"},
});
const LENSES=Object.freeze({
  journey:{
    ru:["Отправная точка","Встреча с препятствием","Открытие направления","Первый шаг"],
    en:["Point of departure","Encounter with an obstacle","A direction emerges","One first step"],
    es:["Punto de partida","Encuentro con obstáculo","Surge un rumbo","Primer paso"],
  },
  shelter:{
    ru:["Безопасное начало","Найти доступную опору","Почувствовать пространство выбора","Завершить в своём темпе"],
    en:["An opening with safety","Find available support","Make space for choice","Close at one's own pace"],
    es:["Inicio con seguridad","Buscar apoyo disponible","Dar espacio a elegir","Cerrar a su ritmo"],
  },
  reframe:{
    ru:["Привычная картина","Деталь меняет взгляд","Увидеть иначе","Новая перспектива"],
    en:["The familiar picture","A detail shifts the view","Look from another angle","A wider perspective"],
    es:["La imagen habitual","Un detalle cambia la mirada","Otro punto de vista","Perspectiva más amplia"],
  },
  integration:{
    ru:["Узнать сигнал","Выбрать посильное действие","Проверить результат","Перенести в свой день"],
    en:["Recognize the signal","Choose a manageable action","Notice the result","Bring it into daily life"],
    es:["Reconocer una señal","Elegir una acción posible","Observar el resultado","Llevarlo a la vida diaria"],
  },
});
// The same visual beat is filmed differently in each scenario. Lens choices
// affect shot framing and narrative emphasis, not the licensed clip registry.
const DIRECTION=Object.freeze({
  journey:{
    ru:["Общий план исходного положения","Поступательное движение к развилке","Крупный план момента осознания","Движение героя вперёд"],
    en:["Wide view of the starting situation","Tracking movement toward the turn","Close view of discovery","Forward action"],
    es:["Plano general de partida","Movimiento hacia el cambio","Primer plano del descubrimiento","Acción hacia adelante"],
  },
  shelter:{
    ru:["Неподвижная камера и мягкое пространство","Крупно показать доступный ресурс","Спокойный устойчивый кадр","Безопасное открытое завершение"],
    en:["Stable framing and generous space","Close-up of available support","Grounded steady composition","Gentle open ending"],
    es:["Plano estable y espacio amplio","Detalle del apoyo posible","Encuadre firme y tranquilo","Final abierto y suave"],
  },
  reframe:{
    ru:["Показать привычное ограничение","Неожиданный визуальный контраст","Смена ракурса на тот же образ","Широкий план новой возможности"],
    en:["Show the familiar constraint","Introduce a visual contrast","Reframe the same image","Wide view of a new possibility"],
    es:["Mostrar límite habitual","Introducir contraste visual","Cambiar ángulo del mismo motivo","Plano amplio de posibilidad"],
  },
  integration:{
    ru:["Узнаваемая бытовая среда","Руки и конкретный предмет в действии","Пауза для наблюдения","Небольшой реалистичный шаг"],
    en:["Recognizable everyday setting","Hands and an object in action","Observational pause","Small feasible next step"],
    es:["Entorno cotidiano reconocible","Manos y objeto en acción","Pausa para observar","Paso pequeño y realista"],
  },
});

function scenarioLocation(scenarioId) {
  if(typeof scenarioId!=="string"||!scenarioId)return null;
  const catalog=getMyTubeTaxonomy();
  for(const category of catalog.categories)for(const subcategory of category.subcategories)
    for(const topic of subcategory.topics){
      const scenario=topic.scenarios.find(row=>row.id===scenarioId);
      if(scenario)return {category,subcategory,topic,scenario};
    }
  return null;
}
function topicStories(categoryId,topicId){
  // New canonical IDs are resolved explicitly, never via fuzzy text matching.
  // This also keeps previously authored plot stories compatible with v3 topics.
  return newer.topics[topicId]??SOURCES.get(categoryId)?.[TOPIC_ALIASES[topicId]??topicId]??[];
}
export function listMyTubePlotChoices(scenarioId,locale="ru") {
  const lang=localeOf(locale);
  const found=scenarioLocation(scenarioId);
  if(!found)return [];
  const {category,topic,scenario}=found;
  const phases=LENSES[scenario.archetype]?.[lang];
  const direction=DIRECTION[scenario.archetype]?.[lang];
  if(!phases||!direction)return [];
  return topicStories(category.id,topic.id).map((seed,index)=>({
    id:scenario.id+"-p"+(index+1),scenarioId:scenario.id,topicId:topic.id,
    categoryId:category.id,
    label:seed.title[lang],
    fullLabel:scenario.label[lang]+" — "+seed.title[lang],
    plotType:seed.kind,plotTypeLabel:GENRES[seed.kind]?.[lang]??seed.kind,
    archetype:scenario.archetype,
    storyboard:seed.shots[lang].map((beat,i)=>({
      shot:i+1,phase:phases[i],visualHint:beat,
      directorNote:direction[i],sequence:(i+1)+"",
    })),
    sourceStatus:"editorial_only_unbound",
    requiresMediaBinding:true,canExport:false,
  }));
}
export function buildMyTubePlotPlan({scenarioId,plotId,locale="ru"}={}){
  const plot=listMyTubePlotChoices(scenarioId,locale).find(row=>row.id===plotId);
  if(!plot)return null;
  return {...plot,mediaStatus:"unbound",clientDataIncluded:false};
}
export function auditMyTubePlotCatalog(){
  const errors=[];let topics=0,scenarios=0,plots=0,shots=0;
  const ids=new Set(),titles=Object.fromEntries(LOCALES.map(lang=>[lang,new Set()]));
  const taxonomy=getMyTubeTaxonomy();
  for(const category of taxonomy.categories){
    for(const subcategory of category.subcategories){
      for(const topic of subcategory.topics){
        topics++;
        const seeds=topicStories(category.id,topic.id);
        if(seeds.length!==4){errors.push("expected_four_seeds:"+topic.id);continue;}
        for(const lang of LOCALES){
          const localTitles=seeds.map(seed=>seed.title?.[lang]?.trim());
          const localBeats=seeds.map(seed=>seed.shots?.[lang]?.join("|"));
          if(localTitles.some(s=>!s)||new Set(localTitles).size!==4)
            errors.push("duplicated_plot_names:"+topic.id+":"+lang);
          if(localBeats.some(s=>!s)||new Set(localBeats).size!==4)
            errors.push("duplicated_plot_shots:"+topic.id+":"+lang);
        }
        for(const scenario of topic.scenarios){
          scenarios++;
          const variants=listMyTubePlotChoices(scenario.id,"ru");
          if(variants.length!==4)errors.push("expected_four_plots:"+scenario.id);
          for(const plot of variants){
            plots++;shots+=plot.storyboard.length;
            if(ids.has(plot.id))errors.push("duplicate_plot_id:"+plot.id);
            ids.add(plot.id);
            if(plot.storyboard.length!==4)errors.push("wrong_shot_count:"+plot.id);
            if(plot.canExport||!plot.requiresMediaBinding)errors.push("unbound_plot_exportable:"+plot.id);
          }
          for(const lang of LOCALES)for(const plot of listMyTubePlotChoices(scenario.id,lang)){
            if(titles[lang].has(plot.fullLabel))errors.push("duplicate_full_title:"+lang+":"+plot.id);
            titles[lang].add(plot.fullLabel);
            if(!plot.label||plot.storyboard.some(shot=>!shot.visualHint||!shot.phase||!shot.directorNote))
              errors.push("incomplete_localized_story:"+lang+":"+plot.id);
          }
        }
      }
    }
  }
  if(topics!==64||scenarios!==256||plots!==1024||shots!==4096)
    errors.push("wrong_hierarchy_counts");
  for(const lang of LOCALES)if(titles[lang].size!==1024)
    errors.push("wrong_localized_title_count:"+lang);
  return {ok:errors.length===0,counts:{topics,scenarios,plots,shots},errors};
}
