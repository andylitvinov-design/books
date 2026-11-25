import { AppError, onlyKeys } from '../assessments/contracts.js'
import { issueDaybookCoachTicket, verifyDaybookCoachTicket } from './daybook-coach-ticket.mjs'

export function createDaybookCoachService(config, { journal, goals, verifySession }) {
  async function sourceFor(actor, source) {
    let value
    try {
      value = source.kind === 'journal'
        ? (await journal.read(actor, source.itemId)).entry
        : (await goals.read(actor, source.itemId)).goal
    } catch (error) {
      if (error instanceof AppError && [404, 410].includes(error.status))
        throw new AppError('DAYBOOK_COACH_SOURCE_UNAVAILABLE', 404)
      throw error
    }
    if (!value || value.id !== source.itemId)
      throw new AppError('DAYBOOK_COACH_SOURCE_UNAVAILABLE', 404)
    if (value.revision !== source.revision) throw new AppError('DAYBOOK_COACH_SOURCE_CHANGED', 409)
    if (source.kind === 'goal' && !['accepted', 'active', 'in_progress'].includes(value.status))
      throw new AppError('DAYBOOK_COACH_SOURCE_UNAVAILABLE', 404)
    return { kind: source.kind, itemId: value.id, revision: value.revision, coachId: source.coachId,
      text: source.kind === 'journal' ? value.text : value.title,
      topicKey: source.kind === 'goal' ? value.areaKey : null,
      ...(source.kind === 'journal' && { localDay: value.localDay }) }
  }
  return {
    async handle(actor, input) {
      if (input?.operation === 'issue') {
        onlyKeys(input, ['operation', 'kind', 'itemId', 'revision', 'coachId'])
        const { kind, itemId, revision, coachId } = input
        const selection = { kind, itemId, revision, coachId }
        const ticket = issueDaybookCoachTicket(config, actor, selection)
        await sourceFor(actor, selection)
        return ticket
      }
      if (input?.operation === 'resolve') {
        onlyKeys(input, ['operation', 'token', 'coachId', 'contextSessionToken'])
        if (!verifySession(config, actor, input.contextSessionToken))
          throw new AppError('CONTEXT_SESSION_INVALID', 409)
        const source = verifyDaybookCoachTicket(config, actor, input.token, input.coachId)
        if (!source) throw new AppError('DAYBOOK_COACH_SOURCE_UNAVAILABLE', 404)
        return { source: await sourceFor(actor, source) }
      }
      throw new AppError('INVALID_DAYBOOK_COACH_OPERATION')
    },
  }
}
