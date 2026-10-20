/**
 * Small, safe text formatter shared by the private editor preview and the
 * published article reader. No HTML rendering, regex HTML substitutions,
 * remote image injection or general-purpose Markdown interpretation.
 */
/** @typedef {{type:'h2'|'h3'|'p',text:string}|{type:'ul'|'ol',items:string[]}} ArticleBlock */
/** @returns {ArticleBlock[]} */
export function articleBlocks(input=''){
 const lines=String(input||'').replace(/\r\n?/g,'\n').split('\n')
 /** @type {ArticleBlock[]} */
 const output=[]
 let kind='',bucket=[]
 const flush=()=>{
  if(!bucket.length)return
  if(kind==='ul'||kind==='ol')output.push({type:kind,items:bucket.slice()})
  else output.push({type:'p',text:bucket.join('\n').trim()})
  bucket=[];kind=''
 }
 for(const original of lines){
  const line=original.trim()
  if(!line){flush();continue}
  const heading=line.match(/^(#{2,3})\s+(.+)$/)
  if(heading){
   flush()
   output.push({type:heading[1].length===2?'h2':'h3',text:heading[2]})
   continue
  }
  const bullet=line.match(/^[-*]\s+(.+)$/)
  if(bullet){if(kind!=='ul')flush();kind='ul';bucket.push(bullet[1]);continue}
  const ordered=line.match(/^\d{1,3}[.)]\s+(.+)$/)
  if(ordered){if(kind!=='ol')flush();kind='ol';bucket.push(ordered[1]);continue}
  if(kind!=='p')flush()
  kind='p';bucket.push(original.trimEnd())
 }
 flush()
 return output
}

export function inlineArticleSegments(value=''){
 return String(value||'')
  .split(/(\*\*[^*\n]+\*\*)/g)
  .filter(Boolean)
  .map(chunk=>chunk.startsWith('**')&&chunk.endsWith('**')
   ?{text:chunk.slice(2,-2),strong:true}
   :{text:chunk,strong:false})
}
