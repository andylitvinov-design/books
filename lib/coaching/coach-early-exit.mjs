// UI-only elapsed clock: never grants quota or proves session completion.
export const COACH_EARLY_EXIT_SECONDS=17*60
export function coachShouldOfferEarlyExit(seconds){
 return !Number.isFinite(seconds)||seconds<COACH_EARLY_EXIT_SECONDS
}
export function coachEarlyExitDestination(locale,sessionId,choice){
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 const root='/'+lang+'/my-coach'
 if(choice!=='switch')return root
 const program=typeof sessionId==='string'?sessionId.split('_')[0]:''
 // The approved comparison has no dedicated goal/legacy-topic launch route.
 if(['clarity','business','love','health'].includes(program))return root+'/programs/'+program
 return root+'/programs'
}
