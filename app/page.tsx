import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const metadata: Metadata = {
  title: "Holistic House — библиотеки и направления",
  description: "Holistic House: книги, библиотека препаратов, услуги и авторский подход «Алхимия души».",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const preference = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = preference === "en" ? "en" : "ru";
  return <HolisticHouseHome locale={locale} />;
}
