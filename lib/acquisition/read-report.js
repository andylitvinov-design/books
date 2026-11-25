import 'server-only'
import { requireAdminRequest } from '../prescriptions/admin.js'
import { getAppConfig } from '../app/config.js'
import { transaction } from '../app/database.js'
import { loadAcquisitionReport } from './report.js'

export async function readAcquisitionReport(period = 7) {
  return loadAcquisitionReport({
    period,
    authorize: requireAdminRequest,
    readDaily: async range => transaction(getAppConfig(), null, async db => {
      // Existing aggregate table only. No contacts, consultation requests, health,
      // payment records or attendee identities are read or joined by this report.
      const result = await db.query(`
        select day::text as day,
          sum(impressions)::text as impressions,
          sum(order_clicks)::text as "orderClicks",
          sum(whatsapp_clicks)::text as "whatsappClicks",
          sum(telegram_clicks)::text as "telegramClicks"
        from app_private.service_funnel_daily
        where day >= $1::date and day <= $2::date
        group by day order by day
      `, [range.start, range.end])
      return result.rows
    }, { server: true }),
    readPublicPages: async range => transaction(getAppConfig(), null, async db => {
      // Aggregate public path and fixed source only. No personal identifiers, CRM or joins.
      // Fail closed rather than truncate a report with too many daily rows.
      const result=await db.query(`
        select day::text as day, page_path as "pagePath", source,
          landings::text as landings, page_views::text as views,
          action_clicks::text as clicks
        from app_private.public_page_source_daily
        where day >= $1::date and day <= $2::date
        order by day, page_path, source limit 10001
      `,[range.start,range.end])
      if(result.rows.length>10000)throw new Error('WEB_REPORT_TOO_LARGE')
      return result.rows
    },{server:true}),
  })
}
