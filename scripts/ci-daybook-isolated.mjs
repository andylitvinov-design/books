// Reuse App R1's existing synthetic Postgres service. Never drop a database.
import pg from 'pg'
import {spawnSync} from 'node:child_process'
import {daybookCiTargets} from './ci-daybook-targets.mjs'
const {control,targets}=daybookCiTargets()
const client=new pg.Client({connectionString:control})
await client.connect()
try{
 const role=await client.query("select rolsuper,rolbypassrls from pg_roles where rolname='hh_app_backend'")
 if(role.rowCount!==1||role.rows[0].rolsuper||role.rows[0].rolbypassrls)throw new Error('DAYBOOK_BACKEND_ROLE_UNSAFE')
 const existing=await client.query('select datname from pg_database where datname=any($1::text[])',[targets.map(t=>t.database)])
 if(existing.rowCount)throw new Error('DAYBOOK_DB_ALREADY_EXISTS')
 for(const target of targets)await client.query('create database "'+target.database+'"')
}finally{await client.end()}
for(const target of targets){
 const result=spawnSync(process.execPath,['--conditions=react-server','--test',target.file],{
  encoding:'utf8',timeout:120000,env:{...process.env,[target.variable]:target.url},
 })
 if(result.stdout)process.stdout.write(result.stdout)
 if(result.stderr)process.stderr.write(result.stderr)
 if(result.error)throw result.error
 const passes=Number((result.stdout||'').match(/^# pass (\d+)$/m)?.[1]||0)
 if(result.status!==0||passes<target.minimumPasses||!/^# fail 0$/m.test(result.stdout||'')||!/^# skipped 0$/m.test(result.stdout||''))throw new Error('DAYBOOK_ACCEPTANCE_NOT_EXECUTED: '+target.database)
}
