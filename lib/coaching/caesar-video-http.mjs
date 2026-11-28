// Fixed first-party path: no arbitrary destinations, tokens in URLs, or user content.
export const CAESAR_VIDEO_ENDPOINT='/api/app/my-coach/caesar-video'
export const CAESAR_VIDEO_CONSENT_VERSION='caesar-video-v1'
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const denied=new Set(['AUTH_REQUIRED','CONSENT_REQUIRED','BUSY','PERSONAL_QUOTA_EXHAUSTED','GLOBAL_QUOTA_EXHAUSTED','UNAVAILABLE','INVALID_REQUEST','ACCESS_DENIED','NOT_FOUND'])
export function createCaesarVideoHttp(fetcher=fetch){
  async function post(body){
    const response=await fetcher(CAESAR_VIDEO_ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:body.action==='end'})
    const data=await response.json()
    // Only an explicitly classified first-party denial is certain. An arbitrary
    // gateway/transport failure may have allocated a token before losing the response.
    if(data?.allowed===false&&denied.has(data.code)&&(body.action!=='start'||(data.code!=='NOT_FOUND'&&data.allocation==='none')))return {allowed:false,code:data.code}
    if(!response.ok||data?.allowed!==true)throw Error('CAESAR_VIDEO_RESPONSE_UNCERTAIN')
    return data
  }
  return {
    requestStart(body){
      if(body?.action!=='start'||body.nonSensitiveConsent!==true||body.privacyConsentVersion!==CAESAR_VIDEO_CONSENT_VERSION||Object.keys(body).length!==3)throw Error('INVALID_CAESAR_CONSENT')
      return post({action:'start',nonSensitiveConsent:true,privacyConsentVersion:CAESAR_VIDEO_CONSENT_VERSION})
    },
    requestEnd(body){
      if(body?.action!=='end'||!uuid(body.sessionId)||Object.keys(body).length!==2)throw Error('INVALID_CAESAR_END')
      return post({action:'end',sessionId:body.sessionId})
    }
  }
}
