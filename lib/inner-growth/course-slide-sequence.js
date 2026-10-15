// Single source of truth for OPORA slide assembly and public lesson QA.
// Pure function: no DOM, no auth, no individual client data.
export function buildCourseSlides(lesson) {
  const guided=(lesson?.sections||[]).filter(section=>['arrive','meditation','finish'].includes(section.kind))
  const hasArrival=guided.some(section=>section.kind==='arrive')
  return [
    {key:'welcome',kind:'welcome'},
    {key:'baseline',kind:'baseline'},
    {key:'checkin',kind:'checkin'},
    ...(lesson?.practiceV3?.recall?[{key:'recall',kind:'recall'}]:[]),
    {key:'idea',kind:'idea'},
    ...(!hasArrival&&(lesson?.sections||[]).some(section=>section.kind==='learn')?
      [{key:'understand',kind:'understand'}]:[]),
    ...(lesson?.workbook?.workingPosition?[{key:'phrase',kind:'phrase'}]:[]),
    ...guided.map((section,index)=>({key:'guided-'+index,kind:'guided',section})),
    {key:'ritual',kind:'ritual'},
    ...(lesson?.workbook?.microPractice?[{key:'transfer',kind:'transfer'}]:[]),
    ...(lesson?.practiceV4?[{key:'symbol',kind:'symbol'}]:[]),
    {key:'reflection',kind:'reflection'},
    {key:'moment',kind:'moment'},
    {key:'feedback',kind:'feedback'},
  ]
}

export const OPORA_EXPECTED_SLIDES=Object.freeze([
  'welcome','baseline','checkin','recall','idea','phrase',
  'guided','guided','guided','ritual','transfer','symbol',
  'reflection','moment','feedback',
])
