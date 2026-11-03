import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { readTestCatalogStats } from '@/lib/app/test-catalog-social-proof'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public, anonymous aggregate statistics. Never return raw runs, answers or identities. */
export async function GET() {
  try {
    const stats = await readTestCatalogStats(getAppConfig())
    return NextResponse.json({ stats }, {
      headers: { 'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'STATS_UNAVAILABLE' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
