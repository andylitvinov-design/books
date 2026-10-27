// Optional, owner-approved post-production SFX. Never runs in a public request or Telegram webhook.
import {spawn} from 'node:child_process'
import {readFile, writeFile, rename, mkdir, open, rm, stat, lstat} from 'node:fs/promises'
import {dirname, extname, isAbsolute, join, resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {pathToFileURL} from 'node:url'

const API = 'https://api.openverse.org/v1/audio/'
const LICENSES = new Set(['cc0', 'by', 'pdm'])
const SOURCES = new Set(['freesound', 'jamendo'])
const EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac'])
const MAX_CUES = 12
const MAX_TYPES = 8
const MAX_FILE_BYTES = 10_000_000
const SEARCHES_PER_DAY = 180 // conservative local ceiling, not a claim about the API's global quota

function deny(message) { throw new Error('SFX_' + message) }
function validType(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,47}$/.test(value) }
function numeric(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function safeUrl(value, host) {
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash || u.hostname.endsWith('.local')) return false
    return u.hostname === host || u.hostname.endsWith('.' + host)
  } catch { return false }
}
function extensionOf(item) {
  const extension = String(item.filetype || '').toLowerCase().replace(/^\./, '')
  if (EXTENSIONS.has(extension)) return extension
  if (extension) return null // reported format overrides any misleading URL suffix
  try {
    const value = extname(new URL(item.url).pathname).slice(1).toLowerCase()
    return EXTENSIONS.has(value) ? value : null
  } catch { return null }
}
function validAudio(bytes, ext) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16 || bytes.length > MAX_FILE_BYTES) return false
  if (ext === 'mp3') return bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224)
  if (ext === 'wav') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE'
  if (ext === 'ogg') return bytes.toString('ascii', 0, 4) === 'OggS'
  if (ext === 'flac') return bytes.toString('ascii', 0, 4) === 'fLaC'
  if (ext === 'm4a') return bytes.toString('ascii', 4, 8) === 'ftyp'
  return false
}
async function validLocalFile(path, ext) {
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.size < 16 || info.size > MAX_FILE_BYTES) return false
    const data = await readFile(path)
    return validAudio(data, ext)
  } catch { return false }
}
async function readManifest(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    if (parsed && parsed.version === 1 && parsed.assets && typeof parsed.assets === 'object') return parsed
    deny('MANIFEST_INVALID')
  } catch (error) {
    if (error.code === 'ENOENT') return {version:1, assets:{}, usage:{day:'', count:0}}
    throw error
  }
}
async function writeAtomic(path, content) {
  const temp = path + '.' + randomUUID() + '.tmp'
  try { await writeFile(temp, content, {flag:'wx', mode:0o600}); await rename(temp, path) }
  finally { await rm(temp, {force:true}).catch(()=>{}) }
}
async function syncCredits(dir, assets) {
  const credits = Object.keys(assets).sort().map(type => assets[type].attribution)
  await writeAtomic(join(dir, 'credits.txt'), credits.join('\n') + (credits.length ? '\n' : ''))
}
export function validateSfxPlan(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.cues) || input.cues.length < 1 || input.cues.length > MAX_CUES) deny('PLAN_INVALID')
  if (typeof input.video !== 'string' || !input.video.endsWith('.mp4') || typeof input.output !== 'string' || !input.output.endsWith('.mp4') || input.video === input.output) deny('VIDEO_PATH_INVALID')
  const unique = new Map()
  const cues = input.cues.map(cue => {
    if (!validType(cue?.type) || typeof cue.query !== 'string' || cue.query.trim() !== cue.query || cue.query.length < 3 || cue.query.length > 100 || /[\r\n@]|https?:|(?:\+?\d[\d ()-]{8,})/.test(cue.query)) deny('QUERY_INVALID')
    if (!numeric(cue.atSeconds, 0, 120) || !numeric(cue.durationSeconds ?? 2, 0.05, 20) || !numeric(cue.gain ?? 0.12, 0.01, 0.3)) deny('TIMING_INVALID')
    if (unique.has(cue.type) && unique.get(cue.type) !== cue.query) deny('TYPE_QUERY_CONFLICT')
    unique.set(cue.type, cue.query)
    return {type:cue.type, query:cue.query, atMs:Math.round(cue.atSeconds * 1000), duration:(cue.durationSeconds ?? 2), gain:(cue.gain ?? 0.12)}
  })
  if (unique.size > MAX_TYPES) deny('TOO_MANY_TYPES')
  return {...input, cues}
}
export function openverseSearchUrl(query) {
  const url = new URL(API)
  url.searchParams.set('q', query)
  url.searchParams.set('license', 'cc0,by,pdm')
  url.searchParams.set('source', 'freesound,jamendo')
  url.searchParams.set('mature', 'false')
  url.searchParams.set('page_size', '20')
  return url.href
}
export function chooseOpenverseAudio(results, query) {
  if (!Array.isArray(results)) return []
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) || []
  return results.filter(item => {
    if (!item || !LICENSES.has(item.license) || !SOURCES.has(item.source) || typeof item.attribution !== 'string' || !item.attribution.trim() || !extensionOf(item)) return false
    const host = item.source === 'freesound' ? 'freesound.org' : 'jamendo.com'
    return safeUrl(item.url, host) && typeof item.id === 'string' && /^[a-zA-Z0-9-]{6,80}$/.test(item.id)
  }).map((item, index) => {
    const title = String(item.title || '').toLowerCase()
    const tagText = Array.isArray(item.tags) ? item.tags.map(tag => String(tag?.name || '')).join(' ').toLowerCase() : ''
    const score = tokens.reduce((n, token) => n + (title.includes(token) ? 4 : 0) + (tagText.includes(token) ? 1 : 0), 0)
    const duration = Number(item.duration) // Openverse audio duration is in milliseconds
    return {item, score:score + (duration > 0 && duration < 30000 ? 1 : 0), index}
  }).sort((a, b) => b.score - a.score || a.index - b.index).map(row => row.item)
}
// curl honors the local HTTPS proxy where Node fetch/undici may time out.
// It is bounded, anonymous and never follows redirects to a different host.
async function curlSearch(url) {
  const args = ['-q','--silent','--show-error','--proto','=https','--connect-timeout','8',
    '--max-time','20','--max-filesize','1500000','--write-out','\n%{http_code}',url]
  const data = await new Promise((resolve,reject) => {
    const child = spawn('curl', args, {shell:false,stdio:['ignore','pipe','pipe']})
    const chunks = []; let size = 0; let stderr = 0
    child.stdout.on('data', chunk => {
      size += chunk.length
      if (size > 1_500_000) child.kill('SIGKILL')
      else chunks.push(chunk)
    })
    child.stderr.on('data', chunk => {stderr += chunk.length; if (stderr > 4096) child.kill('SIGKILL')})
    child.on('error', ()=>reject(Error('SFX_CURL_UNAVAILABLE')))
    child.on('close', code => code === 0 && size <= 1_500_000 && stderr <= 4096
      ? resolve(Buffer.concat(chunks).toString('utf8')) : reject(Error('SFX_OPENVERSE_UNAVAILABLE')))
  })
  const split = data.lastIndexOf('\n')
  const status = Number(data.slice(split+1).trim())
  if (split < 0 || !Number.isInteger(status) || status < 200 || status > 599) deny('OPENVERSE_UNAVAILABLE')
  return {status, ok:status >= 200 && status < 300,
    json:async()=>JSON.parse(data.slice(0,split))}
}
async function curlDownload(url, destination) {
  const args = ['-q', '--fail', '--silent', '--show-error', '--proto', '=https', '--connect-timeout', '8', '--max-time', '25', '--max-filesize', String(MAX_FILE_BYTES), '--output', destination, url]
  await new Promise((resolve, reject) => {
    const child = spawn('curl', args, {shell:false, stdio:['ignore','ignore','pipe']})
    let errorBytes = 0
    child.stderr.on('data', chunk => {errorBytes += chunk.length; if (errorBytes > 4096) child.kill('SIGKILL')})
    child.on('error', () => reject(Error('SFX_CURL_UNAVAILABLE')))
    child.on('close', code => code === 0 && errorBytes <= 4096 ? resolve() : reject(Error('SFX_DOWNLOAD_FAILED')))
  })
}
export async function prepareOpenverseSfx(plan, {dir, fetcher=curlSearch, download=curlDownload, now=()=>new Date()} = {}) {
  const checked = validateSfxPlan(plan)
  if (typeof dir !== 'string' || !isAbsolute(dir)) deny('DIRECTORY_INVALID')
  await mkdir(dir, {recursive:true, mode:0o700})
  const lock = join(dir, '.openverse-sfx.lock')
  let handle
  try { handle = await open(lock, 'wx', 0o600) } catch { deny('LOCKED') }
  try {
    const manifestPath = join(dir, 'manifest.json')
    const manifest = await readManifest(manifestPath)
    const entries = new Map(checked.cues.map(cue => [cue.type, cue.query]))
    const chosen = {}
    for (const [type, query] of entries) {
      let asset = manifest.assets[type]
      if (asset?.query === query && LICENSES.has(asset.license) && SOURCES.has(asset.source) &&
        typeof asset.attribution === 'string' && /^[a-z0-9_-]{1,48}\.(mp3|wav|ogg|m4a|flac)$/.test(asset.file || '') &&
        await validLocalFile(join(dir, asset.file), extname(asset.file).slice(1))) {
        chosen[type] = {...asset, path:join(dir, asset.file)}
        continue
      }
      const day = now().toISOString().slice(0,10)
      if (manifest.usage?.day !== day) manifest.usage = {day, count:0}
      if (manifest.usage.count >= SEARCHES_PER_DAY) deny('DAILY_BUDGET')
      manifest.usage.count++
      await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      const response = await fetcher(openverseSearchUrl(query), {headers:{accept:'application/json'}, redirect:'error', signal:AbortSignal.timeout(12000)})
      if (response.status === 429) deny('OPENVERSE_RATE_LIMIT')
      if (!response.ok) deny('OPENVERSE_UNAVAILABLE')
      const data = await response.json()
      const candidates = chooseOpenverseAudio(data?.results, query)
      if (!candidates.length) deny('NO_LICENSED_AUDIO')
      let downloaded = false
      for (const candidate of candidates.slice(0, 4)) {
        const ext = extensionOf(candidate)
        const filename = type + '-' + candidate.id.slice(0, 20) + '.' + ext
        const destination = join(dir, filename)
        const temporary = destination + '.partial-' + randomUUID()
        try {
          if (!await validLocalFile(destination, ext)) {
            await download(candidate.url, temporary)
            if (!await validLocalFile(temporary, ext)) throw Error('SFX_MEDIA_INVALID')
            await rename(temporary, destination)
          }
          asset = {file:filename, query, license:candidate.license, licenseUrl:String(candidate.license_url || ''),
            source:candidate.source, id:candidate.id, url:candidate.url, landingUrl:String(candidate.foreign_landing_url || ''),
            attribution:candidate.attribution}
          manifest.assets[type] = asset
          await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
          await syncCredits(dir, manifest.assets)
          chosen[type] = {...asset, path:destination}
          downloaded = true
          break
        } catch { /* try next result from the SAME search, never a second query */ }
        finally { await rm(temporary, {force:true}).catch(()=>{}) }
      }
      if (!downloaded) deny('DOWNLOAD_FAILED')
    }
    await syncCredits(dir, manifest.assets)
    return {assets:chosen, cues:checked.cues.map(cue => ({...cue, path:chosen[cue.type].path})), credits:join(dir,'credits.txt'), manifest:manifestPath}
  } finally {
    await handle.close()
    await rm(lock, {force:true})
  }
}
export function videoSfxFfmpegArgs(input, output, cues) {
  if (!Array.isArray(cues) || cues.length < 1 || cues.length > MAX_CUES) deny('PLAN_INVALID')
  const args = ['-hide_banner','-nostdin','-loglevel','error','-y','-i',input]
  for (const cue of cues) {
    if (!cue.path || !numeric(cue.atMs, 0, 120000) || !numeric(cue.duration, 0.05, 20) || !numeric(cue.gain, 0.01, 0.3)) deny('PLAN_INVALID')
    args.push('-i',cue.path)
  }
  const filters = cues.map((cue,i) => '[' + (i+1) + ':a]aresample=48000,atrim=duration=' + cue.duration +
    ',asetpts=PTS-STARTPTS,volume=' + cue.gain + ',adelay=' + cue.atMs + ':all=1[s' + i + ']')
  filters.push('[0:a:0]' + cues.map((_,i) => '[s'+i+']').join('') +
    'amix=inputs=' + (cues.length+1) + ':duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[mixed]')
  args.push('-filter_complex', filters.join(';'), '-map','0:v:0','-map','[mixed]',
    '-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',output)
  return args
}
export async function mixOpenverseSfx({video, output, cues, executable}) {
  if (typeof executable !== 'string' || !executable || resolve(video) === resolve(output)) deny('FFMPEG_INVALID')
  const temp = resolve(output) + '.partial-' + randomUUID() + '.mp4'
  if (await stat(output).then(()=>true,()=>false)) deny('OUTPUT_EXISTS')
  await mkdir(dirname(resolve(output)), {recursive:true})
  try {
    const args = videoSfxFfmpegArgs(resolve(video), temp, cues)
    await new Promise((done, fail) => {
      const proc = spawn(executable, args, {shell:false,stdio:['ignore','ignore','pipe']})
      let stderr = 0
      proc.stderr.on('data', chunk => {stderr += chunk.length; if (stderr > 32768) proc.kill('SIGKILL')})
      proc.on('error', ()=>fail(Error('SFX_FFMPEG_UNAVAILABLE')))
      proc.on('close', code => code === 0 && stderr <= 32768 ? done() : fail(Error('SFX_MIX_FAILED')))
    })
    const info = await stat(temp)
    if (info.size < 1024 || info.size > 250_000_000) deny('OUTPUT_INVALID')
    const file = await open(temp, 'r')
    try {
      const header = Buffer.alloc(12)
      await file.read(header, 0, 12, 0)
      if (header.toString('ascii', 4, 8) !== 'ftyp') deny('OUTPUT_INVALID')
    } finally { await file.close() }
    await rename(temp, output)
    return output
  } finally { await rm(temp, {force:true}).catch(()=>{}) }
}
async function main(argv) {
  if (argv.length !== 1) deny('USAGE_NODE_SCRIPT_PLAN_JSON')
  const planFile = resolve(argv[0])
  const plan = validateSfxPlan(JSON.parse(await readFile(planFile, 'utf8')))
  const root = dirname(planFile)
  const video = resolve(root, plan.video)
  const output = resolve(root, plan.output)
  const dir = resolve(root, 'sfx')
  const source = await stat(video)
  if (!source.isFile() || source.size > 250_000_000) deny('VIDEO_SOURCE_INVALID')
  if (await stat(output).then(()=>true,()=>false)) deny('OUTPUT_EXISTS')
  const prepared = await prepareOpenverseSfx(plan,{dir})
  const {default:staticFfmpeg} = await import('ffmpeg-static')
  const created = await mixOpenverseSfx({video,output,cues:prepared.cues,executable:staticFfmpeg})
  process.stdout.write(JSON.stringify({output:created, credits:prepared.credits, types:Object.keys(prepared.assets)}) + '\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {console.error(error.message);process.exitCode=1})
}
