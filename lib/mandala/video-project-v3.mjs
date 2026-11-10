/**
 * Holistic House VideoProjectV3 — strict browser-local advanced NLE model.
 * Release phase P0-B: a verified project contract & deterministic composition
 * clock, NOT an enabled advanced player or a second renderer.
 *
 * Inputs never contain URLs, client media bytes, provider prompts or tokens.
 * Approved catalogue paths / local file lifetimes come only from a separate
 * trusted runtime registry. No new payments, network, storage or model calls.
 */
import {videoRenderFingerprint} from "./render-plan-v2.mjs";

export const VIDEO_PROJECT_V3_SCHEMA=3;
export const VIDEO_PROJECT_V3_LIMITS=Object.freeze({
  durationMs:60000,assets:32,videoLayers:8,videoClips:24,
  audioLayers:4,textCues:100,simultaneousDecoders:2,
});
const ASPECTS=new Set(["portrait","landscape","square"]);
const LOCALES=new Set(["ru","en","es"]);
const WORKSPACES=new Set(["video","phrases","editor"]);
const RIGHTS=new Set(["existing_approved_first_party_master","project_generated_original",
  "dareful_cc_by_4_0","user_confirmed"]);
const SPEEDS=new Set([.5,.75,1,1.25,1.5,2]);
const TRANSITIONS=new Set(["cut","crossfade"]);
const MASKS=new Set(["none","circle","rounded"]);
const KINDS=new Set(["video","audio"]);
const AUDIO_KINDS=new Set(["voice","music","ambience","sfx"]);
const TEXT_STYLES=new Set(["classic","cinema","minimal","glow"]);
const ID=/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const isId=v=>typeof v==="string"&&v.length<=96&&ID.test(v);
const isPlain=v=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&
  Object.getPrototypeOf(v)===Object.prototype;
const only=(o,keys)=>isPlain(o)&&Object.keys(o).every(k=>keys.includes(k));
const ints=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const fail=reason=>{throw Error("mytube_v3_"+reason)};
const deepFreeze=value=>{
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const named=(rows,max)=>{
  if(!Array.isArray(rows)||rows.length>max)fail("limit");
  const seen=new Set();
  rows.forEach(row=>{
    if(!isId(row?.id)||seen.has(row.id))fail("duplicate_id");
    seen.add(row.id);
  });
};
const validTransform=x=>only(x,["scale","x","y","rotation"])&&
  Number.isFinite(x.scale)&&x.scale>=.5&&x.scale<=2&&
  Number.isFinite(x.x)&&Math.abs(x.x)<=1&&
  Number.isFinite(x.y)&&Math.abs(x.y)<=1&&
  Number.isFinite(x.rotation)&&Math.abs(x.rotation)<=15;
const emptyApproval=()=>({revision:null,planHash:null});
const emptyExport=()=>({state:"idle",planHash:null,artifact:null});

export function createVideoProjectV3({projectId,locale="ru",durationMs=30000,
  aspect="portrait",fps=24,goalText=""}={}){
  return validateVideoProjectV3({
    schemaVersion:3,projectId,revision:0,locale,aspect,durationMs,fps,
    activeWorkspace:"video",goalText,approvedPhrases:[],
    assets:[],videoTracks:[],audioTracks:[],textTracks:[],
    renderApproval:emptyApproval(),export:emptyExport(),
    privacy:{localOnly:true,externalAiConsent:false},
  });
}

/** Validate & clone every field so an imported JSON cannot supply prototypes or URLs. */
export function validateVideoProjectV3(input){
  if(!only(input,["schemaVersion","projectId","revision","locale","aspect",
    "durationMs","fps","activeWorkspace","goalText","approvedPhrases",
    "assets","videoTracks","audioTracks","textTracks","renderApproval","export","privacy"])||
    input.schemaVersion!==VIDEO_PROJECT_V3_SCHEMA||!isId(input.projectId)||
    !ints(input.revision,0,2147483647)||!LOCALES.has(input.locale)||
    !ASPECTS.has(input.aspect)||!ints(input.durationMs,3000,VIDEO_PROJECT_V3_LIMITS.durationMs)||
    ![12,15,20,24,25].includes(input.fps)||!WORKSPACES.has(input.activeWorkspace)||
    typeof input.goalText!=="string"||input.goalText.length>800||
    !Array.isArray(input.approvedPhrases)||input.approvedPhrases.length>8||
    input.approvedPhrases.some(s=>typeof s!=="string"||s.length<2||s.length>220)||
    !only(input.privacy,["localOnly","externalAiConsent"])||
    input.privacy.localOnly!==true||input.privacy.externalAiConsent!==false)
    fail("metadata");
  named(input.assets,VIDEO_PROJECT_V3_LIMITS.assets);
  const assets=input.assets.map(asset=>{
    if(!only(asset,["id","kind","origin","durationMs","width","height"])||
      !KINDS.has(asset.kind)||!["catalog","local"].includes(asset.origin)||
      !ints(asset.durationMs,500,180000)||
      !ints(asset.width,0,3840)||!ints(asset.height,0,3840)||
      (asset.kind==="video"&&(asset.width<160||asset.height<160))||
      (asset.kind==="audio"&&(asset.width!==0||asset.height!==0)))
      fail("asset");
    return {...asset};
  });
  const byId=new Map(assets.map(x=>[x.id,x]));
  named(input.videoTracks,VIDEO_PROJECT_V3_LIMITS.videoLayers);
  let totalClips=0;
  const layers=new Set();
  const videoTracks=input.videoTracks.map(track=>{
    if(!only(track,["id","layer","clips"])||
       !ints(track.layer,0,VIDEO_PROJECT_V3_LIMITS.videoLayers-1)||
       layers.has(track.layer)||!Array.isArray(track.clips))
      fail("video_track");
    layers.add(track.layer);
    named(track.clips,VIDEO_PROJECT_V3_LIMITS.videoClips);
    totalClips+=track.clips.length;
    for(let i=1;i<track.clips.length;i++){
      if(track.clips[i].startMs<track.clips[i-1].startMs)
        fail("video_order");
    }
    const clips=track.clips.map((clip,i)=>{
      if(!only(clip,["id","assetId","startMs","durationMs","sourceInMs","sourceOutMs",
        "speed","opacityPercent","transitionIn","transform","mask"])||
        byId.get(clip.assetId)?.kind!=="video"||
        !ints(clip.startMs,0,input.durationMs-1)||
        !ints(clip.durationMs,250,input.durationMs)||
        clip.startMs+clip.durationMs>input.durationMs||
        !ints(clip.sourceInMs,0,180000)||
        !ints(clip.sourceOutMs,1,180000)||
        clip.sourceOutMs>byId.get(clip.assetId).durationMs||
        clip.sourceOutMs<=clip.sourceInMs||
        !SPEEDS.has(clip.speed)||
        Math.round(clip.durationMs*clip.speed)>clip.sourceOutMs-clip.sourceInMs||
        !ints(clip.opacityPercent,0,100)||
        !TRANSITIONS.has(clip.transitionIn)||
        !validTransform(clip.transform)||!MASKS.has(clip.mask)||
        (i===0&&clip.transitionIn!=="cut"))
        fail("video_clip");
      return {...clip,transform:{...clip.transform}};
    }).sort((a,b)=>a.startMs-b.startMs||a.id.localeCompare(b.id));
    // Adjacent source clips may overlap for a true crossfade only; a third
    // decoder for the same track is never silently enabled.
    for(let i=1;i<clips.length;i++){
      const prev=clips[i-1],cur=clips[i];
      const overlap=prev.startMs+prev.durationMs-cur.startMs;
      if(overlap>0&&
        (cur.transitionIn!=="crossfade"||overlap>1500||
         (i>=2&&clips[i-2].startMs+clips[i-2].durationMs>cur.startMs)))
        fail("video_overlap");
      if(overlap<=0&&cur.transitionIn==="crossfade")fail("transition_without_overlap");
    }
    return {id:track.id,layer:track.layer,clips};
  }).sort((a,b)=>a.layer-b.layer);
  if(totalClips>VIDEO_PROJECT_V3_LIMITS.videoClips)fail("video_clip_limit");
  // Clip IDs are unique even across different tracks.
  named(videoTracks.flatMap(t=>t.clips),VIDEO_PROJECT_V3_LIMITS.videoClips);
  named(input.audioTracks,VIDEO_PROJECT_V3_LIMITS.audioLayers);
  const audioTracks=input.audioTracks.map(track=>{
    if(!only(track,["id","kind","assetId","startMs","durationMs","sourceInMs",
      "gainPercent","fadeInMs","fadeOutMs","loop"])||
      !AUDIO_KINDS.has(track.kind)||byId.get(track.assetId)?.kind!=="audio"||
      !ints(track.startMs,0,input.durationMs-1)||
      !ints(track.durationMs,100,input.durationMs)||
      track.startMs+track.durationMs>input.durationMs||
      !ints(track.sourceInMs,0,byId.get(track.assetId).durationMs-1)||
      !ints(track.gainPercent,0,100)||
      !ints(track.fadeInMs,0,2000)||!ints(track.fadeOutMs,0,2000)||
      track.fadeInMs+track.fadeOutMs>track.durationMs||
      typeof track.loop!=="boolean"||
      (!track.loop&&track.sourceInMs+track.durationMs>byId.get(track.assetId).durationMs))
      fail("audio_track");
    return {...track};
  });
  named(input.textTracks,8);
  const textIds=new Set();
  let textCount=0;
  const textTracks=input.textTracks.map(track=>{
    if(!only(track,["id","items"])||!Array.isArray(track.items))fail("text_track");
    const items=track.items.map(item=>{
      if(!only(item,["id","text","startMs","endMs","position","style","approved"])||
        !isId(item.id)||textIds.has(item.id)||
        typeof item.text!=="string"||!item.text.trim()||item.text.length>220||
        !ints(item.startMs,0,input.durationMs-1)||
        !ints(item.endMs,item.startMs+100,input.durationMs)||
        !["top","center","bottom"].includes(item.position)||
        !TEXT_STYLES.has(item.style)||item.approved!==true)
        fail("text_item");
      textIds.add(item.id);textCount++;
      return {...item};
    });
    return {id:track.id,items};
  });
  if(textCount>VIDEO_PROJECT_V3_LIMITS.textCues)fail("text_limit");
  const approval=input.renderApproval, exp=input.export;
  if(!only(approval,["revision","planHash"])||
    (approval.revision!==null&&!ints(approval.revision,0,input.revision))||
    (approval.planHash!==null&&!/^fnv64-[0-9a-f]{16}$/.test(approval.planHash))||
    (approval.revision===null)!==(approval.planHash===null)||
    !only(exp,["state","planHash","artifact"])||
    !["idle","stale","ready"].includes(exp.state)||
    (exp.planHash!==null&&!/^fnv64-[0-9a-f]{16}$/.test(exp.planHash))||
    (exp.artifact!==null&&!only(exp.artifact,["mime","bytes","validatedPlayback","validatedAudio"]))||
    (exp.artifact!==null&&(!["video/mp4","video/webm"].includes(exp.artifact.mime)||
      !ints(exp.artifact.bytes,1024,80000000)||
      exp.artifact.validatedPlayback!==true||typeof exp.artifact.validatedAudio!=="boolean"))||
    // V3 is a contract-only milestone; importing a JSON claim of a
    // successful render must never create a downloadable "verified" film.
    exp.state==="ready"||approval.revision!==null||
    (exp.state==="stale"&&exp.artifact===null))
    fail("export_state");
  return deepFreeze({
    schemaVersion:3,projectId:input.projectId,revision:input.revision,
    locale:input.locale,aspect:input.aspect,durationMs:input.durationMs,
    fps:input.fps,activeWorkspace:input.activeWorkspace,goalText:input.goalText,
    approvedPhrases:[...input.approvedPhrases],
    assets,videoTracks,audioTracks,textTracks,
    renderApproval:{...approval},
    export:{state:exp.state,planHash:exp.planHash,
      artifact:exp.artifact===null?null:{...exp.artifact}},
    privacy:{localOnly:true,externalAiConsent:false}
  });
}

/** The existing Studio V2 remains unchanged; V3 edits require explicit activation. */
export function applyVideoProjectV3Action(project,action,expectedRevision=project?.revision){
  const current=validateVideoProjectV3(project);
  if(current.revision!==expectedRevision)fail("stale_revision");
  if(!only(action,["type","value"])||typeof action.type!=="string")
    fail("invalid_action");
  const edits={
    set_assets:"assets",set_video_tracks:"videoTracks",set_audio_tracks:"audioTracks",
    set_text_tracks:"textTracks",set_approved_phrases:"approvedPhrases",
    set_goal_text:"goalText",
  };
  if(action.type==="set_workspace"){
    if(!WORKSPACES.has(action.value))fail("workspace");
    return validateVideoProjectV3({...current,activeWorkspace:action.value});
  }
  if(action.type==="set_film_settings"){
    if(!only(action.value,["aspect","durationMs","fps"]))fail("settings");
    const next=validateVideoProjectV3({...current,...action.value});
    if(JSON.stringify([next.aspect,next.durationMs,next.fps])===
       JSON.stringify([current.aspect,current.durationMs,current.fps]))return current;
    return validateVideoProjectV3({...next,revision:current.revision+1,
      renderApproval:emptyApproval(),export:{
        ...current.export,state:current.export.artifact?"stale":"idle"}});
  }
  const key=edits[action.type];
  if(!key)fail("unsupported_action");
  const next=validateVideoProjectV3({...current,[key]:action.value});
  if(JSON.stringify(next[key])===JSON.stringify(current[key]))return current;
  return validateVideoProjectV3({...next,revision:current.revision+1,
    renderApproval:emptyApproval(),export:{
      ...current.export,state:current.export.artifact?"stale":"idle"}});
}

/**
 * Approved assets are a TRUSTED runtime registry, never obtained from project
 * JSON. No project-provided source path, right claim or bearer token is used.
 * This compiled contract is not yet wired to a full NLE Canvas/MP4 renderer.
 */
export function compileVideoProjectV3(project,{approvedAssets}={}){
  const v=validateVideoProjectV3(project);
  if(!Array.isArray(approvedAssets))fail("asset_registry_missing");
  const verified=new Map();
  for(const row of approvedAssets){
    if(!only(row,["id","kind","origin","durationMs","path","rightsKind",
      "consentConfirmed","loaded"])||
      !isId(row.id)||!KINDS.has(row.kind)||verified.has(row.id)||
      !["catalog","local"].includes(row.origin)||
      !ints(row.durationMs,500,180000)||!RIGHTS.has(row.rightsKind))
      fail("registry");
    if(row.origin==="catalog"){
      const allowedPath=row.kind==="video"
        ?/^\/videos\/holistic-house\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.mp4$/
        :/^\/audio\/mandala\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.(?:wav|mp3)$/;
      if(typeof row.path!=="string"||!allowedPath.test(row.path)||
        row.rightsKind==="user_confirmed"||
        row.consentConfirmed!==false||row.loaded!==true)fail("registry_source");
    }else if(row.path!==null||row.rightsKind!=="user_confirmed"||
      row.consentConfirmed!==true||row.loaded!==true)fail("registry_local");
    verified.set(row.id,{...row});
  }
  const proof=v.assets.map(asset=>{
    const row=verified.get(asset.id);
    if(!row||row.origin!==asset.origin||row.kind!==asset.kind||
       row.durationMs!==asset.durationMs)fail("unapproved_asset");
    return {assetId:asset.id,kind:asset.kind,origin:asset.origin,
      sourceDurationMs:asset.durationMs,rightsKind:row.rightsKind,
      sourcePath:row.origin==="catalog"?row.path:null};
  });
  const events=new Set([0,v.durationMs]);
  v.videoTracks.forEach(track=>track.clips.forEach(clip=>{
    events.add(clip.startMs);events.add(clip.startMs+clip.durationMs);
  }));
  const bounds=[...events].sort((a,b)=>a-b);
  let maxActive=0;
  for(let i=1;i<bounds.length;i++){
    const at=(bounds[i-1]+bounds[i])/2;
    let count=0;
    v.videoTracks.forEach(track=>track.clips.forEach(clip=>{
      if(at>=clip.startMs&&at<clip.startMs+clip.durationMs)count++;
    }));
    maxActive=Math.max(maxActive,count);
  }
  if(maxActive>VIDEO_PROJECT_V3_LIMITS.simultaneousDecoders)
    fail("decoder_budget_exceeded");
  const plan={
    version:"hh-video-project-v3-compiled",schemaVersion:3,revision:v.revision,
    projectId:v.projectId,durationMs:v.durationMs,aspect:v.aspect,fps:v.fps,
    engine:"pending_advanced_compositor",runnable:false,
    maxSimultaneousDecoders:maxActive,
    videoTracks:v.videoTracks,audioTracks:v.audioTracks,textTracks:v.textTracks,
    rightsProof:proof,
    privacy:{localOnly:true,externalProviderApproved:false},
  };
  return deepFreeze({...plan,planHash:videoRenderFingerprint(plan)});
}

/** Pure advanced frame resolver — not an alternate browser renderer. */
export function resolveVideoFramesV3(plan,projectMs){
  if(plan?.version!=="hh-video-project-v3-compiled"||
     !ints(projectMs,0,plan.durationMs))fail("frame_clock");
  const result=[];
  for(const track of plan.videoTracks){
    const active=track.clips.filter(clip=>
      projectMs>=clip.startMs&&projectMs<clip.startMs+clip.durationMs);
    if(active.length>2)fail("frame_decoder_budget");
    const incoming=active.length===2?active[1]:null;
    const outgoing=active.length===2?active[0]:null;
    for(const clip of active){
      let factor=1;
      if(incoming&&outgoing){
        if(incoming.transitionIn!=="crossfade")fail("frame_transition");
        const overlap=outgoing.startMs+outgoing.durationMs-incoming.startMs;
        const progress=Math.min(1,Math.max(0,(projectMs-incoming.startMs)/overlap));
        factor=clip===incoming?progress:1-progress;
      }
      const elapsed=projectMs-clip.startMs;
      result.push({clipId:clip.id,assetId:clip.assetId,layer:track.layer,
        sourceMs:Math.min(clip.sourceOutMs-1,clip.sourceInMs+Math.round(elapsed*clip.speed)),
        opacity:Math.round(clip.opacityPercent*factor)/100,
        transform:{...clip.transform},mask:clip.mask});
    }
  }
  if(result.length>VIDEO_PROJECT_V3_LIMITS.simultaneousDecoders)
    fail("frame_decoder_budget");
  return deepFreeze(result);
}
export function resolveAudioMixV3(plan,projectMs){
  if(plan?.version!=="hh-video-project-v3-compiled"||
     !ints(projectMs,0,plan.durationMs))fail("audio_clock");
  return deepFreeze(plan.audioTracks.filter(t=>projectMs>=t.startMs&&
    projectMs<t.startMs+t.durationMs).map(track=>{
      const elapsed=projectMs-track.startMs;
      const asset=plan.rightsProof.find(row=>row.assetId===track.assetId);
      if(!asset)fail("audio_unapproved");
      const maxDuration=track.durationMs;
      const fadeIn=track.fadeInMs?Math.min(1,elapsed/track.fadeInMs):1;
      const fadeOut=track.fadeOutMs?
        Math.min(1,(maxDuration-elapsed)/track.fadeOutMs):1;
      return {trackId:track.id,assetId:track.assetId,kind:track.kind,
        sourceMs:track.sourceInMs+(track.loop
          ?elapsed%(asset.sourceDurationMs-track.sourceInMs):elapsed),
        gain:Math.round(track.gainPercent*Math.max(0,Math.min(fadeIn,fadeOut)))/100};
    }));
}

/** Explicit migration never discards unknown audio or invents unlicensed media. */
export function migrateVideoProjectV2ToV3(v2,{approvedAssets}={}){
  if(!isPlain(v2)||v2.schemaVersion!==2||!isId(v2.projectId)||
     !Array.isArray(v2.film?.shots)||v2.film.shots.length!==4||
     !Array.isArray(approvedAssets))fail("migration_input");
  const ids=v2.film.shots.map(s=>s.sceneId);
  if(new Set(ids).size!==4)fail("migration_duplicate");
  const required=ids.map(id=>approvedAssets.find(x=>x.id===id&&
    x.kind==="video"&&x.origin==="catalog"));
  if(required.some(x=>!x))fail("migration_source");
  const audioId=v2.audio?.trackId;
  let audio=null;
  if(audioId!=="none"){
    audio=approvedAssets.find(x=>x.id===audioId&&x.kind==="audio"&&
      x.origin==="catalog");
    if(!audio)fail("migration_audio_not_approved");
  }
  const p=createVideoProjectV3({projectId:v2.projectId,locale:v2.locale,
    aspect:v2.film.aspect,durationMs:v2.film.durationMs,
    goalText:v2.goal?.text??""});
  const assets=[...required,...(audio?[audio]:[])].map(x=>({
    id:x.id,kind:x.kind,origin:x.origin,durationMs:x.durationMs,
    width:x.kind==="audio"?0:1280,height:x.kind==="audio"?0:720
  }));
  const videoTracks=[{id:"base-video",layer:0,
    clips:v2.film.shots.map((s,i)=>({
      id:"clip-"+(i+1),assetId:s.sceneId,startMs:s.startMs,
      durationMs:s.durationMs,sourceInMs:0,sourceOutMs:required[i].durationMs,
      speed:1,opacityPercent:100,transitionIn:"cut",
      transform:{scale:1,x:0,y:0,rotation:0},mask:"none",
    }))}];
  const audioTracks=audio?[{id:"original-music",kind:"music",
    assetId:audioId,startMs:0,durationMs:v2.film.durationMs,sourceInMs:0,
    gainPercent:v2.audio.volumePercent,loop:true,fadeInMs:0,fadeOutMs:0}]:[];
  return validateVideoProjectV3({...p,revision:v2.revision,assets,videoTracks,
    audioTracks,approvedPhrases:[...(v2.phrases?.approved??[])],
    // A V2 export is not a V3 export: require re-render and re-validation.
    renderApproval:emptyApproval(),export:emptyExport()});
}
