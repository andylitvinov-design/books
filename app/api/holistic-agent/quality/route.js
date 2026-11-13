import {NextResponse} from 'next/server';
import {getAppConfig,requireSameOrigin} from '@/lib/app/config';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {insertHiLearningQuality} from '@/lib/holistic-support/hi-learning-store';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

/** Called only after an explicit Helpful/Unhelpful action; never read chat text. */
export async function POST(request){
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    if(new URL(request.url).hostname!=='holistichouse.vercel.app'&&
       process.env.VERCEL_ENV==='production')
      return NextResponse.json({saved:false,reason:'NON_CANONICAL_HOST'}, {status:202,headers:PRIVATE_HEADERS});
    const body=await readBody(request,384);
    // The shared validator rejects unknown fields and Telegram impersonation.
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown')
      .split(',')[0].trim().slice(0,70);
    await consumeRate(config,{op:'hi-learning-optin',ip},8,86400);
    const result=await insertHiLearningQuality(config,body);
    return NextResponse.json(result,{status:result.saved?201:result.reason==='INVALID_FEEDBACK'?400:202,
      headers:PRIVATE_HEADERS});
  }catch(error){
    const safe=safeError(error);
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  }
}
