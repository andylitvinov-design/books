"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SupportTalismanGallery } from "./support-talisman-gallery";
import { CatalogStarRating, StarFilter, matchesStarFilter, sortByStars, useCatalogRatings } from "./catalog-star-rating";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { readBrowserTalismanCart, saveBrowserTalismanCart, TALISMAN_CART_UPDATED_EVENT } from "@/lib/practitioners/taoist-talisman-cart";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./taoist-talisman-catalog.module.css";

const copy = {
  en: {
    scroll: "Browse Daoist talismans", price: "Price", quote: "Confirmed by the master",
    add: "Add to cart", order: "Order", cart: "Your basket", selected: "in basket",
    note: "Prices, availability and delivery are agreed with the master before any payment.",
    example: "Photographic illustrations of Daoist-style Fu, not ready-to-ship product photographs. Symbols do not guarantee financial, relational or medical outcomes.",
    best: "Highest rated first", noMatches: "No talismans have this rating yet.", archive: "My private talisman collection", storageError: "Your browser could not save the basket. Please allow temporary site storage.",
  },
  ru: {
    scroll: "Каталог даосских талисманов", price: "Цена", quote: "Уточняется у мастера",
    add: "В корзину", order: "Заказать", cart: "Корзина", selected: "в корзине",
    note: "Стоимость, изготовление и доставку согласовываем с мастером до оплаты.",
    example: "Фотографии-иллюстрации талисманов в стиле Фу, а не готовые товары. Символы не гарантируют успеха, отношений или исцеления.",
    best: "Сначала с лучшей оценкой", noMatches: "Талисманов с такой оценкой пока нет.", archive: "Моя личная коллекция", storageError: "Не удалось сохранить корзину. Разрешите временное хранение данных сайта.",
  },
  es: {
    scroll: "Explorar talismanes taoístas", price: "Precio", quote: "A confirmar por el maestro",
    add: "Añadir al carrito", order: "Solicitar", cart: "Tu carrito", selected: "en el carrito",
    note: "El maestro confirma el precio, la disponibilidad y el envío antes de cobrar.",
    example: "Fotografías ilustrativas de estilo Fu, no fotos de productos listos para enviar. Los símbolos no garantizan resultados económicos, afectivos o médicos.",
    best: "Mejor valorados primero", noMatches: "Aún no hay talismanes con esa valoración.", archive: "Mi colección privada", storageError: "No se pudo guardar el carrito. Permite el almacenamiento temporal de este sitio.",
  },
} as const;

export function TaoistTalismanCatalog({ locale, featuredId, rankedIds }: { locale: PublicLocale; featuredId?: string; rankedIds?: readonly string[] }) {
  const router = useRouter();
  const t = copy[locale];
  const stars = useCatalogRatings("talisman", TAOIST_TALISMANS.map(item => item.id));
  const [minimumStars, setMinimumStars] = useState(0);
  const [sortRated, setSortRated] = useState(false);
  // Use the *existing* illustrated SKUs and cart, just put the relevant
  // symbol first. No purchase is made or customer details transferred.
  const rankedOrder = new Map((rankedIds || []).map((id, index) => [id, index]));
  const orderedTalismans = rankedOrder.size
    ? [...TAOIST_TALISMANS].sort((a, b) =>
        (rankedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rankedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    : featuredId && TAOIST_TALISMANS.some(item => item.id === featuredId)
      ? [...TAOIST_TALISMANS].sort((a, b) => Number(b.id === featuredId) - Number(a.id === featuredId))
      : TAOIST_TALISMANS;
  const visibleTalismans = (sortRated ? sortByStars([...orderedTalismans], item => item.id, stars.ratings) : [...orderedTalismans])
    .filter(item => stars.loading || stars.unavailable || matchesStarFilter(stars.ratings[item.id], minimumStars));
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const sync = () => setCartIds(readBrowserTalismanCart());
    sync();
    window.addEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
  }, []);

  const choose = (itemId: string) => {
    if (cartIds.includes(itemId)) {
      router.push("/" + locale + "/talismans/cart");
      return;
    }
    if (!saveBrowserTalismanCart([...cartIds, itemId])) {
      setStorageError(true);
      return;
    }
    setStorageError(false);
  };

  return (
    <div className={styles.root} data-taoist-talisman-catalog>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginBottom:12}}>
        <StarFilter locale={locale} minimum={minimumStars} onChange={setMinimumStars} />
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13}}>
          <input type="checkbox" checked={sortRated} onChange={event => setSortRated(event.target.checked)} />{t.best}
        </label>
      </div>
      {!visibleTalismans.length && !stars.loading && !stars.unavailable && <p role="status">{t.noMatches}</p>}
      <div className={styles.scroller} role="region" tabIndex={0} aria-label={t.scroll}>
        {visibleTalismans.map(item => (
          <article key={item.id} className={styles.card} data-tao-talisman={item.id} data-recommended={item.id === featuredId ? "true" : undefined}>
            <div className={styles.photo}>
              <Image src={item.image} fill
                alt={item[locale].title + " · " + t.example}
                sizes="(max-width: 430px) 104px, 174px" />
            </div>
            <div className={styles.details}>
              <h3>{item[locale].title}</h3>
              <CatalogStarRating locale={locale} summary={stars.ratings[item.id]} onRate={value => stars.rate(item.id,value)} unavailable={stars.unavailable} compact />
              <p className={styles.description}>{item[locale].description}</p>
              <div className={styles.purchase}>
                <span className={styles.price}><small>{t.price}</small><strong>{t.quote}</strong></span>
                <button type="button" className={styles.order}
                  data-tao-talisman-order={item.id}
                  aria-pressed={cartIds.includes(item.id)}
                  onClick={() => choose(item.id)}>
                  {cartIds.includes(item.id) ? t.order : t.add}<span aria-hidden="true"> →</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {cartIds.length > 0 && (
        <button type="button" className={styles.cartBanner} onClick={() => router.push("/" + locale + "/talismans/cart")}>
          <span>{t.cart}: {cartIds.length} {t.selected}</span><span aria-hidden="true">→</span>
        </button>
      )}
      {storageError && <p role="alert" className={styles.error}>{t.storageError}</p>}
      <p className={styles.note}>{t.note} {t.example}</p>
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
