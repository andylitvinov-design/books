import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/prescriptions/admin";
import { PRIVATE_HEADERS } from "@/lib/app/http";
import { getProjectKnowledgeSnapshot } from "@/lib/project-knowledge/google-sheets.mjs";
import { buildOwnerProjectContext } from "@/lib/project-knowledge/registry.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Owner-only, read-only retrieval interface for Project Intelligence.
 * NOT mounted in the client-facing /api/holistic-agent/* pipeline.
 */
export async function GET(request) {
  const headers={...PRIVATE_HEADERS};
  if(!await requireAdminRequest())
    return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
  const q=request.nextUrl.searchParams.get("q")||"";
  if(q.length>160) return NextResponse.json({error:"QUERY_TOO_LONG"},
    {status:400,headers});
  const locale=request.nextUrl.searchParams.get("locale")==="en"?"en":"ru";
  const data=await getProjectKnowledgeSnapshot();
  const result=buildOwnerProjectContext({
    ownerAuthorized:true,query:q,locale,records:data.records,
  });
  return NextResponse.json({
    ...result,knowledgeVersion:"hh-project-knowledge-v1",
    registryMode:data.mode,registryFetchedAt:data.fetchedAt,
    privateSourceLinksAvailable:data.mode==="drive_readonly",
  },{headers});
}
