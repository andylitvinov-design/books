/** Browser-only speech session. Starts only on an explicit user gesture. */
export function createDeviceSpeech(environment) {
  let active = null;
  let sequence = 0;
  let disposed = false;
  const getEnv = () => typeof environment === 'function' ? environment() : environment;
  const available = () => {
    const w=getEnv();
    return Boolean(w?.speechSynthesis && w?.SpeechSynthesisUtterance);
  };
  function stop() {
    const previous = active;
    active = null;
    sequence += 1;
    if (!previous) return;
    previous.clear();
    // The browser queue is global: only cancel after our utterance actually started.
    // Do not cancel an unrelated module's audio when our session was never playing.
    const synth = getEnv()?.speechSynthesis;
    // A still-queued utterance must not start audibly after a component unmount.
    // Only flush it while no other module is actively speaking.
    if (synth && ((previous.started && synth.speaking) || (!synth.speaking && synth.pending))) {
      try { synth.cancel(); } catch { /* text chat remains usable */ }
    }
    previous.onEnd?.('cancelled', previous.id);
  }
  function speak(text, locale, callbacks={}) {
    if (disposed || !available() || !String(text||'').trim()) return {ok:false,reason:'unsupported'};
    stop();
    const w=getEnv(), synth=w.speechSynthesis;
    // Do not commandeer a queue currently owned by coaching or another page.
    if (synth.speaking || synth.pending) return {ok:false,reason:'busy'};
    const id=++sequence;
    let item;
    try { item=new w.SpeechSynthesisUtterance(String(text).slice(0,4500)); }
    catch { return {ok:false,reason:'unsupported'}; }
    const lang=locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-US';
    item.lang=lang; item.rate=.93; item.pitch=1; item.volume=1;
    const voices=synth.getVoices?.()||[];
    const preferred=voices.find(v=>v.lang?.toLowerCase()===lang.toLowerCase()&&v.localService!==false)
      ||voices.find(v=>v.lang?.toLowerCase().startsWith(locale+'-')&&v.localService!==false)
      ||voices.find(v=>v.lang?.toLowerCase().startsWith(locale));
    if(preferred)item.voice=preferred;
    const timers=[];
    const clear=()=>{for(const timer of timers)w.clearTimeout?.(timer);timers.length=0;};
    const session={id,item,started:false,onEnd:callbacks.onEnd,clear};
    active=session;
    const finish=(reason)=>{
      if(active!==session)return;
      active=null;clear();callbacks.onEnd?.(reason,id);
    };
    item.onstart=()=>{
      if(active!==session)return;
      session.started=true;
      callbacks.onStart?.(id);
      // Bounded watchdog: an interrupted Safari synthesizer must not strand Speaking.
      timers.push(w.setTimeout?.(()=>{if(active===session)stop();},Math.min(90000,Math.max(15000,Math.ceil(item.text.length/9)*1000))));
    };
    item.onend=()=>finish('ended');
    item.onerror=()=>finish('error');
    // Some browsers do not fire boundary events; animation is deliberately approximate.
    item.onboundary=event=>{if(active===session&&session.started)callbacks.onBoundary?.(event.charIndex,id);};
    try {
      synth.speak(item);
      timers.push(w.setTimeout?.(()=>{if(active===session&&!session.started)finish('timeout');},12000));
      return {ok:true,id};
    } catch {finish('error');return {ok:false,reason:'error'};}
  }
  function watchVoices(listener) {
    const synth=getEnv()?.speechSynthesis;
    if(!synth)return ()=>{};
    const update=()=>listener(synth.getVoices?.()||[]);
    update(); synth.addEventListener?.('voiceschanged',update);
    return ()=>synth.removeEventListener?.('voiceschanged',update);
  }
  return {available,speak,stop,watchVoices,destroy(){stop();disposed=true;}};
}
