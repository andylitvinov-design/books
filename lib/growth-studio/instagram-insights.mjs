export const GROWTH_INSTAGRAM_INSIGHT_METRICS=Object.freeze([
  'views','reach','accounts_engaged','total_interactions','likes','comments',
  'shares','saves','profile_links_taps','follows_and_unfollows',
])
const allowed=new Set(GROWTH_INSTAGRAM_INSIGHT_METRICS)

export function isValidInstagramInsightDate(value){
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
    Number.isFinite(Date.parse(value+'T00:00:00.000Z'))&&
    new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)===value
}

export function isValidInstagramInsightRange(since,until){
  if(!isValidInstagramInsightDate(since)||!isValidInstagramInsightDate(until)||since>until)return false
  const span=Date.parse(until+'T00:00:00.000Z')-Date.parse(since+'T00:00:00.000Z')
  return Number.isFinite(span)&&span<=90*86_400_000
}


export function instagramInsightUnixRange(since,until){
  if(!isValidInstagramInsightRange(since,until))throw new RangeError('invalid_insights_range')
  return {
    since:Math.floor(Date.parse(since+'T00:00:00.000Z')/1000),
    until:Math.floor(Date.parse(until+'T23:59:59.000Z')/1000),
  }
}

function numericValue(value){
  return typeof value==='number'&&Number.isFinite(value)?value:null
}
export function normalizeInstagramInsightMetrics(response){
  const result={}
  for(const item of Array.isArray(response?.data)?response.data:[]){
    if(!allowed.has(item?.name))continue
    const total=numericValue(item?.total_value?.value)
    if(total!==null){result[item.name]=total;continue}
    if(Array.isArray(item?.values)){
      const values=item.values.map(x=>numericValue(x?.value)).filter(x=>x!==null)
      result[item.name]=values.length?values.reduce((sum,value)=>sum+value,0):null
    }else result[item.name]=null
  }
  return result
}
