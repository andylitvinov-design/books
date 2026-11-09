// Reuse the existing App R1 isolated Postgres service; never target production.
import pg from 'pg'
import {spawnSync} from 'node:child_process'
import {coachingRlsCiUrls} from './ci-coaching-rls-guard.mjs'

const urls=coachingRlsCiUrls()
const client=new pg.Client({connectionString:urls.control})
await client.connect()
try {
  const existing=await client.query('select 1 from pg_database where datname=$1',['hh_coaching_rls_test'])
  if(existing.rowCount)throw new Error('COACHING_RLS_DB_ALREADY_EXISTS')
  await client.query('create database hh_coaching_rls_test')
} finally {await client.end()}
const result=spawnSync(process.execPath,['--conditions=react-server','--test','tests/personal-coaching-rls-isolated.integration.mjs'],{
  encoding:'utf8',timeout:120000,env:{...process.env,HH_TEST_ADMIN_DATABASE_URL:urls.test,HH_COACHING_RLS_TEST:'synthetic-only'},
})
if(result.stdout)process.stdout.write(result.stdout)
if(result.stderr)process.stderr.write(result.stderr)
if(result.error)throw result.error
if(result.status!==0||!/^# pass 1$/m.test(result.stdout||'')||!/^# skipped 0$/m.test(result.stdout||''))
  throw new Error('COACHING_RLS_TEST_NOT_EXECUTED')
