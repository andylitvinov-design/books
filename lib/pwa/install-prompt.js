// A single deferred install prompt for this browser tab.
// The browser's beforeinstallprompt may fire *before* a user finishes signing
// in. Retain only that short-lived browser event, never a client identity.
let pending = null
const listeners = new Set()
function publish(){
  for(const listener of listeners)listener(pending)
}
export function capturePwaInstallPrompt(event){
  if(!event || typeof event.prompt!=='function')return false
  event.preventDefault?.()
  pending = event
  publish()
  return true
}
export function onPwaInstallPrompt(listener){
  listeners.add(listener)
  listener(pending)
  return ()=>{listeners.delete(listener)}
}
export function pwaInstalled(){
  pending = null
  publish()
}
export async function requestPwaInstallation(){
  const event = pending
  if(!event)return {available:false,accepted:false}
  pending = null
  publish()
  try {
    await event.prompt()
    const choice = await event.userChoice
    return {available:true,accepted:choice?.outcome==='accepted'}
  } catch {
    return {available:true,accepted:false}
  }
}
