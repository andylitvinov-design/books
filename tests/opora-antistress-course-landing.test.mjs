import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
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
  const courseSeo = read('app/[locale]/courses/page.tsx')
  const spanishSeo = read('app/es/courses/page.tsx')
  const reportBanner = read('components/app/free-course-banner.jsx')
  assert.match(ribbon, /courses\/antistress/)
  assert.match(ribbon, /app\/course\?program=stress/)
  assert.match(academy, /courses\/antistress/)
  assert.match(academy, /app\/course\?program=stress/)
  assert.match(publicCourses, /courses\/antistress/)
  assert.match(publicCourses, /app\/course\?program=stress/)
  assert.match(courseSeo, /ОПОРА Антистресс/)
  assert.match(spanishSeo, /OPORA Antiestrés/)
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
