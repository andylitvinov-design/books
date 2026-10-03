import { getAppConfig } from '../lib/app/config.js'
import { runAppHousekeeping } from '../lib/app/maintenance.js'
import { closeDatabase } from '../lib/app/database.js'

const batchSize = process.env.HH_APP_HOUSEKEEPING_BATCH
  ? Number(process.env.HH_APP_HOUSEKEEPING_BATCH)
  : 250

try {
  const result = await runAppHousekeeping(getAppConfig(), { batchSize })
  process.stdout.write(JSON.stringify(result) + '\n')
} finally {
  await closeDatabase()
}
