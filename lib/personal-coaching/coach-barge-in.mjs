// Client-only eligibility for hands-free interruption while a coach speaks.
// iOS 27 is conservatively tap-to-interrupt by default: WebKit reports audible
// crackling with an open echo-cancelled microphone during speaker playback.
// Real-device QA may explicitly opt in with ?coachBarge=1.
export function coachBargeInMode({navigator:nav={},location:locationLike={}}={},supported=false){
  if(!supported)return 'tap';
  const search=String(locationLike?.search||'');
  const choice=new URLSearchParams(search).get('coachBarge');
  if(choice==='0')return 'tap';
  if(choice==='1')return 'voice';
  const ua=String(nav.userAgent||'');
  const ios=/iPhone|iPad|iPod/i.test(ua)||
    (nav.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1);
  return ios?'tap':'voice';
}
// Only genuine playback phases can be interrupted; a stopped/failed session
// may never activate a microphone or replay a canceled provider response.
export function canInterruptCoach(phase){
  return phase==='speaking'||phase==='loading'||phase==='thinking';
}
