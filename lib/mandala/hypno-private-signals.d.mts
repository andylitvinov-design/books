import type { VideoLocale,VideoTheme } from "./holistic-video-themes";
import type { VideoAffirmationGoal } from "./video-affirmations";
export declare function resolvePrivateHypnoCodes(args:{
  locale:VideoLocale;theme:VideoTheme;
  problemNote?:string;goalNote?:string;
  problemIndex:number;goalId:VideoAffirmationGoal;
}):Readonly<{
  problemIndex:number;goalId:VideoAffirmationGoal;
  privateDescriptionInterpreted:boolean;rawTextShared:false;
}>;
