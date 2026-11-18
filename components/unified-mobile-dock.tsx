"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, Clapperboard, Film, Leaf, MessageCircle, UserRound } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { UNIFIED_DOCK_IDS, isUnifiedMobileDockHomePath, isUnifiedMobileDockPath, isUnifiedMobileDockAppPath, isUnifiedMobileDockEditorialPath, unifiedMobileDockActive, unifiedMobileDockHref } from "@/lib/unified-mobile-dock.mjs";
import styles from "./unified-mobile-dock.module.css";
import { visualDockBottomOffset, visualKeyboardOpen } from "@/lib/mobile-visual-bottom.mjs";

const icons = {
  mytube: Clapperboard, video: Film, ai: MessageCircle,
  practice: Leaf, coach: UserRound, services: BriefcaseBusiness, profile: UserRound,
} as const;
const labels = {
  ru: { mytube: "MyTube", video: "MyVideo", ai: "ИИ/Чат", practice: "Обучение", coach: "Мой коуч", services: "Услуги", profile: "Профиль" },
  en: { mytube: "MyTube", video: "MyVideo", ai: "AI/Chat", practice: "Study", coach: "My Coach", services: "Services", profile: "Profile" },
  es: { mytube: "MyTube", video: "MyVideo", ai: "IA/Chat", practice: "Estudiar", coach: "Mi coach", services: "Servicios", profile: "Perfil" },
} as const;

/** Exactly one screenshot-1 inspired fixed dock on app journeys, for guests and accounts.
 * Every destination is a REAL existing public/protected workflow. */
export function UnifiedMobileDock({ initialLocale = "en" }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const localeMatch = pathname.match(/^\/(ru|en|es)(?:\/|$)/);
  const locale = (localeMatch?.[1] || initialLocale) as PublicLocale;
  const visible = isUnifiedMobileDockPath(pathname);
  const editorialOnly = !isUnifiedMobileDockAppPath(pathname) && isUnifiedMobileDockEditorialPath(pathname);
  const homeRoute = isUnifiedMobileDockHomePath(pathname);
  const navRef = useRef<HTMLElement>(null);
  const [hash, setHash] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const viewport = window.visualViewport;
    let lastUnfocusedVisualHeight = viewport?.height ?? window.innerHeight;
    // Safari can anchor fixed layers to the layout OR visual viewport as its
    // toolbar changes. Correct only the measured gap, never blindly add a
    // toolbar-sized inset on every scroll (which previously caused jumps).
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const node = navRef.current;
        if (!node || !node.isConnected) return;
        const rect = node.getBoundingClientRect();
        if (rect.height > 0)
          document.body.style.setProperty("--hh-unified-nav-height", rect.height + "px");
        const focused = document.activeElement as HTMLElement | null;
        const editing = focused?.matches("input, textarea, [contenteditable=true]") || focused?.isContentEditable;
        const visualHeight = viewport?.height ?? innerHeight;
        const visualOffsetTop = viewport?.offsetTop ?? 0;
        const hideForKeyboard = visualKeyboardOpen({
          editing: Boolean(editing), layoutHeight: innerHeight, visualHeight,
          visualOffsetTop, lastUnfocusedVisualHeight,
        });
        if (!editing && visualHeight > lastUnfocusedVisualHeight - 140)
          lastUnfocusedVisualHeight = visualHeight;
        // The signed offset also corrects the reported iPhone case where the
        // dock is stranded ABOVE the screen edge after the browser bar moves.
        // Re-measure on scroll; an aligned dock causes no further style write.
        if (viewport && rect.height > 0 && window.innerWidth < 760 && !hideForKeyboard) {
          const currentOffset = Number.parseFloat(node.style.bottom) || 0;
          const visualBottom = viewport.offsetTop + viewport.height;
          const nextOffset = visualDockBottomOffset({
            dockBottom: rect.bottom, visualBottom, currentOffset,
          });
          if (Math.abs(nextOffset - currentOffset) > 1)
            node.style.bottom = nextOffset + "px";
        } else if (node.style.bottom) {
          node.style.removeProperty("bottom");
        }
        setKeyboardOpen(previous => previous === hideForKeyboard ? previous : hideForKeyboard);
        // Share measured iOS keyboard visibility with the single Messenger page.
        // Retained focus after keyboard dismissal must not hide the composer.
        const messengerPage = document.querySelector<HTMLElement>(".hh-messages-page");
        if (messengerPage) messengerPage.dataset.hhMobileKeyboardOpen = hideForKeyboard ? "true" : "false";
      });
    };
    update();
    const observer = navRef.current ? new ResizeObserver(update) : null;
    if (observer && navRef.current) observer.observe(navRef.current);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pageshow", update);
    const onOrientationChange = () => {
      lastUnfocusedVisualHeight = viewport?.height ?? window.innerHeight;
      update();
    };
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    viewport?.addEventListener("resize", update, { passive: true });
    viewport?.addEventListener("scroll", update, { passive: true });
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("orientationchange", onOrientationChange);
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
  return <nav ref={navRef} data-hh-unified-dock data-hh-editorial-dock={editorialOnly || undefined} data-hh-home-route={homeRoute || undefined}
    data-keyboard-open={keyboardOpen || undefined}
    className={styles.dock} aria-label={
      locale === "ru" ? "Нижнее меню Holistic House" :
      locale === "es" ? "Menú inferior Holistic House" : "Holistic House bottom menu"}>
    {UNIFIED_DOCK_IDS.map(id => {
      const href = unifiedMobileDockHref(locale, id);
      if (!href) return null;
      const Icon = icons[id];
      const label = labels[locale][id];
      const ariaLabel = id === "coach"
        ? `${label}: ${locale === "ru" ? "Выбор коуча" : locale === "es" ? "Elegir coach" : "Choose a coach"}`
        : label;
      return <Link href={href} key={id} prefetch={false}
        className={styles.item} data-unified-dock-item={id}
        aria-label={ariaLabel} aria-current={active === id ? "page" : undefined}
        onClick={event => {
          if (id === "video") setHash("");
          // Keep public tabs in an installed iPhone app's current document.
          // AI and Profile retain their separate private CSP reload.
          if (!["mytube", "video", "practice", "coach", "services"].includes(id) ||
              event.defaultPrevented || event.button !== 0 || event.metaKey ||
              event.ctrlKey || event.shiftKey || event.altKey) return;
          const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches ||
            (window.navigator as Navigator & {standalone?: boolean}).standalone === true;
          if (!standalone) return;
          event.preventDefault();
          router.push(href);
        }}>
        <Icon size={24} strokeWidth={2} aria-hidden="true" /><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
