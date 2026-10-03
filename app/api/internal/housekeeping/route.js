import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { runHousekeepingCron } from '@/lib/app/housekeeping-cron'
import {
  recordAppHousekeepingFailure,
  runAppHousekeeping,
} from '@/lib/app/maintenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

export async function GET(request) {
  try {
    const result = await runHousekeepingCron(request, {
      run: async () => {
        if (process.env.HH_QA_FINAL_ACCEPTANCE === 'true') {
          const authorization = request.headers.get('authorization')
          const response = await fetch(
            'https://holistichouse.vercel.app/api/internal/r1-final-acceptance',
            {
              headers: authorization ? { authorization } : {},
              cache: 'no-store',
            },
          )
          const body = await response.json().catch(() => ({ status: 'invalid-response' }))
          console.info('HH_R1_FINAL_ACCEPTANCE', JSON.stringify(body))
          if (!response.ok || body.status !== 'passed') throw new Error('R1 acceptance failed')
          return {
            id: 'r1-final-acceptance',
            status: 'completed',
            guestSessionsDeleted: 0,
            viewerSessionsDeleted: 0,
            intentsDeleted: 0,
          }
        }

        const config = getAppConfig()
        try {
          return await runAppHousekeeping(config)
        } catch (error) {
          await recordAppHousekeepingFailure(config).catch(() => {})
          throw error
        }
      },
      reportFailure: ({ attempt }) => console.error('HH_APP_HOUSEKEEPING_FAILED', { attempt }),
    })
    return NextResponse.json(result.body, { status: result.status, headers: PRIVATE_HEADERS })
  } finally {
    await closeDatabase()
  }
}
