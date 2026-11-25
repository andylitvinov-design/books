import { reikiIntroSlot } from '@/lib/academy/reiki-intro-audio-model'
import { publicReikiIntroAudio } from '@/lib/academy/reiki-intro-audio-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const query = new URL(request.url).searchParams
  const lesson = query.get('lesson')
  const locale = query.get('locale')
  if (!reikiIntroSlot(lesson, locale))
    return Response.json({ audio: null }, {
      status: 400, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  const audio = await publicReikiIntroAudio(lesson, locale)
  return Response.json({ audio }, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=45, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
