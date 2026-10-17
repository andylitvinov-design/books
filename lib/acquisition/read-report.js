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
  })
}
