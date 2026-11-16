export type PublishedReikiAudio = {
  id:string;kind:"audio";audioType:"published_course_introduction";
  title:string;href:string;publishedAt:string;
};
export function publicReikiAudioSlots(opts?:{
  topic?:string|null;locale?:string;maxDurationMin?:number|null;
}):string[];
export function verifiedPublicReikiIntro(payload:unknown,opts?:{
  lesson?:string;locale?:string;
}):PublishedReikiAudio|null;
