/**
 * Metadata-only owner view of existing video locations.
 * Reuse published studio manifests rather than creating a second render catalogue.
 * Drive/HeyGen are stable references, NOT evidence of playback, rights or YouTube delivery.
 * This file contains no signed URLs, client videos, credentials or provider requests.
 */
import filmedManifest from "../../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import motionManifest from "../../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {isApprovedMontageScene} from "../mandala/video-montage-sources.mjs";
import {physicalSceneAspect} from "../mandala/video-source-tag-facets.mjs";
import {ENGLISH_YOUTUBE_MASTERS} from "../youtube/english-master-catalog.mjs";

export const VIDEO_SOURCE_INDEX_REVISION="2026-11-21";
export const VIDEO_SOURCE_FOLDERS=Object.freeze({
  masters:"https://drive.google.com/drive/folders/1MWogfCSLyrJIh7nsiD1166XYkWrwPKqC",
  scenes:"https://drive.google.com/drive/folders/1XdRnSvtMTN1sI7So5R5zSN58rfVjIz-a",
  studio:"https://drive.google.com/drive/folders/1U4hG6D89GUm4WhP8DQzz2roREbkrMpYr",
  coachMotion:"https://github.com/andylitvinov-design/books/tree/codex/public-book-library/public/images/holistic-house/my-coach-motion",
  vaultReview:"https://docs.google.com/spreadsheets/d/1oVuZJ_o7TGyiG68tVow8DdLkrOL9vA5xO1wrHTsK0QM/edit",
});
/** These nine MP4 IDs were listed in the existing Drive master folder on 2026-11-21.
 * A folder listing alone does not attest to bitstream QA or publication.
 */
const DRIVE_MASTERS=Object.freeze([
  ["home-ru","2026-10-01_holistic-house_home_ru_avatarV_16x9_v01.mp4","1NTKQtYMMjs4KZB4zPzXoCKEOK3CyWagc"],
  ["home-en","2026-10-01_holistic-house_home_en_avatarV_16x9_v02.mp4","1yMXi-sT3acnvpe5vnErLebN8kvyI7Uq_"],
  ["services-ru","2026-10-01_holistic-house_services_ru_avatarV_16x9_v01.mp4","13nHZDib2mYI2QsQdx8rGb32l0drG3Bew"],
  ["services-en","2026-10-01_holistic-house_services_en_avatarV_16x9_v02.mp4","14NH72zJuXXOQCFbiykAo8wW1oayYvydV"],
  ["homeopathy-ru","2026-10-01_holistic-house_homeopathy_ru_avatarV_16x9_v01.mp4","1MKaFg_oXf_OBGYh8BxEsYBrjLyCiUVwl"],
  ["homeopathy-en","2026-10-01_holistic-house_homeopathy_en_avatarV_16x9_v02.mp4","1XMPLm8q-o4tNY6ZbS5SE5GEa01tl2n3g"],
  ["psychic-ru","2026-09-30_holistic-house_psychic-alchemy_ru_avatarV_16x9_v01.mp4","1tIxupc1YD8MYEMI9LqEhejkvGSKonpfK"],
  ["psychic-en","2026-09-29_holistic-house_psychic-alchemy_en_avatarV_16x9_v03.mp4","1emF7Peqk8SFz0UVj3hm_k2RwUOa5xpi4"],
  ["psychic-es","2026-10-01_holistic-house_psychic-alchemy_es_avatarV_16x9_v01.mp4","1jOKgCvkaHsz8eJHY1VCH4DgH0cwK5-7U"],
]);
const videoUrl=id=>"https://drive.google.com/file/d/"+id+"/view";
const heygenUrl=id=>"https://app.heygen.com/videos/"+id;

export function buildUnifiedVideoInventory(){
  const scenes=[...(filmedManifest.scenes||[]),...(motionManifest.scenes||[])].filter(isApprovedMontageScene);
  const paths=new Set(),ids=new Set();
  const localScenes=scenes.map(scene=>{
    if(paths.has(scene.video)||ids.has(scene.id))throw Error("VIDEO_INVENTORY_DUPLICATE_LOCAL_SOURCE");
    paths.add(scene.video);ids.add(scene.id);
    return {
      id:scene.id,theme:scene.theme,collection:scene.collection,
      label:scene.label,poster:scene.poster||null,video:scene.video,
      // Existing original motion files record native width/height but omit allowedAspects.
      // Do not infer an unavailable crop or transcode from the physical ratio.
      allowedAspects:scene.allowedAspects||
        (physicalSceneAspect(scene)?[physicalSceneAspect(scene)]:[]),
      media:scene.media,
      tags:Array.isArray(scene.tags)?scene.tags:[],
      // Catalog approval is not fresh byte/readback QA for this request.
      catalogStatus:"approved_manifest_not_rechecked",
    };
  });
  const drive=DRIVE_MASTERS.map(([id,title,fileId])=>({
    id:"drive:"+id,title,url:videoUrl(fileId),provider:"Google Drive",
    state:"file_listed_master_not_playback_qa",kind:"archived_master",
    usableInGenerator:false,
  }));
  const heygen=ENGLISH_YOUTUBE_MASTERS.map(item=>({
    id:"heygen:"+item.videoId,title:item.title,url:heygenUrl(item.videoId),
    provider:"HeyGen",state:"finished_source_youtube_receipt_not_verified",
    kind:"provider_master",usableInGenerator:false,
  }));
  const externalMasters=[...drive,...heygen];
  if(new Set(externalMasters.map(item=>item.id)).size!==externalMasters.length)
    throw Error("VIDEO_INVENTORY_DUPLICATE_PROVIDER_REFERENCE");
  return {
    revision:VIDEO_SOURCE_INDEX_REVISION,
    localScenes,externalMasters,
    counts:{
      localCompositions:localScenes.filter(x=>x.media==="licensed_mp4").length,
      localProcedural:localScenes.filter(x=>x.media==="original_motion_mp4").length,
      driveListedMasters:drive.length,heygenApprovedEnglishMasters:heygen.length,
      separateCoachMotionFilesObserved:24,
    },
    // Other protected areas intentionally stay separate: owner-video-library is
    // private uploads only; storage drafts and client assets MUST NOT be indexed here.
    explicitlyExcluded:["hh-client-private-media","hh-owner-video-drafts/telegram-slides",
      "unapproved-video-vault","research-only-external-source-pages",
      "public/images/holistic-house/my-coach-motion"],
    sourceOfTruth:"site manifest + stable existing provider IDs; not a new storage backend",
  };
}
