import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {waveTelegramLocalReply} from '../lib/crm/telegram-wave-local-reply.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=source('supabase/migrations/20261117005500_wave_conversation_receipts_v1.sql');

test('Ali is the only displayed native assistant name, old names may still be recognized as aliases',()=>{
  for(const [locale,identity,greeting] of [
    ['ru','Расскажи о себе','Приветик'],
    ['en','Who are you','Hi Ali'],
    ['es','Quién eres','Hola Ali'],
  ]){
    for(const text of [identity,greeting]){
      const result=waveNativeTurn({message:text,locale});
      assert.ok(result?.reply,text);
      assert.match(result.reply,/Ali/u);
      assert.doesNotMatch(result.reply,/\bWave\b/u);
      assert.equal(result.externalCalled,false);
    }
    for(const text of ['',locale==='ru'?'Поговорим':locale==='en'?'Let us chat':'Hablemos']){
      const reply=waveTelegramLocalReply({locale,turns:text?[{role:'user',text}]:[]});
      assert.ok(reply);
      assert.doesNotMatch(reply,/\bWave\b/u);
    }
  }
});

test('archive receipts keep original encrypted messages elsewhere, never store raw text',()=>{
  assert.match(migration,/create table app_private\.wave_conversation_receipts/i);
  assert.match(migration,/primary key \(source,source_id\)/i);
  assert.match(migration,/on conflict\(source,source_id\) do update/i);
  assert.match(migration,/after insert or update of status on app\.crm_msg_items/i);
  assert.match(migration,/from app\.crm_msg_items m/i);
  assert.match(migration,/from app_private\.agent_chat_history_pairs h/i);
  assert.match(migration,/from app_private\.coaching_session_messages m/i);
  assert.doesNotMatch(migration,/\b(body_ciphertext|payload_ciphertext|content_ciphertext|openSealed|pgp_sym_decrypt)\b/i);
  assert.match(migration,/force row level security/i);
  assert.match(migration,/revoke all on app_private\.wave_conversation_receipts/i);
  assert.match(migration,/no direct SELECT\/INSERT policies/i);
  assert.match(migration,/after delete on app_private\.agent_chat_history_pairs/i);
  assert.match(migration,/after delete on app\.crm_msg_items/i);
  assert.match(migration,/after delete on app_private\.coaching_session_messages/i);
  assert.match(migration,/grant execute on function app_private\.wave_quality_receipt_summary\(integer\)\s+to hh_app_backend/i);
});

test('coverage is owner-only, partial, version-unattributed and does not claim delivery from accepted',()=>{
  const store=source('lib/holistic-support/hi-learning-store.js');
  const page=source('app/admin/learning/page.jsx');
  assert.match(store,/pg_catalog\.to_regclass\('app_private\.wave_conversation_receipts'\)/);
  assert.match(store,/wave_quality_receipt_summary\(31\)/);
  assert.match(store,/PARTIAL_COVERAGE/);
  assert.match(store,/SCHEMA_NOT_DEPLOYED/);
  assert.match(page,/requireAdminRequest\(\)/);
  assert.match(page,/Принято провайдером не означает доставлено/i);
  assert.match(page,/Для содержательного анализа диалогов необходимо отдельное явное согласие/);
});

test('receipt index accepts every current CRM status, including send lifecycle states',()=>{
 const accepted=['received','processed','send_pending','provider_accepted',
   'delivery_unknown','draft','queued','accepted','delivered','read',
   'failed','blocked','unknown','stored'];
 const deliveryCheck=migration.match(/delivery text not null check \(delivery in\s*\(([^)]+)\)\)/i);
 assert.ok(deliveryCheck,'receipt status constraint must exist');
 const statuses=new Set([...deliveryCheck[1].matchAll(/'([a-z_]+)'/g)].map(m=>m[1]));
 for(const status of accepted)assert.ok(statuses.has(status),'missing CRM status '+status);
 assert.match(migration,/after insert or update of status on app\.crm_msg_items/i);
});

test('receipt index is consent-sensitive on insert, regrant, revocation and backfill',()=>{
  assert.match(migration,/from app_private\.agent_chat_history_consent c[\s\S]*c\.accepted is true/);
  assert.match(migration,/create trigger wave_history_consent_changed[\s\S]*after insert or update of accepted or delete/i);
  assert.match(migration,/delete from app_private\.wave_conversation_receipts r[\s\S]*r\.source='agent_history' and r\.owner_id=v_owner/);
  assert.match(migration,/create trigger wave_coaching_archive_consent_changed[\s\S]*after insert or update of accepted, revoked_at/i);
  assert.match(migration,/new\.accepted is false or new\.revoked_at is not null/);
  assert.match(migration,/c\.accepted and c\.revoked_at is null/);
  assert.match(migration,/delete from app_private\.wave_conversation_receipts r\s+using app_private\.coaching_session_messages m/);
  assert.match(migration,/revoke all on function app_private\.wave_reconcile_history_consent\(\)/i);
  assert.match(migration,/revoke all on function app_private\.wave_reconcile_coaching_consent\(\)/i);
});
