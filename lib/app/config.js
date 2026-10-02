import {AppError} from '../assessments/contracts.js'
export function appEnabled(env=process.env){return env.HH_APP_ENABLED==='true'&&(env.VERCEL_ENV!=='production'||env.HH_APP_PRODUCTION_APPROVED==='true')}
export function testRuntime(env=process.env){return env.CI==='true'&&env.HH_APP_TEST_RUNTIME==='isolated'&&!env.VERCEL&&env.NODE_ENV!=='production'}
export function loopback(url){return ['127.0.0.1','localhost','[::1]'].includes(url.hostname)}
export function getAppConfig(env=process.env){
 const missing=['HH_APP_SUPABASE_URL','HH_APP_SUPABASE_PUBLISHABLE_KEY','HH_APP_DATABASE_URL','HH_APP_ENCRYPTION_KEY','HH_APP_ALLOWED_ORIGINS'].filter(key=>!env[key])
 if(!appEnabled(env)||missing.length)throw new AppError('APP_UNAVAILABLE',503)
 let supabase,database,origins,key
 try{supabase=new URL(env.HH_APP_SUPABASE_URL);database=new URL(env.HH_APP_DATABASE_URL);origins=env.HH_APP_ALLOWED_ORIGINS.split(',').map(value=>new URL(value.trim()));key=Buffer.from(env.HH_APP_ENCRYPTION_KEY,'base64')}catch{throw new AppError('APP_UNAVAILABLE',503)}
 const test=testRuntime(env),validHttp=url=>url.protocol==='https:'||(test&&url.protocol==='http:'&&loopback(url))
 if(!validHttp(supabase)||supabase.username||supabase.password||supabase.pathname!=='/'||supabase.search||supabase.hash||!['postgres:','postgresql:'].includes(database.protocol)||key.length!==32||!origins.length||origins.some(url=>!validHttp(url)||url.username||url.password||url.pathname!=='/'||url.search||url.hash))throw new AppError('APP_UNAVAILABLE',503)
 if(test&&!loopback(database))throw new AppError('TEST_DATABASE_MUST_BE_LOOPBACK',503)
 if(!test&&/^(postgres|supabase_admin|service_role)$/i.test(decodeURIComponent(database.username)))throw new AppError('APP_UNAVAILABLE',503)
 return Object.freeze({supabaseUrl:supabase.origin,publishableKey:env.HH_APP_SUPABASE_PUBLISHABLE_KEY,databaseUrl:env.HH_APP_DATABASE_URL,encryptionKey:key,encryptionKeyId:env.HH_APP_ENCRYPTION_KEY_ID||'app-v1',origins:origins.map(url=>url.origin),test,signupsEnabled:env.HH_APP_SIGNUPS_ENABLED==='true',secretKey:env.HH_APP_SUPABASE_SECRET_KEY||null})
}
export function requestOrigin(request,config){const url=new URL(request.url);if(!config.origins.includes(url.origin))throw new AppError('ORIGIN_DENIED',403);return url.origin}
export function requireSameOrigin(request,config){const origin=requestOrigin(request,config);if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')throw new AppError('ORIGIN_DENIED',403);return origin}
