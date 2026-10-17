import { getProfessionalScaleResource } from '@/data/assessments/professional-scale-resources-2026'
import { makeProfessionalScaleGuidePdf } from '@/lib/assessments/professional-scale-guide-pdf'

export const runtime = 'nodejs'

// Only the audited, explicit allowlist can produce public downloads.
// This is a scale INFORMATION sheet, never an unlicensed questionnaire.
export async function GET(_request, { params }) {
  const { key } = await params
  const resource = getProfessionalScaleResource(key)
  if (!resource) return new Response('Scale reference not found', { status: 404 })
  const pdf = makeProfessionalScaleGuidePdf(resource)
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + key + '-scale-guide.pdf"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
