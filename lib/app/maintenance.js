import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { transaction } from './database.js'

function boundedBatch(value) {
  const number = Number(value ?? 250)
  if (!Number.isInteger(number) || number < 1 || number > 1000)
    throw new AppError('INVALID_BATCH', 400)
  return number
}

export async function runAppHousekeeping(config, { batchSize = 250 } = {}) {
  const limit = boundedBatch(batchSize)
  return transaction(
    config,
    null,
    async (db) => {
      const run = (
        await db.query(
          `insert into app_private.housekeeping_runs(status)
           values('running') returning id,started_at`,
        )
      ).rows[0]

      const intents = (
        await db.query(
          `with doomed as (
             select id from app_private.save_intents
             where status<>'committed' and expires_at<=now()
             order by expires_at,id
             limit $1
             for update skip locked
           )
           delete from app_private.save_intents i
           using doomed d
           where i.id=d.id
           returning i.id`,
          [limit],
        )
      ).rows

      const viewers = (
        await db.query(
          `with doomed as (
             select id from app_private.report_viewer_sessions
             where expires_at<=now() or revoked_at is not null
             order by expires_at,id
             limit $1
             for update skip locked
           )
           delete from app_private.report_viewer_sessions v
           using doomed d
           where v.id=d.id
           returning v.id`,
          [limit],
        )
      ).rows

      const guestIntents = (
        await db.query(
          `with doomed as (
             select i.id from app_private.save_intents i
             join app_private.guest_sessions g on g.id=i.source_guest_session_id
             where i.status<>'committed' and (g.expires_at<=now() or g.revoked_at is not null)
             order by i.expires_at,i.id
             limit $1
             for update of i,g skip locked
           )
           delete from app_private.save_intents i
           using doomed d
           where i.id=d.id
           returning i.id`,
          [limit],
        )
      ).rows

      const guestIds = (
        await db.query(
          `select id from app_private.guest_sessions
           where (expires_at<=now() or revoked_at is not null)
             and not exists(
               select 1 from app_private.save_intents i
               where i.source_guest_session_id=app_private.guest_sessions.id
                 and i.status<>'committed'
             )
           order by expires_at,id
           limit $1
           for update skip locked`,
          [limit],
        )
      ).rows.map((row) => row.id)

      if (guestIds.length) {
        await db.query(
          `delete from app_private.save_intents
           where source_guest_session_id=any($1::uuid[]) and status<>'committed'`,
          [guestIds],
        )
        await db.query(
          'delete from app_private.guest_sessions where id=any($1::uuid[])',
          [guestIds],
        )
      }

      // Privacy retention for consented, first-party report-viewer activity.
      // Reuse the existing daily housekeeping cron; no new scheduled job.
      await db.query(
        `with doomed as (
           select id from app_private.client_session_engagement_events
           where created_at < now()-interval '90 days'
           order by created_at,id limit $1 for update skip locked
         )
         delete from app_private.client_session_engagement_events e
         using doomed d where e.id=d.id`,
        [limit],
      )
      // Expired viewer cookies no longer need server-side consent rows;
      // deleting these sessions also deletes their consent preferences.
      await db.query(
        `with doomed as (
           select id from app_private.client_session_viewer_sessions
           where expires_at < now()-interval '7 days'
              or revoked_at < now()-interval '7 days'
           order by expires_at,id limit $1 for update skip locked
         )
         delete from app_private.client_session_viewer_sessions v
         using doomed d where v.id=d.id`,
        [limit],
      )

      // Public Telegram news consent retention. Reuse the existing owner-only
      // housekeeping cron, not a separate Vercel schedule or paid worker.
      // Keep the daily batch larger than the guest signup rate ceiling.
      await db.query(
        `with doomed as (
           select id from app_private.notification_telegram_guest_requests
           where expires_at < now()-interval '48 hours'
           order by expires_at,id limit ($1::int * 12)
           for update skip locked
         )
         delete from app_private.notification_telegram_guest_requests r
         using doomed d where r.id=d.id`,
        [limit],
      )
      await db.query(
        `with doomed as (
           select id from app_private.notification_telegram_guest_links
           where consent_expires_at<=now()
           order by consent_expires_at,id limit ($1::int * 12)
           for update skip locked
         )
         delete from app_private.notification_telegram_guest_links l
         using doomed d where l.id=d.id`,
        [limit],
      )

      const completed = (
        await db.query(
          `update app_private.housekeeping_runs
           set completed_at=now(),status='completed',
               guest_sessions_deleted=$2,viewer_sessions_deleted=$3,intents_deleted=$4
          where id=$1
           returning id,started_at,completed_at,status,
             guest_sessions_deleted,viewer_sessions_deleted,intents_deleted`,
          [run.id, guestIds.length, viewers.length, intents.length + guestIntents.length],
        )
      ).rows[0]

      return {
        id: completed.id,
        startedAt: completed.started_at,
        completedAt: completed.completed_at,
        status: completed.status,
        guestSessionsDeleted: completed.guest_sessions_deleted,
        viewerSessionsDeleted: completed.viewer_sessions_deleted,
        intentsDeleted: completed.intents_deleted,
      }
    },
    { server: true },
  )
}

export async function recordAppHousekeepingFailure(config) {
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `insert into app_private.housekeeping_runs(status,completed_at)
           values('failed',now())
           returning id,started_at,completed_at,status,
             guest_sessions_deleted,viewer_sessions_deleted,intents_deleted`,
        )
      ).rows[0]
      return {
        id: row.id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status,
        guestSessionsDeleted: row.guest_sessions_deleted,
        viewerSessionsDeleted: row.viewer_sessions_deleted,
        intentsDeleted: row.intents_deleted,
      }
    },
    { server: true },
  )
}

export async function appHousekeepingStatus(config) {
  return transaction(
    config,
    null,
    async (db) => {
      const row = (
        await db.query(
          `select id,started_at,completed_at,status,
                  guest_sessions_deleted,viewer_sessions_deleted,intents_deleted
           from app_private.housekeeping_runs
           where status='completed'
           order by completed_at desc,id desc
           limit 1`,
        )
      ).rows[0]
      if (!row) return null
      return {
        id: row.id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status,
        guestSessionsDeleted: row.guest_sessions_deleted,
        viewerSessionsDeleted: row.viewer_sessions_deleted,
        intentsDeleted: row.intents_deleted,
      }
    },
    { server: true },
  )
}
