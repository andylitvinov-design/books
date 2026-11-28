// Server-side model choice only; callers cannot supply a model ID.
// Existing route auth, consent and free-provider gates must run first.
export function shouldUseCoachLargeV3({purpose,textOnly,fileName,freeConfirmed,basicEnabled}={}){
  return purpose==='my_coach'&&textOnly===true&&freeConfirmed==='true'&&
    (fileName==='coach-review.wav'||basicEnabled==='true')
}
