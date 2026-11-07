import {NextResponse} from 'next/server';
import {cronAuthorized} from '@/lib/app/housekeeping-cron';
import {getAppConfig} from '@/lib/app/config';
import {transaction,closeDatabase} from '@/lib/app/database';
import {commandCenterTick} from '@/lib/command-center/dispatcher.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;
export const preferredRegion='yul1';
const HEADERS={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function GET(request){
  if(process.env.VERCEL_ENV!=='production')
    return NextResponse.json({error:'NOT_AVAILABLE'},{status:404,headers:HEADERS});
  if(!cronAuthorized(request,process.env))
    return NextResponse.json({error:'UNAUTHORIZED'},{status:401,headers:HEADERS});
  if(new URL(request.url).search)return NextResponse.json({error:'INVALID_QUERY'},{status:400,headers:HEADERS});
  try{
    const result=await commandCenterTick({config:getAppConfig(),transaction});
    return NextResponse.json(result,{status:result.status==='unconfirmed'?503:200,headers:HEADERS});
  }catch{return NextResponse.json({error:'COMMAND_CENTER_UNAVAILABLE'},
    {status:503,headers:HEADERS});}
  finally{await closeDatabase();}
}
