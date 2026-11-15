'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import styles from './subscription-compact-picker.module.css'

// Announced tariffs are display-only. They must NEVER use legacy Stripe
// price IDs or change any server-authoritative entitlements.
const PLANS=[{id:'free',name:'Free',amount:0},{id:'practice',name:'Practice',amount:5},{id:'master',name:'Master',amount:20},{id:'pro',name:'Pro',amount:40}]
const COPY={
  en:{
    open:'Compare plans',title:'Choose your plan',monthly:'Monthly',yearly:'Yearly · coming soon',billing:'Billing period',month:'mo',
    descriptions:{free:'Basic access',practice:'For regular practice',master:'For practitioners',pro:'Expanded possibilities'},
    details:'Details and terms',freeDetails:'Free basic access includes one active course. Saved progress is preserved.',
    conditions:'Paid plans and annual billing are unavailable until verified provider prices, entitlements and billing terms are configured.',
    education:'Self-report tests and courses are educational tools, not diagnosis or treatment.',
    note:'Announced prices only. Selecting a plan does not activate access or charge money.',
    total:'Total',continue:'Continue with Free',disabled:'Checkout not available yet',close:'Close plans'
  },
  ru:{
    open:'Сравнить тарифы',title:'Выберите тариф',monthly:'Ежемесячно',yearly:'За год · скоро',billing:'Период оплаты',month:'мес',
    descriptions:{free:'Базовый доступ',practice:'Для регулярной практики',master:'Для специалистов',pro:'Расширенные возможности'},
    details:'Подробнее и условия',freeDetails:'Базовый бесплатный доступ включает один активный курс. Прогресс сохраняется.',
    conditions:'Оплата платных тарифов и годового плана недоступна, пока не подтверждены цены, права доступа и условия у провайдера.',
    education:'Тесты и курсы носят образовательный характер и не заменяют диагностику или лечение.',
    note:'Цены пока для сравнения. Выбор тарифа не активирует доступ и не списывает деньги.',
    total:'Итого',continue:'Продолжить бесплатно',disabled:'Оплата пока недоступна',close:'Закрыть тарифы'
  },
  es:{
    open:'Comparar planes',title:'Elige tu plan',monthly:'Mensual',yearly:'Anual · próximamente',billing:'Período de pago',month:'mes',
    descriptions:{free:'Acceso básico',practice:'Práctica regular',master:'Para profesionales',pro:'Más posibilidades'},
    details:'Detalles y condiciones',freeDetails:'El plan gratuito incluye un curso activo. El progreso se conserva.',
    conditions:'Los planes pagados y anuales no se pueden adquirir hasta verificar los precios, derechos de acceso y condiciones.',
    education:'Los cursos y cuestionarios son educativos, no constituyen diagnóstico ni tratamiento.',
    note:'Precios anunciados. Elegir no activa el acceso ni implica un cobro.',
    total:'Total',continue:'Continuar gratis',disabled:'Pago aún no disponible',close:'Cerrar planes'
  }
}
export default function SubscriptionCompactPicker({locale='en'}){
  const t=COPY[locale]||COPY.en
  const [open,setOpen]=useState(false)
  const [chosen,setChosen]=useState('free')
  const dialogRef=useRef(null),triggerRef=useRef(null)
  const titleId=useId(),radioName=useId()
  const active=PLANS.find(plan=>plan.id===chosen)||PLANS[0]

  useEffect(()=>{
    // Existing Plans quick action opens the account disclosure via a deep link.
    // An intentional Plans link opens this chooser without a new route or shell.
    const checkHash=()=>{if(window.location.hash==='#hh-settings-plans')setOpen(true)}
    const onLink=event=>{if(event.target?.closest?.('a[href="#hh-settings-plans"]'))setOpen(true)}
    checkHash()
    window.addEventListener('hashchange',checkHash)
    document.addEventListener('click',onLink,true)
    return ()=>{window.removeEventListener('hashchange',checkHash);document.removeEventListener('click',onLink,true)}
  },[])
  useEffect(()=>{
    const dialog=dialogRef.current
    if(!dialog)return
    if(open&&!dialog.open)dialog.showModal()
    if(!open&&dialog.open){dialog.close();triggerRef.current?.focus()}
  },[open])

  return <>
    <button type="button" ref={triggerRef} className={styles.launch} aria-haspopup="dialog"
      aria-controls={titleId+'-dialog'} onClick={()=>setOpen(true)} data-open-subscription-plans>{t.open}</button>
    <dialog id={titleId+'-dialog'} ref={dialogRef} className={styles.dialog}
      aria-labelledby={titleId} data-subscription-plan-dialog
      onClose={()=>setOpen(false)} onCancel={event=>{event.preventDefault();setOpen(false)}}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h3 id={titleId}>{t.title}</h3>
          <button className={styles.close} type="button" aria-label={t.close} onClick={()=>setOpen(false)}>
            <X size={22} aria-hidden="true"/>
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.periods} role="group" aria-label={t.billing}>
            <span className={styles.activePeriod}>{t.monthly}</span>
            <span className={styles.unavailablePeriod} aria-disabled="true">{t.yearly}</span>
          </div>
          <fieldset className={styles.planList}>
            <legend className={styles.srOnly}>{t.title}</legend>
            {PLANS.map(plan=><label key={plan.id} className={styles.plan} data-selected={chosen===plan.id}>
              <input type="radio" name={radioName} value={plan.id} checked={chosen===plan.id}
                onChange={()=>setChosen(plan.id)}/>
              <span className={styles.info}><strong>{plan.name}</strong><small>{t.descriptions[plan.id]}</small></span>
              <span className={styles.amount}>€{plan.amount} <small>/ {t.month}</small></span>
              {chosen===plan.id&&<Check size={17} className={styles.check} aria-hidden="true"/>}
            </label>)}
          </fieldset>
          <details className={styles.details}>
            <summary>{t.details}</summary>
            <p>{t.freeDetails}</p>
            <p>{t.conditions}</p>
            <p>{t.education}</p>
          </details>
        </div>
        <footer className={styles.footer}>
          <div className={styles.total}><span>{t.total}</span>
            <strong aria-live="polite">€{active.amount} / {t.month}</strong></div>
          <p className={styles.note}>{t.note}</p>
          <button type="button" className={styles.action} disabled={chosen!=='free'}
            onClick={()=>setOpen(false)}>{chosen==='free'?t.continue:t.disabled}</button>
        </footer>
      </div>
    </dialog>
  </>
}
