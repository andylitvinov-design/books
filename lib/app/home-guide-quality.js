import "server-only";
import { transaction } from "./database.js";

// Only coarse opted-in categories. Never query or persist chat contents.
export async function insertHomeGuideQuality(config, feedback) {
  return transaction(config, null, async db => {
    await db.query(
      "insert into app_private.home_guide_quality_events (category, locale, signal) values ($1,$2,$3)",
      [feedback.category, feedback.locale, feedback.signal],
    );
    return { saved: true };
  }, { server: true });
}

export async function getHomeGuidePriorities(config) {
  return transaction(config, null, async db => {
    const rows = await db.query(`
      select category, sum(event_count)::integer as votes
      from app_private.home_guide_quality_daily
      where signal = 'clarified'
        and report_day >= (now() at time zone 'America/Toronto')::date - 7
        and category <> 'other'
      group by category
      having sum(event_count) >= 5
      order by sum(event_count) desc, category asc
      limit 4
    `);
    // Return names only; never expose even daily counts to clients.
    return rows.rows.map(item => item.category);
  }, { server: true });
}

export async function refreshHomeGuideQualityDaily(config) {
  return transaction(config, null, async db => {
    // Deterministic, idempotent daily rollup. Only approved categories move to
    // the public ordering, never raw phrases and never auto-generated advice.
    const rollup = await db.query(`
      insert into app_private.home_guide_quality_daily
        (report_day, category, locale, signal, event_count, refreshed_at)
      select (created_at at time zone 'America/Toronto')::date,
             category, locale, signal, count(*)::integer, now()
      from app_private.home_guide_quality_events
      where created_at >= now() - interval '3 days'
      group by 1, 2, 3, 4
      on conflict (report_day, category, locale, signal)
      do update set event_count = excluded.event_count, refreshed_at = now()
      returning report_day
    `);
    const oldEvents = await db.query(
      "delete from app_private.home_guide_quality_events where created_at < now() - interval '14 days'",
    );
    const oldDaily = await db.query(
      "delete from app_private.home_guide_quality_daily where report_day < (now() at time zone 'America/Toronto')::date - 60",
    );
    return { refreshed: rollup.rowCount ?? 0,
      eventsPruned: oldEvents.rowCount ?? 0,
      daysPruned: oldDaily.rowCount ?? 0 };
  }, { server: true });
}
