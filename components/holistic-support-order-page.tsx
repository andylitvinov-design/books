"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HolisticInlineSupportOrder } from "./holistic-inline-support-order";
import type { SupportRequestKind } from "./remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";

const goals = {
  business: "Work and money",
  love: "Connection and relationships",
  health: "Inner balance and calm",
} as const;

export function HolisticSupportOrderPage({ locale, topic }: {
  locale: PublicLocale;
  topic: keyof typeof goals;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<SupportRequestKind>("energy");
  return <HolisticInlineSupportOrder locale={locale} kind={kind} initialGoal={goals[topic]}
    onKindChange={next => {
      if (next === "talisman") {
        router.push("/" + locale + "/talismans");
      } else {
        setKind(next);
      }
    }}
    onClose={() => router.push("/" + locale + "/holistic-support")} />;
}
