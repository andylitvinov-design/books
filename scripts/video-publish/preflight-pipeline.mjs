import { mkdir, writeFile, appendFile } from 'node:fs/promises'
import { pipelinePreflight } from './pipeline-safety.mjs'
const result = await pipelinePreflight({ folderId: process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID })
await mkdir('.video-results', { recursive: true })
await writeFile('.video-results/preflight.json', JSON.stringify(result, null, 2) + '\n')
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
  '### Video pipeline connection check\n\n```json\n' + JSON.stringify(result, null, 2) + '\n```\n')
console.log(JSON.stringify(result, null, 2))
if (!result.oauthReady || !result.englishChannelVerified || result.blocker) process.exitCode = 1
