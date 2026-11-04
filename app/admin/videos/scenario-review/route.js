import {randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {uiLocaleCookie} from '@/lib/ui-locale';
import {buildOwnerVideoReviewModel} from '@/lib/mandala/video-owner-review.mjs';
import {renderVideoOwnerReviewHtml} from '@/lib/mandala/video-owner-review-html.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(request){
  if(!await requireAdminRequest())
    return Response.redirect(new URL('/admin/login',request.url),303);

  const security={
    'Cache-Control':'private, no-store, no-cache, max-age=0, must-revalidate',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
  };
  try{
    const jar=await cookies();
    const rawLocale=jar.get(uiLocaleCookie)?.value;
    const locale=['ru','en','es'].includes(rawLocale)?rawLocale:'ru';
    const model=buildOwnerVideoReviewModel({locale});
    const nonce=randomBytes(16).toString('base64');
    const html=renderVideoOwnerReviewHtml(model,nonce);
    const csp=[
      "default-src 'none'","base-uri 'none'","form-action 'none'",
      "frame-ancestors 'none'","object-src 'none'","connect-src 'none'",
      "script-src 'nonce-"+nonce+"'",
      "style-src 'nonce-"+nonce+"' 'unsafe-inline'",
      "img-src 'self' data:","media-src 'self'",
    ].join('; ');
    return new Response(html,{status:200,headers:{
      ...security,'Content-Type':'text/html; charset=utf-8',
      'Content-Security-Policy':csp,
    }});
  }catch{
    // Never serve unverified or malformed asset evidence as owner-ready video.
    return new Response('VIDEO_REVIEW_EVIDENCE_UNAVAILABLE',{status:503,headers:{
      ...security,'Content-Type':'text/plain; charset=utf-8',
    }});
  }
}
