import type { Metadata } from "next";
import { HolisticHouseHome } from "@/components/holistic-house-home";

export const metadata: Metadata = {
  title: "Holistic House — библиотеки и направления",
  description: "Holistic House: собрание книг, справочная библиотека гомеопатии и цифровой продукт PsiAlchemy. Знакомство с материалами и планируемыми направлениями проекта.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HolisticHouseHome />;
}
