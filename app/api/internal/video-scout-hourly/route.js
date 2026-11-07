import {NextResponse} from 'next/server';
import {cronAuthorized} from '@/lib/app/housekeeping-cron';
import {closeDatabase} from '@/lib/app/database';
import {runHourlyVideoScout} from '@/lib/automations/scout-runner';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=90;
export const preferredRegion='yul1';
const HEADERS={
  'Cache-Control':'private, no-store, max-age=0, must-revalidate',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
};

export async function GET(request){
  if(process.env.VERCEL_ENV!=='production')return NextResponse.json({error:'NOT_AVAILABLE'},
    {status:404,headers:HEADERS});
  if(!cronAuthorized(request,process.env))return NextResponse.json({error:'UNAUTHORIZED'},
    {status:401,headers:HEADERS});
  if(new URL(request.url).search)return NextResponse.json({error:'INVALID_PARAMETERS'},
    {status:400,headers:HEADERS});
  try{
    const result=await runHourlyVideoScout();
    const status=result.status==='unconfirmed'?503:200;
    return NextResponse.json(result,{status,headers:HEADERS});
  }catch{
    console.error('HH_VIDEO_SCOUT_CRON_UNAVAILABLE');
    return NextResponse.json({error:'SCOUT_UNAVAILABLE'},
      {status:503,headers:HEADERS});
  }finally{
    await closeDatabase();
  }
}
