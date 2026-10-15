import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Courses card exposes accessible top-right menu and explicit confirmation', () => {
  const selector = read('components/app/course-entry-selector.jsx')
  const css = read('components/app/course-entry-selector.module.css')
  const shell = read('components/app/my-course.jsx')
  assert.match(selector, /data-current-course-card/)
  assert.match(selector, /data-course-menu-trigger/)
  assert.match(selector, /<MoreVertical size=\{22\}/)
  assert.match(selector, /aria-expanded=\{menuOpen\}/)
  assert.match(selector, /data-course-actions-menu/)
  assert.match(selector, /courseOptions: 'Меню курса'/)
  assert.match(selector, /closeCourse: 'Закрыть курс'/)
  assert.match(selector, /closeCourse: 'Close course'/)
  assert.match(selector, /data-close-course-dialog/)
  assert.match(selector, /data-confirm-close-course/)
  assert.match(selector, /<button[^>]+disabled=\{closing\}[^>]*>\{t\.keepCourse\}/)
  assert.match(selector, /onCloseCourse\?\.\(\)/)
  assert.match(selector, /if \(success\) closeCourseDialogRef\.current\?\.close\(\)/)
  assert.match(selector, /closeCourseFailed/)
  assert.match(css, /\.current\{position:relative\}/)
  assert.match(css, /\.courseMenu\{position:absolute;top:10px;right:10px/)
  assert.match(css, /\.courseMenuTrigger\{[^}]*width:44px;height:44px/)
  assert.match(css, /@media\(max-width:420px\)\{\.courseMenu/)
  assert.match(shell, /async function closeCourse\(\)/)
  assert.match(shell, /action: 'close', expectedRevision: state\.course\.revision/)
  assert.match(shell, /onCloseCourse=\{closeCourse\} closing=\{busy\}/)
})

test('close-course DB migration is non-destructive and daily course hides closed state', () => {
  const migration = read('supabase/migrations/20261014225100_hh_growth_course_close.sql')
  const server = read('lib/app/growth-course.js')
  const daily = read('lib/app/growth-daily.js')
  assert.match(migration, /check \(status in \('active','paused','closed'\)\)/)
  assert.doesNotMatch(migration, /delete from|drop table/i)
  assert.match(server, /if \(row\?\.status === 'closed'\) row = null/)
  assert.match(server, /if \(!row \|\| row\.status === 'closed'\) reject\('COURSE_NOT_STARTED'/)
  assert.match(server, /where account_id=\$1 and course_id=\$2 and status in \('active','paused'\)/)
  assert.match(server, /status='archived'/)
  assert.match(server, /status='closed'/)
  assert.match(server, /status='active', stage=1/)
  assert.match(server, /concerns_ciphertext=null/)
  assert.match(server, /goals='\{\}'/)
  assert.match(server, /day_completions='\{\}'::jsonb/)
  assert.match(daily, /course\.status==='closed'/)
  assert.doesNotMatch(server, /delete from app_private\.growth_(?:courses|cycles|sessions|checkins)/i)
})

test('server close is owner-scoped, revision-checked, preserves prior practice and allows fresh enrolment', async () => {
  const source = read('lib/app/growth-course.js')
  const factorySource = source.slice(source.indexOf('export function createGrowthCourseRepository'))
    .replace(/^export /, '')
  let record = { id: 'course-owner', account_id: 'owner', stage: 4, status: 'active', revision: 7,
    goals: ['calm_regulation'], focus_tags: ['stress'], test_keys: ['hh-weekly-pulse'],
    scale_keys: ['hh-weekly-pulse::weekly.tension'], day_completions: {1: {completedAt:'yesterday'}} }
  const cycles = [{id:'cycle-1',status:'active',sessions: [{id:'saved-lesson'}]}]
  const sql = []
  const db = { async query(query, args) {
    sql.push({query,args})
    if (query.includes('for update') && query.includes('growth_courses'))
      return {rows: [record]}
    if (query.includes('update app_private.growth_cycles set')) {
      assert.deepEqual(Array.from(args), ['owner','course-owner'])
      for (const cycle of cycles) if (['active','paused'].includes(cycle.status)) cycle.status = 'archived'
      return {rows:[]}
    }
    if (query.includes('update app_private.growth_courses set')) {
      assert.deepEqual(Array.from(args), ['owner','course-owner'])
      if (query.includes("status='closed'")) record = {...record,status:'closed',revision:record.revision+1}
      if (query.includes("status='active', stage=1")) record = {...record,status:'active',stage:1,revision:record.revision+1,
        goals:[],focus_tags:[],test_keys:[],scale_keys:[],day_completions:{},started_at:null,chosen_at:null}
      return {rows:[record]}
    }
    throw new Error('Unexpected SQL in close-course contract: '+query)
  }}
  const context = {
    transaction: async (_config,_actor,fn) => fn(db),
    accountReady: async () => undefined,
    onlyKeys: () => {},
    validRevision: (body,row) => {
      if (body.expectedRevision !== row.revision) throw new Error('REVISION_CONFLICT')
    },
    reject: (code='INVALID_COURSE_INPUT') => { throw new Error(code) },
    gather: async (_db,_actor,row) => ({course:row?.status==='closed' ? null : row}),
  }
  const factory = runInNewContext(factorySource+'\ncreateGrowthCourseRepository;',context)
  const service = factory({})
  await assert.rejects(service.command({id:'owner'},{action:'close',expectedRevision:6}),/REVISION_CONFLICT/)
  assert.equal(cycles[0].status,'active')
  const closed = await service.command({id:'owner'},{action:'close',expectedRevision:7})
  assert.equal(closed.course,null)
  assert.equal(cycles[0].status,'archived')
  assert.equal(cycles[0].sessions.length,1)
  assert.equal(record.stage,4)
  assert.equal(record.status,'closed')
  await assert.rejects(service.command({id:'owner'},{action:'pause',expectedRevision:8}),/COURSE_NOT_STARTED/)
  const restarted = await service.command({id:'owner'},{action:'start',consent:true})
  assert.equal(restarted.course.stage,1)
  assert.equal(restarted.course.status,'active')
  assert.deepEqual(Array.from(restarted.course.goals),[])
  assert.deepEqual(Array.from(restarted.course.focus_tags),[])
  assert.deepEqual(restarted.course.day_completions,{})
  assert.equal(cycles[0].sessions.length,1)
  assert.equal(cycles[0].status,'archived')
  assert.equal(sql.filter(entry=>/update app_private\.growth_cycles/.test(entry.query)).length,1)
  assert.ok(sql.every(entry=>!/delete from/i.test(entry.query)))
})
