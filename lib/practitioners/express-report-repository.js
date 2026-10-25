import 'server-only'
import { transaction as databaseTransaction } from '../app/database.js'
import { seal, openSealed } from '../app/crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import {
  validateExpressReportCreate,
  validateExpressReportEdit,
  validateExpressReportTransition,
  requireExpressReportReady,
} from './express-report-contracts.js'

// Reuse the verified app account, request, crypto and RLS; NEVER the owner's
// separate /admin prescription store or private, manually-entered client CRM.
const context = row => ({
  accountId: row.client_account_id,
  recordId: row.id,
  field: 'practice.express_report',
})
const activePractitioner = "p.active AND p.status IN ('approved','submitted','changes_requested')"
const notFound = () => { throw new AppError('NOT_FOUND', 404) }
const dateText = value => value instanceof Date
  ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

function reportView(row, config) {
  const content = openSealed(row.document_ciphertext, context(row), config)
  return {
    id: row.id,
    requestId: row.request_id,
    language: row.language_preference,
    issuedOn: dateText(row.issued_on),
    content,
    status: row.status,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

async function ownedReport(db, actor, id, lock = false) {
  requireUUID(id)
  const row = (await db.query(
    'SELECT r.* FROM app.practitioner_express_reports r ' +
    'JOIN app.practitioners p ON p.id=r.practitioner_id ' +
    'WHERE r.id=$1 AND r.practitioner_account_id=$2 AND p.trusted_auth_user_id=$2 ' +
    'AND ' + activePractitioner + (lock ? ' FOR UPDATE OF r' : '') + ' LIMIT 1',
    [id, actor.id],
  )).rows[0]
  if (!row) notFound()
  return row
}

export function createExpressReportRepository(config, { transaction = databaseTransaction } = {}) {
  return {
    async listForPractitioner(actor) {
      return transaction(config, actor, async db => {
        const rows = (await db.query(
          'SELECT r.* FROM app.practitioner_express_reports r ' +
          'JOIN app.practitioners p ON p.id=r.practitioner_id ' +
          'WHERE r.practitioner_account_id=$1 AND p.trusted_auth_user_id=$1 ' +
          'AND ' + activePractitioner +
          ' ORDER BY r.created_at DESC,r.id DESC LIMIT 60',
          [actor.id],
        )).rows
        return { items: rows.map(row => reportView(row, config)) }
      })
    },

    async listForClient(actor) {
      return transaction(config, actor, async db => {
        const rows = (await db.query(
          "SELECT * FROM app.practitioner_express_reports " +
          "WHERE client_account_id=$1 AND status='published' " +
          'ORDER BY published_at DESC,id DESC LIMIT 60',
          [actor.id],
        )).rows
        return { items: rows.map(row => reportView(row, config)) }
      })
    },

    async create(actor, input) {
      const data = validateExpressReportCreate(input)
      return transaction(config, actor, async db => {
        // Never associate reports by email, name or marketing CRM contact.
        // Only the requester's actual verified app account can receive this.
        const request = (await db.query(
          'SELECT r.id,r.account_id,r.recipient_practitioner_id,p.trusted_auth_user_id ' +
          'FROM app.consultation_requests r ' +
          'JOIN app.practitioners p ON p.id=r.recipient_practitioner_id ' +
          'WHERE r.id=$1 AND p.trusted_auth_user_id=$2 AND ' + activePractitioner +
          ' LIMIT 1',
          [data.requestId, actor.id],
        )).rows[0]
        if (!request) notFound()

        const prior = (await db.query(
          'SELECT * FROM app.practitioner_express_reports ' +
          'WHERE id=$1 AND practitioner_account_id=$2 LIMIT 1',
          [data.operationId, actor.id],
        )).rows[0]
        if (prior) {
          const old = reportView(prior, config)
          if (old.requestId === data.requestId && old.issuedOn === data.issuedOn &&
              old.language === data.language && old.status === 'draft' &&
              JSON.stringify(old.content) === JSON.stringify(data.content))
            return { report: old, duplicate: true }
          throw new AppError('REPORT_CONFLICT', 409)
        }

        const record = {
          id: data.operationId,
          request_id: request.id,
          practitioner_id: request.recipient_practitioner_id,
          practitioner_account_id: actor.id,
          client_account_id: request.account_id,
        }
        const ciphertext = seal(data.content, context(record), config)
        const row = (await db.query(
          'INSERT INTO app.practitioner_express_reports ' +
          '(id,request_id,practitioner_id,practitioner_account_id,client_account_id,' +
          'language_preference,issued_on,document_ciphertext) ' +
          'VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
          [record.id,record.request_id,record.practitioner_id,record.practitioner_account_id,
            record.client_account_id,data.language,data.issuedOn,ciphertext],
        )).rows[0]
        return { report: reportView(row,config), duplicate: false }
      })
    },

    async edit(actor, id, input) {
      const data = validateExpressReportEdit(input)
      return transaction(config, actor, async db => {
        const row = await ownedReport(db,actor,id,true)
        if (row.revision !== data.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        if (row.status !== 'draft') throw new AppError('PUBLISHED_REPORT_IMMUTABLE', 409)
        const ciphertext = seal(data.content, context(row), config)
        const updated = (await db.query(
          'UPDATE app.practitioner_express_reports SET language_preference=$3,' +
          'issued_on=$4,document_ciphertext=$5,revision=revision+1,updated_at=now() ' +
          'WHERE id=$1 AND practitioner_account_id=$2 AND revision=$6 RETURNING *',
          [id,actor.id,data.language,data.issuedOn,ciphertext,data.expectedRevision],
        )).rows[0]
        if (!updated) throw new AppError('REVISION_CONFLICT', 409)
        return { report: reportView(updated,config) }
      })
    },

    async changeStatus(actor,id,input) {
      const action = validateExpressReportTransition(input)
      return transaction(config, actor, async db => {
        const row = await ownedReport(db,actor,id,true)
        if (row.revision !== action.expectedRevision) throw new AppError('REVISION_CONFLICT',409)
        if (action.action === 'publish') {
          if (row.status !== 'draft') throw new AppError('INVALID_REPORT_STATE',409)
          requireExpressReportReady(openSealed(row.document_ciphertext,context(row),config))
        } else if (row.status !== 'published') {
          throw new AppError('INVALID_REPORT_STATE',409)
        }
        const updated = (await db.query(
          'UPDATE app.practitioner_express_reports SET status=$3,' +
          'published_at=CASE WHEN $3=$4 THEN now() ELSE published_at END,' +
          'revision=revision+1,updated_at=now() ' +
          'WHERE id=$1 AND practitioner_account_id=$2 AND revision=$5 RETURNING *',
          [id,actor.id,action.action === 'publish' ? 'published' : 'revoked',
            'published',action.expectedRevision],
        )).rows[0]
        if (!updated) throw new AppError('REVISION_CONFLICT',409)
        return { report: reportView(updated,config) }
      })
    },
  }
}
