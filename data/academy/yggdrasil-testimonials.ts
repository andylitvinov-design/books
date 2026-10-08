import type { PublicLocale } from "@/lib/public-locales";

export type YggdrasilTextTestimonial = {
  id: string;
  quote: Record<PublicLocale, string>;
  sourceUrl: string;
  sourceLanguage: "en";
};

export type YggdrasilVideoTestimonial = {
  youtubeId: string;
  title: Record<PublicLocale, string>;
  language: "en";
};

export const yggdrasilTextTestimonials: YggdrasilTextTestimonial[] = [
  {
    id: "testimonial-1",
    quote: {
      en: "Each rune has its own qualities and mental program that can be used to enhance one’s life in various ways.",
      ru: "«У каждой руны есть свои качества и ментальная программа, которые можно использовать для улучшения разных сторон жизни».",
      es: "«Cada runa tiene sus propias cualidades y un programa mental que puede utilizarse en distintas áreas de la vida».",
    },
    sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (2).jpg",
    sourceLanguage: "en",
  },
  {
    id: "testimonial-2",
    quote: {
      en: "As a system, it is a complete, comprehensive modality that is as easily accessible on the go.",
      ru: "«Как система, это целостный и комплексный метод, к которому легко обращаться даже в повседневной жизни».",
      es: "«Como sistema, es un método completo e integral al que resulta fácil recurrir en la vida cotidiana».",
    },
    sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (3).jpg",
    sourceLanguage: "en",
  },
  {
    id: "testimonial-3",
    quote: {
      en: "From level 2 on I began to feel my being becoming more and more saturated with runic energy.",
      ru: "«Начиная со второго уровня, я стал чувствовать, что всё больше наполняюсь рунической энергией».",
      es: "«A partir del segundo nivel empecé a sentirme cada vez más lleno de energía rúnica».",
    },
    sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (4).jpg",
    sourceLanguage: "en",
  },
  {
    id: "testimonial-4",
    quote: {
      en: "The energy is very purposeful and adds up to a comprehensive effect within the practitioner that we can then transmit.",
      ru: "«Энергия очень целенаправленная и складывается в комплексный эффект внутри практикующего, который затем можно передавать дальше».",
      es: "«La energía es muy dirigida y produce un efecto integral en el practicante que luego puede transmitirse».",
    },
    sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (5).jpg",
    sourceLanguage: "en",
  },
  {
    id: "testimonial-5",
    quote: {
      en: "Practical results: began to save money and put into place a mid-term developing business plan which is going well.",
      ru: "«Практические результаты: я начал экономить деньги и составил среднесрочный план развития бизнеса, который хорошо работает».",
      es: "«Resultados prácticos: empecé a ahorrar dinero y puse en marcha un plan de desarrollo empresarial a medio plazo».",
    },
    sourceUrl: "https://www.psitrends.com/images/photo_2023-10-11_01-10-43 (6).jpg",
    sourceLanguage: "en",
  },
];

export const yggdrasilVideoTestimonials: YggdrasilVideoTestimonial[] = [
  {
    youtubeId: "wN_SNwZ1Epo",
    title: {
      en: "Student video review · Reiki Yggdrasil",
      ru: "Видеоотзыв ученика · Reiki Yggdrasil",
      es: "Video testimonio de estudiante · Reiki Yggdrasil",
    },
    language: "en",
  },
  {
    youtubeId: "3Apc8P1Yudc",
    title: {
      en: "Student video review · Reiki Yggdrasil 2",
      ru: "Видеоотзыв ученика · Reiki Yggdrasil 2",
      es: "Video testimonio de estudiante · Reiki Yggdrasil 2",
    },
    language: "en",
  },
];
