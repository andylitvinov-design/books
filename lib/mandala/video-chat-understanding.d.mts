export const VIDEO_CHAT_EDIT_STEPS: readonly string[];
export type VideoChatConversationStage =
  "goal"|"category"|"topic"|"scenario"|"idea"|"phrase"|
  "mood"|"aspect"|"duration"|"music"|"phrases"|"review"|"ready"|"done";
export type VideoChatConversationFilters={
  mood?:"slow"|"dynamic";aspect?:"portrait"|"landscape"|"square";
  duration?:10|15|20|30|60;music?:"none"|"harmony"|"love"|"meditation";
  phrases?:boolean;
};
export type VideoChatConversationReply={
  kind:string;
  reason?:string;goal?:string;requested?:number;
  targetStep?:VideoChatConversationStage;direction?:number;
  audioRequested?:boolean;filters:VideoChatConversationFilters;
};
export function understandVideoChatReply(value:string,
  stage?:VideoChatConversationStage):VideoChatConversationReply;
