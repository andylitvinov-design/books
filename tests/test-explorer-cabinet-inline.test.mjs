import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
test('public Client Cabinet includes the same interactive Test Explorer before account login', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/test-explorer.module.css')
  assert.match(cabinet, /<PublicTestExplorer locale=\{locale\} embedded\s*\/>/)
  assert.ok(cabinet.indexOf('<PublicTestExplorer') < cabinet.indexOf('className="cabinet-signin-strip'), 'one-click start must precede secondary account entry')
  assert.ok(cabinet.indexOf('<PublicTestExplorer') < cabinet.indexOf('<MoodCheckIn'), 'mood check-in is optional and must not block test start')
  assert.doesNotMatch(cabinet, /without signing in|можно подобрать и пройти без входа/)
  assert.match(publicExplorer, /<TestExplorer locale=\{locale\} audience="account" embedded=\{embedded\}/)
  assert.match(explorer, /embedded \? styles\.embedded/)
  assert.match(styles, /\.explorer \.battery\{position:static/)
  assert.match(styles, /\.customizer\[hidden\]\{display:none/)
  assert.match(explorer, /\[customizeOpen, setCustomizeOpen\] = useState\(false\)/)
  assert.match(explorer, /\[filtersOpen, setFiltersOpen\] = useState\(false\)/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  assert.match(explorer, /aria-expanded=\{customizeOpen\}/)
  assert.match(explorer, /showAll \? visible : visible\.slice\(0, 8\)/)
  assert.match(explorer, /if \(aSelected !== bSelected\) return aSelected \? -1 : 1/)
  assert.match(explorer, /selectedKeys\.includes\(a\.key\)/)
  assert.match(explorer, /selectedKeys\.includes\(b\.key\)/)
  assert.match(cabinet, /<MoodCheckIn/)
})

test('public Client entry shows the photo portrait immediately with Booking-style quick filters', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const visual = read('components/app/test-explorer-visual.jsx')
  const styles = read('components/app/test-explorer.module.css')
  // One click must start the existing rights-cleared battery and OAuth handoff.
  assert.match(explorer, /<button type="button" className=\{styles\.quickPrimary\}/)
  assert.match(explorer, /buildStarterBattery\(/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  // Fast thematic, duration and professional filters share existing state.
  assert.match(explorer, /QUICK_FOCUS\.map/)
  assert.match(explorer, /setFocus\(\(current\) => toggle\(current, key\)\)/)
  assert.match(explorer, /setMaxMinutes\(\(current\)/)
  assert.match(explorer, /setStylesFilter\(\(current\)/)
  assert.match(explorer, /<b>\{matchCount\}<\/b>/)
  assert.match(explorer, /aria-live="polite"/)
  assert.match(explorer, /<TestExplorerVisual compact/)
  assert.ok(explorer.indexOf('<TestExplorerVisual compact') < explorer.indexOf('id="hh-test-customizer"'),
    'photo portrait must precede optional advanced customizer')
  assert.doesNotMatch(explorer, /<details className=\{styles\.visualDetails\}>/,
    'portrait must not be hidden in a disclosure')
  assert.doesNotMatch(explorer, /Math\.round\(entry\.score \/ 1\.2\)/,
    'do not suggest unvalidated match scores are a medical percentage')
  assert.match(visual, /holistic-house-test-brain-concept\.png/)
  assert.match(visual, /compact = false/)
  assert.match(visual, /compact && !portrait && <div className=\{styles\.compactAxes\}/)
  assert.match(styles, /\.explorerHero\{display:grid;grid-template-columns:/)
  assert.match(styles, /@media\(max-width:960px\)/)
  assert.match(styles, /\.quickFilterChips button\[aria-pressed=true\]/)
  assert.match(styles, /\.explorer \.list\{border:0;display:grid/)
})

test('mobile design keeps head and one-click CTA above horizontally scrollable chips', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const visual = read('components/app/test-explorer-visual.jsx')
  const css = read('components/app/test-explorer.module.css')
  assert.ok(explorer.indexOf('className={styles.quickStart}') < explorer.indexOf('className={styles.heroPortrait}'))
  assert.ok(explorer.indexOf('className={styles.heroPortrait}') < explorer.indexOf('className={styles.quickDiscovery}'))
  assert.ok(explorer.indexOf('className={styles.quickDiscovery}') < explorer.indexOf('id="hh-test-customizer"'))
  assert.match(css, /grid-template-areas:"start" "portrait" "discovery"/)
  assert.match(css, /quickFilterChips\{display:flex;flex-wrap:nowrap;overflow-x:auto/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /\.visualCompact \.portraitSource\{width:1019px!important/)
  assert.match(css, /\.explorer \.row\{padding:14px 11px;gap:10px;grid-template-columns:/)
  assert.match(explorer, /<TestArtwork entry=\{entry\} \/>/)
  assert.match(explorer, /import \{ Activity, Brain, Compass, Heart, Moon, Shield, Sparkles, Zap \} from 'lucide-react'/)
  assert.match(visual, /className=\{styles\.focusRays\}/)
  assert.match(visual, /topicCount > 0 \|\| selectedCount > 0/)
  assert.match(css, /\.visualCompact \.focusRays/)
  // Styles hide the advanced panel by default but never the portrait.
  assert.match(css, /\.customizer\[hidden\]\{display:none!important\}/)
})


test('matching test cards and search remain visible while expert filters are collapsed', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const css = read('components/app/test-explorer.module.css')
  const client = read('app/[locale]/client/page.tsx')
  const header = read('components/public-site-header.tsx')
  const closedCustomizer = explorer.indexOf('    </section>\n    </div>\n    <section id="hh-test-list"')
  assert.ok(closedCustomizer > explorer.indexOf('id="hh-test-customizer"'),
    'optional advanced disclosure should end before the public test catalog')
  assert.ok(explorer.indexOf('className={styles.workspace}') > closedCustomizer,
    'test cards must not be inside the hidden advanced disclosure')
  assert.ok(explorer.indexOf('className={styles.catalogControls}') > closedCustomizer,
    'search and sort should be reachable without revealing advanced filters')
  assert.match(explorer, /id="hh-test-list"/)
  assert.match(explorer, /<TestArtwork entry=\{entry\} \/>/)
  assert.match(css, /\.catalogTopbar\{/)
  assert.match(css, /\.catalogControls\{/)
  assert.match(client, /showAssessmentStrip=\{false\}/)
  assert.match(client, /<MindBodyMonitorStrip locale=\{typedLocale\} \/>/)
  assert.match(header, /showAssessmentStrip = true/)
})
