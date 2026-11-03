export function syntheticTraumaContext(definition) {
 if(definition.key==='pcl-5')return {event_timing:'Synthetic one year',criterion_a:'No',exposure_modes:'["Other, please describe"]',death_type:'Natural causes',adult_confirmed:'Yes',event_anchored:'Yes'}
 if(definition.key==='itq-adult')return {event_timing:'1 to 5 years ago',adult_confirmed:'Yes',event_anchored:'Yes'}
 return {}
}
