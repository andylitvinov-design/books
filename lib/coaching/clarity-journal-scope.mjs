// Course scope is a server-validated identity, not a user-editable label.
// Historical unscoped entries remain readable, editable and deletable.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const fail=()=>{throw Error('CLARITY_JOURNAL_SCOPE_INVALID')}
export function clarityJournalIdentity(entry){
 if(!entry||!Array.isArray(entry.tags))fail()
 const tags=entry.tags
 const scopes=tags.filter(t=>typeof t==='string'&&t.startsWith('cr:'))
 const homework=tags.filter(t=>typeof t==='string'&&t.startsWith('hw:'))
 const fields=tags.filter(t=>typeof t==='string'&&t.startsWith('hw-field:'))
 if(!scopes.length){
  // Legacy homework can be edited, except when it refers to a new bound
  // protocol (the server repository checks that exact UUID).
  const reportId=homework.length===1&&uuid.test(homework[0].slice(3))?homework[0].slice(3):null
  return {courseRunId:null,reportId,kind:null,day:null,key:null}
 }
 if(scopes.length!==1||!uuid.test(scopes[0].slice(3))||entry.kind!=='note'||entry.goalId!==null)fail()
 const courseRunId=scopes[0].slice(3)
 const game=tags.filter(t=>typeof t==='string'&&t.startsWith('clarity-game-v1-'))
 const reflection=tags.filter(t=>typeof t==='string'&&t.startsWith('clarity-v2-day-'))
 if(game.length+reflection.length+homework.length!==1)fail()
 if(game.length||reflection.length){
  if(fields.length)fail()
  const match=game.length?/^clarity-game-v1-([123])-([123])$/.exec(game[0]):/^clarity-v2-day-([123])$/.exec(reflection[0])
  if(!match)fail()
  return {courseRunId,reportId:null,kind:game.length?'game':'reflection',day:Number(match[1]),key:game[0]||reflection[0]}
 }
 if(fields.length!==1||!uuid.test(homework[0].slice(3))||!/^hw-field:[a-zA-Z0-9_-]{1,31}$/.test(fields[0]))fail()
 return {courseRunId,reportId:homework[0].slice(3),kind:'homework',day:null,key:homework[0]+'|'+fields[0]}
}
export function assertClarityJournalIdentityUnchanged(previous,next){
 const a=clarityJournalIdentity(previous),b=clarityJournalIdentity(next)
 // Existing scoped entries cannot be relinked or converted into generic
 // notes; generic entries cannot be attached to a new run by editing tags.
 if((a.courseRunId||b.courseRunId)&&(a.courseRunId!==b.courseRunId||a.kind!==b.kind||a.key!==b.key||a.day!==b.day||a.reportId!==b.reportId))fail()
 return b
}
export function assertClarityJournalBinding(identity,binding){
 if(identity.reportId){
  // A bound protocol cannot appear as legacy homework, nor be attached
  // to another run. New scoped homework needs the exact owned binding.
  if(binding&&(binding.courseRunId!==identity.courseRunId||![1,2,3].includes(binding.day)))fail()
  if(identity.courseRunId&&!binding)fail()
 }
 return identity
}
