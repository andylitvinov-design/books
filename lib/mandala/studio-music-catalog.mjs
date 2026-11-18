/** Safe, user-facing classification of actual uploaded music recordings. */
export const PUBLIC_MUSIC_TAG_LABELS=Object.freeze({
 piano:["Фортепиано","Piano","Piano"],
 cello:["Виолончель","Cello","Violonchelo"],
 "string-quartet":["Струнные","Strings","Cuerdas"],
 orchestral:["Оркестр","Orchestral","Orquesta"],
 relaxation:["Расслабление","Relaxation","Relajación"],
 restorative:["Восстановление","Restorative","Restaurador"],
 romantic:["Романтика","Romantic","Romántico"],
 concentration:["Концентрация","Focus","Concentración"],
 uplifting:["Воодушевление","Uplifting","Inspirador"],
 meditative:["Медитация","Meditation","Meditación"],
 calm:["Спокойствие","Calm","Calma"],
 instrumental:["Без вокала","Instrumental","Instrumental"],
});
export function safeStudioMusicTags(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(x=>typeof x==="string"&&/^[a-z0-9][a-z0-9-]{1,36}$/.test(x)))].slice(0,32);
}
export function studioMusicFilter(items,{category="all",tag="all",query=""}={}){
 const needle=String(query||"").trim().toLocaleLowerCase().slice(0,100);
 return (Array.isArray(items)?items:[]).filter(item=>{
  if(!item||typeof item.title!=="string")return false;
  if(category!=="all"&&item.category!==category)return false;
  const tags=safeStudioMusicTags(item.tags);
  if(tag!=="all"&&!tags.includes(tag))return false;
  if(!needle)return true;
  return [item.title,item.composer,item.performer,item.mood,item.category,...tags]
   .filter(x=>typeof x==="string").some(x=>x.toLocaleLowerCase().includes(needle));
 });
}
export const musicTagLabel=(tag,locale="en")=>{
 const languages={ru:0,en:1,es:2};
 return PUBLIC_MUSIC_TAG_LABELS[tag]?.[languages[locale]??1]||tag;
};

/** Actual recordings placed before the legacy generated picks on the Audio tab.
 * Not an acoustic/editorial approval: pre-reviewed source-verified files only,
 * and published tracks that passed the separate human listening gate.
 */
export function studioMusicFeaturedTracks(items,category="all",limit=5){
 const max=Number.isSafeInteger(limit)?Math.min(8,Math.max(0,limit)):5;
 const eligible=(Array.isArray(items)?items:[]).filter(row=>
   row&&typeof row.id==="string"&&/^[a-f0-9-]{36}$/i.test(row.id)&&
   typeof row.title==="string"&&row.title.length>0&&
   row.mime==="audio/mpeg"&&Number.isSafeInteger(row.bytes)&&
   row.bytes>0&&row.bytes<=15*1024*1024&&
   (row.status==="ready"&&row.reviewStage==="technical_preview"&&row.sourceVerified===true||
    row.status==="published"&&row.rightsConfirmed===true&&row.qualityScore>=4));
 const score=row=>/Nocturne|Notturno|Largo|Adagio|Prelude|Aria/i.test(row.title)?2:
   /Andante|Romanza|Variation/i.test(row.title)?1:0;
 const order=(a,b)=>score(b)-score(a)||String(a.title).localeCompare(String(b.title));
 if(category!=="all")return eligible.filter(x=>x.category===category).sort(order).slice(0,max);
 const result=[],seen=new Set();
 for(const cat of ["calm","love","wellbeing","focus","energy"]){
   const first=eligible.filter(x=>x.category===cat).sort(order)[0];
   if(first&&!seen.has(first.id)){result.push(first);seen.add(first.id);}
   if(result.length>=max)return result;
 }
 for(const item of [...eligible].sort(order))if(!seen.has(item.id)){
   result.push(item);seen.add(item.id);if(result.length>=max)break;
 }
 return result;
}
export function studioMusicAttachmentName(row){
 const ext=row?.mime==="audio/mp4"?"m4a":row?.mime==="audio/wav"?"wav":"mp3";
 return String(row?.title||"Recording").slice(0,90).replace(/[/\\]/g,"-")+"."+ext;
}
