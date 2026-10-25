import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const workspace=read('components/app/practice-workspace.jsx')
const practiceCss=read('components/app/practice-dashboard.css')
const materials=read('components/app/practice-materials.jsx')
const builder=read('components/app/practitioner-course-builder.jsx')
const courseApi=read('app/api/app/practice/courses/route.js')
const courseContracts=read('lib/practitioners/course-contracts.js')

test('My Practice leads with clear service and meditation actions before utilities',()=>{
 const create=workspace.indexOf('data-practice-create-first')
 const toolbox=workspace.indexOf('className="hh-practice-v4-grid"')
 assert.ok(create>0&&toolbox>create,'Creation actions must precede the eight-way utility grid')
 assert.match(workspace,/data-create-practice-service/)
 assert.match(workspace,/data-create-practice-meditation/)
 assert.match(workspace,/onClick=\{startService\}/)
 assert.match(workspace,/aria-expanded=\{meditationPickerOpen\}/)
 assert.match(workspace,/startMeditation\('audio'\)/)
 assert.match(workspace,/startMeditation\('video'\)/)
 for(const item of ['List a service','Add a meditation','Разместить услугу','Добавить медитацию','Publicar un servicio','Añadir una meditación']){
   assert.ok(workspace.includes(item),item)
 }
 assert.doesNotMatch(workspace,/Create and share knowledge/)
})

test('new masters receive a registration handoff instead of privileged editor access',()=>{
 assert.match(workspace,/if\(!data\?\.practiceActivated\)/)
 assert.match(workspace,/setCreationGoal\('service'\)/)
 assert.match(workspace,/setCreationGoal\(kind\)/)
 assert.match(workspace,/document\.getElementById\('hh-practice-onboarding'\)/)
 assert.match(workspace,/data\?\.practiceActivated,creationGoal/)
 assert.match(workspace,/setNewServiceRequest\(current=>current\+1\)/)
 assert.match(workspace,/data\.serviceQuota\?\.canAdd===false/)
 assert.match(workspace,/const isOwner=Boolean\(ownerTools\)/)
 assert.match(workspace,/if\(busy\|\|!isOwner\)return/)
})

test('meditation creates a private draft in the existing authenticated course editor',()=>{
 assert.match(workspace,/setMaterialShortcut\(current=>\(\{tab:'courses',nonce:current\.nonce\+1\}\)\)/)
 assert.match(workspace,/meditationType=\{meditationType\}/)
 assert.match(materials,/meditationType=\{meditationType\}/)
 assert.match(materials,/setCourseComposerOpen\(shortcut\.tab==='courses'&&Boolean\(quickCreateCourse\)\)/)
 assert.match(materials,/startCreate=\{quickCreateCourse\}/)
 assert.match(builder,/isMeditation\?\{\.\.\.makeSlide\(\),kind:meditationType\}:makeSlide\(\)/)
 assert.match(builder,/api\(\{action:'create',course\}\)/)
 assert.match(courseApi,/createPractitionerCourseRepository/)
 assert.match(courseContracts,/new Set\(\['text','image','audio','video','embed'\]\)/)
 assert.match(workspace,/Nothing goes public without your confirmation/)
})

test('creation cards are responsive and accessible on mobile',()=>{
 assert.match(practiceCss,/My Practice · creation first/)
 assert.match(practiceCss,/> \.hh-practice-first-actions\{order:2\}/)
 assert.match(practiceCss,/@media\(max-width:640px\)/)
 assert.match(practiceCss,/@media\(max-width:360px\)/)
 assert.match(practiceCss,/\.hh-practice-first-actions-grid\{grid-template-columns:minmax\(0,1fr\)/)
 assert.match(practiceCss,/:focus-visible/)
 assert.match(practiceCss,/prefers-reduced-motion:reduce/)
 assert.match(workspace,/aria-controls="hh-practice-meditation-picker"/)
 assert.match(workspace,/id="hh-practice-meditation-picker"/)
})
