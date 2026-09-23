import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HolisticHouseHome } from "@/components/holistic-house-home";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const metadata: Metadata = {
  title: "Holistic House — развитие, практики и индивидуальная работа",
  description: "Holistic House: индивидуальные сессии, программы и воркшопы, навигация по препаратам, книги и авторские материалы.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const preference = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = preference === "en" ? "en" : "ru";
  return <HolisticHouseHome locale={locale} />;
}
