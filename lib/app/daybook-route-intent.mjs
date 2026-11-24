/** Same-route Next navigation changes intent without necessarily remounting Daybook. */
export function advanceDaybookRouteIntent(previous,{autoStartVector=false,initialTab='stages'}={}){
 const start=autoStartVector===true,requestedTab=['stages','today','journal','goals','growth'].includes(initialTab)?initialTab:'stages'
 if(previous&&previous.autoStartVector===start&&previous.initialTab===requestedTab)return previous
 return {autoStartVector:start,initialTab:requestedTab,tab:start?'goals':requestedTab,
  vectorStartRequest:(previous?.vectorStartRequest||0)+(start&&!previous?.autoStartVector?1:0)}
}

/** Navigation carries only opaque goal IDs and positions, never private answers. */
export function daybookRouteOptions(query={}){
 const value=query||{}
 const number=(input,max,fallback=1)=>typeof input==='string'&&new RegExp('^[1-'+max+']$').test(input)?Number(input):fallback
 return {
  autoStartVector:value.start==='vector',
  initialTab:['stages','today','journal','goals','growth'].includes(value.tab)?value.tab:'stages',
  initialStage:number(value.stage,8),initialLevel:number(value.level,4),initialStep:number(value.step,7),
  initialGoalId:typeof value.goal==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.goal)?value.goal:null,
 }
}

/** Consuming an explicit navigation must never discard an unfinished editor. */
export function vectorStartDecision({autoStartVector,request,consumed,hasSelection=false,selectionStatus='',pendingDelete=false}){
 if(!autoStartVector||!Number.isSafeInteger(request)||request<1||request<=consumed)return {consume:false,open:false,resume:false}
 const open=!pendingDelete&&(!hasSelection||selectionStatus==='saved')
 return {consume:true,open,resume:hasSelection&&!open}
}
