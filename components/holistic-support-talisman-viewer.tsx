"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Leaf, ShoppingBag, Sparkles, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { readBrowserTalismanCart, saveBrowserTalismanCart } from "@/lib/practitioners/taoist-talisman-cart";
import { TaoistTalismanCart } from "@/components/taoist-talisman-cart";
import styles from "./holistic-support-talisman-viewer.module.css";

type Focus = "energy" | "money" | "relationships" | "goals";
const byGoal: Record<Focus, string> = {
  energy: "fu-balance", money: "fu-prosperity",
  relationships: "fu-harmony", goals: "fu-prosperity",
};
const goals: Focus[] = ["energy", "money", "relationships", "goals"];

const translations = {
  en: {
    mode: "Talisman", tradition: "Tradition", daoist: "Daoist Fu",
    master: "Master", masterValue: "On request", goal: "Goal",
    goals: { energy: "Energy", money: "Money", relationships: "Relationships", goals: "Goals" },
    recommended: "For your chosen focus", symbol: "Symbolic design", price: "Price confirmed by the master",
    request: "Request talisman", detail: "Details", closeDetail: "Hide details",
    gallery: "More talismans", browse: "Browse all", hideBrowse: "Close catalogue",
    previous: "Previous talisman", next: "Next talisman", selected: "Selected",
    instructions: "Swipe the main image or choose a design below.",
    note: "Illustrative designs, not ready-to-ship products. Price, availability and delivery are confirmed before payment. No promised results.",
    basketError: "Cannot save this choice on your device. Enable temporary site storage to continue.",
    orderTitle: "Review your talisman request", close: "Close request",
  },
  ru: {
    mode: "Талисман", tradition: "Традиция", daoist: "Даосские Фу",
    master: "Мастер", masterValue: "По запросу", goal: "Цель",
    goals: { energy: "Энергия", money: "Деньги", relationships: "Отношения", goals: "Цели" },
    recommended: "По выбранной цели", symbol: "Символический рисунок", price: "Стоимость уточняется у мастера",
    request: "Заказать талисман", detail: "Подробнее", closeDetail: "Скрыть описание",
    gallery: "Другие талисманы", browse: "Весь каталог", hideBrowse: "Свернуть каталог",
    previous: "Предыдущий талисман", next: "Следующий талисман", selected: "Выбран",
    instructions: "Листайте изображение или выберите символ ниже.",
    note: "Иллюстрации символов, не готовые изделия. Цена, наличие и доставка подтверждаются до оплаты. Без обещания результата.",
    basketError: "Не удалось сохранить выбор. Разрешите временное хранение данных сайта.",
    orderTitle: "Проверьте заявку на талисман", close: "Закрыть заявку",
  },
  es: {
    mode: "Talismán", tradition: "Tradición", daoist: "Fu taoísta",
    master: "Maestro", masterValue: "A consultar", goal: "Objetivo",
    goals: { energy: "Energía", money: "Dinero", relationships: "Relaciones", goals: "Metas" },
    recommended: "Para tu objetivo", symbol: "Diseño simbólico", price: "Precio confirmado por el maestro",
    request: "Solicitar talismán", detail: "Detalles", closeDetail: "Ocultar detalles",
    gallery: "Más talismanes", browse: "Ver catálogo", hideBrowse: "Cerrar catálogo",
    previous: "Talismán anterior", next: "Talismán siguiente", selected: "Seleccionado",
    instructions: "Desliza la imagen o elige un diseño de abajo.",
    note: "Diseños ilustrativos, no productos listos para envío. Precio y entrega se confirman antes de pagar. Sin promesas de resultados.",
    basketError: "No se pudo guardar el diseño. Permite el almacenamiento temporal.",
    orderTitle: "Revisa tu solicitud", close: "Cerrar solicitud",
  },
} as const;

export function HolisticSupportTalismanViewer({
  locale, focus, rankedIds, catalogOpen, onToggleCatalog,
}: {
  locale: PublicLocale;
  focus: Focus;
  rankedIds?: readonly string[];
  catalogOpen: boolean;
  onToggleCatalog: () => void;
}) {
  const t = translations[locale];
  const [goal, setGoal] = useState<Focus>(focus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [basketError, setBasketError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setGoal(focus); setSelectedId(null); }, [focus]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (orderOpen && !dialog.open) dialog.showModal();
    if (!orderOpen && dialog.open) dialog.close();
  }, [orderOpen]);

  // Only three published illustrative symbols. A goal is a browsing preference,
  // not a clinical inference, new stock-keeping unit or promise of availability.
  const preferredId = byGoal[goal];
  const ranked = new Map((rankedIds || []).map((id, index) => [id, index]));
  const items = [...TAOIST_TALISMANS].sort((a, b) => {
    const rank = (id: string) => (id === preferredId ? -1 : ranked.get(id) ?? 100);
    return rank(a.id) - rank(b.id);
  });
  const selected = items.find(item => item.id === selectedId) || items[0];
  const current = items.findIndex(item => item.id === selected.id);
  const step = (delta: number) => {
    const next = items[(current + delta + items.length) % items.length];
    setSelectedId(next.id);
    setDetailsOpen(false);
  };
  const touchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touch) touchOrigin.current = { x: touch.clientX, y: touch.clientY };
  };
  const touchEnd = (event: TouchEvent<HTMLElement>) => {
    const origin = touchOrigin.current;
    touchOrigin.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  };
  const request = () => {
    const existing = readBrowserTalismanCart();
    if (!saveBrowserTalismanCart([...new Set([...existing, selected.id])])) {
      setBasketError(true);
      return;
    }
    setBasketError(false);
    setOrderOpen(true);
  };

  return (
    <div className={styles.viewer} data-support-talisman-viewer>
      <section className={styles.hero} data-support-talisman={selected.id}
        aria-label={selected[locale].title} onTouchStart={touchStart} onTouchEnd={touchEnd}>
        <div className={styles.photoStage} aria-hidden="true">
          <Image src={selected.image} alt="" fill priority sizes="(max-width: 640px) 65vw, 500px"
            className={styles.talismanPhoto} />
        </div>
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.filters} role="group" aria-label={t.mode}>
          <span className={styles.mode} data-support-talisman-mode>
            <Sparkles size={17} aria-hidden="true" />{t.mode}
          </span>
          <span className={styles.staticFilter} data-support-talisman-filter="tradition">
            <strong>{t.tradition}</strong><small>{t.daoist}</small>
          </span>
          <span className={styles.staticFilter} data-support-talisman-filter="master">
            <strong>{t.master}</strong><small>{t.masterValue}</small>
          </span>
          <label className={styles.goalFilter} data-support-talisman-filter="goal">
            <strong>{t.goal}</strong><small>{t.goals[goal]}</small>
            <select value={goal} aria-label={t.goal}
              onChange={event => { setGoal(event.target.value as Focus); setSelectedId(null); setDetailsOpen(false); }}>
              {goals.map(key => <option value={key} key={key}>{t.goals[key]}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.badge}><Leaf size={15} aria-hidden="true" />
            {selected.id === preferredId ? t.recommended : t.symbol}</span>
          <h2>{selected[locale].title}</h2>
          <p>{selected[locale].description}</p>
          <span className={styles.price}>{t.price}</span>
        </div>
        <div className={styles.carouselControls} role="group" aria-label={t.gallery}>
          <button type="button" onClick={() => step(-1)} aria-label={t.previous} data-support-talisman-prev>
            <ChevronLeft size={23} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label={t.next} data-support-talisman-next>
            <ChevronRight size={23} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.request} data-support-talisman-request onClick={request}>
            <ShoppingBag size={23} aria-hidden="true" />{t.request}<ArrowRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className={styles.details} aria-expanded={detailsOpen} aria-controls="talisman-design-details"
            onClick={() => setDetailsOpen(open => !open)}>
            {detailsOpen ? t.closeDetail : t.detail}
          </button>
        </div>
        <div className={styles.dots} role="group" aria-label={t.gallery}>
          {items.map(item => <button type="button" key={item.id}
            aria-label={item[locale].title} aria-pressed={item.id === selected.id}
            onClick={() => { setSelectedId(item.id); setDetailsOpen(false); }} />)}
        </div>
      </section>
      {basketError && <p className={styles.error} role="alert">{t.basketError}</p>}
      {detailsOpen && <p id="talisman-design-details" className={styles.expandedDetails}>
        {selected[locale].description} {t.note}
      </p>}
      <section className={styles.more} aria-label={t.gallery}>
        <div className={styles.heading}>
          <h3>{t.gallery}</h3>
          <button type="button" onClick={onToggleCatalog} aria-expanded={catalogOpen}
            aria-controls="support-talisman-full-catalog">
            {catalogOpen ? t.hideBrowse : t.browse}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.rail} role="group" aria-label={t.instructions} data-support-talisman-rail>
          {items.map(item => <button type="button" key={item.id}
            className={styles.thumb} data-support-talisman-thumb={item.id}
            aria-pressed={item.id === selected.id} aria-label={item[locale].title}
            onClick={() => { setSelectedId(item.id); setDetailsOpen(false); }}>
            <span className={styles.thumbPhoto}><Image src={item.image} alt="" fill
              sizes="(max-width: 640px) 37vw, 200px" /></span>
            <span className={styles.thumbTitle}>{item[locale].title}</span>
            <span className={styles.thumbMarker}>{item.id === selected.id ? t.selected : t.goals[
              item.id === "fu-harmony" ? "relationships" : item.id === "fu-balance" ? "energy" : "money"
            ]}</span>
          </button>)}
        </div>
        <p className={styles.note}>{t.instructions} {t.note}</p>
      </section>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="support-talisman-order-title"
        onClose={() => setOrderOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) setOrderOpen(false); }}>
        <div className={styles.dialogTop}>
          <h2 id="support-talisman-order-title">{t.orderTitle}</h2>
          <button type="button" onClick={() => setOrderOpen(false)} aria-label={t.close}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <TaoistTalismanCart locale={locale} inline />
      </dialog>
    </div>
  );
}
