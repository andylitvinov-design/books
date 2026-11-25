/**
 * User-gesture music output: Safari iOS may ignore HTMLMediaElement.volume.
 * One AudioContext per preview, with live GainNode levels and safe cleanup.
 * No network fetches, uploads, TTS or additional media playback.
 */
export type PreviewGainGroup={
  setGains:(levels:readonly number[])=>void;
  resume:()=>void;
  close:()=>void;
};
const clamp=(value:number)=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
export function createPreviewGainGroup(
  players:readonly HTMLMediaElement[],levels:readonly number[],
):PreviewGainGroup|null{
  if(typeof window==="undefined"||!players.length||players.length!==levels.length)return null;
  const AudioCtor=window.AudioContext||
    (window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor)return null;
  let context:AudioContext|null=null;
  const sources:MediaElementAudioSourceNode[]=[];
  const nodes:GainNode[]=[];
  try{
    context=new AudioCtor();
    for(const player of players){
      const source=context.createMediaElementSource(player);
      const node=context.createGain();
      source.connect(node);node.connect(context.destination);
      sources.push(source);nodes.push(node);
    }
    const ctx=context;
    let closed=false;
    const setGains=(next:readonly number[])=>{
      if(closed||next.length!==nodes.length)return;
      const now=ctx.currentTime;
      nodes.forEach((node,index)=>{
        const value=clamp(next[index]);
        node.gain.cancelScheduledValues(now);
        if(value===0)node.gain.setValueAtTime(0,now);
        else node.gain.setTargetAtTime(value,now,.015);
      });
    };
    const resume=()=>{if(!closed)void ctx.resume().catch(()=>{});};
    const close=()=>{
      if(closed)return;closed=true;
      sources.forEach(source=>{try{source.disconnect();}catch{}});
      nodes.forEach(node=>{try{node.disconnect();}catch{}});
      void ctx.close().catch(()=>{});
    };
    setGains(levels);resume();
    return {setGains,resume,close};
  }catch{
    sources.forEach(source=>{try{source.disconnect();}catch{}});
    nodes.forEach(node=>{try{node.disconnect();}catch{}});
    if(context)void context.close().catch(()=>{});
    return null;
  }
}
