import 'server-only'
import { createDaybookJournalRepository } from './daybook-journal.js'
import { createPersonalGoalRepository } from './daybook-personal-goals.js'
import { verifyCoachContextSession } from './coach-context-session.js'
import { createDaybookCoachService } from './daybook-coach-service.mjs'

export function createDaybookCoachRepository(config) {
  return createDaybookCoachService(config, {
    journal: createDaybookJournalRepository(config),
    goals: createPersonalGoalRepository(config),
    verifySession: verifyCoachContextSession,
  })
}
