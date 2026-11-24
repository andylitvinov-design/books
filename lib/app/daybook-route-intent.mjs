/** Same-route Next navigation changes intent without necessarily remounting Daybook. */
export function advanceDaybookRouteIntent(previous,{autoStartVector=false,initialTab='today'}={}){
 const start=autoStartVector===true,requestedTab=['today','journal','goals','growth'].includes(initialTab)?initialTab:'today'
 if(previous&&previous.autoStartVector===start&&previous.initialTab===requestedTab)return previous
 return {autoStartVector:start,initialTab:requestedTab,tab:start?'goals':requestedTab,
  vectorStartRequest:(previous?.vectorStartRequest||0)+(start&&!previous?.autoStartVector?1:0)}
}

/** Consuming an explicit navigation must never discard an unfinished editor. */
export function vectorStartDecision({autoStartVector,request,consumed,hasSelection=false,selectionStatus='',pendingDelete=false}){
 if(!autoStartVector||!Number.isSafeInteger(request)||request<1||request<=consumed)return {consume:false,open:false,resume:false}
 const open=!pendingDelete&&(!hasSelection||selectionStatus==='saved')
 return {consume:true,open,resume:hasSelection&&!open}
}
