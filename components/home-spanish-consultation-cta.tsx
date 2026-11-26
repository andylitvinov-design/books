"use client";

import { useEffect, useState } from "react";
import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";

// /es always selects the existing personal choice. Keep the original null
// server/first-client render so hydration and the visible form stay unchanged.
export function HomeSpanishConsultationCta({ locale }: { locale: "es" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <ConsultationChoiceCapture locale={locale} variant="personal" /> : null;
}
