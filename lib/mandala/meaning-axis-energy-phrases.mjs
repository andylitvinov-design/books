/**
 * Opt-in editorial support phrase choices: 512 canonical short scenario IDs,
 * three manually self-selected readiness/energy levels, five options each.
 *
 * Distinct from clinical maturity/health assessment. No network, billing,
 * personal data, renderer, automatic guessing, or media/publication permission.
 * The long phrase is voice/editorial copy; caption is <=36 code points.
 */
import catalog from '../../data/video-catalog/meaning-axis-energy-phrases-512-v1.json' with {type:'json'};

const locales = Object.freeze(['ru','en','es']);
const tiers = Object.freeze(['low','medium','high']);
const fields = Object.freeze(['ru','en','es','ruCaption','enCaption','esCaption']);
const index = new Map(catalog.scenarios.map(row=>[row.id,row]));

export const MEANING_AXIS_ENERGY_PHRASES_VERSION=catalog.schemaVersion;
export const MEANING_AXIS_ENERGY_PHRASES_COUNTS=Object.freeze({...catalog.meta});

export function getMeaningEnergyLevels(locale='en'){
 if (!locales.includes(locale)) return [];
 return tiers.map(id=>({id,label:catalog.tierLabels[id][locale].name,
     readiness:catalog.tierLabels[id][locale].readiness,
     focus:catalog.tierLabels[id][locale].focus,
     requiresSelfSelection:true}));
}

export function listMeaningEnergyPhrases(scenarioId,{tier,locale='en'}={}){
 if(typeof scenarioId!=='string'||!tiers.includes(tier)||!locales.includes(locale))return [];
 const record=index.get(scenarioId);
 if(!record)return [];
 const field=fields.indexOf(locale);
 const caption=fields.indexOf(locale+'Caption');
 return record.tierPhrases[tier].map((pair,i)=>({
   id:`${record.subsectorId}__${tier}__p${i+1}`,
   scenarioId:record.id,topicId:record.topicId,axisId:record.axisId,
   tier,rank:i+1,spokenText:pair[field],captionText:pair[caption],
   requiresUserApproval:true,canRender:false,editorialStatus:catalog.status,
 }));
}

export function auditMeaningEnergyPhrases(){
 const errors=[];
 if(catalog.scenarios.length!==512||index.size!==512)errors.push('scenario_count_or_id');
 if(catalog.axes.length!==8||catalog.meta.canonicalTopics!==64)errors.push('axis_or_topic_count');
 const ids=new Set(),topicIds=new Set(),combos=new Set(),seen={ru:new Set(),en:new Set(),es:new Set()};
 for(const s of catalog.scenarios){
   topicIds.add(s.topicId);
   const combo=s.topicId+'__'+s.axisId;
   if(combos.has(combo))errors.push('duplicate_topic_axis:'+combo);
   combos.add(combo);
   if(!catalog.axes.some(a=>a.id===s.axisId)||s.id!==s.subsectorId+'__short-film-v1')
     errors.push('invalid_script_axis:'+s.id);
   for(const tier of tiers){
     const lines=s.tierPhrases[tier];
     if(!Array.isArray(lines)||lines.length!==5){errors.push('tier_count:'+s.id+':'+tier);continue;}
     lines.forEach((pair,i)=>{
       const phraseId=s.subsectorId+'__'+tier+'__p'+(i+1);
       if(ids.has(phraseId))errors.push('duplicate_phrase_id:'+phraseId);
       ids.add(phraseId);
       if(!Array.isArray(pair)||pair.length!==6){errors.push('locale_count:'+phraseId);return;}
       for(const lang of locales){
         const full=pair[fields.indexOf(lang)],short=pair[fields.indexOf(lang+'Caption')];
         if(typeof full!=='string'||!full.trim())errors.push('missing_full:'+phraseId+':'+lang);
         else if(seen[lang].has(full))errors.push('duplicate_full:'+phraseId+':'+lang);
         else seen[lang].add(full);
         if(typeof short!=='string'||!short.trim()||[...short].length>36)
           errors.push('invalid_caption:'+phraseId+':'+lang);
       }
     });
   }
 }
 if(topicIds.size!==64||combos.size!==512||ids.size!==7680)errors.push('missing_topic_axis_or_phrase_ids');
 for(const lang of locales)if(seen[lang].size!==7680)errors.push('phrase_count:'+lang);
 return {ok:errors.length===0,counts:{scenarios:catalog.scenarios.length,
    topics:topicIds.size,axes:catalog.axes.length,levels:tiers.length,phraseIds:ids.size,
    localized:{ru:seen.ru.size,en:seen.en.size,es:seen.es.size}},errors};
}