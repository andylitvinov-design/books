/**
 * Read-only site video SLOT matrix. Built-in public records are fallback
 * metadata, not a verified provider playback test or a live KV snapshot.
 * The separate YouTube meditation and MyTube indexes remain independent.
 */
import {builtInSiteVideoRecords} from "../site-videos/defaults.js";
import {SITE_VIDEO_SLOTS,videoPagePath} from "../site-videos/model.js";
const LOCALES=["en","ru","es"];
const ID_YT=/^[A-Za-z0-9_-]{11}$/;
const ID_HEYGEN=/^[a-f0-9]{32}$/;
const key=(slot,locale,entityId="")=>slot+":"+locale+(entityId?":"+entityId:"");
const idsafe=r=>Boolean(r?.published?.status==="published"&&
  (ID_YT.test(r.published.youtubeId||"")||ID_HEYGEN.test(r.published.heygenId||"")));
export function auditSiteVideoSlotCoverage({records=builtInSiteVideoRecords()}={}){
  if(!Array.isArray(records))throw Error("INVALID_SITE_VIDEO_SLOT_RECORDS");
  const map=new Map();
  for(const r of records){
    if(!r||!SITE_VIDEO_SLOTS.some(x=>x.id===r.slot)||
      !LOCALES.includes(r.locale)||r.entityId||map.has(key(r.slot,r.locale)))continue;
    // Never elevate a draft, unsupported URL or unverifiable provider ID.
    map.set(key(r.slot,r.locale),r);
  }
  const rows=[];
  for(const slot of SITE_VIDEO_SLOTS)for(const locale of LOCALES){
    if(locale==="es"&&!["about-intro","thank-you"].includes(slot.id))continue;
    const dynamic=Boolean(slot.entityType);
    const published=map.get(key(slot.id,locale));
    let path=null;
    if(!dynamic)path=videoPagePath(slot.id,locale);
    const sourcePresent=!dynamic&&idsafe(published);
    const provider=sourcePresent?
      ID_YT.test(published.published.youtubeId||"")?"youtube":"heygen":null;
    rows.push({slotId:slot.id,locale,path,
      pageMode:dynamic?"entity_dynamic":"fixed",
      metadataPublishedSource:sourcePresent,provider,
      sourceStatus:dynamic?"dynamic_entity_requires_per_page_audit":
        sourcePresent?"built_in_public_reference_playback_unverified":
          "no_built_in_source_live_owner_store_not_checked",
      livePlaybackVerified:false,ownerStoreChecked:false,
      editorReviewedForCurrentPage:false});
  }
  return {
    schemaVersion:"hh-site-video-slots-offline-v1",
    summary:{
      configuredSlots:SITE_VIDEO_SLOTS.length,
      localePlacements:rows.length,
      builtInPublicSourcePlacements:rows.filter(r=>r.metadataPublishedSource).length,
      nonBuiltInOrDynamicPlacements:rows.filter(r=>!r.metadataPublishedSource).length,
      actualLiveVerifiedPlacements:0,
      liveStoreRead:false,
      actualProviderPlaybackRead:false,
    },
    rows,
  };
}
