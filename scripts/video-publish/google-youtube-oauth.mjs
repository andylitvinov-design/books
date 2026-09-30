// Run locally; tokens never appear in stdout, browser pages or committed files.
import { createServer } from 'node:http'
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { googleJson } from './pipeline-safety.mjs'
import { normalizeHandle } from './youtube-private-core.mjs'

const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID?.trim()
const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET?.trim()
const port = Number(process.env.YOUTUBE_OAUTH_PORT || 53682)
if (!clientId || !clientSecret || !Number.isInteger(port) || port < 1024 || port > 65535 || process.env.GITHUB_ACTIONS) {
  console.error('Run locally with GOOGLE_YOUTUBE_CLIENT_ID and GOOGLE_YOUTUBE_CLIENT_SECRET and a valid loopback port.'); process.exit(1)
}
const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`
const state = randomBytes(32).toString('base64url')
const verifier = randomBytes(48).toString('base64url')
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
  scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/drive'].join(' '),
  access_type: 'offline', prompt: 'consent select_account', state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString()
let busy = false
const server = createServer(async (req, res) => {
  const respond = (status, text) => { res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' }); res.end(text) }
  const u = new URL(req.url || '/', redirectUri)
  if (req.method !== 'GET' || u.pathname !== '/oauth2/callback') return respond(404, 'Not found')
  const supplied = Buffer.from(u.searchParams.get('state') || '')
  if (supplied.length !== Buffer.byteLength(state) || !timingSafeEqual(supplied, Buffer.from(state))) return respond(400, 'Invalid authorization state. Return to the original authorization window.')
  if (busy) return respond(409, 'Authorization is already being processed.')
  busy = true
  try {
    const code = u.searchParams.get('code')
    if (!code || u.searchParams.has('error')) throw new Error()
    const token = await googleJson(fetch, 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri }) }, 'oauth_exchange_failed')
    if (!token.refresh_token || !token.access_token) throw new Error()
    const data = await googleJson(fetch, 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50', { headers: { authorization: `Bearer ${token.access_token}` } }, 'channel_check_failed')
    const channel = data.items?.find(item => normalizeHandle(item.snippet?.customUrl) === 'aatapro')
    if (!channel) throw new Error()
    const secrets = { GOOGLE_YOUTUBE_CLIENT_ID: clientId, GOOGLE_YOUTUBE_CLIENT_SECRET: clientSecret, GOOGLE_YOUTUBE_REFRESH_TOKEN: token.refresh_token }
    if (process.argv.includes('--github')) {
      // gh must already be authenticated as the repository owner. Values use stdin.
      for (const [key, value] of Object.entries(secrets)) {
        const written = spawnSync('gh', ['secret', 'set', key, '--repo', 'andylitvinov-design/books'], { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 })
        if (written.status !== 0) throw new Error()
      }
      console.log('English channel verified; the three encrypted GitHub Actions secrets were saved. Run the read-only pipeline preflight next.')
    } else {
      const root = join(homedir(), '.config', 'homeo-video-publisher')
      await mkdir(root, { recursive: true, mode: 0o700 })
      const dir = await mkdtemp(join(root, 'oauth-'))
      const path = join(dir, 'credentials.json')
      await writeFile(path, JSON.stringify(secrets, null, 2), { flag: 'wx', mode: 0o600 })
      console.log('English channel verified. Credentials saved locally with owner-only permissions: ' + path)
      console.log('Keep this file private. Do not paste it into chat or commit it to GitHub.')
    }
    respond(200, 'English YouTube authorization succeeded. Credentials were stored securely; no tokens are shown here. This does not verify the YouTube API publishing audit.')
  } catch {
    console.error('Authorization or secure credential storage did not complete. No credentials were printed. Check the selected @aatapro account and local setup.')
    respond(500, 'Authorization/setup did not complete. Check the local terminal. No credentials are shown here.'); process.exitCode = 1
  } finally { clearTimeout(expiry); server.close() }
})
const expiry = setTimeout(() => { console.error('Authorization window expired.'); server.close(); process.exitCode = 1 }, 10 * 60 * 1000)
server.on('error', () => { clearTimeout(expiry); console.error('Could not open the local OAuth callback.'); process.exitCode = 1 })
server.listen(port, '127.0.0.1', () => {
  console.log('Authorize the English @aatapro channel in your own browser:\n' + authUrl.href)
  if (process.platform === 'darwin') { const child = spawn('open', [authUrl.href], { detached: true, stdio: 'ignore' }); child.on('error', () => {}); child.unref() }
})
