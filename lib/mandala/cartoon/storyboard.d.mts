export type CartoonLocale="ru"|"en"|"es";
export type CartoonPreset="friendship"|"courage"|"calm"|"celebration";
export type CartoonAspect="portrait"|"landscape";
export interface CartoonScene {
  readonly shotId:string;readonly index:number;readonly startMs:number;
  readonly durationMs:number;readonly worldId:string;readonly characterId:string;
  readonly actionId:string;readonly emotionId:string;readonly narration:string;
  readonly starVisible:boolean;
  readonly camera:Readonly<{movement:string;amplitude:number}>;
}
export interface CartoonStoryboard {
  readonly version:string;readonly format:string;readonly locale:CartoonLocale;
  readonly preset:CartoonPreset;readonly title:string;readonly aspect:CartoonAspect;
  readonly seed:number;readonly variation:number;readonly fps:number;
  readonly durationMs:number;readonly shotCount:number;
  readonly scenes:ReadonlyArray<CartoonScene>;
}
export const CARTOON_PRESETS:readonly CartoonPreset[];
export function createCartoonStoryboard(options?:{wish?:string;locale?:CartoonLocale;
  preset?:CartoonPreset|"auto";aspect?:CartoonAspect;variation?:number}):CartoonStoryboard;
export function validateCartoonStoryboard(plan:CartoonStoryboard):true;
export function cartoonSceneAt(plan:CartoonStoryboard,timeMs:number):CartoonScene;
