/**
 * Types for the browser-local V3 NLE contract (not a live player).
 * No raw File, Blob, URL, provider ID or payer data belongs to this DTO.
 */
export interface VideoV3Asset{
  id:string;kind:"video"|"audio";origin:"catalog"|"local";
  durationMs:number;width:number;height:number;
}
export interface VideoV3Transform{
  scale:number;x:number;y:number;rotation:number;
}
export interface VideoV3Clip{
  id:string;assetId:string;startMs:number;durationMs:number;
  sourceInMs:number;sourceOutMs:number;
  speed:0.5|0.75|1|1.25|1.5|2;opacityPercent:number;
  transitionIn:"cut"|"crossfade";transform:VideoV3Transform;
  mask:"none"|"circle"|"rounded";
}
export interface VideoV3VideoTrack{
  id:string;layer:number;clips:VideoV3Clip[];
}
export interface VideoV3AudioTrack{
  id:string;kind:"voice"|"music"|"ambience"|"sfx";assetId:string;
  startMs:number;durationMs:number;sourceInMs:number;
  gainPercent:number;fadeInMs:number;fadeOutMs:number;loop:boolean;
}
export interface VideoV3TextItem{
  id:string;text:string;startMs:number;endMs:number;
  position:"top"|"center"|"bottom";
  style:"classic"|"cinema"|"minimal"|"glow";approved:true;
}
export interface VideoV3TextTrack{id:string;items:VideoV3TextItem[]}
export interface VideoProjectV3{
  readonly schemaVersion:3;readonly projectId:string;readonly revision:number;
  readonly locale:"ru"|"en"|"es";
  readonly aspect:"portrait"|"landscape"|"square";
  readonly durationMs:number;readonly fps:12|15|20|24|25;
  readonly activeWorkspace:"video"|"phrases"|"editor";
  readonly goalText:string;readonly approvedPhrases:readonly string[];
  readonly assets:readonly VideoV3Asset[];
  readonly videoTracks:readonly VideoV3VideoTrack[];
  readonly audioTracks:readonly VideoV3AudioTrack[];
  readonly textTracks:readonly VideoV3TextTrack[];
  readonly renderApproval:{revision:number|null;planHash:string|null};
  readonly export:{
    state:"idle"|"stale"|"ready";planHash:string|null;
    artifact:null|{mime:"video/mp4"|"video/webm";bytes:number;
      validatedPlayback:true;validatedAudio:boolean};
  };
  readonly privacy:{localOnly:true;externalAiConsent:false};
}
export interface VideoV3ApprovedAsset{
  id:string;kind:"video"|"audio";origin:"catalog"|"local";
  durationMs:number;path:string|null;
  rightsKind:"existing_approved_first_party_master"|"project_generated_original"|
    "dareful_cc_by_4_0"|"user_confirmed";
  consentConfirmed:boolean;loaded:boolean;
}
export interface CompiledVideoPlanV3{
  readonly version:"hh-video-project-v3-compiled";
  readonly schemaVersion:3;readonly revision:number;readonly projectId:string;
  readonly durationMs:number;readonly aspect:string;readonly fps:number;
  readonly engine:"pending_advanced_compositor";readonly runnable:false;
  readonly maxSimultaneousDecoders:number;
  readonly videoTracks:readonly VideoV3VideoTrack[];
  readonly audioTracks:readonly VideoV3AudioTrack[];
  readonly textTracks:readonly VideoV3TextTrack[];
  readonly rightsProof:readonly {
    assetId:string;kind:string;origin:string;sourceDurationMs:number;
    rightsKind:string;sourcePath:string|null
  }[];
  readonly privacy:{localOnly:true;externalProviderApproved:false};
  readonly planHash:string;
}
export declare const VIDEO_PROJECT_V3_SCHEMA:3;
export declare const VIDEO_PROJECT_V3_LIMITS:Readonly<{
  durationMs:60000;assets:32;videoLayers:8;videoClips:24;
  audioLayers:4;textCues:100;simultaneousDecoders:2
}>;
export declare function createVideoProjectV3(input:{
  projectId:string;locale?:"ru"|"en"|"es";durationMs?:number;
  aspect?:"portrait"|"landscape"|"square";fps?:12|15|20|24|25;
  goalText?:string
}):VideoProjectV3;
export declare function validateVideoProjectV3(value:unknown):VideoProjectV3;
export declare function applyVideoProjectV3Action(project:VideoProjectV3,action:{
  type:string;value:unknown
},expectedRevision?:number):VideoProjectV3;
export declare function compileVideoProjectV3(project:VideoProjectV3,options:{
  approvedAssets:readonly VideoV3ApprovedAsset[]
}):CompiledVideoPlanV3;
export declare function resolveVideoFramesV3(plan:CompiledVideoPlanV3,
  projectMs:number):readonly {
  clipId:string;assetId:string;layer:number;sourceMs:number;opacity:number;
  transform:VideoV3Transform;mask:VideoV3Clip["mask"]
}[];
export declare function resolveAudioMixV3(plan:CompiledVideoPlanV3,
  projectMs:number):readonly {
  trackId:string;assetId:string;kind:VideoV3AudioTrack["kind"];
  sourceMs:number;gain:number
}[];
export declare function migrateVideoProjectV2ToV3(
  v2:unknown,options:{approvedAssets:readonly VideoV3ApprovedAsset[]}
):VideoProjectV3;
