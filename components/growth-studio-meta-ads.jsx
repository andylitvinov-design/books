'use client'

import {useState} from 'react'
import {CircleAlert, ClipboardCopy, ExternalLink, ShieldCheck} from 'lucide-react'
import draft from '@/data/meta-ads-pilot-draft.json'
import {metaAdsUrlParameters} from '@/lib/paid-ad-referrals.js'
import styles from './growth-studio.module.css'

const text={
  ru:{
    heading:'Facebook + Instagram · подготовка рекламы',
    state:'Черновик · без запуска',
    intro:'Один общий Meta-пилот, а не две конкурирующие кампании. Этот экран не подключает рекламный аккаунт, не ставит Pixel и не публикует объявления.',
    budget:'Верхний предел пилота',scope:'Размещений',scopeValue:'Facebook и Instagram',
    campaign:'Кампания',account:'Рекламный аккаунт',accountValue:'Не выбран и не подтверждён',
    checklist:'Перед первым платным запуском',
    gate1:'Подтвердить ВАШ Business Portfolio, Facebook Page и профессиональный Instagram. У проверенных ранее read-only аккаунтов не подтверждено соответствие Holistic House.',
    gate2:'Нужен принадлежащий Holistic House рекламный аккаунт с валютой CAD и часовым поясом Торонто. Не подставлять чужой или USD-аккаунт.',
    gate3:'Проверить бесплатный письменный разбор: реальная отправка формы, серверная квитанция и получение заявки владельцем в CRM.',
    gate4:'Подтвердить права на настоящие фотографии, обрезку для Facebook/Instagram Feed и Stories и соответствие политике Meta.',
    gate5:'В Ads Manager проверить именно жёсткий lifetime cap 35 CAD, окончание через 7 дней, согласовать бюджет отдельно. Если Meta не принимает лимит — остановиться.',
    attribution:'Важно: настоящая площадка определяется автоматически',
    attributionHelp:'В Meta Ads Manager поле Website URL должно содержать только чистую ссылку без UTM. В отдельное поле Tracking → URL parameters вставьте шаблон ниже. {{site_source_name}} должен подставить fb или ig; другие источники не засчитываются нашей системой. Проверьте оба варианта в реальном предпросмотре.',
    ads:'Два варианта объявления для проверки',
    copyText:'Копировать объявление',copyUrl:'Копировать адрес сайта',copyParams:'Копировать UTM-параметры',
    copied:'Скопировано',copyFailed:'Не удалось скопировать. Выделите текст вручную.',
    headline:'Заголовок',body:'Текст объявления',website:'Website URL (без параметров)',parameters:'URL parameters (поле Tracking)',view:'Проверить лендинг',
    readOnly:'Это только подготовка. Отчёты Meta, заявки и оплаты здесь не подтверждены. Никакого GA4 / Meta Pixel / CAPI, ретаргетинга по тестам или передачи личных данных.',
    manager:'Открыть Ads Manager',business:'Проверить Business Settings',issue:'Техническое ТЗ и блокеры',
  },
  en:{
    heading:'Facebook + Instagram · advertising setup',
    state:'Draft · not launched',
    intro:'One shared Meta pilot, not two competing campaigns. This screen does not connect an ad account, install a Pixel or publish an ad.',
    budget:'Maximum pilot exposure',scope:'Placements',scopeValue:'Facebook and Instagram',
    campaign:'Campaign',account:'Advertiser account',accountValue:'Not selected or verified',
    checklist:'Checks required before paid launch',
    gate1:'Verify YOUR Business Portfolio, Facebook Page and professional Instagram. Previously visible read-only accounts are not proven to belong to Holistic House.',
    gate2:'Use a verified Holistic House advertising account in CAD / Toronto time. Never substitute someone else’s or a USD account.',
    gate3:'Verify the free written-review intake end to end: actual form submission, server receipt and owner-confirmed CRM intake.',
    gate4:'Check real-photo usage rights, Facebook/Instagram Feed and Stories crops, and Meta policy compliance.',
    gate5:'Verify a hard CAD 35 lifetime cap and 7-day end date in Ads Manager, then obtain separate budget authorization. Stop if Meta rejects the cap.',
    attribution:'Important: actual serving platform, not creative name',
    attributionHelp:'Ads Manager Website URL must be the clean URL without UTM. Paste the template below into the separate Tracking → URL parameters field. {{site_source_name}} should resolve to fb or ig; other platform codes fail closed. Test both in real ad preview.',
    ads:'Two draft ads to review',
    copyText:'Copy ad copy',copyUrl:'Copy website URL',copyParams:'Copy URL parameters',
    copied:'Copied',copyFailed:'Clipboard unavailable. Select and copy the text manually.',
    headline:'Headline',body:'Primary text',website:'Website URL (no parameters)',parameters:'URL parameters (Tracking field)',view:'Review landing',
    readOnly:'Preparation only. Meta results, real leads and payments are not confirmed here. No GA4 / Meta Pixel / CAPI, test-based retargeting or private-data export.',
    manager:'Open Ads Manager',business:'Review Business Settings',issue:'Specification and blockers',
  },
}
const campaignCode='hh_free_review_en_toronto_202610'

export default function GrowthStudioMetaAds({locale='en'}) {
  const t=text[locale==='ru'?'ru':'en']
  const [feedback,setFeedback]=useState({id:'',ok:false})
  async function copy(value,id) {
    try {
      await navigator.clipboard.writeText(value)
      setFeedback({id,ok:true})
    } catch {
      setFeedback({id,ok:false})
    }
  }
  const gates=[t.gate1,t.gate2,t.gate3,t.gate4,t.gate5]
  return <details className={styles.metaAdsPanel} data-meta-ads-readiness>
    <summary><ShieldCheck size={18} aria-hidden="true"/><span>{t.heading}</span>
      <span className={styles.metaAdDraft}>{t.state}</span>
    </summary>
    <div className={styles.metaAdsBody}>
      <p>{t.intro}</p>
      <div className={styles.metaAdsFacts}>
        <div><small>{t.budget}</small><strong>CAD {draft.campaign.lifetimeBudgetCad} / {draft.campaign.maxDurationDays} days</strong></div>
        <div><small>{t.scope}</small><strong>{t.scopeValue}</strong></div>
        <div><small>{t.account}</small><strong>{t.accountValue}</strong></div>
      </div>
      <p className={styles.metaAdsCampaign}><strong>{t.campaign}:</strong> {draft.campaign.name}</p>
      <h4>{t.checklist}</h4>
      <ol className={styles.metaAdsGates}>{gates.map(gate=><li key={gate}>{gate}</li>)}</ol>
      <div className={styles.metaAdsNotice}>
        <CircleAlert size={17} aria-hidden="true"/>
        <div><strong>{t.attribution}</strong><p>{t.attributionHelp}</p></div>
      </div>
      <h4>{t.ads}</h4>
      <div className={styles.metaAdsCards}>
        {draft.campaign.ads.map(ad=>{
          const path='/en/services/free-situation-review'
          const params=metaAdsUrlParameters(path,{campaign:campaignCode,content:ad.id})
          const copyText=ad.headline+'\n\n'+ad.primaryText+'\n\nCTA: '+ad.cta
          return <article key={ad.id} className={styles.metaAdsCard}>
            <small>{ad.id.toUpperCase()} · {ad.cta}</small>
            <h5>{ad.headline}</h5><p>{ad.primaryText}</p>
            <div><strong>{t.website}</strong><code>{ad.adsManagerWebsiteUrl}</code>
              <button type="button" onClick={()=>copy(ad.adsManagerWebsiteUrl,ad.id+'-url')}>
                <ClipboardCopy size={14} aria-hidden="true"/>{t.copyUrl}</button>
            </div>
            <div><strong>{t.parameters}</strong><code>{params}</code>
              <button type="button" onClick={()=>copy(params,ad.id+'-params')}>
                <ClipboardCopy size={14} aria-hidden="true"/>{t.copyParams}</button>
            </div>
            <div className={styles.metaAdsCardActions}>
              <button type="button" onClick={()=>copy(copyText,ad.id+'-copy')}>
                <ClipboardCopy size={14} aria-hidden="true"/>{t.copyText}</button>
              <a href={ad.adsManagerWebsiteUrl} target="_blank" rel="noopener noreferrer">
                {t.view} <ExternalLink size={14} aria-hidden="true"/></a>
            </div>
            {feedback.id.startsWith(ad.id+'-')&&<small role="status">
              {feedback.ok?t.copied:t.copyFailed}
            </small>}
          </article>
        })}
      </div>
      <p className={styles.metaAdsSafety}><ShieldCheck size={16} aria-hidden="true"/>{t.readOnly}</p>
      <div className={styles.metaAdsLinks}>
        <a href="https://business.facebook.com/adsmanager/manage/campaigns" target="_blank" rel="noopener noreferrer">{t.manager} ↗</a>
        <a href="https://business.facebook.com/settings" target="_blank" rel="noopener noreferrer">{t.business} ↗</a>
        <a href="https://github.com/andylitvinov-design/books/issues/371" target="_blank" rel="noopener noreferrer">{t.issue} ↗</a>
      </div>
    </div>
  </details>
}
