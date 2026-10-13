// Compare positions within their own possible ranges, not health or different constructs.
export function insightScaleOrder(dimensions=[]) {
 return dimensions.map((dimension,index)=>({dimension,index,position:
  Number.isFinite(dimension?.value)&&Number.isFinite(dimension?.min)&&Number.isFinite(dimension?.max)&&dimension.max>dimension.min&&dimension.value>=dimension.min&&dimension.value<=dimension.max
   ?(dimension.value-dimension.min)/(dimension.max-dimension.min):null}))
 .sort((a,b)=>a.position===null?(b.position===null?a.index-b.index:1):b.position===null?-1:a.position-b.position||a.index-b.index)
 .map(row=>row.dimension)
}
