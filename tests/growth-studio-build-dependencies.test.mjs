import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const workflow=read('.github/workflows/hh-growth-studio.yml')
const pkg=JSON.parse(read('package.json'))
const lock=JSON.parse(read('package-lock.json'))
const compilerTests=[
  'coaching-gentle-dialogue','coaching-intelligence-offline','coaching-intelligence-p1',
  'coaching-session-onboarding','coaching-topic-groups','personal-coaching-voice',
  'tantric-intimacy-coaching',
]

test('Growth Studio production build installs locked development tools before unchanged lifecycle checks',()=>{
  const job=workflow.match(/^  next-build:\n([\s\S]*)$/m)?.[1]
  assert.ok(job,'Growth Studio build job remains enabled')
  assert.match(job,/^      NODE_ENV: production$/m)
  assert.match(job,/^        run: npm ci --include=dev$/m)
  assert.match(job,/^        run: npm run build$/m)
  assert.ok(job.indexOf('run: npm ci --include=dev')<job.indexOf('run: npm run build'))
  assert.doesNotMatch(job,/continue-on-error|--ignore-scripts|\|\|\s*true/)
})

test('TypeScript is an existing lock-pinned development dependency, not an ad-hoc install',()=>{
  assert.ok(pkg.devDependencies.typescript)
  assert.equal(lock.packages[''].devDependencies.typescript,pkg.devDependencies.typescript)
  const compiler=lock.packages['node_modules/typescript']
  assert.equal(compiler.dev,true)
  assert.match(compiler.version,/^\d+\.\d+\.\d+$/)
  assert.match(compiler.integrity,/^sha512-/)
})

test('prebuild retains every compiler-dependent coaching release test',()=>{
  assert.equal(pkg.scripts.build,'next build')
  assert.match(pkg.scripts.prebuild,/(?:^|&& )npm run test:coaching:release(?: &&|$)/)
  for(const name of compilerTests){
    const path='tests/'+name+'.test.mjs'
    assert.ok(pkg.scripts['test:coaching:release'].split(/\s+/).includes(path),path+' remains required')
    assert.match(read(path),/(?:from\s*|import\()'typescript'/,path+' still performs compiler-backed checks')
  }
})

test('dependency and guard changes trigger Growth Studio and run the guard without installed packages',()=>{
  for(const path of ['package.json','package-lock.json','tests/growth-studio-build-dependencies.test.mjs'])
    assert.ok(workflow.includes("      - '"+path+"'"),path+' triggers the workflow')
  const editorial=workflow.split(/^  next-build:/m)[0]
  assert.match(editorial,/^        run: node --test tests\/growth-studio-build-dependencies\.test\.mjs$/m)
})
