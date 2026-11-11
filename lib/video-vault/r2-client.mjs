/**
 * Cloudflare R2 private Standard bucket adapter — S3 Signature V4 via Node
 * built-ins only. No Worker, npm dependency, public r2.dev or bucket creation.
 * Disabled without an explicit feature flag; write needs a second flag.
 */
import {createHash,createHmac} from 'node:crypto';
import {VAULT_EXCEPTION_FILE_BYTES} from './contracts.mjs';
const HASH=/^[a-f0-9]{64}$/;
const ACCOUNT=/^[0-9a-f]{32}$/i;
const BUCKET=/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const KEY=/^(masters|posters)\/[a-z][a-z0-9-]{2,63}\/[a-f0-9]{64}\.(mp4|jpg)$/;
const RIGHTS_KEY=/^evidence\/[a-z][a-z0-9-]{2,63}\/rights-v1\.json$/;
const sha256=v=>createHash('sha256').update(v).digest('hex');
const hmac=(key,text)=>createHmac('sha256',key).update(text).digest();
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
function reject(code){throw Error('HH_R2_'+code)}
export function safeR2Key(value,{evidence=false}={}){
  if(typeof value!=='string'||!(KEY.test(value)||(evidence&&RIGHTS_KEY.test(value)))||
    value.includes('..')||value.includes('//'))reject('OBJECT_KEY_DENIED');
  if(value.startsWith('masters/')&&!value.endsWith('.mp4'))reject('OBJECT_KEY_DENIED');
  if(value.startsWith('posters/')&&!value.endsWith('.jpg'))reject('OBJECT_KEY_DENIED');
  return value;
}
export function r2Config(env=process.env,{write=false}={}){
  if(env.HH_VIDEO_VAULT_R2_ENABLED!=='true'||env.HH_VIDEO_VAULT_R2_DISABLED!=='false')
    reject('DISABLED');
  if(write&&env.HH_VIDEO_VAULT_R2_WRITE_ENABLED!=='true')reject('WRITE_DISABLED');
  const account=env.HH_VIDEO_VAULT_R2_ACCOUNT_ID;
  const bucket=env.HH_VIDEO_VAULT_R2_BUCKET;
  const prefix=write?'HH_VIDEO_VAULT_R2_WRITE_':'HH_VIDEO_VAULT_R2_READ_';
  const accessKeyId=env[prefix+'ACCESS_KEY_ID'];
  const secretAccessKey=env[prefix+'SECRET_ACCESS_KEY'];
  if(!ACCOUNT.test(account||'')||!BUCKET.test(bucket||'')||
    typeof accessKeyId!=='string'||accessKeyId.length<8||
    typeof secretAccessKey!=='string'||secretAccessKey.length<16)reject('CONFIG_MISSING');
  return Object.freeze({account:account.toLowerCase(),bucket,accessKeyId,secretAccessKey});
}
export function objectKeys(assetId,digest){
  if(!/^[a-z][a-z0-9-]{2,63}$/.test(assetId||'')||!HASH.test(digest||''))
    reject('IDENTITY_MISSING');
  return Object.freeze({
    master:'masters/'+assetId+'/'+digest+'.mp4',
    poster:'posters/'+assetId+'/'+digest+'.jpg',
    evidence:'evidence/'+assetId+'/rights-v1.json',
  });
}
function signature(config,{method,key,body,headers={},time=new Date(),presignSeconds=0}){
  safeR2Key(key,{evidence:true});
  const date=time.toISOString().replace(/[:-]|\.\d{3}/g,'');
  const short=date.slice(0,8);
  const host=config.account+'.r2.cloudflarestorage.com';
  const path='/'+[config.bucket,...key.split('/')].map(encode).join('/');
  const scope=short+'/auto/s3/aws4_request';
  const payloadHash=presignSeconds?'UNSIGNED-PAYLOAD':sha256(body||Buffer.alloc(0));
  const normalized=Object.entries({
    host,
    ...(!presignSeconds?{'x-amz-content-sha256':payloadHash,'x-amz-date':date}:{}),
    ...headers,
  }).map(([k,v])=>[k.toLowerCase(),String(v).trim().replace(/\s+/g,' ')])
    .sort((a,b)=>a[0].localeCompare(b[0]));
  const names=normalized.map(v=>v[0]).join(';');
  const canonHeaders=normalized.map(([k,v])=>k+':'+v+'\n').join('');
  const query=presignSeconds?Object.entries({
    'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
    'X-Amz-Credential':config.accessKeyId+'/'+scope,
    'X-Amz-Date':date,
    'X-Amz-Expires':String(presignSeconds),
    'X-Amz-SignedHeaders':names,
    'X-Amz-Content-Sha256':'UNSIGNED-PAYLOAD',
  }).map(([k,v])=>encode(k)+'='+encode(v)).sort().join('&'):'';
  const canonical=[method,path,query,canonHeaders,names,payloadHash].join('\n');
  const stringToSign=['AWS4-HMAC-SHA256',date,scope,sha256(canonical)].join('\n');
  const secret=hmac('AWS4'+config.secretAccessKey,short);
  const region=hmac(secret,'auto'),service=hmac(region,'s3');
  const signingKey=hmac(service,'aws4_request');
  const signature=createHmac('sha256',signingKey).update(stringToSign).digest('hex');
  const url='https://'+host+path+(query?'?'+query:'');
  return {url:url+(query?'&X-Amz-Signature='+signature:''),headers:presignSeconds?{}:{
    ...headers,'x-amz-content-sha256':payloadHash,'x-amz-date':date,
    Authorization:'AWS4-HMAC-SHA256 Credential='+config.accessKeyId+'/'+scope+
      ',SignedHeaders='+names+',Signature='+signature,
  }};
}
export function presignR2Get(config,key,{seconds=1200,time}={}){
  safeR2Key(key); // evidence must never be client-signed
  if(!Number.isInteger(seconds)||seconds<60||seconds>1800)reject('TTL_INVALID');
  return signature(config,{method:'GET',key,presignSeconds:seconds,time}).url;
}
export function createR2Client(config,{fetcher=fetch,time=()=>new Date()}={}){
  async function request(method,key,{body,contentType,checksum,evidence=false}={}){
    safeR2Key(key,{evidence});
    if((method==='PUT'||method==='GET')&&body&&body.length>VAULT_EXCEPTION_FILE_BYTES)
      reject('FILE_TOO_LARGE');
    const headers={};
    if(contentType)headers['content-type']=contentType;
    if(checksum){
      if(!HASH.test(checksum))reject('CHECKSUM_INVALID');
      headers['x-amz-meta-sha256']=checksum;
    }
    const signed=signature(config,{method,key,body,headers,time:time()});
    let response;
    try{response=await fetcher(signed.url,{
      method,headers:signed.headers,body,redirect:'error',cache:'no-store',
    })}catch{reject('TRANSPORT_FAILURE')}
    if(!response||response.redirected||!response.ok)
      reject(method+'_FAILED_'+String(response?.status||'UNKNOWN'));
    return response;
  }
  return Object.freeze({
    presignGet:(key,options)=>presignR2Get(config,key,{...options,time:time()}),
    async put(key,bytes,{contentType,checksum,evidence=false}={}){
      if(!Buffer.isBuffer(bytes)&&!(bytes instanceof Uint8Array))reject('PUT_BYTES_REQUIRED');
      if(bytes.length>VAULT_EXCEPTION_FILE_BYTES)reject('FILE_TOO_LARGE');
      if(checksum&&sha256(bytes)!==checksum)reject('PUT_CHECKSUM_MISMATCH');
      await request('PUT',key,{body:bytes,contentType,checksum,evidence});
      return {key,bytes:bytes.length,sha256:sha256(bytes)};
    },
    async head(key,{evidence=false}={}){
      const response=await request('HEAD',key,{evidence});
      const bytes=Number(response.headers.get('content-length'));
      const contentType=response.headers.get('content-type')||'';
      const checksum=response.headers.get('x-amz-meta-sha256')||null;
      if(!Number.isSafeInteger(bytes)||bytes<0)reject('HEAD_INVALID_SIZE');
      return {key,bytes,contentType,checksum};
    },
    async getVerified(key,{expectedBytes,expectedSha256,maxBytes=VAULT_EXCEPTION_FILE_BYTES}={}){
      if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||
        expectedBytes>maxBytes||!HASH.test(expectedSha256||''))reject('READBACK_CONTRACT_INVALID');
      const response=await request('GET',key);
      const header=Number(response.headers.get('content-length'));
      if(header&&header!==expectedBytes)reject('READBACK_LENGTH_MISMATCH');
      let data;
      const reader=response.body?.getReader?.();
      if(reader){
        data=Buffer.alloc(expectedBytes);
        let total=0;
        try{
          while(true){
            const {done,value}=await reader.read();
            if(done)break;
            if(!(value instanceof Uint8Array)||total+value.length>expectedBytes||
              total+value.length>maxBytes){
              await reader.cancel().catch(()=>{});
              reject('READBACK_OVERSIZE');
            }
            data.set(value,total);total+=value.length;
          }
        }finally{reader.releaseLock()}
        if(total!==expectedBytes)reject('READBACK_LENGTH_MISMATCH');
      }else{
        // Test fake or platform without a streaming reader; bounded by HEAD.
        data=Buffer.from(await response.arrayBuffer());
      }
      if(data.length!==expectedBytes||data.length>maxBytes||sha256(data)!==expectedSha256)
        reject('READBACK_CHECKSUM_MISMATCH');
      return {key,bytes:data.length,sha256:expectedSha256};
    },
  });
}
