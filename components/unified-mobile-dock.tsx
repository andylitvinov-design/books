"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, Clapperboard, Film, Leaf, MessageCircle, UserRound } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { UNIFIED_DOCK_IDS, isUnifiedMobileDockPath, unifiedMobileDockActive, unifiedMobileDockHref } from "@/lib/unified-mobile-dock.mjs";
import styles from "./unified-mobile-dock.module.css";

const icons = {
  mytube: Clapperboard, video: Film, ai: MessageCircle,
  practice: Leaf, master: BriefcaseBusiness, profile: UserRound,
} as const;
const labels = {
  ru: { mytube: "MyTube", video: "Видео", ai: "ИИ/Чат", practice: "Практика", master: "Мастер", profile: "Профиль" },
  en: { mytube: "MyTube", video: "Video", ai: "AI/Chat", practice: "Practice", master: "Master", profile: "Profile" },
  es: { mytube: "MyTube", video: "Vídeo", ai: "IA/Chat", practice: "Práctica", master: "Master", profile: "Perfil" },
} as const;

/** Exactly one screenshot-1 inspired fixed dock on app journeys, for guests and accounts.
 * Every destination is a REAL existing public/protected workflow. */
export function UnifiedMobileDock({ initialLocale = "en" }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname() || "";
  const localeMatch = pathname.match(/^\/(ru|en|es)(?:\/|$)/);
  const locale = (localeMatch?.[1] || initialLocale) as PublicLocale;
  const visible = isUnifiedMobileDockPath(pathname);
  const navRef = useRef<HTMLElement>(null);
  const [hash, setHash] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const viewport = window.visualViewport;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const node = navRef.current;
        if (!node) return;
        document.body.style.setProperty("--hh-unified-nav-height", node.getBoundingClientRect().height + "px");
        const focused = document.activeElement as HTMLElement | null;
        const editing = focused?.matches("input, textarea, [contenteditable=true]") || focused?.isContentEditable;
        const visualBottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
        setKeyboardOpen(Boolean(editing && innerHeight - visualBottom > 140));
      });
    };
    update();
    const observer = navRef.current ? new ResizeObserver(update) : null;
    if (observer && navRef.current) observer.observe(navRef.current);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("pageshow", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    viewport?.addEventListener("resize", update, { passive: true });
    viewport?.addEventListener("scroll", update, { passive: true });
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      document.body.style.removeProperty("--hh-unified-nav-height");
    };
  }, [visible, pathname]);

  // Deep link into the EXISTING Video Director chatbot. This does not instantiate
  // a second chatbot, provider or media exporter and preserves editor state.
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let observer: MutationObserver | undefined;
    const openExistingChat = () => {
      const nextHash = window.location.hash;
      setHash(nextHash);
      if (!/\/holistic-support\/mandala\/?$/.test(pathname) ||
          nextHash !== "#video-director-chat") return;
      const detail = document.querySelector<HTMLDetailsElement>("[data-video-director-chat-details]");
      if (!detail) return;
      const videoTab = document.querySelector<HTMLButtonElement>('[data-video-quick-control="video"]');
      if (videoTab?.getAttribute("aria-pressed") !== "true") videoTab?.click();
      if (!detail.open) detail.open = true;
      if (observer) observer.disconnect();
      frame = requestAnimationFrame(() => {
        document.getElementById("video-director-chat")?.scrollIntoView({ block: "nearest" });
      });
    };
    openExistingChat();
    if (/\/holistic-support\/mandala\/?$/.test(pathname)) {
      observer = new MutationObserver(() => {
        if (window.location.hash === "#video-director-chat") openExistingChat();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener("hashchange", openExistingChat);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("hashchange", openExistingChat);
    };
  }, [visible, pathname]);

  if (!visible) return null;
  const active = unifiedMobileDockActive(pathname, hash);
  return <nav ref={navRef} data-hh-unified-dock data-keyboard-open={keyboardOpen || undefined}
    className={styles.dock} aria-label={
      locale === "ru" ? "Нижнее меню Holistic House" :
      locale === "es" ? "Menú inferior Holistic House" : "Holistic House bottom menu"}>
    {UNIFIED_DOCK_IDS.map(id => {
      const href = unifiedMobileDockHref(locale, id);
      if (!href) return null;
      const Icon = icons[id];
      const label = labels[locale][id];
      return <Link href={href} key={id} prefetch={false}
        className={styles.item} data-unified-dock-item={id}
        aria-label={label} aria-current={active === id ? "page" : undefined}
        onClick={id === "ai" ? () => {
          // On the same route, Next's Link updates history without always
          // dispatching hashchange. Open the existing chat on the actual click.
          setHash("#video-director-chat");
          if (!pathname.endsWith("/holistic-support/mandala")) return;
          const videoTab = document.querySelector<HTMLButtonElement>('[data-video-quick-control="video"]');
          if (videoTab?.getAttribute("aria-pressed") !== "true") videoTab?.click();
          const detail = document.querySelector<HTMLDetailsElement>("[data-video-director-chat-details]");
          if (detail && !detail.open) detail.open = true;
          requestAnimationFrame(() => document.getElementById("video-director-chat")?.scrollIntoView({ block: "nearest" }));
        } : id === "video" ? () => setHash("") : undefined}>
        <Icon size={24} strokeWidth={2} aria-hidden="true" /><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
