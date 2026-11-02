// PostgreSQL timestamps retain six fractional digits. Date.parse is useful for
// timezone normalization, but its millisecond result cannot order messages alone.
function timestampParts(value){
  const milliseconds=Date.parse(value)
  const fraction=typeof value==='string'
    ?value.match(/\.(\d+)(?:Z|[+-]\d{2}(?::?\d{2})?)$/i)?.[1]||'':''
  return [Number.isFinite(milliseconds)?milliseconds:-Infinity,
    Number(fraction.slice(3,6).padEnd(3,'0'))]
}

export function compareConversationMessages(a,b){
  const [aMs,aMicros]=timestampParts(a.createdAt)
  const [bMs,bMicros]=timestampParts(b.createdAt)
  if(aMs!==bMs)return aMs<bMs?-1:1
  if(aMicros!==bMicros)return aMicros-bMicros
  // Canonical UUID hexadecimal order matches PostgreSQL's UUID tie-breaker.
  const aId=String(a.id).toLowerCase(),bId=String(b.id).toLowerCase()
  return aId===bId?0:aId<bId?-1:1
}

export function mergeConversationMessages(older=[],fresh=[]){
  const messages=new Map(older.map(message=>[message.id,message]))
  for(const message of fresh)messages.set(message.id,message)
  return [...messages.values()].sort(compareConversationMessages)
}

export function latestVisibleParticipantMessage(messages=[]){
  let latest=null
  for(const item of messages){
    if(item.visibility!=='participants'||item.mine)continue
    if(!latest||compareConversationMessages(latest,item)<0)latest=item
  }
  return latest
}

export function mergeConversationPage(previous,fresh,{olderPage=false}={}){
  const previousMessages=previous?.messages||[]
  const freshMessages=fresh.messages||[]
  const knownIds=new Set(previousMessages.map(message=>message.id))
  const overlaps=freshMessages.some(message=>knownIds.has(message.id))
  // A latest page with no overlap may leave a gap of more than one page.
  // Restart at its cursor so those messages remain reachable via Earlier messages.
  if(!previous||(!olderPage&&!overlaps)){
    return {...fresh,messages:mergeConversationMessages([],freshMessages)}
  }
  return {...fresh,
    messages:mergeConversationMessages(previousMessages,freshMessages),
    nextCursor:olderPage?fresh.nextCursor:previous.nextCursor,
  }
}

// Each mounted account/request owns a scope. A refresh supersedes its older
// pending read; an account switch/unmount closes the scope permanently.
export function createConversationReadScope(){
  let active=true,current=null
  return {
    begin(){
      if(!active)return null
      current?.abort()
      current=new AbortController()
      return current
    },
    accepts(read){return Boolean(active&&read&&current===read&&!read.signal.aborted)},
    close(){active=false;current?.abort()},
  }
}
