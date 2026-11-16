import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const workflow = read('.github/workflows/holistic-house-native.yml')
const plist = read('ios/App/HHCourseWidget/Info.plist')
const project = read('ios/App/App.xcodeproj/project.pbxproj')

function pipelineContract(source) {
  const shell=source.match(/^defaults:\n  run:\n    shell: (.+)$/m)?.[1];
  assert.equal(shell,'bash --noprofile --norc -eo pipefail {0}',
    'All native log pipelines must preserve upstream failure status');
  assert.equal((source.match(/^\s+(?:-\s+)?shell:/gm)||[]).length,1,
    'No weaker per-job or per-step shell overrides');
  assert.doesNotMatch(source,/continue-on-error:\s*true|\|\|\s*true|set\s+\+e|set\s+\+o\s+pipefail/);
  assert.match(source,/permissions:\n  contents: read/);
  assert.match(source,/actions\/upload-artifact@v4/);
  assert.ok(source.includes("always() && github.event_name != 'pull_request'"),
    'Real build diagnostics must stay available after failures');

  const stepCommand=name=>{
    const marker='      - name: '+name+'\n';
    const start=source.indexOf(marker);
    assert.notEqual(start,-1,'Missing native build step: '+name);
    const end=source.indexOf('\n      - ',start+marker.length);
    const section=source.slice(start,end<0?undefined:end);
    assert.ok(section.includes("github.event_name != 'pull_request'"),
      'Expensive native builds must be production/manual only: '+name);
    const match=section.match(/^        run: ([^\n]+)(?:\n([\s\S]*))?/m);
    assert.ok(match,'Missing runnable native command: '+name);
    const kind=match[1].trim();
    const command=(kind==='|' || kind==='>-')
      ? (match[2]||'').split('\n').filter(line=>line.startsWith('          '))
          .map(line=>line.slice(10)).join(kind==='|'?'\n':' ').trim()
      :kind;
    assert.match(command,/2>&1\s*\|\s*tee\s+\S+\.log/,
      'Must retain upstream stderr and artifact logs: '+name);
    return command;
  };
  const commands=[
    stepCommand('Sync Android Capacitor project'),
    stepCommand('Build Android debug APK (not a production release)'),
    stepCommand('Sync iOS Capacitor project'),
    stepCommand('Build unsigned iOS simulator app (not installable on physical iPhone)'),
    stepCommand('Build unsigned iPhone arm64 bundle for owner personal signing'),
  ];
  assert.match(commands[0],/^npx cap sync android /);
  assert.match(commands[1],/^\.\/gradlew assembleDebug --stacktrace /);
  assert.match(commands[2],/^npx cap sync ios /);
  for(const command of commands.slice(3)){
    assert.match(command,/^xcodebuild -workspace ios\/App\/App\.xcworkspace/);
    assert.match(command,/CODE_SIGNING_ALLOWED=NO build 2>&1 \| tee /,
      'Unsigned native candidates must never silently become signed');
  }
  return {shell,commands};
}

// Execute the actual workflow commands with local stand-ins. Never invoke an
// SDK, dependency installer, signing tool, network request or real native build.
function runPipeline(command, shell, upstreamStatus) {
  const root = mkdtempSync(path.join(tmpdir(), 'native-ci-pipeline-'))
  try {
    const bin = path.join(root, 'bin'), android = path.join(root, 'android')
    mkdirSync(bin); mkdirSync(android)
    const stub = '#!/bin/sh\nprintf "native fixture stdout\\n"\nprintf "native fixture stderr\\n" >&2\nexit "$NATIVE_FIXTURE_STATUS"\n'
    for (const file of [path.join(bin, 'npx'), path.join(bin, 'xcodebuild'), path.join(android, 'gradlew')]) {
      writeFileSync(file, stub, { mode: 0o755 })
    }
    const script = path.join(root, 'step.sh')
    writeFileSync(script, command + '\nprintf "after native pipeline\\n"\n')
    const cwd = command.startsWith('./gradlew') ? android : root
    const [program, ...args] = shell.split(/\s+/).map(part => part === '{0}' ? script : part)
    const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, NATIVE_FIXTURE_STATUS: String(upstreamStatus) } })
    assert.ifError(result.error)
    const logName = command.match(/\| tee (\S+)$/)?.[1]
    return { ...result, log: readFileSync(path.resolve(cwd, logName), 'utf8') }
  } finally { rmSync(root, { recursive: true, force: true }) }
}

function assertWidgetIdentifier(info, pbx) {
  assert.equal((info.match(/<key>CFBundleIdentifier<\/key>/g) || []).length, 1)
  assert.match(info, /<key>CFBundleIdentifier<\/key>\s*<string>\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>/)
  const configs = [...pbx.matchAll(/\/\* Widget (Debug|Release) \*\/ = \{([\s\S]*?)\n\t\t\};/g)]
  assert.deepEqual(configs.map(match => match[1]), ['Debug', 'Release'])
  for (const [, name, settings] of configs) {
    assert.match(settings, /INFOPLIST_FILE = HHCourseWidget\/Info\.plist;/, name)
    assert.match(settings, /PRODUCT_BUNDLE_IDENTIFIER = app\.psialchemy\.mobile\.HHCourseWidget;/, name)
  }
  assert.match(info, /<key>NSExtensionPointIdentifier<\/key><string>com\.apple\.widgetkit-extension<\/string>/)
}

test('all five successor native pipelines use strict status without changing unsigned builds', () => {
  pipelineContract(workflow)
})

test('successful sync/build stand-ins pass and preserve stdout/stderr logs', () => {
  const { shell, commands } = pipelineContract(workflow)
  for (const command of commands) {
    const result = runPipeline(command, shell, 0)
    assert.equal(result.status, 0, command)
    assert.match(result.stdout, /after native pipeline/)
    assert.equal(result.log, 'native fixture stdout\nnative fixture stderr\n')
  }
})

test('failed sync/build stand-ins cannot become green through tee and still retain logs', () => {
  const { shell, commands } = pipelineContract(workflow)
  for (const command of commands) {
    const result = runPipeline(command, shell, 65)
    assert.equal(result.status, 65, command)
    assert.doesNotMatch(result.stdout, /after native pipeline/)
    assert.equal(result.log, 'native fixture stdout\nnative fixture stderr\n')
  }
})

test('removing pipefail reproduces the original false green and fails the source contract', () => {
  const { shell, commands } = pipelineContract(workflow)
  const weakened = shell.replace('-eo pipefail', '-e')
  for (const command of commands) assert.equal(runPipeline(command, weakened, 65).status, 0)
  assert.throws(() => pipelineContract(workflow.replace(shell, weakened)))
  assert.throws(() => pipelineContract(workflow.replace('      - name: Build unsigned iOS simulator app (not installable on physical iPhone)', '      - shell: bash -e {0}\n        name: Build unsigned iOS simulator app (not installable on physical iPhone)')))
  assert.throws(() => pipelineContract(workflow.replace('CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_ALLOWED=YES')))
})

test('widget plist uses its existing target-specific bundle identifier in Debug and Release', () => {
  assertWidgetIdentifier(plist, project)
})

test('missing, duplicated, hardcoded or wrong-target widget identifiers are rejected', () => {
  const entry = '<key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>'
  assert.ok(plist.includes(entry))
  for (const replacement of ['', entry + entry, '<key>CFBundleIdentifier</key><string>app.psialchemy.mobile</string>']) {
    assert.throws(() => assertWidgetIdentifier(plist.replace(entry, replacement), project))
  }
  assert.throws(() => assertWidgetIdentifier(plist, project.replaceAll('PRODUCT_BUNDLE_IDENTIFIER = app.psialchemy.mobile.HHCourseWidget;', 'PRODUCT_BUNDLE_IDENTIFIER = app.psialchemy.mobile;')))
})
