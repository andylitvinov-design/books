import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const page=read('components/app/my-page-client.jsx')
const personal=read('components/app/profile-personal-summary.jsx')
const personalCss=read('components/app/profile-personal-summary.module.css')
const work=read('components/practice-work-profile-intro.jsx')
const practice=read('components/practice-showcase.jsx')
const professional=read('components/practice-social-profile.jsx')
const professionalCss=read('components/practice-social-profile.module.css')

test('My Page is a personal social page, not a counter-first settings form',()=>{
 assert.match(page,/data-profile-mode-switch/)
 assert.match(page,/Моя страничка/)
 assert.match(page,/Профиль мастера/)
 assert.match(page,/<ProfilePersonalSummary/)
 assert.match(page,/\{editingProfile\?<>/)
 assert.doesNotMatch(page,/aria-label=\{t\.stats\}/)
 assert.doesNotMatch(page,/aria-label=\{t\.videoTitle\}/)
 assert.match(page,/aria-label=\{t\.feed\}/)
 assert.match(page,/action:'saveProfile'/)
 assert.match(page,/action:'setPublished'/)
 assert.match(page,/action:'setVisibility'/)
 assert.match(page,/action:'deleteItem'/)
 assert.match(page,/data-my-page-google/)
})

test('Personal results and goals only use authenticated owner endpoints, with no invented percentages',()=>{
 assert.match(personal,/getCabinetBootstrap\('portrait'\)/)
 assert.match(personal,/appFetch\('development-goals'\)/)
 assert.match(personal,/buildProfileAssessmentView/)
 assert.match(personal,/sourceResultId/)
 assert.match(personal,/goalCheckin/)
 assert.match(personal,/data-private-profile-only/)
 assert.doesNotMatch(personal,/\b73%|\b78%|\b72%/)
 assert.doesNotMatch(personal,/localStorage|sessionStorage/)
 assert.doesNotMatch(personal,/\/api\/public\/.*(?:results|goals)/)
})

test('Private MP4 video URLs are obtained on click from owner-scoped personal videos',()=>{
 assert.match(personal,/appFetch\('personal-videos\/'\+id\)/)
 assert.match(personal,/<video src=\{playing\.url\} controls playsInline/)
 assert.match(personal,/onAddVideo\(video\)/)
 assert.match(page,/action:'addVideo'/)
 assert.match(personal,/!data\.page/)
})

test('Professional mode shows approved video and published services, not invented services',()=>{
 assert.match(work,/life:'Моя страничка',work:'Профиль мастера'/)
 assert.match(work,/lifeLocale\+'\/my-page'/)
 assert.match(work,/\{children\}/)
 assert.match(practice,/<PracticeSocialProfile/)
 assert.match(professional,/if\(!signedIn\)return null/)
 assert.match(professional,/practitioner\?\.profile/)
 assert.match(professional,/s\.status==='published'/)
 assert.match(professional,/approved\?\.videoPresentation\?\.kind==='external'/)
 assert.match(professional,/PractitionerPresentationVideo/)
 assert.match(professional,/PractitionerVideoGallery/)
 assert.doesNotMatch(professional,/\b73%|\b78%|\b150\s?€/)
})

test('Mobile layout uses large switching controls and narrow viewport fallbacks',()=>{
 assert.match(read('components/app/my-page.module.css'),/\.socialModes/)
 assert.match(read('components/app/my-page.module.css'),/min-height:49px/)
 assert.match(personalCss,/@media\(max-width:345px\)/)
 assert.match(professionalCss,/@media\(max-width:330px\)/)
 assert.match(professionalCss,/\.avatar img/)
})
