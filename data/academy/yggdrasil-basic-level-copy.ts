import type { PublicLocale } from "@/lib/public-locales";
import englishAttunements from "@/data/academy/yggdrasil-en-settings-l1.json";

// Shared, previously published Basic Course summaries and attunement translations.
export const basicStepDescriptions: Record<number, Record<PublicLocale, string>> = {
  1: {
    en: "Start with body awareness, intuition and symbolic protection. Learn four foundational attunements and how to approach a personal situation.",
    ru: "Начните с внимания к телу, интуиции и символической защиты. Освойте четыре базовые настройки и работу с личной ситуацией.",
    es: "Empieza con la atención al cuerpo, la intuición y la protección simbólica. Aprende cuatro sintonizaciones básicas y a explorar una situación personal.",
  },
  2: {
    en: "Practise symbolic cleansing, charging objects and releasing unwanted connections. Explore your relationship with resources and money.",
    ru: "Освойте символическое очищение, зарядку предметов и освобождение от нежелательных связей. Исследуйте своё отношение к ресурсам и деньгам.",
    es: "Practica limpieza simbólica, carga de objetos y liberación de vínculos no deseados. Explora tu relación con los recursos y el dinero.",
  },
  3: {
    en: "Explore personal direction and inner strength through practices centred on emotions, will, intellect, energy and life patterns.",
    ru: "Исследуйте жизненное направление и внутреннюю силу через практики с эмоциями, волей, интеллектом, энергией и жизненными сценариями.",
    es: "Explora tu rumbo personal y tu fuerza interior mediante prácticas de emociones, voluntad, intelecto, energía y patrones de vida.",
  },
  4: {
    en: "Develop imagination and intuitive perception through guided imagery, symbolic memories, knowledge and visualising possible situations.",
    ru: "Развивайте воображение и интуитивное восприятие через образы, символическую память, познание и представление возможных ситуаций.",
    es: "Desarrolla la imaginación y la percepción intuitiva con imágenes guiadas, recuerdos simbólicos, conocimiento y visualización de situaciones.",
  },
  5: {
    en: "Bring the Basic Course together in two Master Level attunements: Connection with the World and Connection with the Gods.",
    ru: "Объедините навыки Базового курса в двух мастерских настройках: «Связь с Миром» и «Связь с Богами».",
    es: "Integra el Curso Básico con dos sintonizaciones de maestría: Conexión con el Mundo y Conexión con los Dioses.",
  },
};

const basicSpanishAttunements: Record<number, string[]> = {
  1: ["Sanación", "Intuición", "Protección", "Trabajo con una situación"],
  2: ["Cargar un objeto", "Activar el flujo del dinero", "Limpieza personal", "Limpieza de espacios y objetos", "Romper vínculos"],
  3: ["Destino", "Emoción", "Activación", "Poder", "Sexualidad", "Vuelo", "Intelecto", "Karma"],
  4: ["Clarividencia", "Vidas pasadas", "Crear una situación", "Conocimiento"],
  5: ["Conexión con el Mundo", "Conexión con los Dioses"],
};

export function basicAttunementName(locale: PublicLocale, step: { number: number }, setting: { id: string; title: string }, index: number) {
  if (locale === "ru") return setting.title;
  if (locale === "es") return basicSpanishAttunements[step.number]?.[index] ?? setting.title;
  const translated = englishAttunements as Record<string, { title: string }>;
  return translated[setting.id]?.title ?? setting.title;
}

