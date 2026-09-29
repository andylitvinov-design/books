import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const metadata: Metadata = {
  title: "Holistic House — holistic care, practice, and personal guidance",
  description: "Holistic House: personal sessions, practical guidance, remedies, books, and thoughtful wellbeing resources.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const preference = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = preference === "ru" ? "ru" : "en";
  return <HolisticHouseHome locale={locale} />;
}
