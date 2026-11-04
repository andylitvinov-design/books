/** Optional AI wording of video-guidance questions. Never chooses video footage. */
import {NextResponse} from 'next/server';
import {AppError} from '@/lib/assessments/contracts';
import {getAppConfig,requireSameOrigin} from '@/lib/app/config';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {parseVideoChatAiInput,generateVideoChatAiQuestion} from '@/lib/mandala/video-chat-ai.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=15;

export async function POST(request) {
  try {
    const config=getAppConfig();
    requireSameOrigin(request,config);
    const data=parseVideoChatAiInput(await readBody(request,2000));
    if(!data)throw new AppError('VIDEO_CHAT_INVALID_OR_NO_CONSENT',400);
    if(process.env.HH_FIRST_VIDEO_AI_ENABLED!=='true')
      throw new AppError('VIDEO_CHAT_FREE_AI_DISABLED',503);
    // Shared anonymous quotas across all visitors. No private text in logs.
    await consumeRate(config,{op:'video-chat-free-global-day'},60,86400);
    await consumeRate(config,{op:'video-chat-free-global-minute'},10,60);
    const result=await generateVideoChatAiQuestion(data,process.env);
    if(!result.reply)throw new AppError(result.error||'VIDEO_CHAT_AI_UNAVAILABLE',503);
    return NextResponse.json({reply:result.reply,provider:result.provider,changesApplied:false,
      externalVideoGenerated:false},{headers:PRIVATE_HEADERS});
  }catch(error){
    const e=safeError(error);
    return NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
  }
}
