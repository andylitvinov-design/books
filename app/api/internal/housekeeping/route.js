import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import {
  recordAppHousekeepingFailure,
  runAppHousekeeping,
  runHousekeepingCron,
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
