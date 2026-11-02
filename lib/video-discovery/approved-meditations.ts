import "server-only";
import {unstable_cache} from "next/cache";
import {getAppConfig} from "@/lib/app/config";
import {transaction} from "@/lib/app/database.js";
import {projectApprovedMeditationRows} from "@/lib/video-discovery/catalog.mjs";
import type {LibraryFeedItem} from "@/components/library-feed";

// Database and projector independently gate publication. No private
// client-delivery recordings, assessments, tests, or account data are queried.
const APPROVED_QUERY=[
  "select youtube_id,title,creator,source_kind,source_url,source_evidence_url,",
  "audio_language,content_type,goals,editorial_status,embed_status,",
  "rights_status,content_checked_at,embed_checked_at,metadata_checked_at,claims_risk",
  "from public.hh_meditation_catalog_v1",
  "where editorial_status='approved' and embed_status='confirmed'",
  "and rights_status='embed_approved' and content_checked_at is not null",
  "and embed_checked_at is not null and metadata_checked_at is not null",
  "order by content_checked_at desc, youtube_id limit 150",
].join(" ");

// Cache only audited, public-only content. On DB outage, fail closed.
const cachedReviewed=unstable_cache(async()=>{
  try{
    const config=getAppConfig();
    const rows=await transaction(config,null,async db=>
      (await db.query(APPROVED_QUERY)).rows,{server:true});
    return projectApprovedMeditationRows(rows);
  }catch(error){
    console.warn("[video-discovery] Reviewed catalog unavailable; hiding unverified items.",
      error instanceof Error ? error.name : "unknown");
    return [];
  }
},["hh-public-video-discovery-reviewed-v1"],{revalidate:300});

export async function loadApprovedVideoDiscoveries():Promise<LibraryFeedItem[]>{
  return await cachedReviewed() as LibraryFeedItem[];
}
