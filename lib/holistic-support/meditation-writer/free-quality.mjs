/** An accepted free-model draft must contain a real, sufficiently long text. */
export function reviewFreeMeditationQuality({draft,plannedDurationSeconds}={}) {
 if(draft?.status!=="draft_review_required" ||
    draft.generationMode!=="llm" || draft.modelUsed!==true ||
    draft.review?.status!=="draft_review_required" ||
    !Number.isFinite(plannedDurationSeconds)||plannedDurationSeconds<=0)
   return {ok:false,reason:"UNREVIEWED_OR_NON_LLM"};
 const estimate=draft.review.estimatedDurationSeconds;
 if(!Number.isFinite(estimate) ||
    estimate<Math.round(plannedDurationSeconds*.78) ||
    estimate>Math.round(plannedDurationSeconds*1.22))
   return {ok:false,reason:"WRONG_ESTIMATED_DURATION"};
 if(draft.review.warnings?.includes("REPEATED_SENTENCES"))
   return {ok:false,reason:"REPEATED_SENTENCES"};
 if(!Array.isArray(draft.segments)||draft.segments.length!==7 ||
    draft.segments.some(s=>typeof s?.text!=="string"||!s.text.trim()))
   return {ok:false,reason:"INCOMPLETE_SCRIPT"};
 return {ok:true,reason:null,estimatedDurationSeconds:estimate};
}
