import type { PublicLocale } from "@/lib/public-locales";

/** Original Russian-source course introductions. Editorial descriptions, not claims of outcomes. */
const ru: Record<string, string> = {
  "videos/planetary-power": "11 видеозаписей о символике планет, созерцании и внимательной работе с образами. Познакомьтесь с каждой темой и сформулируйте личные наблюдения.",
  "videos/egypt-osiris": "Семь видеоуроков об Осирисе и символах египетской храмовой традиции. Последовательно исследуйте темы цикла и свои вопросы к ним.",
  "videos/greek-mysteries-dionysus": "Семь уроков о Дионисе и греческих мистериях: мифы, образы и рефлексия. После каждого занятия запишите, что осталось непонятным или важным.",
  "videos/greek-mysteries-demeter": "Пять видео о Деметре и символическом цикле греческих мистерий. Смотрите записи по порядку и отмечайте собственные открытия.",
  "videos/strength-protection": "Семь видеомедитаций и объяснений о субъективном ощущении опоры, силы и личных границ. Практики добровольны и не заменяют медицинскую помощь.",
  "videos/maya-archetypes": "Шесть видео об образах и мифологических архетипах цивилизации майя. Знакомьтесь с символами и фиксируйте возникшие вопросы.",
  "videos/energy-pump-ups": "Две вводные видеозаписи по авторским энергопрактикам. Изучите предложенные упражнения и запишите личные наблюдения.",
  "mysteries/archetypes-of-gods": "Видеозаписи о мифологических архетипах богов и их символическом значении. Каждый сюжет изучается отдельно, со временем для собственных вопросов.",
  "mysteries/guidance-of-gods": "Русскоязычные видеоматериалы о символических подсказках и образах традиций. Просматривайте по одному и записывайте свои интерпретации.",
};
const en: Record<string, string> = {
  "videos/planetary-power": "Eleven original videos exploring planetary symbolism, imagery and reflection.",
  "videos/egypt-osiris": "Seven original videos on Osiris and the symbolic Egyptian temple tradition.",
  "videos/greek-mysteries-dionysus": "Seven videos on Dionysus, Greek mysteries and reflection.",
  "videos/greek-mysteries-demeter": "Five original videos on Demeter and the Greek mysteries.",
  "videos/strength-protection": "Seven videos about subjective inner support, strength and boundaries. Practices are optional, not medical treatment.",
  "videos/maya-archetypes": "Six videos exploring Maya mythology and archetypes.",
  "videos/energy-pump-ups": "Two introductory video recordings of original energy practices.",
  "mysteries/archetypes-of-gods": "Original recordings exploring the symbolic meaning of mythological deities and archetypes.",
  "mysteries/guidance-of-gods": "Russian-language videos introducing symbolic guidance and traditions.",
};
const es: Record<string, string> = {
  "videos/planetary-power": "Once vídeos originales sobre el simbolismo de los planetas y la reflexión personal.",
  "videos/egypt-osiris": "Siete vídeos sobre Osiris y la tradición simbólica de los templos egipcios.",
  "videos/greek-mysteries-dionysus": "Siete vídeos sobre Dioniso y los misterios griegos.",
  "videos/greek-mysteries-demeter": "Cinco vídeos originales sobre Deméter y los misterios griegos.",
  "videos/strength-protection": "Siete vídeos sobre la experiencia subjetiva del apoyo interior y los límites. Prácticas voluntarias, no médicas.",
  "videos/maya-archetypes": "Seis vídeos que exploran la mitología y los arquetipos mayas.",
  "videos/energy-pump-ups": "Dos grabaciones introductorias sobre prácticas energéticas.",
  "mysteries/archetypes-of-gods": "Grabaciones sobre el significado simbólico de las deidades y los arquetipos.",
  "mysteries/guidance-of-gods": "Vídeos en ruso sobre orientación simbólica y tradiciones.",
};
export function academyVideoCourseIntro(id: string, locale: PublicLocale): string {
  const selected = locale === "ru" ? ru : locale === "es" ? es : en;
  return selected[id] ?? (locale === "ru"
    ? "Смотрите оригинальные видео последовательно. После каждого урока можно оставить вопросы или комментарии."
    : locale === "es" ? "Mira los vídeos originales en secuencia y escribe preguntas o comentarios después de cada uno."
    : "Watch the original lessons in sequence and leave questions or comments after each video.");
}
