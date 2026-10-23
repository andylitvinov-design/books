import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { refreshHomeGuideQualityDaily } from '@/lib/app/home-guide-quality'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { runHousekeepingCron } from '@/lib/app/housekeeping-cron'
import { purgeExpiredGoalPhotos } from '@/lib/practitioners/remote-goal-photo'
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
        const config = getAppConfig()
        try {
          const result = await runAppHousekeeping(config)
          // Existing daily authorized cron also refreshes non-identifying
          // guide clarification priorities; failure does not block maintenance.
          try { await refreshHomeGuideQualityDaily(config) }
          catch { console.error('HH_HOME_GUIDE_QUALITY_DAILY_FAILED') }
          try { await purgeExpiredGoalPhotos(config) }
          catch { console.error('HH_GOAL_PHOTO_RETENTION_FAILED') }
          return result
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
