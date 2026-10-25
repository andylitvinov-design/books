import 'server-only'
import {transaction} from '../app/database.js'

export async function purgeOldPublicTraffic(config) {
  await transaction(config,null,async db=>
    db.query("delete from app_private.public_page_source_daily where day < (now() at time zone 'America/Toronto')::date - 90"),{server:true})
}
