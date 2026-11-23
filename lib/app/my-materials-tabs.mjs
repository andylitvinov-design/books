// Pure query-state contract: views over private media, never duplicated assets.
export const MATERIAL_TAB_IDS=Object.freeze(['avatars','videos','photos']);
export function selectedMaterialTab(search=''){
  const value=new URLSearchParams(search).get('tab');
  return MATERIAL_TAB_IDS.includes(value)?value:'videos';
}
export function materialTabSearch(search='',id){
  if(!MATERIAL_TAB_IDS.includes(id))throw new Error('INVALID_MATERIAL_TAB');
  const params=new URLSearchParams(search);
  if(id==='videos')params.delete('tab');
  else params.set('tab',id);
  const next=params.toString();
  return next?'?'+next:'';
}
