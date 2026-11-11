import {NextResponse} from 'next/server';
import {cronAuthorized} from '@/lib/app/housekeeping-cron';
import {closeDatabase} from '@/lib/app/database';
import {runHourlyVideoScout} from '@/lib/automations/scout-runner';
import {runFourHourlyClassification} from '@/lib/automations/classifier-runner';
import {runWeeklyCouncilPlanner} from '@/lib/automations/weekly-council-runner';
import {runDailyVideoDigest} from '@/lib/automations/daily-video-digest-runner';
import {runGrowthDryRunWorker} from '@/lib/growth-studio/dry-run-worker.mjs';

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
    // Optional distinct task: no inference unless BOTH the deployment feature
    // flag and the private task gate are enabled. The L0 scout stays independent.
    let enrichment={status:'disabled'};
    if(process.env.HH_VIDEO_CLASSIFIER_ENABLED==='true'){
      try{enrichment=await runFourHourlyClassification();}
      catch{enrichment={status:'unconfirmed'};}
    }
    let council={status:'disabled'};
    if(process.env.HH_AUTOMATION_COUNCIL_ENABLED==='true'){
      try{council=await runWeeklyCouncilPlanner();}
      catch{council={status:'unconfirmed'};}
    }
    let dailyDigest={status:'disabled'};
    if(process.env.HH_VIDEO_SCOUT_DIGEST_ENABLED==='true'){
      try{dailyDigest=await runDailyVideoDigest();}
      catch{dailyDigest={status:'unconfirmed'};}
    }
    // Reuse this already scheduled CRON_SECRET route. The Growth Studio branch
    // remains simulation-only and OFF unless the owner explicitly enables its
    // existing dry-run flag; it never invokes a publishing adapter.
    let growthStudioDryRun={status:'disabled',simulated:0,externalPublishing:false};
    if(process.env.HH_GROWTH_QUEUE_DRY_RUN_ENABLED==='true'){
      try{growthStudioDryRun=await runGrowthDryRunWorker({environment:process.env,limit:5});}
      catch{growthStudioDryRun={status:'unconfirmed',simulated:0,externalPublishing:false};}
    }
    const status=[result.status,enrichment.status,council.status,dailyDigest.status,growthStudioDryRun.status]
      .includes('unconfirmed')?503:200;
    return NextResponse.json({...result,classification:{status:enrichment.status},
      weeklyCouncil:{status:council.status},dailyDigest:{status:dailyDigest.status},
      growthStudioDryRun},
      {status,headers:HEADERS});
  }catch{
    console.error('HH_VIDEO_SCOUT_CRON_UNAVAILABLE');
    return NextResponse.json({error:'SCOUT_UNAVAILABLE'},
      {status:503,headers:HEADERS});
  }finally{
    await closeDatabase();
  }
}
