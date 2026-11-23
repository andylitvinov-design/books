// Minimal CSP permissions for the existing consent-gated personal MP4 flow.
// No wildcard or bearer/secret access. Middleware calls this only for public
// Video Studio and the authenticated My Videos cabinet.
const PROJECT_HOST=/^([a-z0-9]{20})\.supabase\.co$/;

export function personalVideoStorageCsp(pathname,env=process.env){
  const studio=/^\/(en|ru|es)\/holistic-support\/mandala\/?$/.test(pathname);
  const cabinet=/^\/(en|ru|es)\/app\/videos\/?$/.test(pathname);
  const restricted={connect:"",media:cabinet?" blob:":""};
  if(!studio&&!cabinet)return restricted;
  if(env.HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED!=="true")return restricted;
  try{
    const url=new URL(env.HH_APP_SUPABASE_URL||"");
    const host=PROJECT_HOST.exec(url.hostname);
    if(url.protocol!=="https:"||!host||url.port||url.username||url.password||
       url.pathname!=="/"||url.search||url.hash)return restricted;
    // Small signed uploads use the API host. iPhone TUS chunks use the
    // dedicated storage host. Both remain private, signed and consent-gated.
    const apiOrigin=url.origin;
    const storageOrigin="https://"+host[1]+".storage.supabase.co";
    return {connect:" "+apiOrigin+" "+storageOrigin,
      media:cabinet?" blob: "+apiOrigin:""};
  }catch{return restricted;}
}
