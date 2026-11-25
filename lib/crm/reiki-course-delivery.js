import { openSealed } from '../app/crypto.js'

export async function reconcileReikiMessenger(db) {
  const { rows: [result] } = await db.query('select app_private.reconcile_my_reiki_messenger() as linked')
  return result?.linked === true
}

export async function readReikiMessengerEvents(db, threadId, page, config) {
  const ids = page.filter(item => item.reiki_event_id).map(item => item.id)
  if (!ids.length) return new Map()
  const { rows } = await db.query('select * from app_private.reiki_messenger_page($1,$2::uuid[])', [threadId, ids])
  return new Map(rows.map(row => {
    const payload = openSealed(row.payload_ciphertext, {
      accountId: row.learner_id, recordId: row.event_id, field: 'academy.messenger_event',
    }, config)
    return [row.event_id, { ...payload, occurredAt: row.occurred_at }]
  }))
}
