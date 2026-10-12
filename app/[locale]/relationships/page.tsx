import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Heart, HeartHandshake, ShieldCheck, Sparkles, Leaf } from 'lucide-react'
import { PublicSiteHeader } from '@/components/public-site-header'
import { RELATIONSHIPS_INTIMACY_CATALOG, RELATIONSHIP_CONTEXT_COPY } from '@/data/assessments/relationships-intimacy-v1'
import styles from './relationships.module.css'

type Props = { params: Promise<{ locale: string }> }
type Language = 'en' | 'ru'
const copy = {
  en: {
    kicker:'HOLISTIC HOUSE · LOVE & RELATIONSHIPS', title:'Love. Connection. Intimacy.',
    subtitle:'Explore how you connect, communicate, feel desire and stay true to yourself. A gentle space for relationships, sexual wellbeing and Tantra-inspired presence.',
    secondary:'Personal guidance', begin:'Explore free tests', label:'Self-reflection series',
    intro:'Eight short, free questionnaires in English or Russian. Choose the topic that speaks to you, then receive a private report with separate scales and practical, optional reflections.',
    minutes:'~2 min', questions:'6 questions', open:'Explore this test',
    additional:'Go deeper with personal guidance', guidance:'If something in love, intimacy or relationships feels difficult, we can explore your question together at your pace — without pressure or promises of a particular outcome.',
    consult:'View personal sessions', privacyTitle:'Your pace. Your privacy.',
    privacy:'These questions are for adults. You can choose a test, decide not to answer it, and continue with Google only when you want to save results privately. We never assess the consent or intentions of another person from your answers.',
    related:'Already in the library', relatedCopy:'You can also explore the existing Closeness Compass, Boundary Radar and Conflict Repair self-checks.',
    full:'Open complete test library', groupLabel:'Choose your area', explore:'Find a topic to explore',
    groups:[
      {id:'love',tag:'01 · LOVE',title:'Affection & relationships',intro:'Explore the ways you care, communicate and allow emotional closeness.',keys:['hh-love-affection','hh-trust-dialogue','hh-emotional-intimacy']},
      {id:'sex',tag:'02 · INTIMACY',title:'Sexual wellbeing & consent',intro:'Understand your preferences, communication and choice without shame or performance pressure.',keys:['hh-intimacy-consent','hh-desire-dialogue','hh-sexual-self-kindness']},
      {id:'tantra',tag:'03 · TANTRA',title:'Presence & embodied joy',intro:'Practice mindful attention, grounding and voluntary connection without any requirement for touch.',keys:['hh-tantra-presence','hh-sensual-joy']},
    ],
  },
  ru: {
    kicker:'HOLISTIC HOUSE · ЛЮБОВЬ И ОТНОШЕНИЯ',title:'Любовь. Близость. Контакт.',
    subtitle:'Исследуйте, как вы сближаетесь, общаетесь, переживаете желание и сохраняете верность себе. Бережное пространство для отношений, сексуальности и тантрического присутствия.',
    secondary:'Личная консультация',begin:'Бесплатные тесты',label:'Серия для самопознания',
    intro:'Восемь коротких бесплатных анкет на русском и английском. Выберите то, что откликается, и получите личный отчёт с отдельными шкалами и необязательными практическими рекомендациями.',
    minutes:'~2 мин',questions:'6 вопросов',open:'Исследовать себя',
    additional:'Можно пойти глубже с личной поддержкой',guidance:'Если в любви, отношениях или интимной сфере есть непростая тема, её можно спокойно исследовать на личной встрече — без давления и обещаний результата.',
    consult:'Посмотреть консультации',privacyTitle:'Ваш темп. Ваша приватность.',
    privacy:'Эти анкеты предназначены для взрослых. Вы можете выбрать тест или отказаться от него, а входить через Google — только если захотите сохранить результаты в личном кабинете. Ответы не оценивают согласие или намерения другого человека.',
    related:'Уже есть в нашей библиотеке',relatedCopy:'Можно также пройти имеющиеся тесты «Компас близости», «Радар границ» и «Восстановление после конфликтов».',
    full:'Весь каталог тестов',groupLabel:'Выберите направление',explore:'Найдите свою тему',
    groups:[
      {id:'love',tag:'01 · ЛЮБОВЬ',title:'Нежность и отношения',intro:'Как вы проявляете тепло, общаетесь и допускаете эмоциональную близость.',keys:['hh-love-affection','hh-trust-dialogue','hh-emotional-intimacy']},
      {id:'sex',tag:'02 · ИНТИМНОСТЬ',title:'Сексуальность и согласие',intro:'Предпочтения, общение и свобода выбора без стыда и давления ожиданий.',keys:['hh-intimacy-consent','hh-desire-dialogue','hh-sexual-self-kindness']},
      {id:'tantra',tag:'03 · ТАНТРА',title:'Присутствие и чувственность',intro:'Мягкое внимание к себе, телесное заземление и добровольный контакт без обязательных прикосновений.',keys:['hh-tantra-presence','hh-sensual-joy']},
    ],
  },
} as const

export function generateStaticParams() { return [{locale:'en'},{locale:'ru'}] }
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params
  const ru = locale==='ru'
  return {title:ru?'Любовь, отношения и сексуальность | Holistic House':'Love, Relationships & Sexual Wellbeing | Holistic House',
    description:ru?'Бережные тесты об эмоциональной близости, согласии, сексуальном благополучии и тантрическом присутствии — с личными рекомендациями.':'Explore free self-reflection tests about love, emotional intimacy, sexual wellbeing, consent and Tantra-inspired mindful presence.',
    alternates:{languages:{en:'/en/relationships',ru:'/ru/relationships'}}}
}
export default async function RelationshipsPage({params}:Props) {
  const {locale:input} = await params
  if(input!=='en'&&input!=='ru') notFound()
  const locale = input as Language
  const c = copy[locale]
  type PublicTest = { key: string; title: Record<Language,string>; description: Record<Language,string> }
  const tests = new Map<string,PublicTest>((RELATIONSHIPS_INTIMACY_CATALOG as PublicTest[]).map((item:PublicTest) => [item.key,item]))
  return <main className={styles.page} lang={locale}>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false}/>
    <section className={styles.hero} aria-labelledby="relationships-title">
      <div className={styles.heroContent}>
        <p className={styles.kicker}>{c.kicker}</p>
        <h1 id="relationships-title">{c.title}</h1>
        <p className={styles.lead}>{c.subtitle}</p>
        <div className={styles.actions}>
          <Link href="#tests" className={styles.primary}>{c.begin}<ArrowRight size={17}/></Link>
          <Link href={`/${locale}/services`} className={styles.secondary}>{c.secondary}</Link>
        </div>
      </div>
      <div className={styles.heroArt} aria-hidden="true">
        <div className={styles.orbit}><Heart size={62} strokeWidth={1.1}/></div>
        <div className={styles.bubbleOne}><HeartHandshake size={32}/></div>
        <div className={styles.bubbleTwo}><Leaf size={31}/></div>
        <div className={styles.bubbleThree}><Sparkles size={31}/></div>
      </div>
    </section>
    <section id="tests" className={styles.library} aria-labelledby="relationships-series">
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>{c.label}</p>
        <h2 id="relationships-series">{c.explore}</h2>
        <p>{c.intro}</p>
      </div>
      <div className={styles.groups}>
        {c.groups.map(group=><section key={group.id} className={styles.group} data-relationships-category={group.id} aria-labelledby={group.id+'-heading'}>
          <div className={styles.groupHeading}><span>{group.tag}</span><h3 id={group.id+'-heading'}>{group.title}</h3><p>{group.intro}</p></div>
          <div className={styles.testList}>{group.keys.map(key=>{
            const test=tests.get(key)
            if(!test) return null
            return <Link key={key} className={styles.testCard} href={`/${locale}/client/tests?test=${key}`} prefetch={false}>
              <span className={styles.testIcon} aria-hidden="true">{group.id==='sex'?<ShieldCheck size={20}/>:group.id==='tantra'?<Sparkles size={20}/>:<Heart size={20}/>}</span>
              <span className={styles.testText}>
                <strong>{test.title[locale]}</strong>
                <span>{test.description[locale]}</span>
                <small>{c.questions} · {c.minutes}</small>
              </span>
              <ArrowRight className={styles.arrow} size={19} aria-label={c.open}/>
            </Link>
          })}</div>
        </section>)}
      </div>
      <div className={styles.more}><div><strong>{c.related}</strong><p>{c.relatedCopy}</p></div><Link href={`/${locale}/client/tests`} prefetch={false}>{c.full}<ArrowRight size={16}/></Link></div>
    </section>
    <section className={styles.footerGrid}>
      <div className={styles.safety}><ShieldCheck size={24}/><div><h2>{c.privacyTitle}</h2><p>{c.privacy}</p><p className={styles.disclaimer}>{RELATIONSHIP_CONTEXT_COPY[locale]}</p></div></div>
      <div className={styles.support}><p className={styles.kicker}>{c.additional}</p><p>{c.guidance}</p><Link href={`/${locale}/services`}>{c.consult}<ArrowRight size={17}/></Link></div>
    </section>
  </main>
}
