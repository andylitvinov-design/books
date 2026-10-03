import {AppError, assertObject} from '../assessments/contracts.js'
export const PRIVATE_HEADERS=Object.freeze({
  'Cache-Control':'private, no-store, max-age=0, must-revalidate',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',Vary:'Cookie',
})
export async function readBody(request,limit=65536){
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new AppError('JSON_REQUIRED',415)
  if(Number(request.headers.get('content-length'))>limit)throw new AppError('PAYLOAD_TOO_LARGE',413)
  const reader=request.body?.getReader()
  if(!reader)throw new AppError('INVALID_BODY',400)
  let size=0;const chunks=[]
  try{
    for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new AppError('PAYLOAD_TOO_LARGE',413)}chunks.push(value)}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));assertObject(body);return body
  }catch(error){if(error instanceof AppError)throw error;throw new AppError('INVALID_BODY',400)}
}
export function safeError(error){
  // Only synthetic CI emits diagnostics. No user requests, tokens or payloads.
  if(process.env.CI==='true'&&process.env.HH_APP_TEST_RUNTIME==='isolated'&&!process.env.VERCEL){
    const detail=error instanceof AppError?'':String(error?.message||'').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/(?:password|token|secret|code_verifier)=[^\s&]+/gi,'[redacted]').slice(0,300)
    console.error('HH_APP_TEST_ERROR',error?.name||'Error',error?.code||'',detail)
  }
  if(process.env.VERCEL_ENV==='preview'&&process.env.HH_APP_DIAGNOSTICS==='true'){
    const detail=error instanceof AppError?'':String(error?.message||'').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/(?:password|token|secret|code_verifier)=[^\s&]+/gi,'[redacted]').slice(0,300)
    console.error('HH_APP_PREVIEW_ERROR',error?.name||'Error',error?.code||'',detail)
  }
  if(error instanceof AppError)return{status:error.status,code:error.code}
  if(['23505','40001','40P01'].includes(error?.code))return{status:409,code:'CONFLICT'}
  if(error?.code==='42501')return{status:403,code:'ACCESS_DENIED'}
  return{status:503,code:'SERVICE_UNAVAILABLE'}
}
