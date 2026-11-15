/**
 * Global match of approved camera sources to an ordered narrative.
 * Candidate rights, aspect, duration and subject restrictions are prefiltered.
 * Distinct groups mean no reused master; a missing scene returns null.
 */
export function assignNarrativeShotSources(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 12 ||
      rows.some(row=>!Array.isArray(row)||!row.length))return null;
  const choices=rows.map(row=>{
    const byGroup=new Map();
    for(const item of row){
      if(typeof item?.groupKey!=="string"||!item.groupKey||
         !Number.isFinite(item.score)||!item.source)continue;
      const old=byGroup.get(item.groupKey);
      if(!old||item.score>old.score||
         item.score===old.score&&item.source.id<old.source.id)
        byGroup.set(item.groupKey,item);
    }
    return byGroup;
  });
  if(choices.some(row=>!row.size))return null;
  const groups=[...new Set(choices.flatMap(row=>[...row.keys()]))].sort();
  const n=rows.length,m=groups.length;
  if(m<n)return null;
  // Minimum cost complete bipartite assignment, not greedy per-scene ranking.
  const forbidden=1e12;
  const costs=choices.map(row=>groups.map((key,index)=>{
    const item=row.get(key);
    return item?-Math.round(item.score*100)+index/(m+1):forbidden;
  }));
  const u=Array(n+1).fill(0),v=Array(m+1).fill(0);
  const p=Array(m+1).fill(0),way=Array(m+1).fill(0);
  for(let i=1;i<=n;i++){
    p[0]=i;
    let j0=0;
    const best=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
    do{
      used[j0]=true;
      const row=p[j0];
      let delta=Infinity,next=0;
      for(let j=1;j<=m;j++){
        if(used[j])continue;
        const cost=costs[row-1][j-1]-u[row]-v[j];
        if(cost<best[j]){best[j]=cost;way[j]=j0}
        if(best[j]<delta){delta=best[j];next=j}
      }
      if(!Number.isFinite(delta))return null;
      for(let j=0;j<=m;j++){
        if(used[j]){u[p[j]]+=delta;v[j]-=delta}
        else best[j]-=delta;
      }
      j0=next;
    }while(p[j0]!==0);
    do{
      const prev=way[j0];p[j0]=p[prev];j0=prev;
    }while(j0!==0);
  }
  const selected=Array(n).fill(null);
  for(let j=1;j<=m;j++)if(p[j])
    selected[p[j]-1]=choices[p[j]-1].get(groups[j-1])||null;
  return selected.every(Boolean)?selected:null;
}
