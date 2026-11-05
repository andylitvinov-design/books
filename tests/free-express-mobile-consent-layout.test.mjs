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

test('no anonymous analytics popup blocks public/mobile forms; preferences stay on Privacy page',()=>{
 const layout=read('app/layout.tsx')
 const choice=read('components/analytics-consent.tsx')
 const privacy=read('app/privacy/page.tsx')
 const css=read('components/personal-express-enquiry.module.css')
 // The public notice was intentionally retired. Consent is never solicited
 // with an interrupting banner; visitors can change it on the Privacy page.
 assert.match(layout,/<AnalyticsConsent \/>[\s\S]*<PublicPageTraffic \/>/)
 assert.doesNotMatch(layout,/FirstPartyStatsNotice|<FirstPartyStatsPreferences\s*\/>/)
 assert.match(choice,/export function AnalyticsConsent\(\)/)
 assert.match(choice,/export function FirstPartyStatsPreferences\(\)/)
 assert.match(privacy,/<FirstPartyStatsPreferences \/>/)
 assert.match(privacy,/<AnalyticsPreferences \/>/)
 assert.match(choice,/setFirstPartyConsent\(allow\)/)
 assert.doesNotMatch(choice,/setFirstPartyConsent\(true\)/)
 assert.match(choice,/allow \? "v1" : "denied"/)
 assert.match(css,/\.disclosure\[hidden\]\{display:none!important\}/)
})
