/**
 * Bounded, in-memory undo / redo of the currently selected client-local montage.
 * No persistence, payments, media uploads or stale export re-use.
 */
export const MYTUBE_UNDO_LIMIT=40;
export function emptyMyTubeEditorHistory(){
  return {past:[],future:[],lastKind:null,lastAt:0};
}
export function recordMyTubeEditorUndo(history,current,kind,at){
  if(!history||!Array.isArray(history.past)||!Array.isArray(history.future)||
     typeof kind!=="string"||!kind||
     !Number.isFinite(at)||at<0)throw Error("invalid_mytube_undo");
  // Consecutive character edits/drag events are one undoable gesture.
  const coalesce=(kind.startsWith("caption:")||kind.startsWith("shot-motion:")||kind.startsWith("source-timing:")||kind==="audio-offset"||kind==="audio-bed-volume")&&
    history.lastKind===kind&&at>=history.lastAt&&at-history.lastAt<=500&&
    history.past.length>0;
  return {past:coalesce?history.past:
    [...history.past.slice(1-MYTUBE_UNDO_LIMIT),current],
    future:[],lastKind:kind,lastAt:at};
}
export function undoMyTubeEditor(history,current){
  if(!history?.past?.length)return {history,snapshot:null};
  const previous=history.past[history.past.length-1];
  return {history:{past:history.past.slice(0,-1),
    future:[current,...history.future].slice(0,MYTUBE_UNDO_LIMIT),
    lastKind:null,lastAt:0},snapshot:previous};
}
export function redoMyTubeEditor(history,current){
  if(!history?.future?.length)return {history,snapshot:null};
  const next=history.future[0];
  return {history:{past:[...history.past.slice(1-MYTUBE_UNDO_LIMIT),current],
    future:history.future.slice(1),lastKind:null,lastAt:0},snapshot:next};
}
