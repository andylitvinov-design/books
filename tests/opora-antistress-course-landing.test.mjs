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
  const academyRoute = read('app/[locale]/academy/[[...slug]]/page.tsx')
  const hub = read('components/academy-hub.tsx')
  const reportBanner = read('components/app/free-course-banner.jsx')
  assert.match(ribbon, /courses\/antistress/)
  assert.match(ribbon, /app\/course\?program=stress/)
  assert.match(academy, /courses\/antistress/)
  assert.match(academy, /app\/course\?program=stress/)
  assert.match(publicCourses, /courses\/antistress/)
  assert.match(publicCourses, /app\/course\?program=stress/)
  // /courses is a legacy entry, not a second copy of the course catalog.
  // Check the actual Academy successor and its rendered OPORA card instead.
  assert.match(academyRoute, /if \(!slug\?\.length\) \{[\s\S]*?return <AcademyHub locale=\{locale\} view=\{view\} \/>;/)
  assert.match(academyRoute, /if \(key === "free-ai-courses"\) return <>[\s\S]*?<PublicGrowthCourses locale=\{locale\}/)
  assert.match(hub, /<AcademyDiscovery[^>]*items=\{items\}/)
  const opora = hub.match(/\{\s*id: "academy-free-opora",[\s\S]*?\n    \},/)?.[0]
  assert.ok(opora, 'The actual Academy catalog must retain the OPORA card')
  for (const title of ['ОПОРА · Антистресс', 'OPORA · Stress Relief', 'OPORA · Antiestrés'])
    assert.ok(opora.includes(title), 'Missing localized OPORA catalog title: ' + title)
  assert.match(opora, /href: "\/" \+ locale \+ "\/courses\/antistress"/)
  assert.match(opora, /courseHref: "\/" \+ \(locale === "es" \? "en" : locale\) \+ "\/app\/course\?program=stress"/)
  assert.match(opora, /free: true/)
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


// Execute only the real legacy route and metadata modules. No Next server,
// account, API, browser or private course transport is available to this VM.
function legacyRouteModule(path, dependencies) {
  const exports = {}
  const code = ts.transpileModule(read(path), { fileName: path, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  runInNewContext(code, { exports, URL, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected route dependency: ' + name)
    return dependencies[name]
  } }, { filename: path, timeout: 1000 })
  return exports
}

test('legacy course entries preserve localized permanent redirects, valid locales and canonical metadata', async () => {
  const navigation = {
    notFound() { throw Error('synthetic-not-found') },
    permanentRedirect(path) { throw Error('synthetic-permanent-redirect:' + path) },
  }
  const metadata = { metadataBaseFor: () => new URL('https://synthetic.example.invalid') }
  const courses = legacyRouteModule('app/[locale]/courses/page.tsx', {
    'next/navigation': navigation,
    '@/data/academy/catalog': { isPublicLocale: value => ['en', 'ru', 'es'].includes(value) },
    '@/data/site-metadata': metadata,
  })
  assert.deepEqual(Array.from(courses.generateStaticParams(), item => item.locale), ['en', 'ru', 'es'])
  for (const locale of ['en', 'ru', 'es']) {
    const params = Promise.resolve({ locale })
    await assert.rejects(courses.default({ params }), error => error.message === 'synthetic-permanent-redirect:/' + locale + '/academy')
    const seo = await courses.generateMetadata({ params })
    assert.equal(seo.alternates.canonical, '/' + locale + '/academy')
    for (const language of ['en', 'ru', 'es']) assert.equal(seo.alternates.languages[language], '/' + language + '/academy')
    assert.equal(seo.metadataBase.origin, 'https://synthetic.example.invalid')
    assert.ok(seo.title.length > 10 && seo.description.length > 20)
  }
  await assert.rejects(courses.default({ params: Promise.resolve({ locale: 'invalid' }) }), /synthetic-not-found/)
  assert.equal((await courses.generateMetadata({ params: Promise.resolve({ locale: 'invalid' }) })).title, 'Not found')
  const spanishMetadata = legacyRouteModule('lib/spanish-metadata.ts', { '@/data/site-metadata': metadata })
  const spanish = legacyRouteModule('app/es/courses/page.tsx', {
    'next/navigation': navigation, '@/lib/spanish-metadata': spanishMetadata,
  })
  assert.throws(() => spanish.default(), /synthetic-permanent-redirect:\/es\/academy$/)
  assert.equal(spanish.metadata.alternates.canonical, 'https://synthetic.example.invalid/es/academy')
  for(const locale of ['en','ru','es'])
    assert.equal(spanish.metadata.alternates.languages[locale], 'https://synthetic.example.invalid/' + locale + '/academy')
  assert.match(spanish.metadata.title, /OPORA Antiestrés/)
})
