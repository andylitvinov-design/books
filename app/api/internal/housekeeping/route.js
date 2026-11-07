import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { closeDatabase } from '@/lib/app/database'
import { refreshHomeGuideQualityDaily } from '@/lib/app/home-guide-quality'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { runHousekeepingCron } from '@/lib/app/housekeeping-cron'
import { purgeExpiredGoalPhotos } from '@/lib/practitioners/remote-goal-photo'
import { purgeExpiredFreeExpressMedia } from '@/lib/practitioners/free-express-media'
import { purgeOldPublicTraffic } from '@/lib/analytics/public-traffic-retention'
import {
  recordAppHousekeepingFailure,
  runAppHousekeeping,
} from '@/lib/app/maintenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 90

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
          // Emergency feature rollback must not also stop deleting already-uploaded media.
          try { await purgeExpiredFreeExpressMedia(config) }
          catch { console.error('HH_FREE_EXPRESS_MEDIA_RETENTION_FAILED') }
          try { await purgeOldPublicTraffic(config) }
          catch { console.error('HH_PUBLIC_TRAFFIC_RETENTION_FAILED') }
          // Reuse this existing CRON_SECRET-protected daily task as a
          // no-cost safety net when YouTube accepted an owner-approved MP4
          // but processing outlasted the upload request. This is *only*
          // a read-only check of the already recorded provider video ID.
          if(process.env.HH_OWNER_VIDEO_ENABLED==='true'){
            try{
              const {reconcilePendingOwnerYoutubeVideo}=await import(
                '@/lib/practitioners/owner-telegram-video-service')
              await reconcilePendingOwnerYoutubeVideo(config)
            }catch{console.error('HH_OWNER_YOUTUBE_READBACK_RECONCILE_FAILED')}
            // Up to three owner-approved cabinet videos with provider IDs.
            // Never attempt another upload or inspect unconsented material.
            try{
              const {reconcileOwnerYoutubePublications}=await import(
                '@/lib/youtube/owner-publication-service')
              await reconcileOwnerYoutubePublications(config)
            }catch{console.error('HH_OWNER_PUBLICATIONS_RECONCILE_FAILED')}
          }
          // Existing daily CRON_SECRET maintenance doubles as a no-cost
          // retention and pending-reply safety net (not near-real-time recovery).
          if(process.env.HH_SUBSCRIBER_AI_SCHEMA_READY==='true'){
            try{
              const {pruneSubscriberAiState,drainSubscriberAiOutbox}=await import(
                '@/lib/app/subscriber-ai-telegram')
              await pruneSubscriberAiState(config)
              if(process.env.HH_SUBSCRIBER_AI_ENABLED==='true')
                await drainSubscriberAiOutbox(config,process.env,{limit:3})
            }catch{console.error('HH_SUBSCRIBER_AI_HOUSEKEEPING_FAILED')}
          }
          // Existing authorized daily housekeeping also recovers queued text /
          // delivery when an after() execution ended unexpectedly. No new cron.
          if(process.env.HH_AI_TELEGRAM_QUEUE_ENABLED==='true'){
            try{
              const {pruneAiQueue}=await import('@/lib/app/telegram-ai-queue')
              const {runTelegramAiQueues,pruneTelegramAiTemporaryVideos}=
                await import('@/lib/app/telegram-ai-worker')
              await runTelegramAiQueues(config,{messages:2,videos:0,deliveries:2})
              await pruneAiQueue(config)
              await pruneTelegramAiTemporaryVideos(config)
            }catch{console.error('HH_AI_QUEUE_HOUSEKEEPING_FAILED')}
          }
          // Always prune private AI render orphans, even after a feature
          // rollback/STOP. This is the EXISTING CRON_SECRET daily task,
          // not a new scheduled invocation or an unbounded bucket scan.
          try{
            const {pruneTelegramAiOrphanUploads}=
              await import('@/lib/app/telegram-ai-worker')
            await pruneTelegramAiOrphanUploads(config)
          }catch{console.error('HH_AI_VIDEO_PRIVATE_ORPHAN_CLEANUP_FAILED')}
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
