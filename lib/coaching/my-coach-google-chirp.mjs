import {sign} from 'node:crypto';
export const GOOGLE_PROVIDER='google_chirp3_hd';
export const GOOGLE_TTS_MAX_CHARS=500;
export const GOOGLE_TTS_MAX_UTF8=1600;
export const GOOGLE_TTS_GLOBAL_DAILY_LIMIT=40;
export const GOOGLE_TTS_MONTHLY_UPPER_BOUND=GOOGLE_TTS_MAX_CHARS*GOOGLE_TTS_GLOBAL_DAILY_LIMIT*31;
const languages={en:'en-US',ru:'ru-RU',es:'es-ES'};
const personas=new Set(['mira','max','sofia','alex','lea','noah','iris','ray']);
const male=new Set(['max','alex','noah','ray']);
const tokenUrl='https://oauth2.googleapis.com/token';
const textUrl='https://texttospeech.googleapis.com/v1/text:synthesize';
const sensitive=/(?:sk-or-v1-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/i;
export function googleChirpConfig(env=process.env){
 if(env.HH_MY_COACH_GOOGLE_CHIRP_ENABLED!=='true'||
 env.HH_MY_COACH_GOOGLE_CHIRP_APPROVED!=='true'||
 env.HH_MY_COACH_GOOGLE_CHIRP_COST_APPROVED!=='true')return null;
 const raw=String(env.HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON||'');
 const projectId=String(env.HH_GOOGLE_TTS_PROJECT_ID||'');
 if(!raw||raw.length>12000||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))return null;
 let account;try{account=JSON.parse(raw)}catch{return null}
 if(!account||account.type!=='service_account'||account.project_id!==projectId||
 !/^[-a-z0-9]+@[-a-z0-9]+\.iam\.gserviceaccount\.com$/.test(account.client_email||'')||
 typeof account.private_key!=='string'||!account.private_key.includes('-----BEGIN PRIVATE KEY-----')||
 !account.private_key.includes('-----END PRIVATE KEY-----')||
 account.token_uri!==tokenUrl)return null;
 return {projectId,email:account.client_email,privateKey:account.private_key};
}
export function normalizeGoogleChirpInput(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
 Object.keys(body).some(k=>!['provider','locale','personaId','text','voiceConsent','cloudVoiceConsent'].includes(k))||
 body.provider!==GOOGLE_PROVIDER||!Object.hasOwn(languages,body.locale)||
 !personas.has(body.personaId)||body.voiceConsent!==true||
 body.cloudVoiceConsent!==true||typeof body.text!=='string')throw Error('GOOGLE_CHIRP_INVALID');
 const text=body.text.trim();
 if(!text||text.length>GOOGLE_TTS_MAX_CHARS||
 new TextEncoder().encode(text).byteLength>GOOGLE_TTS_MAX_UTF8||
 /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)||sensitive.test(text))
 throw Error('GOOGLE_CHIRP_INVALID');
 return {locale:body.locale,personaId:body.personaId,text};
}
export function googleChirpVoice(locale,personaId){
 if(!Object.hasOwn(languages,locale)||!personas.has(personaId))return null;
 const languageCode=languages[locale];
 return {languageCode,name:`${languageCode}-Chirp3-HD-${male.has(personaId)?'Charon':'Aoede'}`};
}
export function googleChirpAssertion(config,epoch=Date.now()){
 const now=Math.floor(epoch/1000);
 const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const header=b64({alg:'RS256',typ:'JWT'});
 const payload=b64({iss:config.email,scope:'https://www.googleapis.com/auth/cloud-platform',
 aud:tokenUrl,iat:now,exp:now+1800});
 const unsigned=header+'.'+payload;
 return unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),config.privateKey).toString('base64url');
}
export async function synthesizeGoogleChirp({config,input,signal,fetcher=fetch}){
 if(!config||!input||!googleChirpVoice(input.locale,input.personaId))throw Error('GOOGLE_CHIRP_DISABLED');
 const tokenResponse=await fetcher(tokenUrl,{method:'POST',redirect:'error',cache:'no-store',signal,
 headers:{'Content-Type':'application/x-www-form-urlencoded'},
 body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
 assertion:googleChirpAssertion(config)}).toString()});
 if(!tokenResponse.ok)throw Error('GOOGLE_CHIRP_AUTH_FAILED');
 const token=await tokenResponse.json();
 if(typeof token.access_token!=='string'||token.access_token.length<32||
 token.token_type?.toLowerCase()!=='bearer')throw Error('GOOGLE_CHIRP_AUTH_FAILED');
 const response=await fetcher(textUrl,{method:'POST',redirect:'error',cache:'no-store',signal,
 headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',
 'x-goog-user-project':config.projectId},
 body:JSON.stringify({input:{text:input.text},voice:googleChirpVoice(input.locale,input.personaId),
 audioConfig:{audioEncoding:'MP3'}})});
 if(!response.ok)throw Error('GOOGLE_CHIRP_TTS_FAILED');
 const data=await response.json();
 const content=data?.audioContent;
 if(typeof content!=='string'||content.length<30||content.length>3000000||
 !/^[A-Za-z0-9+/]+={0,2}$/.test(content))throw Error('GOOGLE_CHIRP_AUDIO_INVALID');
 const mp3=Buffer.from(content,'base64');
 if(mp3.length<16||mp3.length>2000000||
 !(mp3.subarray(0,3).toString()==='ID3'||(mp3[0]===255&&(mp3[1]&224)===224)))
 throw Error('GOOGLE_CHIRP_AUDIO_INVALID');
 return mp3;
}
