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
