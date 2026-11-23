/**
 * Editorial inventory only: no media / diagnosis / production certification.
 * On-demand and provider-free. 4-beat plots != 6-shot Video Studio films.
 */
import {getMyTubeTaxonomy,auditMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";
import {auditMyTubePlots} from "./mytube-scenario-plots.mjs";
import {getCompleteFilmScreenplay} from "./film-screenplay-256.mjs";
import {classifyMyTubeRequest} from "./mytube-prompt-classifier.mjs";
export const MYTUBE_PROBLEM_COVERAGE_FIXTURES=Object.freeze([
  {
    "id": "shame-guilt",
    "locale": "ru",
    "query": "Мне стыдно из-за ошибки",
    "topicId": "self-acceptance"
  },
  {
    "id": "shame-guilt",
    "locale": "en",
    "query": "I feel ashamed about yesterday",
    "topicId": "self-acceptance"
  },
  {
    "id": "shame-guilt",
    "locale": "es",
    "query": "Siento culpa por un error",
    "topicId": "self-acceptance"
  },
  {
    "id": "inner-critic-perfectionism",
    "locale": "ru",
    "query": "Мой внутренний критик не дает покоя",
    "topicId": "self-acceptance"
  },
  {
    "id": "inner-critic-perfectionism",
    "locale": "en",
    "query": "My inner critic is very loud",
    "topicId": "self-acceptance"
  },
  {
    "id": "inner-critic-perfectionism",
    "locale": "es",
    "query": "Siento perfeccionismo al trabajar",
    "topicId": "self-acceptance"
  },
  {
    "id": "anger-resentment",
    "locale": "ru",
    "query": "Я чувствую злость на работе",
    "topicId": "stress-relief"
  },
  {
    "id": "anger-resentment",
    "locale": "en",
    "query": "I feel resentment towards a colleague",
    "topicId": "stress-relief"
  },
  {
    "id": "anger-resentment",
    "locale": "es",
    "query": "Siento rabia por una situación",
    "topicId": "stress-relief"
  },
  {
    "id": "social-evaluation",
    "locale": "ru",
    "query": "Я испытываю страх оценки",
    "topicId": "phobias"
  },
  {
    "id": "social-evaluation",
    "locale": "en",
    "query": "I have fear of judgment in meetings",
    "topicId": "phobias"
  },
  {
    "id": "social-evaluation",
    "locale": "es",
    "query": "Tengo ansiedad social al conocer gente",
    "topicId": "phobias"
  },
  {
    "id": "grief",
    "locale": "en",
    "query": "I am grieving",
    "topicId": "low-mood"
  },
  {
    "id": "sleep-rest",
    "locale": "ru",
    "query": "Мучаюсь от бессонницы",
    "topicId": "evening-fatigue"
  },
  {
    "id": "boundaries",
    "locale": "en",
    "query": "I want to set boundaries",
    "topicId": "couple-communication"
  },
  {
    "id": "family",
    "locale": "es",
    "query": "Me preocupa la crianza de mis hijos",
    "topicId": "family-relationships"
  }
]);
export async function auditMyTubeCreativeCoverage(){
 const taxonomyAudit=auditMyTubeTaxonomy(),plotAudit=await auditMyTubePlots();
 const taxonomy=getMyTubeTaxonomy();
 const rows=taxonomy.categories.flatMap(category=>category.subcategories.flatMap(
   sub=>sub.topics.flatMap(topic=>topic.scenarios.map(s=>({
    categoryId:category.id,topicId:topic.id,scenarioId:s.id
   })))));
 const errors=[...taxonomyAudit.errors.map(x=>"taxonomy:"+x),
   ...plotAudit.errors.map(x=>"plot:"+x)];
 let individuallyDirected=0,structuredDrafts=0,mediaUnverified=0;
 for(const locale of ["ru","en","es"])for(const row of rows){
   const film=getCompleteFilmScreenplay(row.scenarioId,locale);
   if(!film||film.topicId!==row.topicId||film.categoryId!==row.categoryId||
     film.storyboard?.length!==6||film.conceptScenes?.length!==6||
     film.storyboard.some((shot,index)=>shot.startSeconds!==index*5||
       shot.endSeconds!==(index+1)*5||shot.sourceVerified!==false))
     errors.push("screenplay:"+locale+":"+row.scenarioId);
   if(locale==="en"&&film){
     if(film.editorialTreatment==="individually_directed")individuallyDirected++;
     else structuredDrafts++;
     if(film.mediaBindingStatus==="editorial_only_unverified")mediaUnverified++;
   }
 }
 const cases=MYTUBE_PROBLEM_COVERAGE_FIXTURES.map(f=>{
   const r=classifyMyTubeRequest(f.query,f.locale);
   const pass=r?.topicId===f.topicId&&r?.contextId===f.id&&
     r?.matchLevel==="context"&&r?.confidence==="low";
   if(!pass)errors.push("coverage:"+f.locale+":"+f.id+":"+(r?.topicId||"none"));
   return {id:f.id,locale:f.locale,topicId:r?.topicId||null,pass};
 });
 return {
   version:"hh-mytube-editorial-quality-v1",
   ok:errors.length===0,
   inventory:{categories:taxonomy.categories.length,topics:64,scenarios:rows.length,
     plotVariants:plotAudit.counts.plots,plotBeats:plotAudit.counts.storyBeats,
     localizedSixShotScreenplays:rows.length*3},
   editorial:{individuallyDirectedScenarioIds:individuallyDirected,
     structuredScreenplayDrafts:structuredDrafts,mediaNotVerifiedByScreenplay:mediaUnverified,
     humanReviewCertified:false},
   intentCoverage:{fixtures:cases.length,failed:cases.filter(x=>!x.pass)},
   release:{qualityChecksPassed:errors.length===0,
     physicalSceneMediaVerified:false,iphoneMp4E2eVerified:false,
     productionReadyFromThisAudit:false},
   caveats:[
     "An adjacent topic is not a dedicated psychological program or diagnosis.",
     "Distinct titles and high structural scores are not human creative review.",
     "Five matching metadata entries do not prove depicted action, real JPEG or licensing.",
     "Actual verified sources, credits, render and device playback are separate gates."
   ],errors
 };
}
