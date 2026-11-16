export const MUSIC_MATCH_VERSION:string;
export type MusicMatchTrack={
  id:string;kind:"melody";themes:string[];moods:string[];
  pace:"slow"|"steady"|"active";voiceSafe:boolean;durationSeconds:number;
  name:Record<"ru"|"en"|"es",string>;
  detail:Record<"ru"|"en"|"es",string>;
  icon?:string;
  category?:string;
  rights?:Record<string,unknown>;
  tags:{
    themes:readonly string[];moods:readonly string[];pace:string;voiceSafe:boolean;
    instruments:readonly string[];motifs:readonly string[];durationSeconds:number|null;
  };
  score:number;reasons:string[];
};
export function rankPersonalMusic(input?:{
 tracks?:readonly unknown[];theme?:string;wish?:string;transcript?:string;
 scenarioId?:string;priorityIds?:string[];kind?:string;mood?:string;
 pace?:string;voiceFriendly?:boolean;limit?:number;
}):MusicMatchTrack[];
