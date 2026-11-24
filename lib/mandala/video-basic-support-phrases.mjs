/**
 * Offline, reviewed, category-based Emotional Support text for Montage.
 * Never reads private wishes, names, health details, profiles or remote AI.
 */
import {GOAL_IDEA_LINES,GOAL_PURPOSE_LINES,SUPPORT_STYLE_LINES} from "./video-goal-idea-phrases.mjs";

const CATEGORY_BY_THEME=Object.freeze({
 relationships:"love",money:"business",goals:"business",
 energy:"energy",life:"energy",health:"body"
});
const SUPPORT_BY_THEME=Object.freeze({
 relationships:"connection",money:"worth",goals:"acceptance",
 energy:"reassurance",life:"connection",health:"care"
});
const LANGUAGES=["en","ru","es"];

/** @param {{locale?:string,theme?:string,revision?:number,excluded?:string[],limit?:number}} [input] */
export function suggestBasicSupportPhrases({locale="en",theme="energy",revision=0,excluded=[],limit=7}={}){
 const lang=LANGUAGES.includes(locale)?locale:"en";
 const category=CATEGORY_BY_THEME[theme]||"energy";
 const focus=SUPPORT_BY_THEME[theme]||"reassurance";
 const reviewed=[
  ...(SUPPORT_STYLE_LINES[lang][focus]||[]),
  ...(GOAL_IDEA_LINES[lang][category]||[]),
  ...GOAL_PURPOSE_LINES[lang].support
 ].filter(line=>typeof line==="string"&&Array.from(line).length<=36);
 const unique=[...new Set(reviewed)];
 const offset=Math.max(0,Number.isInteger(revision)?revision:0)%Math.max(unique.length,1);
 const ordered=[...unique.slice(offset),...unique.slice(0,offset)];
 const excludedSet=new Set(Array.isArray(excluded)?excluded:[]);
 return ordered.filter(line=>!excludedSet.has(line)).slice(0,Math.max(1,Math.min(14,limit)));
}
