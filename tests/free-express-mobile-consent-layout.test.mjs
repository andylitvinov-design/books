import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('free express mobile theme legend spans two equal choices instead of occupying the first tile',()=>{
 const style=read('components/personal-express-enquiry.module.css')
 const form=read('components/personal-express-enquiry.tsx')
 assert.match(style,/\.choices\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(style,/\.choices legend\{grid-column:1\/-1;float:none;width:100%/)
 assert.match(style,/\.capture\[data-expanded="true"\] \.choice/)
 assert.match(form,/<fieldset className=\{styles\.choices\} data-express-focus-group/)
 assert.match(form,/<legend>\{t\.legend\}<\/legend>/)
 assert.match(form,/name="express-review-focus"/)
 assert.match(form,/checked=\{focus === area\}/)
})

test('analytics never interrupts public or mobile forms; controls remain on the Privacy page',()=>{
 const layout=read('app/layout.tsx')
 const choice=read('components/analytics-consent.tsx')
 const privacy=read('app/privacy/page.tsx')
 assert.match(layout,/<AnalyticsConsent \/>/)
 assert.match(layout,/<PublicPageTraffic \/>/)
 assert.doesNotMatch(layout,/FirstPartyStatsNotice|AnalyticsPreferences|FirstPartyStatsPreferences/)
 assert.match(choice,/export function AnalyticsConsent\(\)/)
 assert.match(choice,/applyConsent\(isPublicAnalyticsPath\(pathname\) \? savedConsent\(\) : "denied"\)/)
 assert.match(choice,/No analytics tag is loaded for new visitors/)
 assert.match(choice,/export function AnalyticsPreferences\(\)/)
 assert.match(choice,/aria-label="Analytics preferences"/)
 assert.match(choice,/analytics_storage: value/)
 assert.match(privacy,/<AnalyticsPreferences \/>/)
 assert.match(privacy,/<FirstPartyStatsPreferences \/>/)
 assert.match(privacy,/<h2>Website statistics and optional analytics<\/h2>/)
 assert.match(choice,/allow \? "v1" : "denied"/)
})
