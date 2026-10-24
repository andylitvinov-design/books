import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { activeNavigationId } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('OPORA Anti-Stress has a dedicated trilingual public course landing and SEO', () => {
  const [component, enRuPage, esPage, sitemap, locale] = [
    read('components/public-antistress-landing.tsx'),
    read('app/[locale]/courses/antistress/page.tsx'),
    read('app/es/courses/antistress/page.tsx'),
    read('app/sitemap.ts'),
    read('lib/public-locales.ts'),
  ]
  assert.match(component, /data-opora-antistress-landing/)
  assert.match(component, /const copy = /)
  assert.match(component, /"ru": \{/)
  assert.match(component, /"en": \{/)
  assert.match(component, /"es": \{/)
  assert.match(enRuPage, /generateStaticParams/)
  assert.match(enRuPage, /generateMetadata/)
  assert.match(enRuPage, /metadataBaseFor/)
  assert.match(enRuPage, /PublicAntistressLanding locale=\{locale\}/)
  assert.match(enRuPage, /images: \[/)
  assert.match(esPage, /spanishMetadata/)
  assert.match(esPage, /PublicAntistressLanding locale="es"/)
  for (const lang of ['ru', 'en', 'es']) {
    assert.match(sitemap, new RegExp('/' + lang + '/courses/antistress'))
    assert.equal(activeNavigationId('/' + lang + '/courses/antistress'), 'courses')
  }
  assert.match(locale, /courses\\\/antistress/)
})

test('14 lessons are organized in seven localized expandable skill pairs', () => {
  const source = read('components/public-antistress-landing.tsx')
  const skillBlock = source.slice(source.indexOf('const copy ='), source.indexOf('const challengeIcons'))
  for (const lang of ['ru','en','es']) {
    const match = skillBlock.match(new RegExp('"' + lang + '": \\{([\\s\\S]*?)(?=\\n  "(?:ru|en|es)": \\{|\\n\\} as const;)'))
    assert.ok(match, lang + ' locale must be present')
    assert.equal((match[1].match(/"days": "0[13579]|"days": "1[13]/g) || []).length, 7)
  }
  assert.match(source, /programme\.skills\.map\(\(skill, index\)/)
  assert.match(source, /index \* 2 \+ 1/)
  assert.match(source, /index \* 2 \+ 2/)
  assert.match(source, /<details className=\{styles\.skill\}/)
  assert.match(source, /previewDay\(stageDays\[0\]\)/)
  assert.match(source, /previewDay\(stageDays\[1\]\)/)
  assert.match(source, /skill\.outcome/)
  assert.match(source, /PublicAntistressEvidence/)
  assert.match(source, /data-antistress-full-day-scheme/)
})

test('promotional landing uses the approved full photo, responsive design and interactive optional choice', () => {
  const page = read('components/public-antistress-landing.tsx')
  const css = read('components/public-antistress-landing.module.css')
  assert.match(page, /course-focus-mountain-boy\.webp/)
  assert.match(css, /object-fit:contain/)
  assert.doesNotMatch(css, /heroImage[^}]*object-fit:cover/)
  assert.match(page, /data-antistress-practice-demo/)
  assert.match(page, /aria-pressed=\{chosenExample === index\}/)
  assert.match(page, /role="status" aria-live="polite"/)
  assert.match(page, /setChosenExample\(index\)/)
  assert.match(page, /data-antistress-start/)
  assert.match(page, /app\/course\?program=stress/)
  assert.doesNotMatch(page, /fetch\(|localStorage|sessionStorage|autoplay|HEYGEN_API_KEY/)
  assert.match(css, /max-width:520px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /:focus-visible/)
})

test('all major campaign surfaces expose the dedicated info landing without removing course enrolment', () => {
  const ribbon = read('components/sitewide-antistress-banner.tsx')
  const academy = read('components/academy-free-course-banner.tsx')
  const publicCourses = read('components/public-growth-courses.tsx')
  const reportBanner = read('components/app/free-course-banner.jsx')
  assert.match(ribbon, /courses\/antistress/)
  assert.match(ribbon, /app\/course\?program=stress/)
  assert.match(academy, /courses\/antistress/)
  assert.match(academy, /app\/course\?program=stress/)
  assert.match(publicCourses, /courses\/antistress/)
  assert.match(publicCourses, /app\/course\?program=stress/)
  assert.doesNotMatch(reportBanner, /courses\/antistress/, 'screening results keep exactly one score-independent optional course link')
})

test('marketing statements keep trauma/PTSD and clinical effectiveness limitations visible', () => {
  const page = read('components/public-antistress-landing.tsx')
  assert.match(page, /не лечение ПТСР/)
  assert.match(page, /not treatment for PTSD/)
  assert.match(page, /no cuenta con validación clínica independiente/)
  assert.match(page, /нет необходимости|не нужно|No\./i)
  assert.match(page, /после вашего согласия|с вашим согласием/)
  assert.match(page, /without.*consent|only saved after consent/i)
  assert.match(page, /"faqs": \[/)
})

// Source-executed redirect and JSX binding checks. Unrelated archive/account UI
// and icons are isolated; these do not establish Next/browser navigation.
const paths = {
  courses: 'app/[locale]/courses/page.tsx', spanish: 'app/es/courses/page.tsx',
  academy: 'app/[locale]/academy/[[...slug]]/page.tsx', hub: 'components/academy-hub.tsx',
  discovery: 'components/academy-discovery.tsx', cards: 'components/academy-course-card-list.tsx',
  growth: 'components/public-growth-courses.tsx',
}
const sourcesFor = () => Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, read(path)]))
const element = (type, props) => ({ type, props })
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes)
  return value && typeof value === 'object' && value.props ? [value, ...nodes(value.props.children)] : []
}
function evaluate(source, scope = {}) {
  const ast = ts.createSourceFile('actual.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length, 0)
  const isolated = ast.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(ast)).join('\n')
  const code = ts.transpileModule(isolated, { fileName: 'actual.tsx', compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(code, { ...scope, module: compiledModule, exports: compiledModule.exports,
    require(name) {
      assert.equal(name, 'react/jsx-runtime', 'Only the isolated JSX representation is imported')
      return { jsx: element, jsxs: element, Fragment: 'fragment' }
    },
  })
  return compiledModule.exports
}
const catalog = ts.createSourceFile('catalog.ts', read('data/academy/catalog.ts'), ts.ScriptTarget.Latest, true)
const guard = catalog.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'isPublicLocale')
assert.ok(guard, 'Use the actual public-locale guard')
const { isPublicLocale } = evaluate(guard.getText(catalog))
const icons = Object.fromEntries(['ArrowRight','BookOpenCheck','BookOpen','CheckCircle2','CircleHelp','Clock3',
  'ShieldCheck','SlidersHorizontal','Sparkles','Target','Waves','ChevronDown','ChevronRight','Archive',
  'CalendarDays','GraduationCap','MapPin','PlayCircle','Search'].map(name => [name, name]))
const scope = {
  ...icons, Link: 'a', Image: 'img', styles: new Proxy({}, { get: (_, key) => key }),
  useMemo: fn => fn(), useState: initial => [typeof initial === 'function' ? initial() : initial, () => assert.fail('Unexpected update')],
  PublicSiteHeader: 'PublicSiteHeader', AcademyCourseCapture: 'AcademyCourseCapture',
  AcademyVideoCourses: 'AcademyVideoCourses', AcademyDiscovery: 'AcademyDiscovery',
  AcademyCourseCardList: 'AcademyCourseCardList', AcademyMyCourses: 'AcademyMyCourses',
  DiscoverySectionTabs: 'DiscoverySectionTabs', PublicCourseCabinet: 'PublicCourseCabinet',
  Course14DayOverview: 'Course14DayOverview', cardArtworkUrl: value => value, hasCardArtwork: () => false,
  PUBLIC_EVENTS: [], psimasterMedia: [], preferredAcademyRecords: () => [], videoRecords: () => [],
  REIKI_FREE_COURSE_PATH: '/academy/reiki/free-practitioner-course',
  academyCopy: Object.fromEntries(['en','ru','es'].map(locale => [locale, { allPrograms: 'All programmes' }])),
}
async function verifyRoutes(sources) {
  const redirects = [], missing = new Error('not-found')
  const navigation = { isPublicLocale, permanentRedirect: href => redirects.push(href),
    notFound: () => { throw missing }, metadataBaseFor: () => 'https://example.invalid' }
  const courses = evaluate(sources.courses, navigation)
  const academy = evaluate(sources.academy, { ...navigation, AcademyHub: 'AcademyHub',
    PublicGrowthCourses: 'PublicGrowthCourses', PublicPractitionerCourses: 'PublicPractitionerCourses' }).default
  for (const locale of ['en','ru']) {
    redirects.length = 0
    await courses.default({ params: Promise.resolve({ locale }) })
    assert.deepEqual(redirects, ['/' + locale + '/academy'])
    const meta = await courses.generateMetadata({ params: Promise.resolve({ locale }) })
    assert.equal(meta.alternates.canonical, redirects[0])
    const page = await academy({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) })
    assert.equal(page.type, 'AcademyHub')
    assert.equal(page.props.locale, locale)
    assert.equal(page.props.view, 'programs', 'Full catalog, not a video-only or free-course subset')
  }
  redirects.length = 0
  await assert.rejects(courses.default({ params: Promise.resolve({ locale: 'xx' }) }), error => error === missing)
  assert.equal(redirects.length, 0)
  // Explicit Spanish route currently overrides the generic alias. Do not claim
  // full-Academy parity from the EN/RU route; follow its actual rendered target.
  const spanish = evaluate(sources.spanish, { ...navigation, spanishMetadata: (...args) => ({ args }) })
  spanish.default()
  assert.equal(redirects.length, 1)
  assert.equal(redirects[0], '/es/academy/free-ai-courses', 'Spanish legacy alias must stay local without query or fragment')
  const destination = new URL(redirects[0], 'https://example.invalid')
  assert.equal(destination.pathname, '/es/academy/free-ai-courses')
  assert.equal(spanish.metadata.args[0], destination.pathname)
  const page = await academy({ params: Promise.resolve({ locale: 'es', slug: destination.pathname.split('/').slice(3) }), searchParams: Promise.resolve({}) })
  const bindings = nodes(page).filter(n => n.type === 'PublicGrowthCourses')
  assert.equal(bindings.length, 1, 'The actual Spanish destination renders OPORA courses')
  assert.equal(bindings[0].props.locale, 'es')
  const growth = evaluate(sources.growth, scope).PublicGrowthCourses(bindings[0].props)
  const links = nodes(growth).filter(n => n.type === 'a')
  assert.ok(links.some(n => n.props.href === '/es/courses/antistress'), 'Spanish OPORA information remains reachable')
  assert.ok(links.some(n => n.props.href === '/en/app/course?program=stress'), 'Supported Spanish-to-EN enrollment remains reachable')
}
function verifyCards(sources) {
  const hub = evaluate(sources.hub, scope).AcademyHub
  const discovery = evaluate(sources.discovery, scope).AcademyDiscovery
  const list = evaluate(sources.cards, scope).AcademyCourseCardList
  for (const locale of ['en','ru','es']) {
    const bindings = nodes(hub({ locale })).filter(n => n.type === 'AcademyDiscovery')
    assert.equal(bindings.length, 1)
    assert.equal(bindings[0].props.locale, locale)
    const free = nodes(discovery(bindings[0].props)).find(n => n.props.id === 'academy-free-courses')
    assert.ok(free)
    const lists = nodes(free).filter(n => n.type === 'AcademyCourseCardList')
    assert.equal(lists.length, 1)
    const cards = nodes(list(lists[0].props)).filter(n => typeof n.type === 'function' && n.props.item?.id === 'academy-free-opora')
    assert.equal(cards.length, 1, 'OPORA reaches exactly one actual card')
    const card = cards[0].type(cards[0].props), all = nodes(card)
    const info = all.filter(n => n.type === 'a' && n.props.className === 'landing')
    const enrol = all.filter(n => n.type === 'a' && n.props.className === 'take')
    assert.equal(card.props['data-academy-course-card'], 'academy-free-opora')
    assert.equal(info.length, 1)
    assert.equal(info[0].props.href, '/' + locale + '/courses/antistress')
    assert.equal(enrol.length, 1)
    assert.equal(enrol[0].props.href, '/' + (locale === 'es' ? 'en' : locale) + '/app/course?program=stress')
    assert.equal(enrol[0].props.prefetch, false)
    assert.equal(all.find(n => n.type === 'h3').props.children,
      { en: 'OPORA · Stress Relief', ru: 'ОПОРА · Антистресс', es: 'OPORA · Antiestrés' }[locale])
  }
}

test('legacy course routes retain OPORA information and enrollment through actual route/catalog/card bindings', async () => {
  const sources = sourcesFor()
  await verifyRoutes(sources)
  verifyCards(sources)
})
for (const [label, key, before, after] of [
  ['Spanish external redirect','spanish','permanentRedirect("/es/academy/free-ai-courses")','permanentRedirect("https://example.invalid/es/academy/free-ai-courses")'],
  ['Spanish query redirect','spanish','permanentRedirect("/es/academy/free-ai-courses")','permanentRedirect("/es/academy/free-ai-courses?unexpected=1")'],
  ['Spanish fragment redirect','spanish','permanentRedirect("/es/academy/free-ai-courses")','permanentRedirect("/es/academy/free-ai-courses#unexpected")'],
  ['generic subsection redirect','courses','permanentRedirect(`/${locale}/academy`)','permanentRedirect(`/${locale}/academy/free-ai-courses`)'],
  ['canonical alias regression','courses','canonical: `/${locale}/academy`','canonical: `/${locale}/courses`'],
  ['invalid locale redirect','courses','if (!isPublicLocale(locale)) notFound();',''],
  ['Academy root detachment','academy','return <AcademyHub locale={locale} view={view} />;','return <PublicGrowthCourses locale={locale} />;'],
  ['Spanish destination detachment','academy','if (key === "free-ai-courses") return <><PublicGrowthCourses locale={locale} /><PublicPractitionerCourses locale={locale} /></>;','if (key === "free-ai-courses") return <PublicPractitionerCourses locale={locale} />;'],
  ['Spanish enrollment fallback','growth','const appLocale = locale === "es" ? "en" : locale;','const appLocale = locale;'],
  ['card list detachment','hub','<AcademyDiscovery locale={locale} view={view} items={items}','<AcademyDiscovery locale={locale} view={view} items={items.filter(item => item.id !== "academy-free-opora")}'],
  ['free card filtering','discovery','const freeItems = matchedItems.filter((item) => item.free);','const freeItems = matchedItems.filter((item) => item.free && item.id !== "academy-free-opora");'],
  ['information link detachment','cards','<Link className={styles.landing} href={item.href}>','<Link className={styles.landing} href="/wrong">'],
  ['enrollment link detachment','cards','href={item.courseHref ?? item.href}','href={item.href}'],
]) test('negative OPORA route/card control rejects ' + label, async () => {
  const sources = sourcesFor()
  assert.equal(sources[key].split(before).length, 2, 'Unique mutation target')
  sources[key] = sources[key].replace(before, after)
  await assert.rejects(async () => { await verifyRoutes(sources); verifyCards(sources) }, assert.AssertionError)
})

test('equivalent JSX prop ordering preserves actual OPORA discovery rather than one source spelling', async () => {
  const sources = sourcesFor()
  sources.hub = sources.hub.replace('<AcademyDiscovery locale={locale} view={view} items={items}', '<AcademyDiscovery items={items} view={view} locale={locale}')
  await verifyRoutes(sources)
  verifyCards(sources)
})


test('negative Spanish information control rejects detaching both actual public course-page links', async () => {
  const sources = sourcesFor()
  assert.equal(sources.growth.split('/courses/antistress').length, 3, 'Two current information link bindings')
  sources.growth = sources.growth.replaceAll('/courses/antistress', '/wrong-info')
  await assert.rejects(() => verifyRoutes(sources), assert.AssertionError)
})
