"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";

// The full review archive has six interactive video players per language.
// Keep it outside first-paint JS, SSR HTML and the initial hydration tree.
const PersonalTestimonials = dynamic(
  () => import("@/components/personal-testimonials").then((module) => module.PersonalTestimonials),
  { ssr: false },
);

export function LazyPersonalTestimonials({
  locale,
  summary,
  className,
}: {
  locale: PublicLocale;
  summary: string;
  className: string;
}) {
  const [openedOnce, setOpenedOnce] = useState(false);

  return (
    <details
      className={className}
      data-review-stories
      onToggle={(event) => {
        if (event.currentTarget.open) setOpenedOnce(true);
      }}
    >
      <summary>{summary}<ArrowRight size={18} aria-hidden="true" /></summary>
      {openedOnce ? <PersonalTestimonials locale={locale} variant="all" sameAudioOnly /> : null}
    </details>
  );
}
