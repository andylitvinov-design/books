import type {CartoonStoryboard} from "./storyboard.mjs";
export function renderCartoonSvg(plan:CartoonStoryboard,timeMs:number,
  dimensions?:{width?:number;height?:number}):string;
