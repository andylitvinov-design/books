const tracks=['inner','outer']
const ratingKey=r=>JSON.stringify([r.current,r.desired,r.source,r.recordedAt])
export function vectorFingerprint(vectors){
 if(!vectors)return null
 return JSON.stringify([vectors.version,...tracks.map(track=>[
  vectors[track].focusId,Object.entries(vectors[track].ratings).sort(([a],[b])=>a.localeCompare(b)).map(([id,r])=>[id,ratingKey(r)])
 ])])
}
export function vectorHistoryRows(snapshots,track,id){
 if(!tracks.includes(track))return []
 const seen=new Set(),rows=[]
 for(const snapshot of [...snapshots].sort((a,b)=>a.revision-b.revision)){
  const r=snapshot.vectors?.[track]?.ratings?.[id]
  if(!r||!Number.isFinite(Date.parse(r.recordedAt)))continue
  const key=ratingKey(r)
  if(seen.has(key))continue
  seen.add(key)
  rows.push({...r,revision:snapshot.revision,savedAt:snapshot.savedAt})
 }
 return rows.sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt)||a.revision-b.revision)
}
export function vectorHistoryRange(rows,from='',to=''){
 const start=from?Date.parse(from+'T00:00:00'): -Infinity
 const end=to?Date.parse(to+'T23:59:59.999'):Infinity
 if(Number.isNaN(start)||Number.isNaN(end)||start>end)return []
 return rows.filter(r=>Date.parse(r.recordedAt)>=start&&Date.parse(r.recordedAt)<=end)
}
