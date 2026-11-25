// Small, opt-in service requests attached to the four private Profile areas.
// Public, authored copy only. NEVER include private results, client IDs, selectors,
// report content or profile page paths in a WhatsApp enquiry.
import { whatsappEnquiryUrl } from '../whatsapp-enquiry.js'

export const PROFILE_AREAS = Object.freeze(['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'])

const OFFERS = Object.freeze({
  psychology: {
    slug: 'alchemy-of-soul',
    en: {
      title: 'Discuss your situation with Andrey',
      description: 'An optional Alchemy of the Soul session: situation analysis and symbolic constellation work.',
      button: 'Request a session',
      details: 'About this session',
      service: 'Alchemy of the Soul — personal situation and constellation session',
      request: 'I would like to request a personal session to explore my psychological profile or situation. Please tell me the available formats and times. I will choose separately whether to share any private test results.',
    },
    ru: {
      title: 'Обсудить свою ситуацию с Андреем',
      description: 'При желании — личная сессия «Алхимия души»: анализ ситуации и символическая расстановка.',
      button: 'Заказать сессию',
      details: 'Об услуге',
      service: 'Алхимия души — анализ ситуации и личная расстановочная сессия',
      request: 'Хочу заказать личную сессию для обсуждения моей ситуации или психологического профиля. Подскажите формат и доступное время. Результаты тестов смогу передать отдельно, если решу.',
    },
  },
  homeopathy: {
    slug: 'psychohomeopathy',
    en: {
      title: 'Review your homeopathic selection',
      description: 'Ask about an individual complementary consultation and your previously shared recommendations.',
      button: 'Request a consultation',
      details: 'About the approach',
      service: 'Individual homeopathy / psychohomeopathy consultation',
      request: 'I would like to discuss an individual complementary homeopathy consultation, including a previously issued selection or possible next steps. Please tell me the format and availability. I am not sharing private recommendations through this request.',
    },
    ru: {
      title: 'Уточнить индивидуальный подбор',
      description: 'Можно обсудить прежние рекомендации и дополнительную консультацию по гомеопатическому подбору.',
      button: 'Заказать консультацию',
      details: 'О подходе',
      service: 'Индивидуальная консультация по гомеопатии и психогомеопатии',
      request: 'Хочу заказать индивидуальную дополнительную консультацию по гомеопатическому подбору и обсудить ранее переданные рекомендации. Подскажите формат и доступное время. Содержание личных отчётов сейчас не передаю.',
    },
  },
  wu_xing: {
    slug: 'dao-health-profile',
    en: {
      title: 'Request your five-element resource profile',
      description: 'Free written reflection using the author’s symbolic Wu Xing framework, not a medical test.',
      button: 'Request for free',
      details: 'How it works',
      service: 'FREE DAO / Wu Xing five-element resource analysis',
      request: 'I would like to request the free personal written resource analysis using the symbolic five-element Wu Xing model. Please tell me what information I need to provide. I understand this is not a medical diagnosis or free live consultation.',
    },
    ru: {
      title: 'Получить личный профиль У-Син',
      description: 'Бесплатный письменный разбор ресурсов по авторской символической модели пяти стихий.',
      button: 'Заказать бесплатно',
      details: 'Как проходит',
      service: 'БЕСПЛАТНАЯ диагностика ресурсов Дао / У-Син (пять стихий)',
      request: 'Хочу заказать бесплатную письменную диагностику ресурсов по авторской модели пяти стихий У-Син. Подскажите, какие материалы необходимо предоставить. Понимаю, что это не медицинская диагностика и не бесплатная живая консультация.',
    },
  },
  hypnotherapy: {
    slug: 'hypnotherapy-course',
    en: {
      title: 'Explore a guided-imagery course',
      description: 'Individual sessions to explore inner images, emotional patterns and personal resources.',
      button: 'Request the course',
      details: 'About the course',
      service: 'Guided Imagery Hypnotherapy — individual course',
      request: 'I would like to enquire about a personal guided-imagery hypnotherapy course, its format, session availability and price. Please tell me how to begin. No private reports are attached.',
    },
    ru: {
      title: 'Курс работы с внутренними образами',
      description: 'Индивидуальная гипнотерапия: работа с образами, переживаниями и личными ресурсами.',
      button: 'Заказать курс',
      details: 'О программе',
      service: 'Индивидуальный курс гипнотерапии с образами',
      request: 'Хочу заказать индивидуальный курс гипнотерапии и работы с образами. Подскажите формат, доступное время, стоимость и как начать. Личные отчёты к запросу не прикрепляю.',
    },
  },
})

export function profileServiceOffer(area, locale = 'en') {
  if (!PROFILE_AREAS.includes(area)) throw new Error('UNKNOWN_PROFILE_AREA')
  if (!['en','ru'].includes(locale)) throw new Error('UNKNOWN_PROFILE_LOCALE')
  const offer = OFFERS[area]
  return {
    ...offer[locale],
    area,
    descriptionHref: '/' + locale + '/services/' + offer.slug,
    requestHref: whatsappEnquiryUrl({
      locale, service: offer[locale].service, request: offer[locale].request,
    }),
  }
}
