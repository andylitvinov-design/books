import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { types } from 'node:util'

// Native ESLint formatter: never serialize or read source, message text,
// suggestions, fixes, URLs, rule metadata or arbitrary enumerable properties.
export const LIMITS = Object.freeze({ files: 20000, pathsBytes: 2 * 1024 * 1024, pathBytes: 256,
  messages: 100000, totalMessages: 1000000, records: 128, groups: 128, ruleBytes: 128, outputBytes: 131072 })
const INVALID = 'ESLINT_DIAGNOSTICS_INVALID_METADATA'
const fail = () => { throw new Error(INVALID) }
function own(value, key, optional = false) {
  if (value === null || typeof value !== 'object' || types.isProxy(value)) fail()
  let descriptor
  try { descriptor = Object.getOwnPropertyDescriptor(value, key) } catch { fail() }
  if (!descriptor) { if (optional) return undefined; fail() }
  if (!Object.hasOwn(descriptor, 'value')) fail()
  return descriptor.value
}
function integer(value, max = 10000000) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) fail()
  return value
}
function arrayLength(value, max) {
  if (types.isProxy(value) || !Array.isArray(value)) fail()
  return integer(own(value, 'length'), max)
}
function safePath(value) {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= LIMITS.pathBytes &&
    /^[A-Za-z0-9_./@()[\]{} +,=-]+$/.test(value) && !isAbsolute(value) &&
    value.split('/').every(part => part !== '' && part !== '.' && part !== '..')
}
function hex(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) fail()
  return value
}
function coordinates(message, key) {
  const value = own(message, key, true)
  if (value === undefined) return null
  return integer(value, 10000000) || fail()
}

export function formatDiagnostics(results, options) {
  const cwd = own(options, 'cwd')
  if (typeof cwd !== 'string' || cwd.length > 4096 || !isAbsolute(cwd)) fail()
  const paths = own(options, 'allowedPaths'), allowed = new Set()
  for (let i = 0, n = arrayLength(paths, LIMITS.files); i < n; i++) {
    const path = own(paths, String(i))
    if (!safePath(path) || allowed.has(path)) fail()
    allowed.add(path)
  }
  if (!allowed.size) fail()
  const inputCheckout = own(options, 'checkout'), parents = own(inputCheckout, 'parents')
  const checkout = { commit: hex(own(inputCheckout, 'commit')), tree: hex(own(inputCheckout, 'tree')), parents: [] }
  for (let i = 0, n = arrayLength(parents, 8); i < n; i++) checkout.parents.push(hex(own(parents, String(i))))
  const totals = { files: arrayLength(results, LIMITS.files), errors: 0, warnings: 0, fatalErrors: 0, messages: 0 }
  const records = [], groups = [], seen = new Set()
  let omittedRecords = 0, omittedGroups = 0, omittedGroupMessages = 0
  for (let i = 0; i < totals.files; i++) {
    const result = own(results, String(i)), filePath = own(result, 'filePath')
    if (typeof filePath !== 'string' || filePath.length > 8192 || !isAbsolute(filePath)) fail()
    const path = relative(cwd, filePath)
    if (!safePath(path) || !allowed.has(path) || seen.has(path)) fail()
    seen.add(path)
    const errors = integer(own(result, 'errorCount')), warnings = integer(own(result, 'warningCount'))
    const fatalErrors = integer(own(result, 'fatalErrorCount'))
    const messages = own(result, 'messages'), count = arrayLength(messages, LIMITS.messages)
    if (fatalErrors > errors || errors + warnings !== count || totals.messages + count > LIMITS.totalMessages) fail()
    let observedErrors = 0, observedWarnings = 0, observedFatal = 0
    for (let j = 0; j < count; j++) {
      const message = own(messages, String(j)), severity = own(message, 'severity')
      if (severity !== 1 && severity !== 2) fail()
      const fatal = own(message, 'fatal', true)
      if (fatal !== undefined && typeof fatal !== 'boolean') fail()
      if (fatal && severity !== 2) fail()
      let ruleId = own(message, 'ruleId')
      if (ruleId !== null && (typeof ruleId !== 'string' || ruleId.length === 0 ||
        Buffer.byteLength(ruleId) > LIMITS.ruleBytes || !/^[A-Za-z0-9_@/-]+$/.test(ruleId))) fail()
      if (ruleId === null) ruleId = fatal ? 'parser-fatal' : 'unclassified'
      const record = { path, line: coordinates(message, 'line'), column: coordinates(message, 'column'), ruleId, severity }
      if (severity === 2) observedErrors++; else observedWarnings++
      if (fatal) observedFatal++
      if (records.length < LIMITS.records) records.push(record); else omittedRecords++
    }
    if (observedErrors !== errors || observedWarnings !== warnings || observedFatal !== fatalErrors) fail()
    totals.errors += errors; totals.warnings += warnings; totals.fatalErrors += fatalErrors; totals.messages += count
    if (count) {
      if (groups.length < LIMITS.groups) groups.push({ path, errors, warnings, fatalErrors })
      else { omittedGroups++; omittedGroupMessages += count }
    }
  }
  const output = JSON.stringify({ schemaVersion: 1, checkout, totals, records, groups,
    omittedRecords, omittedGroups, omittedGroupMessages, completeRecords: omittedRecords === 0,
    completeGroups: omittedGroups === 0 }) + '\n'
  if (Buffer.byteLength(output) > LIMITS.outputBytes) fail()
  return output
}

function readTrackedPaths(directory) {
  let fd
  try {
    fd = openSync(join(directory, 'app-r1-lint', 'tracked-paths'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const stat = fstatSync(fd)
    if (!stat.isFile() || !stat.size || stat.size > LIMITS.pathsBytes) fail()
    const bytes = Buffer.alloc(stat.size)
    let offset = 0
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset)
      if (!count) fail()
      offset += count
    }
    const text = bytes.toString('utf8')
    if (!text.endsWith('\0')) fail()
    return text.slice(0, -1).split('\0')
  } catch { fail() } finally { if (fd !== undefined) closeSync(fd) }
}

export default function formatter(results, context) {
  // Environment fields contain only workflow-generated Git metadata, never
  // diagnostic content. All errors are constant, with CLI stderr suppressed by
  // the workflow; no caught exception payload is forwarded.
  try {
    const directory = own(process.env, 'RUNNER_TEMP')
    if (typeof directory !== 'string' || directory.length > 4096 || !isAbsolute(directory)) fail()
    const parents = own(process.env, 'HH_LINT_CHECKOUT_PARENTS')
    if (typeof parents !== 'string' || !/^(?:[0-9a-f]{40}(?: [0-9a-f]{40}){0,7})?$/.test(parents)) fail()
    return formatDiagnostics(results, { cwd: own(context, 'cwd'), allowedPaths: readTrackedPaths(directory),
      checkout: { commit: own(process.env, 'HH_LINT_CHECKOUT_SHA'), tree: own(process.env, 'HH_LINT_CHECKOUT_TREE'),
        parents: parents ? parents.split(' ') : [] } })
  } catch { fail() }
}
