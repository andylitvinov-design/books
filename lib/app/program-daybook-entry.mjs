import {clarityLocale,clarityDaybookPath,clarityOnboardingPath} from './clarity-program.mjs'
const destinations={clarity:'clarity-daybook',goal:'goal-daybook',business:'business-daybook'}
export function programContinuation(program){
 if(!Object.hasOwn(destinations,program))throw new Error('INVALID_PROGRAM')
 return destinations[program]
}
export const programFromContinuation=continuation=>Object.keys(destinations).find(key=>destinations[key]===continuation)||null
export function programDaybookPath(locale,program){
 programContinuation(program)
 const lang=clarityLocale(locale)
 return program==='clarity'?clarityDaybookPath(lang):'/'+lang+'/app/daybook'+(program==='goal'?'?start=vector':'/business')
}
export function programOnboardingPath(locale,program){
 programContinuation(program)
 const lang=clarityLocale(locale)
 if(program==='clarity')return clarityOnboardingPath(lang)
 return '/'+(lang==='es'?'en':lang)+'/app/portrait?afterSignIn='+programContinuation(program)+'&programLocale='+lang
}
