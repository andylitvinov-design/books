import Link from 'next/link'
import { ArrowRight, Heart, ShieldCheck, Sparkles } from 'lucide-react'
import type { Locale } from '@/data/remedies'
import styles from './relationships-spotlight.module.css'
const labels={
  en:{tag:'A NEW SPACE · LOVE & INTIMACY',title:'Love, relationships & the art of connection',text:'Gentle, free self-reflection tests about affection, emotional closeness, sexual wellbeing, consent and Tantra-inspired presence.',start:'Explore 8 free tests',learn:'Discover the programme',cards:['Emotional connection','Choice & consent','Body awareness']},
  ru:{tag:'НОВОЕ НАПРАВЛЕНИЕ · ЛЮБОВЬ И БЛИЗОСТЬ',title:'Любовь, отношения и искусство близости',text:'Бережные бесплатные тесты о любви, эмоциональной близости, сексуальности, согласии и тантрическом присутствии.',start:'8 бесплатных тестов',learn:'Открыть направление',cards:['Эмоциональная близость','Свобода и согласие','Телесное присутствие']},
}
export function RelationshipsSpotlight({locale}: {locale:Locale}){
  const c=labels[locale]
  return <section className={styles.spotlight} aria-labelledby="relationships-spotlight-title">
    <div className={styles.main}><p className={styles.tag}>{c.tag}</p><h2 id="relationships-spotlight-title">{c.title}</h2><p>{c.text}</p>
      <div className={styles.actions}><Link className={styles.primary} href={`/${locale}/relationships#tests`}>{c.start}<ArrowRight size={16}/></Link>
      <Link href={`/${locale}/relationships`}>{c.learn}<ArrowRight size={16}/></Link></div>
    </div>
    <div className={styles.features} aria-hidden="true">
      <div><Heart size={23}/><span>{c.cards[0]}</span></div>
      <div><ShieldCheck size={23}/><span>{c.cards[1]}</span></div>
      <div><Sparkles size={23}/><span>{c.cards[2]}</span></div>
    </div>
  </section>
}
