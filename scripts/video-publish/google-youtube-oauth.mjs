import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

import { normalizeHandle } from './youtube-private-core.mjs'

const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID?.trim()
const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET?.trim()
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_YOUTUBE_CLIENT_ID and GOOGLE_YOUTUBE_CLIENT_SECRET first.')
  process.exit(1)
}

const port = Number(process.env.YOUTUBE_OAUTH_PORT || 53682)
const redirectUri = 'http://127.0.0.1:' + port + '/oauth2/callback'
const state = randomBytes(24).toString('hex')
const expectedHandle = normalizeHandle(process.env.YOUTUBE_ENGLISH_EXPECTED_HANDLE || '@aatapro')
const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline',
  prompt: 'consent select_account',
  include_granted_scopes: 'true',
  state,
}).toString()

async function exchange(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(body))
  return body
}

async function channels(accessToken) {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true&maxResults=50',
    { headers: { authorization: 'Bearer ' + accessToken } },
  )
  const body = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(body))
  return Array.isArray(body.items) ? body.items : []
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', redirectUri)
    if (url.pathname !== '/oauth2/callback') {
      res.writeHead(404).end('Not found')
      return
    }
    if (url.searchParams.get('state') !== state) throw new Error('OAuth state mismatch')
    const code = url.searchParams.get('code')
    if (!code) throw new Error(url.searchParams.get('error') || 'No authorization code returned')

    const token = await exchange(code)
    if (!token.refresh_token) {
      throw new Error('No refresh token returned. Revoke the app grant and run again with prompt=consent.')
    }

    const items = await channels(token.access_token)
    const match = items.find((item) => normalizeHandle(item?.snippet?.customUrl) === expectedHandle)
    if (!match) {
      throw new Error('The selected account/channel is not @' + expectedHandle + ': ' + JSON.stringify(items.map((item) => ({
        id: item?.id,
        title: item?.snippet?.title,
        customUrl: item?.snippet?.customUrl,
      }))))
    }

    const message = [
      'Connected successfully.',
      'Channel: ' + (match.snippet?.title || ''),
      'Handle: ' + (match.snippet?.customUrl || ''),
      'Channel ID: ' + match.id,
      '',
      'Store these as GitHub Actions secrets:',
      'GOOGLE_YOUTUBE_CLIENT_ID=' + clientId,
      'GOOGLE_YOUTUBE_CLIENT_SECRET=' + clientSecret,
      'GOOGLE_YOUTUBE_REFRESH_TOKEN=' + token.refresh_token,
      '',
      'You can close this page.',
    ].join('\n')

    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(message)
    console.log('\n' + message + '\n')
    setTimeout(() => server.close(), 250)
  } catch (error) {
    const message = error?.stack || String(error)
    console.error(message)
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(message)
    setTimeout(() => server.close(), 250)
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log('OAuth callback: ' + redirectUri)
  console.log('Open this URL if the browser does not open automatically:\n' + authUrl.toString() + '\n')
  if (process.platform === 'darwin') {
    const child = spawn('open', [authUrl.toString()], { detached: true, stdio: 'ignore' })
    child.unref()
  }
})
