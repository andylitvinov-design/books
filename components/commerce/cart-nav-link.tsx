"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import type { ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import styles from "./cart-nav-link.module.css";

const copy = { en: "Cart", ru: "Корзина", es: "Carrito" } as const;

export function CartNavLink({ locale }: { locale: ServiceLocale }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function sync() {
      try { setCount(restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY)).length); }
      catch { setCount(0); }
    }
    sync();
    window.addEventListener(SERVICE_CART_UPDATED_EVENT, sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener(SERVICE_CART_UPDATED_EVENT, sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);
  return <Link href={`/${locale}/cart`} className={styles.navCart} aria-label={`${copy[locale]} (${count})`} data-nav-item="cart">
    <ShoppingBasket size={20} aria-hidden="true" />
    <span>{copy[locale]}</span>
    {count > 0 ? <b aria-live="polite">{count}</b> : null}
  </Link>;
}
