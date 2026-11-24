// Run with --conditions=react-server in a fresh loopback hh_app_test after
// tests/helpers/app-db-setup.mjs. Apply the production migrations below once.
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { A, B, SB, actor, adminClient, assertIsolated } from './helpers/app-db-setup.mjs'
import { createEnergyworkCourseRepository } from '../lib/academy/energywork-course-repository.js'
import { createCrmMessengerStore } from '../lib/crm/messenger-store.js'
import { closeDatabase } from '../lib/app/database.js'
import { seal } from '../lib/app/crypto.js'
import { ENERGYWORK_VERSION as version, ENERGYWORK_QUESTIONS, energyworkSequence } from '../data/academy/energywork-ai-schema.js'
import { writeReikiInitiationRequest } from '../data/academy/reiki-initiation-request.js'
import { PRACTITIONER_ID } from '../data/app-services.js'

const migrations = [
  '20261018122353','20261018123830','20261018183403','20261018184658','20261018185711','20261018190505',
  '20261019030943','20261019044513','20261019133000','20261019145500','20261019160000_hh_academy',
  '20261019170000','20261019180000','20261019190500','20261019203000','20261020212000',
  '20261020132212','20261020162323','20261026143713','20261026173446','20261026193500',
  '20261027004620','20261104141404','20261104155150','20261104165824','20261106215000',
  '20261113222405','20261113232313','20261114012134','20261116223413',
  '20261119023500','20261119025000','20261119025500','20261119190000',
  '20261124150000','20261124150100','20261124150200',
]

test('course commands populate only the verified teacher thread after explicit sharing, with exact answers, revisions and erasure', async t => {
  const local = new URL(assertIsolated())
  local.username='hh_app_ci_login'
  local.password='synthetic-ci-only'
  const db=await adminClient()
  t.after(async () => { await closeDatabase(); await db.end() })
  if (!(await db.query("select to_regclass('app.crm_contacts') as present")).rows[0].present) {
    const folder=new URL('../supabase/migrations/',import.meta.url)
    const files=await readdir(folder)
    for (const prefix of migrations) {
      const name=files.find(file=>file.startsWith(prefix))
      assert.ok(name,prefix)
      await db.query(await readFile(new URL(name,folder),'utf8'))
    }
  }

  const config={ databaseUrl:local.toString(), test:true, encryptionKey:randomBytes(32), encryptionKeyId:'test',
    secretKey:'synthetic-private-storage', supabaseUrl:'http://127.0.0.1:1' }
  // The storage boundary is simulated. The course, CRM, encryption, PostgreSQL
  // constraints, triggers and both restricted role reads are real.
  t.mock.method(globalThis,'fetch',async (input,init) => {
    const url=new URL(typeof input==='string'?input:input.url)
    assert.equal(url.origin,config.supabaseUrl)
    const segment='/storage/v1/'
    if (url.pathname===segment+'bucket/hh-remote-goal-photos')
      return Response.json({id:'hh-remote-goal-photos',public:false})
    if (url.pathname===segment+'object/info/hh-remote-goal-photos/reiki-initiation/'+A+'/photo.jpg')
      return Response.json({size:512,content_type:'image/jpeg'})
    if (init.method==='DELETE' && url.pathname===segment+'object/hh-remote-goal-photos')
      return Response.json([])
    assert.fail('Unexpected storage operation: '+url.pathname)
  })

  const learner=actor(), owner=actor(B,SB), course=createEnergyworkCourseRepository(config)
  const account=randomUUID(), contact=randomUUID(), thread=randomUUID()
  const businessHash='a'.repeat(64), userHash='b'.repeat(64)
  const encrypt=(id,field,value)=>seal(value,{accountId:B,recordId:id,field},config)
  await db.query("insert into app.accounts(id,onboarding_state) values ($1,'active'),($2,'active')",[A,B])
  await db.query('update app.practitioners set trusted_auth_user_id=$1 where id=$2',[B,PRACTITIONER_ID])
  await db.query("insert into app.crm_msg_accounts(id,owner_id,channel,external_hash) values($1,$2,'whatsapp',$3)",[account,B,businessHash])
  await db.query("insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle) values($1,$2,$3,$4,'ru','client')",
    [contact,B,encrypt(contact,'crm.contact',{displayName:'Synthetic learner'}),'c'.repeat(64)])
  await db.query(`insert into app.crm_msg_threads(id,owner_id,account_id,contact_id,user_hash,user_ciphertext,display_ciphertext,last_inbound_at)
    values($1,$2,$3,$4,$5,$6,$7,now())`,[thread,B,account,contact,userHash,encrypt(account,'crm.msgidentity',{}),encrypt(account,'crm.msgdisplay',{})])
  await db.query(`insert into app_private.crm_wa_diagnostic_sessions
    (business_hash,user_hash,stage,locale,last_message_hash,last_inbound_at,consent_at)
    values ($1,$2,'done','ru',$3,now(),now())`,[businessHash,userHash,'d'.repeat(64)])

  const messenger=async (who=owner) => {
    await db.query('begin')
    try {
      await db.query('set local role hh_crm_backend')
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(who.claims)])
      return await createCrmMessengerStore(db,who,config).listMessengerThreads(thread)
    } finally { await db.query('rollback') }
  }
  const entries=async()=> (await messenger()).messages.map(message=>message.courseEvent)
  const privateStart=await course.command(learner,{action:'start',consent:true,version})
  assert.equal(privateStart.sharingWithTeacher,false)
  await course.command(learner,{action:'save',version,slideId:'welcome-01',nextSlideId:'welcome-02',
    expectedRevision:privateStart.revision})
  assert.equal((await db.query('select count(*)::int n from app_private.reiki_course_events')).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int n from app_private.reiki_course_leads')).rows[0].n,0)
  await course.command(learner,{action:'delete',confirmed:true})

  let progress=await course.command(learner,{action:'start',consent:true,teacherConsent:true,version})
  assert.equal(progress.sharingWithMessenger,false,'legacy CRM opt-in alone does not authorize Messenger')
  assert.deepEqual(await entries(),[])
  const command=async (action,fields={})=> progress=await course.command(learner,
    {action,version,expectedRevision:progress.revision,expectedEnrollmentId:progress.enrollmentId,...fields})
  const save=async (slideId,nextSlideId,fields={})=> command('save',{slideId,nextSlideId,...fields})
  await command('share',{consent:true,teacherConsent:true,messengerConsent:true})
  assert.equal(progress.sharingWithMessenger,true)
  assert.equal(progress.messengerLinked,false)
  assert.deepEqual(await entries(),[])
  await db.query(`insert into app_private.crm_google_whatsapp_links(account_id,crm_owner_id,business_hash,user_hash)
    values($1,$2,$3,$4)`,[A,B,businessHash,userHash])
  assert.deepEqual((await entries()).map(e=>e.kind),['start'],'link reconciles without another course save')
  assert.equal((await course.read(learner)).messengerLinked,true)
  await assert.rejects(messenger(learner),{code:'NOT_FOUND'})

  const sequence=energyworkSequence(), request=writeReikiInitiationRequest({
    firstName:'Test',lastName:'Learner',location:'Test City',timezone:'UTC',preferredTime:'Monday',
    freeInitiation:'tantra',motivation:'Synthetic learner submitting this application for integration verification.',
  })
  const longAnswer='Сегодня я заметил(а) разницу. 🌿 Следующая строка.\n'.repeat(144)
  const answerFor=id=>id==='flight-04'?longAnswer:id==='end-01'?request:id==='welcome-02'?'beginner':id==='flight-03'?'felt-light':
    id==='tan-03'?'connected':ENERGYWORK_QUESTIONS[id]==='choice'?'tried':
    'Synthetic learning reflection for '+id+', intentionally long enough to finish this lesson.'
  for (let i=0;i<sequence.length-1;i++) {
    const id=sequence[i], next=sequence[i+1]
    if (id==='flight-05') {
      await save(id,id,{answer:'draft typing'})
      assert.ok(!(await entries()).some(e=>e.answer==='draft typing'))
    }
    await save(id,next,ENERGYWORK_QUESTIONS[id]?{answer:answerFor(id),commitAnswer:true}:{})
    if (id==='flight-05') {
      const edit='Отредактированный ответ\n第二行 🌿'
      const previous=progress.revision
      await save(id,id,{answer:edit})
      await assert.rejects(course.command(learner,{action:'save',version,expectedRevision:previous,slideId:id,nextSlideId:next,answer:'stale',commitAnswer:true}),{code:'COURSE_PROGRESS_CHANGED'})
      await save(id,next,{answer:edit,commitAnswer:true})
      await save(id,next,{answer:edit,commitAnswer:true})
      const versions=(await entries()).filter(e=>e.questionId===id)
      assert.deepEqual(versions.map(e=>[e.kind,e.answer,e.lesson]),[['answer',answerFor(id),1],['answer-edit',edit,1]])
      assert.ok(versions[0].revision<versions[1].revision)
    }
  }
  assert.equal(progress.status,'completed')
  const history=await entries()
  assert.deepEqual(history.filter(e=>e.kind==='milestone').map(e=>e.lesson),[1,2,3,4,5])
  assert.equal(history.at(-1).kind,'complete')
  assert.equal(history.find(e=>e.questionId==='flight-04').answer,longAnswer)
  assert.ok(!history.some(e=>e.questionId==='end-01'||e.kind==='application'))
  assert.deepEqual(history.filter(e=>e.kind==='answer').map(e=>e.questionId),
    sequence.filter(id=>ENERGYWORK_QUESTIONS[id]&&id!=='end-01'))
  await assert.rejects(command('apply',{confirmed:false}),{code:'CONFIRMATION_REQUIRED'})
  await command('apply',{confirmed:true})
  await command('apply',{confirmed:true})
  const page=await messenger()
  assert.equal(page.messages.filter(m=>m.courseEvent.kind==='application').length,1)
  assert.equal(page.messages.at(-1).courseEvent.answer,request)
  assert.ok(page.messages.every(m=>m.direction==='note'))
  assert.equal(page.threads[0].unreadCount,page.messages.length)
  assert.equal((await entries()).length,page.messages.length,'refresh is idempotent')
  const staleRevision=progress.revision
  await command('withdraw-sharing',{confirmed:true})
  assert.equal(progress.sharingWithMessenger,false)
  assert.equal(progress.status,'completed')
  assert.ok(progress.applicationLead,'explicit administration request is retained until deletion')
  assert.deepEqual(await entries(),[])
  assert.equal((await messenger()).threads[0].unreadCount,0)
  await assert.rejects(course.command(learner,{action:'share',version,expectedRevision:staleRevision,
    consent:true,teacherConsent:true,messengerConsent:true}),{code:'COURSE_PROGRESS_CHANGED'})
  await course.command(learner,{action:'start',version,consent:true,teacherConsent:true,messengerConsent:true})
  await save('flight-05',sequence[sequence.indexOf('flight-05')+1],{answer:'now private',commitAnswer:true})
  assert.deepEqual(await entries(),[])
  await command('delete',{confirmed:true})
  assert.equal((await course.read(learner)).enrolled,false)
  assert.deepEqual(await entries(),[])

  await db.query(await readFile(new URL('./reiki-messenger-identity.pg.sql',import.meta.url),'utf8'))

  const enrollment=await course.command(learner,{action:'start',version,consent:true,teacherConsent:true,messengerConsent:true})
  assert.equal(enrollment.messengerLinked,true)
  assert.notEqual(enrollment.enrollmentId,privateStart.enrollmentId)
  await assert.rejects(course.command(learner,{action:'delete',confirmed:true,
    expectedEnrollmentId:privateStart.enrollmentId,expectedRevision:enrollment.revision}),{code:'COURSE_ENROLLMENT_CHANGED'})
  assert.deepEqual((await entries()).map(e=>e.kind),['start'])
  await course.command(learner,{action:'delete',confirmed:true})
  assert.deepEqual(await entries(),[],'full deletion also cascades a still-authorized enrollment')

  const handoff={action:'start',version,consent:true,teacherConsent:true,messengerConsent:true,
    firstLesson:{answers:{'flight-03':'felt-light','flight-04':longAnswer.slice(0,200),
      'flight-05':answerFor('flight-05'),'welcome-02':'beginner'}}}
  const imported=await course.command(learner,handoff)
  assert.equal(imported.slideId,'tan-01')
  assert.equal((await course.command(learner,handoff)).revision,imported.revision)
  const batch=await entries()
  assert.deepEqual(batch.filter(e=>e.kind==='answer').map(e=>e.questionId),['welcome-02','flight-05','flight-04','flight-03'])
  assert.deepEqual(batch.map(e=>e.kind),['start','answer','answer','answer','answer','milestone'])
  assert.ok(batch[0].consentedAt)
  await course.command(learner,{action:'delete',confirmed:true})
})
