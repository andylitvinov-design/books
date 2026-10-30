import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { createAppRepository } from "@/lib/app/repository";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { consultPsychologistMind } from "@/lib/holistic-support/psychologist-mind.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
const FOCI=new Set(["stress","relationships","self_worth","meaning"]);
const LANGUAGES=new Set(["en","ru","es"]);
const LENGTHS=new Set([5,8,12,20]);
const COURSE_ID=/^[a-z][a-z0-9_]{1,60}$/;

export async function POST(request) {
  let auth;
  try {
    if (process.env.HH_AGENT_CHAT_ENABLED!=="true" ||
      (process.env.VERCEL_ENV==="production" &&
        process.env.HH_AGENT_PRODUCTION_APPROVED!=="true"))
      throw new AppError("AGENT_DISABLED",503);
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    await createAppRepository(config).ensureAccount(actor);
    const body=await readBody(request,2048);
    onlyKeys(body,["locale","focus","courseId","resourceImagery","safetyAcknowledged","minutes"]);
    if (!LANGUAGES.has(body.locale) || !FOCI.has(body.focus) ||
      body.safetyAcknowledged!==true || typeof body.resourceImagery!=="boolean" ||
      !LENGTHS.has(body.minutes) ||
      (body.courseId!==undefined &&
        (typeof body.courseId!=="string" || !COURSE_ID.test(body.courseId))))
      throw new AppError("INVALID_PROGRAM_PREVIEW",400);
    await consumeRate(config,{op:"holistic-educational-outline",actorId:actor.id},10,3600);
    // User-confirmed readiness only authorizes low-intensity educational
    // planning. It is not clinical safety assessment or permission to deliver
    // therapy. No trauma, private source scores, practitioner notes or raw
    // client words are passed to the planner.
    const plan=consultPsychologistMind({
      task:"video_course",locale:body.locale,
      intent:{focus:body.focus,durationMinutes:body.minutes,
        noImagery:body.resourceImagery!==true,
        ...(body.courseId?{courseId:body.courseId}:{})},
      safety:{status:"clear"},
      access:{authenticated:true,ownerScoped:true},
      consent:{resourceImagery:body.resourceImagery===true},
    });
    if (plan?.status!=="draft_ready" || !Array.isArray(plan.lessons) ||
      plan.lessons.length!==8 || plan.published!==false ||
      plan.rendered!==false || plan.mediaAssetsVerified!==false)
      return auth.apply(NextResponse.json({
        status:"unavailable",published:false,mediaReady:false,lessons:[],
      },{headers:PRIVATE_HEADERS,status:409}));
    const lessons=plan.lessons.map(item=>({
      number:item.number, title:item.title,
      steps:Array.isArray(item.practicalSteps)?item.practicalSteps.slice(0,3):[],
      objective:item.learningObjective,needsSafetyRecheck:true,
      videoReady:false,audioReady:false,
    }));
    return auth.apply(NextResponse.json({
      status:"draft_ready",courseId:plan.courseId,title:plan.title,
      lessons,kind:"educational_8_step_outline",
      published:false,mediaReady:false,requiresPractitionerOrEditorialReview:true,
      recordedVideoCount:0,generatedMediaCount:0,saved:false,
    },{headers:PRIVATE_HEADERS}));
  } catch(error) {
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
