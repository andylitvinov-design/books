import type { PublicLocale } from "@/lib/public-locales";

export type CoreServiceId = "situation" | "dao" | "alchemy" | "hypnotherapy" | "business";

export type CoreServiceOffer = {
  id: CoreServiceId;
  label: string;
  title: string;
  promise: string;
  benefit: string;
  image: string;
  href: string;
  action: string;
};

const images = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  alchemy: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  hypnotherapy: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  business: "/images/holistic-house/video-posters/constellations-en-v1.webp",
} as const;

const offers = {
  en: [
    {
      id: "situation",
      label: "Free · Written review",
      title: "Free Situation Review",
      promise: "See your question, obstacles and possible next steps from a fresh perspective.",
      benefit: "Personal written reflection",
      image: images.situation,
      route: "free-situation-review",
      action: "Start free review",
    },
    {
      id: "dao",
      label: "Free · DAO / Wu Xing",
      title: "Free Wu Xing Resource Profile",
      promise: "Explore personal resource patterns through an author-led symbolic Daoist model.",
      benefit: "Personal resource overview, not a medical diagnosis",
      image: images.dao,
      route: "dao-health-profile",
      action: "Explore free resource profile",
    },
    {
      id: "alchemy",
      label: "Personal session · integrated method",
      title: "Alchemy of the Soul · Psycho-homeopathy",
      promise: "Explore the situation through constellations, guided imagery hypnotherapy and optional psycho-homeopathy.",
      benefit: "Constellation diagnosis · hypnotherapy · complementary homeopathic selection",
      image: images.alchemy,
      route: "alchemy-of-soul",
      action: "Explore the session",
    },
    {
      id: "hypnotherapy",
      label: "Individual course",
      title: "Guided Imagery Hypnotherapy",
      promise: "Explore subconscious imagery and questions that feel hard to resolve through thinking alone.",
      benefit: "Inner resources · emotional patterns · personal answers",
      image: images.hypnotherapy,
      route: "hypnotherapy-course",
      action: "Explore the course",
    },
    {
      id: "business",
      label: "Business · Personal session",
      title: "Business consulting & goal activation",
      promise: "Explore the business system through a constellation and turn one clear goal into your next action.",
      benefit: "System map · goal activation · 14-day action plan",
      image: images.business,
      route: "business-consulting",
      action: "Explore business consulting",
    },
  ],
  ru: [
    {
      id: "situation",
      label: "Бесплатно · Письменный разбор",
      title: "Диагностика ситуации",
      promise: "По-новому взглянуть на проблему, препятствия и возможные решения.",
      benefit: "Личный письменный отчёт",
      image: images.situation,
      route: "free-situation-review",
      action: "Начать бесплатно",
    },
    {
      id: "dao",
      label: "Бесплатно · Дао / У-Син",
      title: "Бесплатный профиль ресурсов У-Син",
      promise: "Исследовать жизненный ресурс и баланс в авторской символической модели Дао.",
      benefit: "Профиль ресурсов, не медицинский диагноз",
      image: images.dao,
      route: "dao-health-profile",
      action: "Открыть профиль ресурсов",
    },
    {
      id: "alchemy",
      label: "Личная сессия · авторский метод",
      title: "Алхимия души · Психогомеопатия",
      promise: "Исследовать ситуацию через расстановку, образную гипнотерапию и дополнительную психогомеопатию.",
      benefit: "Расстановка · гипнотерапия · дополнительный гомеопатический подбор",
      image: images.alchemy,
      route: "alchemy-of-soul",
      action: "О сессии",
    },
    {
      id: "hypnotherapy",
      label: "Индивидуальный курс",
      title: "Курс гипнотерапии",
      promise: "Искать ответы и внутреннюю опору через работу с образами подсознания.",
      benefit: "Ресурс · эмоции · личные ответы",
      image: images.hypnotherapy,
      route: "hypnotherapy-course",
      action: "О курсе",
    },
    {
      id: "business",
      label: "Бизнес · Личная сессия",
      title: "Бизнес-консалтинг и активация цели",
      promise: "Исследуем бизнес через расстановку и превращаем выбранную цель в конкретное решение и план.",
      benefit: "Карта системы · активация цели · план на 14 дней",
      image: images.business,
      route: "business-consulting",
      action: "Подробнее о бизнес-сессии",
    },
  ],
  es: [
    {
      id: "situation",
      label: "Gratis · Revisión escrita",
      title: "Revisión gratuita de tu situación",
      promise: "Observa tu pregunta, los obstáculos y los posibles siguientes pasos desde otra perspectiva.",
      benefit: "Reflexión personal por escrito",
      image: images.situation,
      route: "free-situation-review",
      action: "Empezar gratis",
    },
    {
      id: "dao",
      label: "Gratis · DAO / Wu Xing",
      title: "Perfil gratuito de recursos Wu Xing",
      promise: "Explora tus recursos personales mediante un modelo taoísta simbólico.",
      benefit: "Perspectiva sobre recursos personales, no diagnóstico médico",
      image: images.dao,
      route: "dao-health-profile",
      action: "Explorar el perfil gratuito",
    },
    {
      id: "alchemy",
      label: "Sesión personal · método integrado",
      title: "Alquimia del Alma · Psicohomeopatía",
      promise: "Explora tu situación mediante constelaciones, hipnoterapia con imágenes guiadas y psicohomeopatía opcional.",
      benefit: "Constelaciones · hipnoterapia · apoyo homeopático complementario",
      image: images.alchemy,
      route: "alchemy-of-soul",
      action: "Conocer la sesión",
    },
    {
      id: "hypnotherapy",
      label: "Curso individual",
      title: "Hipnoterapia con imágenes guiadas",
      promise: "Explora imágenes interiores y preguntas difíciles de resolver solo con el pensamiento.",
      benefit: "Recursos internos · patrones emocionales · respuestas personales",
      image: images.hypnotherapy,
      route: "hypnotherapy-course",
      action: "Conocer el curso",
    },
    {
      id: "business",
      label: "Negocios · Sesión personal",
      title: "Consultoría de negocios y activación de metas",
      promise: "Explora el sistema de tu negocio mediante una constelación y concreta un próximo paso.",
      benefit: "Mapa del sistema · activación de metas · plan de acción de 14 días",
      image: images.business,
      route: "business-consulting",
      action: "Conocer la consultoría",
    },
  ],
} as const satisfies Record<PublicLocale, readonly (Omit<CoreServiceOffer, "href"> & { route: string })[]>;

export function coreServiceOffers(locale: PublicLocale): CoreServiceOffer[] {
  return offers[locale].map((item) => ({
    ...item,
    href: "/" + locale + "/services/" + item.route,
  }));
}
