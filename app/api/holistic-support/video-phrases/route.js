/**
 * Public read-only phrase dictionary. One scenario/locale request loads all
 * 192 prepared phrases, so every tone/voice/length switch is client-local.
 * No user text, service-role key, paid AI provider or session is involved.
 */
import {NextResponse} from "next/server";
import {
  VIDEO_PHRASE_CATALOG_VERSION,VIDEO_PHRASE_TONES,VIDEO_PHRASE_SPEAKERS,
  VIDEO_PHRASE_LENGTHS,listVideoPhraseIdeas,listPreparedVideoPhrases,
  formatVideoPhraseForOverlay,
} from "@/lib/mandala/video-phrase-catalog.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=10;
const headers={
  "Cache-Control":"public,max-age=60,s-maxage=300,stale-while-revalidate=600",
  "X-Content-Type-Options":"nosniff",
};
const allowedLocales=new Set(["ru","en","es"]);
function staticRows(scenarioId,locale){
  return listVideoPhraseIdeas(scenarioId,locale).flatMap(idea=>
    VIDEO_PHRASE_TONES.flatMap(tone=>
      VIDEO_PHRASE_SPEAKERS.flatMap(speaker=>
        VIDEO_PHRASE_LENGTHS.flatMap(length=>
          listPreparedVideoPhrases({scenarioId,ideaId:idea.id,locale,tone,speaker,length})
        )
      )
    )
  );
}
function asResponse(rows,source){
  return NextResponse.json({
    catalogVersion:VIDEO_PHRASE_CATALOG_VERSION,
    source,items:rows,
  },{headers});
}
function verifiedRemoteRows(value,localRows){
  if(!Array.isArray(value)||value.length!==localRows.length)return null;
  const original=new Map(localRows.map(row=>[row.id,row]));
  const unique=new Set(),normalized=[];
  for(const item of value){
    const local=original.get(item?.id);
    if(!local||unique.has(item.id)||typeof item.phrase_text!=="string"||
      item.phrase_text.length>180||/[<>]/.test(item.phrase_text)||
      !formatVideoPhraseForOverlay(item.phrase_text))return null;
    unique.add(item.id);
    normalized.push({...local,text:item.phrase_text});
  }
  return normalized.sort((a,b)=>a.id.localeCompare(b.id));
}
export async function GET(request){
  const params=new URL(request.url).searchParams;
  const scenarioId=params.get("scenarioId")||"";
  const locale=params.get("locale")||"";
  if(!allowedLocales.has(locale)||!/^[a-z0-9-]{4,80}$/.test(scenarioId)||
    !listVideoPhraseIdeas(scenarioId,locale).length){
    return NextResponse.json({error:"INVALID_VIDEO_PHRASE_SELECTION"},
      {status:400,headers:{"Cache-Control":"no-store"}});
  }
  const localRows=staticRows(scenarioId,locale);
  const url=process.env.HH_APP_SUPABASE_URL;
  const key=process.env.HH_APP_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return asResponse(localRows,"bundled");
  try{
    const endpoint=new URL("/rest/v1/hh_video_phrase_catalog_v1",url);
    endpoint.searchParams.set("select","id,phrase_text");
    endpoint.searchParams.set("scenario_id","eq."+scenarioId);
    endpoint.searchParams.set("locale","eq."+locale);
    endpoint.searchParams.set("limit","192");
    const res=await fetch(endpoint,{
      headers:{apikey:key,Accept:"application/json"},
      next:{revalidate:300},
      signal:AbortSignal.timeout(3500),
    });
    if(res.ok){
      const records=verifiedRemoteRows(await res.json(),localRows);
      if(records)return asResponse(records,"database");
    }
  }catch{
    // Offline or project-unavailable: the same approved strings stay usable.
  }
  return asResponse(localRows,"bundled");
}
