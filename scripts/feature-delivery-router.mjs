// Pure routing policy. No deploy, merge or network side effects.
export function routeFeature({kind='feature',risk='normal',urgent=false,labReady=false,qaPassed=false,releaseApproved=false}={}){
 const direct=['ci','release-infrastructure','security-hotfix','production-incident'];
 if(direct.includes(kind)||urgent&&['critical','security','payments'].includes(risk))
   return {lane:'github-hotfix',status:'PR_REQUIRED',reason:'time-critical or release-infrastructure',checks:'full-applicable'};
 if(['security','payments','auth','personal-data','database'].includes(risk))
   return {lane:'lab-isolated',status:'HOLD_FOR_ISOLATION',reason:'sensitive change requires isolated fixtures',checks:'full-applicable'};
 if(!labReady)return {lane:'lab',status:'LOCAL_ONLY',reason:'preview pipeline not yet verified',checks:'focused'};
 if(!qaPassed)return {lane:'lab',status:'LAB_QA',reason:'iterate without production PR',checks:'focused'};
 if(!releaseApproved)return {lane:'release-candidate',status:'READY_FOR_RELEASE_REVIEW',reason:'prepare coherent PR with evidence',checks:'full-applicable'};
 return {lane:'github-release',status:'PR_REQUIRED',reason:'release candidate accepted',checks:'full-applicable'};
}
