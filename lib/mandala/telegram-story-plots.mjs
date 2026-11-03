/**
 * Telegram Story Director editorial plot choices.
 * A plot is a visual treatment of a scenario, never a claim that footage exists.
 * Reuse the exact MyTube source tree; do not clone or fork its 256 IDs.
 */
import {
  MYTUBE_TAXONOMY_VERSION,
  listMyTubeCategories,
  listMyTubeSubcategories,
  listMyTubeTopics,
  listMyTubeScenarios,
  getMyTubeTopic,
} from './mytube-content-taxonomy.mjs';

export const TELEGRAM_STORY_PLOT_VERSION = 'hh-telegram-story-plots-v1';
const LOCALES = new Set(['ru','en','es']);
const safeLocale = locale => LOCALES.has(locale) ? locale : 'ru';
const TREATMENTS = Object.freeze([
  {
    id:'realistic-journey',
    label:{ru:'Реальная история',en:'Real-life journey',es:'Historia real'},
    beats:{
      ru:['Повседневная ситуация','Первое небольшое изменение','Реальное действие','Открытый следующий шаг'],
      en:['Everyday situation','A small first change','A real action','An open next step'],
      es:['Situación cotidiana','Un primer cambio pequeño','Una acción real','Un siguiente paso abierto'],
    },
    tags:['everyday','human','movement','forward'],
  },
  {
    id:'nature-metaphor',
    label:{ru:'Метафора природы',en:'Nature metaphor',es:'Metáfora natural'},
    beats:{
      ru:['Тихий пейзаж','Смена света и погоды','Постепенное движение','Простор и перспектива'],
      en:['A quiet landscape','Light and weather shift','Gradual movement','Space and perspective'],
      es:['Paisaje tranquilo','Cambio de luz y clima','Movimiento gradual','Espacio y perspectiva'],
    },
    tags:['nature','light','landscape','space'],
  },
  {
    id:'symbolic-transformation',
    label:{ru:'Символическое превращение',en:'Symbolic transformation',es:'Transformación simbólica'},
    beats:{
      ru:['Символ исходного состояния','Появление альтернативы','Изменение формы','Новый образ выбора'],
      en:['Symbol of the starting state','An alternative appears','The form changes','A new image of choice'],
      es:['Símbolo del estado inicial','Aparece una alternativa','Cambio de forma','Nueva imagen de elección'],
    },
    tags:['symbol','contrast','transition','choice'],
  },
  {
    id:'gentle-guided',
    label:{ru:'Бережное сопровождение',en:'Gentle guided experience',es:'Acompañamiento suave'},
    beats:{
      ru:['Спокойное знакомое место','Замедление и ориентирование','Ощущение доступной опоры','Возвращение в настоящее'],
      en:['A calm familiar place','Slowing down and orienting','A sense of available support','Returning to the present'],
      es:['Lugar familiar y tranquilo','Bajar el ritmo y orientarse','Sensación de apoyo disponible','Volver al presente'],
    },
    tags:['calm','grounding','safety','present'],
  },
]);

const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(id) && id.length <= 96;

export function listTelegramStoryCategories(locale='ru') {
  return listMyTubeCategories(safeLocale(locale));
}
export function listTelegramStorySubcategories(categoryId,locale='ru') {
  return validId(categoryId) ? listMyTubeSubcategories(categoryId,safeLocale(locale)) : [];
}
export function listTelegramStoryTopics(categoryId,subcategoryId,locale='ru') {
  return validId(categoryId)&&validId(subcategoryId)
    ? listMyTubeTopics(categoryId,subcategoryId,safeLocale(locale)) : [];
}
export function listTelegramStoryScenarios(topicId,locale='ru') {
  return validId(topicId) ? listMyTubeScenarios(topicId,safeLocale(locale)) : [];
}
export function listTelegramStoryPlots(scenarioId,locale='ru') {
  if(!validId(scenarioId)) return [];
  const lang=safeLocale(locale);
  // Resolve through the canonical hierarchy, not guessed ID prefixes.
  for(const category of listMyTubeCategories(lang)) {
    for(const subcategory of listMyTubeSubcategories(category.id,lang)) {
      for(const topic of listMyTubeTopics(category.id,subcategory.id,lang)) {
        const scenario=listMyTubeScenarios(topic.id,lang).find(item=>item.id===scenarioId);
        if(!scenario) continue;
        return TREATMENTS.map(treatment=>Object.freeze({
          id:scenarioId+'--'+treatment.id,
          scenarioId,
          topicId:topic.id,
          subcategoryId:subcategory.id,
          categoryId:category.id,
          label:treatment.label[lang],
          creativeBrief:scenario.creativeBrief,
          visualBeats:Object.freeze([...treatment.beats[lang]]),
          visualTags:Object.freeze([...treatment.tags]),
          sourceStatus:'editorial_only_unbound',
          canExport:false,
          taxonomyVersion:MYTUBE_TAXONOMY_VERSION,
          plotVersion:TELEGRAM_STORY_PLOT_VERSION,
        }));
      }
    }
  }
  return [];
}
export function resolveTelegramStoryPlot(plotId,locale='ru') {
  if(typeof plotId!=='string'||plotId.length>160) return null;
  const match=plotId.match(/^([a-z0-9_-]+)--(realistic-journey|nature-metaphor|symbolic-transformation|gentle-guided)$/);
  if(!match) return null;
  return listTelegramStoryPlots(match[1],locale).find(plot=>plot.id===plotId)??null;
}
export function telegramStoryPlotCounts() {
  const categories=listTelegramStoryCategories();
  let subcategories=0,topics=0,scenarios=0,plots=0;
  for(const category of categories) {
    for(const subcategory of listTelegramStorySubcategories(category.id)) {
      subcategories++;
      for(const topic of listTelegramStoryTopics(category.id,subcategory.id)) {
        topics++;
        for(const scenario of listTelegramStoryScenarios(topic.id)) {
          scenarios++;
          plots+=listTelegramStoryPlots(scenario.id).length;
        }
      }
    }
  }
  return {categories:categories.length,subcategories,topics,scenarios,plots};
}
