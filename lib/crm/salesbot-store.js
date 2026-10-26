import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed } from '../app/crypto.js'
import { validateSalesbotFlow, simulateSalesbotFlow, SALESBOT_TOPICS } from './salesbot-flow.mjs'

// The caller must use createCrmRepository.withOwner() first. Its transaction
// sets HH's restricted hh_crm_backend role and verified account JWT claims.
// This is NOT a new CRM, transport, AI service, or customer message store.
const draftCtx = (owner, id) => ({
  accountId: owner, recordId: id, field: 'crm.salesbot.draft',
})
const previewCtx = (owner, id) => ({
  accountId: owner, recordId: id, field: 'crm.salesbot.preview',
})
const FLOW_PAGE_LIMIT = 30

function revisionOf(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000)
    throw new AppError('INVALID_SALESBOT_REVISION', 400)
  return value
}
function flowOf(input) {
  try { return validateSalesbotFlow(input) }
  catch { throw new AppError('INVALID_SALESBOT_FLOW', 400) }
}
function assertFields(value, fields) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).some(key => !fields.includes(key)))
    throw new AppError('INVALID_SALESBOT_COMMAND', 400)
}
function safeUuid(id) {
  try { requireUUID(id) }
  catch { throw new AppError('INVALID_SALESBOT_ID', 400) }
  return id
}
function view(row, owner, config) {
  return {
    id: row.id,
    flowKey: row.flow_key,
    flow: openSealed(row.draft_ciphertext, draftCtx(owner, row.id), config),
    status: row.status,
    revision: row.revision,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createCrmSalesbotStore(db, actor, config) {
  const owner = actor.id
  return {
    async listSalesbotFlows() {
      const rows = (await db.query(
        `select id,flow_key,draft_ciphertext,status,revision,version,created_at,updated_at
           from app.crm_salesbot_flows where owner_id=$1
           order by updated_at desc,id desc limit $2`,
        [owner, FLOW_PAGE_LIMIT],
      )).rows
      return rows.map(row => view(row, owner, config))
    },

    async listSalesbotRuns(){
      const rows=(await db.query(
        'select id,flow_id,version,state,created_at from app.crm_salesbot_runs '+
        'where owner_id=$1 order by created_at desc,id desc limit 20',
        [owner])).rows
      return rows.map(row=>({
        id:row.id,flowId:row.flow_id,version:row.version,
        state:row.state,createdAt:row.created_at,
      }))
    },

    async saveSalesbotFlow(input) {
      assertFields(input, ['id', 'flow', 'expectedRevision'])
      const flow = flowOf(input.flow)
      if (input.id === undefined) {
        if (input.expectedRevision !== undefined)
          throw new AppError('INVALID_SALESBOT_REVISION', 400)
        const count = (await db.query(
          'select count(*)::integer as count from app.crm_salesbot_flows where owner_id=$1',
          [owner],
        )).rows[0]?.count ?? 0
        if (count >= FLOW_PAGE_LIMIT) throw new AppError('SALESBOT_FLOW_LIMIT', 409)
        const id = randomUUID()
        const ciphertext = seal(flow, draftCtx(owner, id), config)
        try {
          const saved = (await db.query(
            `insert into app.crm_salesbot_flows
              (id,owner_id,flow_key,draft_ciphertext,status,revision,version)
             values($1,$2,$3,$4,'draft',0,0)
             returning id,flow_key,status,revision,version,created_at,updated_at`,
            [id, owner, flow.id, ciphertext],
          )).rows[0]
          return { ...saved, flowKey: saved.flow_key, flow, saved: true }
        } catch (error) {
          if (error?.code === '23505') throw new AppError('SALESBOT_FLOW_ALREADY_EXISTS', 409)
          throw error
        }
      }
      const id = safeUuid(input.id)
      const expectedRevision = revisionOf(input.expectedRevision)
      const row = (await db.query(
        'select id,flow_key,revision from app.crm_salesbot_flows where id=$1 and owner_id=$2 for update',
        [id, owner],
      )).rows[0]
      if (!row) throw new AppError('NOT_FOUND', 404)
      if (row.revision !== expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
      if (row.flow_key !== flow.id) throw new AppError('SALESBOT_FLOW_KEY_IMMUTABLE', 409)
      const encrypted = seal(flow, draftCtx(owner, id), config)
      const saved = (await db.query(
        `update app.crm_salesbot_flows
          set draft_ciphertext=$3,status=case when status in ('approved_preview','active_internal') then 'paused' else status end,
            revision=revision+1,updated_at=now()
          where id=$1 and owner_id=$2 returning id,flow_key,status,revision,version,created_at,updated_at`,
        [id, owner, encrypted],
      )).rows[0]
      return { ...saved, flowKey: saved.flow_key, flow, saved: true }
    },

    async approveSalesbotPreview(input) {
      assertFields(input, ['id', 'expectedRevision'])
      const id = safeUuid(input.id)
      const expectedRevision = revisionOf(input.expectedRevision)
      const row = (await db.query(
        'select draft_ciphertext,revision,version from app.crm_salesbot_flows where id=$1 and owner_id=$2 for update',
        [id, owner],
      )).rows[0]
      if (!row) throw new AppError('NOT_FOUND', 404)
      if (row.revision !== expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
      const graph = flowOf(openSealed(row.draft_ciphertext, draftCtx(owner, id), config))
      const snapshot = seal(graph, previewCtx(owner, id), config)
      const saved = (await db.query(
        `update app.crm_salesbot_flows
          set published_ciphertext=$3,status='approved_preview',version=version+1,
            revision=revision+1,updated_at=now()
          where id=$1 and owner_id=$2
          returning id,flow_key,status,revision,version,created_at,updated_at`,
        [id, owner, snapshot],
      )).rows[0]
      // "Approved preview" does not send, enroll, dispatch, or publish to visitors.
      return { ...saved, flowKey: saved.flow_key, flow: graph, saved: true }
    },

    async activateInternalSalesbotFlow(input){
      assertFields(input,['id','expectedRevision'])
      const id=safeUuid(input.id),expectedRevision=revisionOf(input.expectedRevision)
      const row=(await db.query(
        'select status,revision,published_ciphertext from app.crm_salesbot_flows '+
        'where id=$1 and owner_id=$2 for update',[id,owner])).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.revision!==expectedRevision)throw new AppError('REVISION_CONFLICT',409)
      if(row.status!=='approved_preview')throw new AppError('SALESBOT_PREVIEW_APPROVAL_REQUIRED',409)
      const graph=flowOf(openSealed(row.published_ciphertext,previewCtx(owner,id),config))
      // No outgoing provider messages; no user-interactive choices that could
      // leave a customer waiting for a bot prompt that never got sent.
      if(graph.nodes.some(node=>node.type==='choice'))
        throw new AppError('SALESBOT_INTERNAL_ONLY_REQUIRES_DETERMINISTIC_GRAPH',409)
      for(const topic of SALESBOT_TOPICS){
        const simulated=simulateSalesbotFlow(graph,{locale:'en',topic,answers:{}})
        if(simulated.status!=='completed')throw new AppError('SALESBOT_INTERNAL_FLOW_INCOMPLETE',409)
      }
      if(!graph.nodes.some(node=>node.type==='handoff'))
        throw new AppError('SALESBOT_INTERNAL_HANDOFF_REQUIRED',409)
      try{
        const saved=(await db.query(
          "update app.crm_salesbot_flows set status='active_internal',"+
          "revision=revision+1,updated_at=now() where id=$1 and owner_id=$2 "+
          "returning id,flow_key,status,revision,version,created_at,updated_at",
          [id,owner])).rows[0]
        return {...saved,flowKey:saved.flow_key,saved:true}
      }catch(error){
        if(error?.code==='23505')throw new AppError('SALESBOT_ONE_ACTIVE_INTERNAL_FLOW',409)
        throw error
      }
    },

    async pauseSalesbotPreview(input) {
      assertFields(input, ['id', 'expectedRevision'])
      const id = safeUuid(input.id)
      const expectedRevision = revisionOf(input.expectedRevision)
      const row = (await db.query(
        'select status,revision from app.crm_salesbot_flows where id=$1 and owner_id=$2 for update',
        [id, owner],
      )).rows[0]
      if (!row) throw new AppError('NOT_FOUND', 404)
      if (row.revision !== expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
      if (!['approved_preview','active_internal'].includes(row.status)) throw new AppError('SALESBOT_NOT_APPROVED', 409)
      const saved = (await db.query(
        `update app.crm_salesbot_flows
          set status='paused',revision=revision+1,updated_at=now()
          where id=$1 and owner_id=$2
          returning id,flow_key,status,revision,version,created_at,updated_at`,
        [id, owner],
      )).rows[0]
      return {
        id: saved.id, flowKey: saved.flow_key, status: saved.status,
        revision: saved.revision, version: saved.version, saved: true,
        createdAt: saved.created_at, updatedAt: saved.updated_at,
      }
    },
  }
}
