"use client";

import { useEffect, type RefObject } from "react";

/**
 * CSS fixed bottom:0 alone may follow Safari's layout viewport while the
 * visual viewport changes on browser-toolbar collapse, scroll and keyboard
 * dismissal. Move the existing dock only by the measured, finite gap.
 * Never move an invisible/keyboard-hidden dock.
 */
export function useVisualBottomDock(ref: RefObject<HTMLElement | null>, enabled = true, viewKey = "") {
  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let translation = 0;
    const reset = () => {
      if (translation !== 0 || element.style.transform) {
        translation = 0;
        element.style.removeProperty("transform");
      }
    };
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!element.isConnected) return;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.position !== "fixed" || style.display === "none" ||
            style.visibility === "hidden" || rect.height < 1) {
          reset();
          return;
        }
        const visualBottom = viewport
          ? viewport.offsetTop + viewport.height
          : window.innerHeight;
        if (!Number.isFinite(visualBottom)) return;
        const gap = visualBottom - rect.bottom;
        if (!Number.isFinite(gap) || Math.abs(gap) <= 1) return;
        translation += gap;
        element.style.transform = `translate3d(0, ${translation}px, 0)`;
      });
    };
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver(update) : null;
    observer?.observe(element);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("pageshow", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    viewport?.addEventListener("scroll", update, { passive: true });
    viewport?.addEventListener("resize", update, { passive: true });
    return () => {
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      viewport?.removeEventListener("scroll", update);
      viewport?.removeEventListener("resize", update);
      reset();
    };
  }, [ref, enabled, viewKey]);
}
