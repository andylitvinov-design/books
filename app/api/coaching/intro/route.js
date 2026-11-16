import {NextResponse} from 'next/server'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'

// Backward compatibility only. Natural coach audio is generated exclusively
// by /api/coaching/intro/:locale/:coach with an explicit persona voice.
export const dynamic='force-dynamic'
export async function GET(request){
  const url=new URL(request.url)
  const locale=url.searchParams.get('locale')
  const coach=url.searchParams.get('coach')
  if(!['en','ru','es'].includes(locale)||!getCoachPresentation(coach,locale)||
    [...url.searchParams.keys()].some(k=>!['locale','coach'].includes(k))){
    return NextResponse.json({error:'MY_COACH_INTRO_INVALID'},{status:400,headers:{
      'Cache-Control':'private, no-store'
    }})
  }
  return NextResponse.redirect(new URL(`/api/coaching/intro/${locale}/${coach}`,url),307)
}
