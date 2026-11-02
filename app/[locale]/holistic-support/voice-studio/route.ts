import { NextResponse } from "next/server";
import { isPublicLocale } from "@/data/academy/catalog";

type Params = { params: Promise<{ locale: string }> };
export async function GET(request: Request, { params }: Params) {
  const {locale}=await params;
  if(!isPublicLocale(locale))return new Response("Not found",{status:404});
  // Preserve previously advertised links without a redundant public page
  // or loading a second Voice Studio component in the same document.
  const url=new URL("/"+locale+"/holistic-support/mandala",request.url);
  url.hash="voice-studio";
  return NextResponse.redirect(url,307);
}
