"use client";

import { useEffect } from "react";

/**
 * Archived-video index links point inside an otherwise collapsed study chapter.
 * Reveal that chapter on a deep link, including an initial page load, before
 * scrolling to the preserved Russian-language videos.
 */
export function TempleCourseHashSync() {
  useEffect(() => {
    function revealVideoTarget() {
      const fragment = decodeURIComponent(window.location.hash.slice(1));
      if (!fragment.startsWith("temple-video-")) return;
      const id = fragment.slice("temple-video-".length);
      const chapter = document.getElementById("temple-" + id);
      const sourceVideos = document.getElementById(fragment);
      if (!chapter || !sourceVideos) return;
      const disclosure = chapter.querySelector<HTMLDetailsElement>(".temple-stage-details");
      if (disclosure && !disclosure.open) disclosure.open = true;
      window.requestAnimationFrame(() => {
        sourceVideos.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }

    revealVideoTarget();
    window.addEventListener("hashchange", revealVideoTarget);
    return () => window.removeEventListener("hashchange", revealVideoTarget);
  }, []);

  return null;
}
