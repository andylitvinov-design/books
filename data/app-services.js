import { deepFreeze } from '../lib/assessments/contracts.js'
export const PRACTITIONER_ID = '246aa1a3-a371-5a83-9f4b-cd23ff027a76'
export const APP_SERVICES = deepFreeze([
  {
    id: 'fcef611f-e68b-5b30-b9f4-b0aa5614654d',
    practitionerId: PRACTITIONER_ID,
    category: 'psychosomatic_constellation_exploration',
    copy: {
      en: {
        title: 'Personal constellation session',
        description:
          'Explore emotional, relational and situational factors around your concern through systemic and archetypal constellation work. This does not establish a medical diagnosis or proven cause.',
      },
      ru: {
        title: 'Личная расстановочная сессия',
        description:
          'Исследуйте эмоциональные, семейные и ситуационные факторы вашего запроса через системные и архетипические расстановки. Это не медицинская диагностика и не доказательство причины заболевания.',
      },
    },
  },
  {
    id: '7d0b3c10-b426-5c1b-8c61-b83312095a54',
    practitionerId: PRACTITIONER_ID,
    category: 'homeopathy_consultation',
    copy: {
      en: {
        title: 'Homeopathy consultation',
        description:
          'An individual complementary homeopathy consultation to discuss your history and current experience. It does not replace standard or urgent medical care.',
      },
      ru: {
        title: 'Консультация по гомеопатии',
        description:
          'Индивидуальная дополнительная консультация по гомеопатии с обсуждением вашей истории и текущего опыта. Не заменяет стандартную или неотложную медицинскую помощь.',
      },
    },
  },
  {
    id: 'b6b60244-7473-54b4-8130-de0442ca8fe8',
    practitionerId: PRACTITIONER_ID,
    category: 'business_situation_constellation',
    copy: {
      en: {
        title: 'Business & situation constellation',
        description:
          'Explore a work, business, decision or life situation through systemic constellation work. No financial outcome is guaranteed.',
      },
      ru: {
        title: 'Бизнес- и ситуационные расстановки',
        description:
          'Исследуйте рабочую, деловую или жизненную ситуацию и варианты решений через системные расстановки. Финансовый результат не гарантируется.',
      },
    },
  },
])
