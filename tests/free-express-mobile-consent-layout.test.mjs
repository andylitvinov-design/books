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

test('anonymous stats choice does not block an expanded private request or change consent silently',()=>{
 const notice=read('components/first-party-stats-notice.tsx')
 const css=read('components/personal-express-enquiry.module.css')
 assert.match(notice,/const \[expressFormOpen, setExpressFormOpen\] = useState\(false\)/)
 assert.match(notice,/MutationObserver\(sync\)/)
 assert.match(notice,/attributeFilter: \['data-expanded'\]/)
 assert.match(notice,/free-situation-review\$/)
 assert.match(notice,/if\(!show \|\| expressFormOpen\)return null/)
 assert.match(notice,/setFirstPartyConsent\(allow\)/)
 assert.doesNotMatch(notice,/setFirstPartyConsent\(true\)/)
 assert.match(notice,/firstPartyCookie\("hh_public_stats_skip"\)/)
 assert.match(css,/\.disclosure\[hidden\]\{display:none!important\}/)
})
