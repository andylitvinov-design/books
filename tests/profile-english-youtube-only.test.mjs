import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ENGLISH_HEYGEN_INTRO_ID,verifiedEnglishIntroYoutubeId}
 from '../lib/youtube/english-master-catalog.mjs'
import {profilePresentationForLocale} from '../lib/profile-presentation.mjs'
import {approvedTelegramPresentation} from '../lib/crm/telegram-presentation.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('English My Space only accepts the exact verified AATA YouTube presentation',()=>{
 const player=source('components/app/profile-presentation-player.jsx')
 const endpoint=source('app/api/public/english-intro-video/route.js')
 const upload=source('lib/youtube/heygen-en-service.js')
 const approved=profilePresentationForLocale('en')
 assert.equal(approved.heygenId,ENGLISH_HEYGEN_INTRO_ID)
 assert.match(player,/const youtubeReady=locale==='en'/)
 assert.match(player,/presentation\?\.heygenId===ENGLISH_HEYGEN_INTRO_ID/)
 assert.match(player,/if\(locale==='en'&&!youtubeReady\)/)
 assert.match(player,/data-profile-presentation-source="youtube-pending"/)
 assert.match(player,/setVerifiedId\(youtubeIdValid\(data\?\.youtubeId\)\?data.youtubeId:null\)/)
 assert.match(player,/const source=youtubeReady[\s\S]*?youtubeId:verifiedId/)
 assert.match(player,/locale==='en'\?null:presentation/)
 assert.match(player,/<SiteVideoPlayer key=/)
 assert.match(player,/video=\{source\} locale=\{locale\} minimal fallbackPoster=\{poster\}/)
 assert.doesNotMatch(player,/app\.heygen\.com|youtube-nocookie\.com\/embed|iframe src=/)
 assert.match(player,/https:\/\/www\.youtube\.com\/@aatapro/)
 assert.match(endpoint,/verifiedEnglishIntroYoutubeId\(receipt,channels.en\)/)
 assert.match(upload,/archiveVerified\(command,job\)/)
})
test('No fake or mismatched English YouTube ID is admitted to My Space',()=>{
 const channel={id:'UC'+'a'.repeat(22),handle:'@aatapro'}
 const id='AbCdeF123_-'
 const good=JSON.stringify({channelId:channel.id,videoId:id})
 assert.equal(verifiedEnglishIntroYoutubeId(good,channel),id)
 assert.equal(verifiedEnglishIntroYoutubeId(good,{id:'UC'+'b'.repeat(22)}),null)
 assert.equal(verifiedEnglishIntroYoutubeId('[]',channel),null)
 assert.equal(verifiedEnglishIntroYoutubeId(null,channel),null)
})
test('Pending EN video keeps a compact, accessible channel link; RU unchanged',()=>{
 const player=source('components/app/profile-presentation-player.jsx')
 const style=source('components/app/profile-presentation-player.module.css')
 assert.match(player,/data-profile-youtube-status=\{checked\?'awaiting-verified-upload':'checking'\}/)
 assert.match(player,/role="status"/)
 assert.match(player,/target="_blank" rel="noopener noreferrer"/)
 assert.match(style,/aspect-ratio:16\/9/)
 assert.match(style,/min-height:44px/)
 assert.doesNotMatch(style,/iframe|\.heygen/)
 const ru=profilePresentationForLocale('ru')
 assert.equal(ru.youtubeId,approvedTelegramPresentation('ru').youtubeId)
 assert.equal(ru.language,'ru')
})
