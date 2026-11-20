import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const migration=load('supabase/migrations/20261119025500_hh_crm_tg_account_kind_v1.sql')
const store=load('lib/crm/messenger-store.js')
const webhook=load('lib/crm/messenger-webhook.js')

test('One owner can have separately scoped Telegram Bot and Business entries',()=>{
 assert.match(migration,/ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'primary'/)
 assert.match(migration,/channel='telegram' AND account_kind='business'/)
 assert.match(migration,/UNIQUE \(owner_id,channel,account_kind\)/)
 assert.match(migration,/DROP CONSTRAINT IF EXISTS crm_msg_accounts_owner_id_channel_key/)
 assert.match(migration,/UNIQUE\(channel,external_hash\)/)
 assert.match(store,/where owner_id=\$1 and channel=\$2 and account_kind='primary'/)
 assert.match(store,/account_kind\) values\(\$1,\$2,\$3,\$4,'primary'\)/)
 assert.match(store,/order by channel,case when account_kind='primary' then 0 else 1 end/)
 assert.match(store,/accountKind:r\.account_kind/)
 assert.match(store,/accountKind:a\.account_kind/)
})

test('Unverified Business routes never send a Bot-identity reply',()=>{
 assert.match(store,/enabled:r\.enabled&&r\.account_kind==='primary'&&crmReplyTransportReady\(replyChannel\)/)
 assert.match(store,/enabled:thread\.enabled&&thread\.account_kind==='primary'&&crmReplyTransportReady\(replyChannel\)/)
 assert.match(store,/enabled:row\.enabled&&row\.account_kind==='primary'&&crmReplyTransportReady\(replyChannel\)/)
 assert.match(webhook,/app_private\.crm_msg_ingest/)
 assert.doesNotMatch(migration,/GRANT\s+(?:ALL|INSERT|SELECT|UPDATE)/i)
 assert.doesNotMatch(migration,/UPDATE app\.crm_msg_accounts SET|DELETE FROM app\.crm_msg_accounts/i)
})

test('No existing contact, thread, RLS or provider identity constraints are removed',()=>{
 assert.doesNotMatch(migration,/DROP (?:TABLE|POLICY|SCHEMA|INDEX)/i)
 assert.doesNotMatch(migration,/DROP CONSTRAINT IF EXISTS crm_msg_accounts_channel_external_hash_key/)
 assert.doesNotMatch(migration,/DROP CONSTRAINT IF EXISTS crm_msg_accounts_id_owner_id_key/)
 assert.doesNotMatch(migration,/DROP CONSTRAINT IF EXISTS crm_msg_accounts_owner_id_fkey/)
 assert.match(migration,/schema change alone does NOT authorize\/ingest personal Business chats/)
})
