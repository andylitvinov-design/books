"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HolisticInlineSupportOrder } from "./holistic-inline-support-order";
import { SupportTalismanGallery } from "./support-talisman-gallery";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import type { SupportRequestKind } from "./remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./taoist-talisman-catalog.module.css";

type Talisman = (typeof TAOIST_TALISMANS)[number];
const copy = {
  en: {
    scroll:"Browse Daoist talismans", price:"Price", quote:"Confirmed by the master",
    order:"Order", selected:"Your selection",
    enquiry:"Select a practitioner and send an enquiry. Item, price and delivery are confirmed before you commit to buying.",
    example:"Photographic illustrations of Daoist-style Fu, not ready-to-ship product photographs. Symbols do not guarantee financial, relational or medical outcomes.",
    archive:"My private talisman collection",
  },
  ru: {
    scroll:"Каталог даосских талисманов", price:"Цена", quote:"Уточняется у мастера",
    order:"Заказать", selected:"Вы выбрали",
    enquiry:"Выберите мастера и отправьте заявку. Изготовление, цену и доставку мастер подтвердит до покупки.",
    example:"Фотографии-иллюстрации талисманов в стиле Фу, а не готовые товары. Символы не гарантируют успеха, отношений или исцеления.",
    archive:"Моя личная коллекция",
  },
  es: {
    scroll:"Explorar talismanes taoístas", price:"Precio", quote:"A confirmar por el profesional",
    order:"Solicitar", selected:"Tu elección",
    enquiry:"Elige un profesional y envía tu solicitud. La producción, el precio y la entrega se confirman antes de comprar.",
    example:"Fotografías ilustrativas de estilo Fu, no fotos de productos listos para enviar. Los símbolos no garantizan resultados económicos, afectivos o médicos.",
    archive:"Mi colección privada",
  },
} as const;

export function TaoistTalismanCatalog({ locale, standalone = false }: { locale: PublicLocale; standalone?: boolean }) {
  const t = copy[locale];
  const [selection, setSelection] = useState<Talisman | null>(standalone ? TAOIST_TALISMANS[0] : null);
  const [hasPicked, setHasPicked] = useState(false);
  const [kind, setKind] = useState<SupportRequestKind>("talisman");
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    const onDifferentOrder = (event: Event) => {
      if ((event as CustomEvent<{ source?: string }>).detail?.source !== "catalog") setSelection(null);
    };
    window.addEventListener("hh-support-order-open", onDifferentOrder);
    return () => window.removeEventListener("hh-support-order-open", onDifferentOrder);
  }, []);

  useEffect(() => {
    if (!selection || !hasPicked) return;
    const panel = document.getElementById("holistic-inline-order");
    if (!panel) return;
    panel.scrollIntoView({
      block:"start",
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    panel.querySelector<HTMLElement>("#holistic-inline-order-title")?.focus({ preventScroll:true });
  }, [selection, hasPicked]);

  const choose = (item: Talisman) => {
    window.dispatchEvent(new CustomEvent("hh-support-order-open", { detail:{ source:"catalog" } }));
    setKind("talisman");
    setHasPicked(true);
    setSelection(item);
  };

  return (
    <div className={styles.root + (standalone ? " " + styles.standalone : "")} data-taoist-talisman-catalog>
      <div className={styles.scroller} role="region" tabIndex={0} aria-label={t.scroll}>
        {TAOIST_TALISMANS.map(item => (
          <article key={item.id} className={styles.card} data-tao-talisman={item.id}>
            <div className={styles.photo}>
              <Image src={item.image} fill
                alt={item[locale].title + " · " + t.example}
                sizes="(max-width: 430px) 104px, 174px" />
            </div>
            <div className={styles.details}>
              <h3>{item[locale].title}</h3>
              <p className={styles.description}>{item[locale].description}</p>
              <div className={styles.purchase}>
                <span className={styles.price}><small>{t.price}</small><strong>{t.quote}</strong></span>
                <button type="button" className={styles.order}
                  data-tao-talisman-order={item.id}
                  aria-pressed={selection?.id === item.id}
                  aria-expanded={selection?.id === item.id && kind === "talisman"}
                  aria-controls="holistic-inline-order" onClick={() => choose(item)}>
                  {t.order}<span aria-hidden="true"> →</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className={styles.note}>{t.example}</p>

      {selection && (
        <div className={styles.request} data-tao-talisman-request={selection.id}>
          <article className={styles.selectionHero} data-tao-selected-item={selection.id}>
             <div className={styles.selectionPhoto}>
               <Image src={selection.image} alt={selection[locale].title} fill
                 sizes="(max-width:430px) 120px, 180px" />
             </div>
             <div className={styles.selectionCopy}>
               <p className={styles.selected}>{t.selected}</p>
               <h3>{selection[locale].title}</h3>
               <p>{selection[locale].description}</p>
               <span className={styles.selectionPrice}>{t.price}: {t.quote}</span>
             </div>
           </article>
          <p className={styles.explanation}>{t.enquiry}</p>
          <HolisticInlineSupportOrder key={selection.id} locale={locale} kind={kind}
            initialGoal={selection.goal} initialTalismanId={selection.id}
            onKindChange={setKind} onClose={() => setSelection(null)} />
        </div>
      )}

      <div className={styles.archive}>
        <button type="button" className={styles.archiveToggle} aria-expanded={archiveOpen}
          aria-controls="tao-talisman-private-gallery" onClick={() => setArchiveOpen(open => !open)}>
          {t.archive} <span aria-hidden="true">{archiveOpen ? "−" : "+"}</span>
        </button>
        {archiveOpen && <div id="tao-talisman-private-gallery" className={styles.archiveContent}>
          <SupportTalismanGallery locale={locale} />
        </div>}
      </div>
    </div>
  );
}
