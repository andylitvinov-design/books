/**
 * Read BOTH currently active Video Studio storyboard collections, without
 * publishing a second catalog, changing user-approved UI or evaluating TS code.
 * v1: 24 inlined plain JSON object literals; v2: 24 catalog JSON entries.
 * Throws on source layout drift rather than silently auditing only half.
 */
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const prefix="const FREE_FILM_PRESETS:readonly FreeFilmPreset[] = [";
const suffix="  ...(extraFreeFilmPresets.presets as FreeFilmPreset[]),";

export function loadActiveFilmPresets(){
 const source=readFileSync(resolve(root,"components/mandala-free-video-studio.tsx"),"utf8");
 const start=source.indexOf(prefix);
 const end=source.indexOf(suffix,start+prefix.length);
 if(start<0||end<0||end<=start)throw Error("live_video_presets_source_layout_changed");
 const literal=source.slice(start+prefix.length,end).trim().replace(/,\s*$/,"");
 let inline;
 try{
   // Literal section contains only JSON with optional trailing commas; no
   // eval, JSX, arbitrary TS or external API calls are ever executed.
   inline=JSON.parse("["+literal.replace(/,\s*(?=[}\]])/g,"")+"]");
 }catch(error){throw Error("inline_video_presets_not_json:"+String(error));}
 const additional=JSON.parse(readFileSync(resolve(root,"data/video-catalog/free-film-presets-v2.json"),"utf8")).presets;
 if(!Array.isArray(inline)||!Array.isArray(additional)||!inline.length||!additional.length)
   throw Error("missing_active_video_preset_collection");
 const all=[...inline,...additional],ids=new Set();
 for(const p of all){
   if(!p||typeof p.id!=="string"||!Array.isArray(p.clips)||ids.has(p.id))
     throw Error("duplicate_or_invalid_active_video_preset:"+p?.id);
   ids.add(p.id);
 }
 return {presets:all,inlineCount:inline.length,additionalCount:additional.length};
}
