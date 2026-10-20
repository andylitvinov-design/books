"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Search, ShoppingBasket, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { coreServiceOffers } from "@/data/core-service-offers";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import { filterStorefrontCards, SHOP_KINDS, SHOP_SORTS } from "@/lib/commerce/storefront-filter";
import styles from "./storefront-shop.module.css";

type ShopKind = "all" | "session" | "program" | "free";
type ShopSort = "featured" | "price-low" | "price-high" | "name";
type ShopItem = {
  id: string; kind: "session" | "program" | "free"; title: string; description: string;
  label: string; image: string; href: string; amountMinor: number | null;
  durationMinutes?: number;
};

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · THE SHOP",
    title: "Find your next step",
    subtitle: "Choose a one-time session, explore an individual programme or begin with a free resource. Only published fixed-price sessions can be paid for directly.",
    search: "Search the shop", searchPlaceholder: "Search by service or topic…",
    filters: "Shop categories", all: "All", session: "Consultations", program: "Programmes", free: "Free",
    sort: "Sort", featured: "Recommended", "price-low": "Price: low to high",
    "price-high": "Price: high to low", name: "Name A–Z",
    minute: "minutes", quoted: "By agreement", freePrice: "Free",
    cart: "Your cart", item: "item", items: "items", total: "Selected total",
    add: "Add to cart", added: "In cart · remove", buy: "Review & pay",
    details: "View details", start: "Start free", openCart: "Open cart",
    empty: "No offers match your search.", reset: "Show all offers",
    quoteNote: "Prices and access for personal courses are confirmed before any payment. They are not charged through the shop.",
    paymentNote: "Prices are in EUR. PayPal is available for fixed-price sessions; Interac is an enquiry for a separately agreed CAD amount. The session time is confirmed personally; payment is confirmed only after verifying the received funds.",
    paymentEvidence: "A redirect or payment screenshot is not proof of receipt.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · МАГАЗИН",
    title: "Выберите свой следующий шаг",
    subtitle: "Подберите личную консультацию, изучите курс или начните с бесплатного материала. Оплачиваются только услуги с утверждённой фиксированной ценой.",
    search: "Поиск по магазину", searchPlaceholder: "Найти услугу или тему…",
    filters: "Категории магазина", all: "Все", session: "Консультации", program: "Программы", free: "Бесплатно",
    sort: "Сортировка", featured: "Рекомендуемые", "price-low": "Сначала дешевле",
    "price-high": "Сначала дороже", name: "По названию",
    minute: "минут", quoted: "По согласованию", freePrice: "Бесплатно",
    cart: "Корзина", item: "услуга", items: "услуги", total: "Сумма выбранного",
    add: "В корзину", added: "В корзине · убрать", buy: "К оплате",
    details: "Подробнее", start: "Начать бесплатно", openCart: "Открыть корзину",
    empty: "Ничего не найдено.", reset: "Показать все услуги",
    quoteNote: "Стоимость и условия индивидуальных программ согласуются до оплаты. Магазин не списывает деньги за них автоматически.",
    paymentNote: "Цены указаны в EUR. Для фиксированных услуг доступен PayPal; Interac — запрос отдельно согласованной суммы в CAD. Время сессии согласуем лично; оплата подтверждается только после проверки поступления средств.",
    paymentEvidence: "Переход по ссылке или скриншот не подтверждают поступление денег.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · TIENDA",
    title: "Elige tu próximo paso",
    subtitle: "Elige una consulta, explora un programa individual o empieza con un recurso gratuito. Solo las sesiones de precio fijo están disponibles para pagar directamente.",
    search: "Buscar en la tienda", searchPlaceholder: "Buscar servicio o tema…",
    filters: "Categorías de la tienda", all: "Todos", session: "Consultas", program: "Programas", free: "Gratis",
    sort: "Ordenar", featured: "Recomendados", "price-low": "Precio: menor primero",
    "price-high": "Precio: mayor primero", name: "Por nombre",
    minute: "minutos", quoted: "A convenir", freePrice: "Gratis",
    cart: "Tu carrito", item: "servicio", items: "servicios", total: "Total seleccionado",
    add: "Añadir al carrito", added: "En carrito · quitar", buy: "Revisar y pagar",
    details: "Ver detalles", start: "Empezar gratis", openCart: "Abrir carrito",
    empty: "No hay resultados.", reset: "Ver todas las ofertas",
    quoteNote: "Los precios y condiciones de los programas personales se acuerdan antes del pago. No se cobran automáticamente aquí.",
    paymentNote: "Precios en EUR. PayPal está disponible para consultas de precio fijo; Interac solo solicita un importe CAD acordado aparte. El horario se acuerda personalmente; el pago se confirma solo después de verificar la recepción.",
    paymentEvidence: "Un enlace o una captura de pantalla no demuestran la recepción del pago.",
  },
} as const;

export function StorefrontShop({ locale }: { locale: ServiceLocale }) {
  const t = copy[locale];
  const searchId = useId();
  const sortId = useId();
  const products = useMemo(() => publicServiceCatalog(locale), [locale]);
  const items = useMemo<ShopItem[]>(() => {
    const offers = coreServiceOffers(locale);
    const photos = [
      "/images/holistic-house/video-posters/constellations-en-v1.webp",
      "/images/holistic-house/andy-about.png",
    ];
    const sessions: ShopItem[] = products.map((product, index) => ({
      id: product.id, kind: "session", title: product.title,
      description: product.description, label: String(product.durationMinutes) + " " + t.minute,
      image: photos[index] || photos[0], amountMinor: product.amountMinor,
      durationMinutes: product.durationMinutes, href: "/" + locale + "/cart",
    }));
    const programs: ShopItem[] = offers
      .filter(offer => ["alchemy", "hypnotherapy", "business"].includes(offer.id))
      .map(offer => ({
        id: offer.id, kind: "program" as const, title: offer.title,
        description: offer.promise, label: offer.label, image: offer.image,
        href: offer.href, amountMinor: null,
      }));
    const free: ShopItem[] = offers
      .filter(offer => ["situation", "dao"].includes(offer.id))
      .map(offer => ({
        id: offer.id, kind: "free" as const, title: offer.title,
        description: offer.promise, label: offer.label, image: offer.image,
        href: offer.href, amountMinor: 0,
      }));
    return [...sessions, ...programs, ...free];
  }, [locale, products, t.minute]);

  const [category, setCategory] = useState<ShopKind>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ShopSort>("featured");
  const [selected, setSelected] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const sync = () => {
      try { setSelected(restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY))); }
      catch { setSelected([]); }
    };
    sync();
    setRestored(true);
    window.addEventListener(SERVICE_CART_UPDATED_EVENT, sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener(SERVICE_CART_UPDATED_EVENT, sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  const visible = useMemo<ShopItem[]>(() => filterStorefrontCards(items,
    { kind: category, query, sort }) as ShopItem[], [items, category, query, sort]);

  const total = products.filter(product => selected.includes(product.id))
    .reduce((sum, product) => sum + product.amountMinor, 0);

  const cartHref = "/" + locale + "/cart" + (selected.length ? "?items=" + encodeURIComponent(selected.join(",")) : "");

  function toggle(item: ShopItem) {
    // Never add courses, quotes or free reports to a paid cart.
    if (item.kind !== 'session') return;
    if (!products.some(product => product.id === item.id)) return;
    const updated = restoreServiceCart(JSON.stringify(
      selected.includes(item.id) ? selected.filter(id => id !== item.id) : [...selected, item.id],
    ));
    setSelected(updated);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(updated)); }
    catch { /* URL checkout still accepts known catalog IDs when browser storage is unavailable. */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
  }

  return <section className={styles.shop} data-service-storefront lang={locale}>
    <div className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>
      <Link className={styles.cartLink} href={cartHref} data-shop-open-cart>
        <ShoppingBasket size={20} aria-hidden="true" />
        <span>{t.cart}</span>
        <b aria-live="polite">{restored ? selected.length : 0}</b>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>

    <div className={styles.controls}>
      <div className={styles.searchControl}>
        <label htmlFor={searchId}><Search size={16} aria-hidden="true"/>{t.search}</label>
        <input id={searchId} type="search" inputMode="search" value={query}
          onChange={event => setQuery(event.target.value.slice(0, 90))}
          placeholder={t.searchPlaceholder} autoComplete="off" data-shop-search />
      </div>
      <div className={styles.sortControl}>
        <label htmlFor={sortId}><SlidersHorizontal size={16} aria-hidden="true"/>{t.sort}</label>
        <select id={sortId} value={sort} data-shop-sort
          onChange={event => setSort(event.target.value as ShopSort)}>
          {SHOP_SORTS.map(key => <option key={key} value={key}>{t[key as ShopSort]}</option>)}
        </select>
      </div>
    </div>
    <div className={styles.filters} role="group" aria-label={t.filters}>
      {SHOP_KINDS.map(key => <button type="button" key={key}
        data-shop-filter={key} aria-pressed={category === key}
        onClick={() => setCategory(key as ShopKind)}>{t[key as ShopKind]}
        <span>{key === "all" ? items.length : items.filter(item => item.kind === key).length}</span>
      </button>)}
    </div>

    {visible.length ? <div className={styles.grid} data-shop-results>
      {visible.map(item => <article key={item.id} className={styles.card}
        data-shop-product={item.id} data-shop-kind={item.kind}>
        <div className={styles.media}>
          <Image src={item.image} alt="" fill unoptimized loading="lazy"
            sizes="(max-width: 520px) 100vw, (max-width: 850px) 50vw, 33vw"
            className={styles.image} />
          <span className={styles.categoryLabel}>{t[item.kind]}</span>
        </div>
        <div className={styles.content}>
          <div className={styles.priceRow}>
            <span>{item.label}</span>
            <strong>{item.kind === "session" ? formatServiceAmount(item.amountMinor!, locale) :
              item.kind === "free" ? t.freePrice : t.quoted}</strong>
          </div>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          {item.kind === "session" ? <div className={styles.paidActions}>
            <button type="button" className={styles.add} data-shop-add={item.id}
              aria-pressed={selected.includes(item.id)} onClick={() => toggle(item)}>
              {selected.includes(item.id) ? <Check size={16} aria-hidden="true" /> :
                <ShoppingCart size={16} aria-hidden="true" />}
              {selected.includes(item.id) ? t.added : t.add}
            </button>
            <Link className={styles.buy} data-shop-checkout={item.id}
              href={"/" + locale + "/cart?items=" +
                encodeURIComponent(restoreServiceCart(JSON.stringify([...selected, item.id])).join(","))}>
              {t.buy}<ArrowRight size={16} aria-hidden="true"/>
            </Link>
          </div> : <Link href={item.href} className={styles.details} data-shop-details={item.id}>
            {item.kind === "free" ? t.start : t.details}<ArrowRight size={16} aria-hidden="true"/>
          </Link>}
        </div>
      </article>)}
    </div> : <div className={styles.empty} role="status"><p>{t.empty}</p>
      <button type="button" onClick={() => { setQuery(""); setCategory("all"); setSort("featured"); }}>{t.reset}</button>
    </div>}

    <div className={styles.cartBar} data-shop-cart-summary>
      <div><ShoppingBasket size={20} aria-hidden="true" />
        <span>{t.cart} · {selected.length} {selected.length === 1 ? t.item : t.items}</span>
        <strong>{formatServiceAmount(total, locale)}</strong>
      </div>
      <Link href={cartHref}>{t.openCart}<ArrowRight size={17} aria-hidden="true"/></Link>
    </div>
    <div className={styles.notes}>
      <p>{t.quoteNote}</p>
      <p>{t.paymentNote}</p>
      <p>{t.paymentEvidence}</p>
    </div>
  </section>;
}
