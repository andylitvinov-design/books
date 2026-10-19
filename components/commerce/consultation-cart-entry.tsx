"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, HeartHandshake, ShoppingBasket, ShoppingCart } from "lucide-react";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import styles from "./consultation-cart-entry.module.css";

const copy = {
  en: {
    eyebrow: "PERSONAL CONSULTATIONS · WITH ANDREY",
    title: "Choose a personal session",
    cart: "Cart",
    add: "Add to cart",
    added: "In cart",
    remove: "Remove from cart",
    free: "Free drawing review + written report",
    note: "We agree on a session time personally. No payment is taken when you add to cart.",
    minute: "min",
  },
  ru: {
    eyebrow: "ЛИЧНЫЕ КОНСУЛЬТАЦИИ · С АНДРЕЕМ",
    title: "Выберите консультацию",
    cart: "Корзина",
    add: "В корзину",
    added: "В корзине",
    remove: "Убрать из корзины",
    free: "Бесплатный разбор рисунка + письменный отчёт",
    note: "Время согласуем лично. Добавление в корзину ничего не списывает.",
    minute: "мин",
  },
  es: {
    eyebrow: "CONSULTAS PERSONALES · CON ANDREY",
    title: "Elige tu consulta",
    cart: "Carrito",
    add: "Añadir al carrito",
    added: "En el carrito",
    remove: "Quitar del carrito",
    free: "Evaluación gratuita por dibujo + informe escrito",
    note: "Acordaremos el horario personalmente. Añadir al carrito no realiza ningún cobro.",
    minute: "min",
  },
} as const;

export function ConsultationCartEntry({ locale, id }: { locale: ServiceLocale; id?: string }) {
  const t = copy[locale];
  const headingId = useId();
  const products = publicServiceCatalog(locale).slice().reverse();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => {
      try { setSelected(restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY))); }
      catch { setSelected([]); }
    };
    sync();
    window.addEventListener(SERVICE_CART_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SERVICE_CART_UPDATED_EVENT, sync);
  }, []);

  function toggle(productId: string) {
    const updated = restoreServiceCart(JSON.stringify(
      selected.includes(productId) ? selected.filter(id => id !== productId) : [...selected, productId],
    ));
    let stored = false;
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(updated)); stored = true; }
    catch { /* Keep the selection in component state and pass validated SKUs via URL. */ }
    setSelected(updated);
    if (stored) window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
  }

  return (
    <section id={id} className={styles.entry} data-consultation-capture="service" data-consultation-cta="true"
      aria-labelledby={headingId} lang={locale}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}><HeartHandshake size={17} aria-hidden="true" />{t.eyebrow}</p>
          <h2 id={headingId}>{t.title}</h2>
        </div>
        <Link href={`/${locale}/cart${selected.length ? "?items=" + selected.join(",") : ""}`} className={styles.cartLink} data-consultation-cart-link>
          <ShoppingBasket size={19} aria-hidden="true" /> <span>{t.cart}</span>
          <b aria-live="polite" aria-atomic="true">{selected.length}</b>
        </Link>
      </div>
      <div className={styles.cards}>
        {products.map(product => {
          const added = selected.includes(product.id);
          return <article className={styles.card} key={product.id} data-service-product={product.id}>
            <div className={styles.rate}><span>{product.durationMinutes} {t.minute}</span><strong>{formatServiceAmount(product.amountMinor, locale)}</strong></div>
            <h3>{product.title}</h3>
            <button type="button" className={styles.add} data-added={added} aria-pressed={added}
              aria-label={`${added ? t.remove : t.add}: ${product.title}`}
              onClick={() => toggle(product.id)}>
              {added ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
              {added ? t.added : t.add}
            </button>
          </article>;
        })}
      </div>
      <Link className={styles.free} href={`/${locale}/services/free-situation-review`} prefetch={false}>
        <span>{t.free}</span><ArrowRight size={18} aria-hidden="true" />
      </Link>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
