import { searchResearchCatalogue } from '@/lib/assessments/research-directory-2026'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Public metadata-only route; never exports protected questionnaire items,
// scoring keys, normative scores, raw PDFs or user-sensitive information.
export async function GET(request) {
  const query=new URL(request.url).searchParams
  const payload=searchResearchCatalogue({
    q:query.get('q') || '',
    page:query.get('page') || 1,
    pageSize:query.get('limit') || 12,
  })
  return Response.json(payload,{
    headers:{
      'Cache-Control':'public, max-age=300, s-maxage=600',
      'X-Content-Type-Options':'nosniff',
    },
  })
}
