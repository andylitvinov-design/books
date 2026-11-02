import {releaseEvidenceFromEnv} from '../../../../lib/ci/public-release-evidence.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
// Do not cache or redirect: the canonical alias must prove what it serves NOW.
export async function GET(request){
 const url=new URL(request.url);
 const identity=url.protocol==='https:'?url.hostname:'';
 const result=releaseEvidenceFromEnv(process.env,identity);
 return new Response(JSON.stringify(result.body),{
  status:result.status,
  headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Cache-Control':'private, no-store, no-cache, must-revalidate',
   'X-Robots-Tag':'noindex, nofollow',
   'Vary':'Host'
  }
 });
}
