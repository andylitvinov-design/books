import { deepFreeze } from '../lib/assessments/contracts.js'

export const ACQUISITION_EVENTS = deepFreeze([
  'gbp_landing_view',
  'service_view',
  'practitioner_view',
  'self_check_start',
  'contact_click',
  'service_request_start',
])

export const LOCAL_ACQUISITION = deepFreeze({
  en: {
    hero: {
      eyebrow: 'Toronto & online',
      title: 'Personal work for the patterns and decisions that matter',
      intro: 'Explore repeating patterns, relationships, important decisions and inner blocks through thoughtful one-to-one work.',
      servicesLabel: 'Explore services',
    },
    selfCheck: {
      title: 'Not sure where to start?',
      text: 'Try a private, non-diagnostic self-check. See your result first, then decide whether you want to save it to your Cabinet.',
      label: 'Try a free self-check',
      href: '/en/app',
    },
    practitioner: {
      label: 'Meet Andrey',
      text: 'Andrey Litvinov offers the Toronto and online practice. Other practitioners are separate people with their own availability and locations.',
      href: '/en/about',
    },
    services: [
      { id: 'hypnotherapy', title: 'Hypnotherapy', subtitle: 'A focused one-to-one session', text: 'Explore a question, repeating pattern or inner conflict through conversation, imagery and attention to what matters to you.' },
      { id: 'systemic-constellations', title: 'Systemic & Family Constellations', subtitle: 'Look at a relationship or pattern from another angle', text: 'Map roles, relationships and competing needs through a voluntary, reflective process.' },
      { id: 'business-decision-constellations', title: 'Business & Decision Constellations', subtitle: 'Make room for a wider view', text: 'Explore a work, business or important life decision alongside your own research and professional advice.' },
      { id: 'reiki-energy-work', title: 'Reiki / Energy Work', subtitle: 'A supporting personal practice', text: 'Discuss whether a complementary energy-work session is an appropriate fit for your current question.' },
    ],
  },
  ru: {
    hero: {
      eyebrow: 'Торонто и онлайн',
      title: 'Индивидуальная работа с важными паттернами и решениями',
      intro: 'Исследуйте повторяющиеся паттерны, отношения, важные решения и внутренние блоки в бережной индивидуальной работе.',
      servicesLabel: 'Посмотреть форматы работы',
    },
    selfCheck: {
      title: 'Не знаете, с чего начать?',
      text: 'Пройдите приватный недиагностический self-check. Сначала вы увидите результат, а затем сами решите, сохранять ли его в Кабинете.',
      label: 'Попробовать бесплатный self-check',
      href: '/ru/app',
    },
    practitioner: {
      label: 'Познакомиться с Андреем',
      text: 'Андрей Литвинов ведёт практику в Торонто и онлайн. Другие практики — это отдельные специалисты со своей доступностью и локациями.',
      href: '/ru/about',
    },
    services: [
      { id: 'hypnotherapy', title: 'Гипнотерапия', subtitle: 'Индивидуальная сессия с фокусом на вашем запросе', text: 'Исследуйте вопрос, повторяющийся паттерн или внутренний конфликт через разговор, образы и внимательное отношение к вашему опыту.' },
      { id: 'systemic-constellations', title: 'Системные и семейные расстановки', subtitle: 'Посмотреть на отношения и паттерны с другой стороны', text: 'Исследуйте роли, отношения и противоречивые потребности в добровольном рефлексивном процессе.' },
      { id: 'business-decision-constellations', title: 'Бизнес-расстановки и решения', subtitle: 'Расширить взгляд на ситуацию', text: 'Исследуйте рабочую, деловую или важную жизненную ситуацию наряду со своими исследованиями и профессиональными советами.' },
      { id: 'reiki-energy-work', title: 'Рейки / энергетическая работа', subtitle: 'Поддерживающая личная практика', text: 'Обсудите, подходит ли дополнительная энергетическая практика для вашего текущего запроса.' },
    ],
  },
})

export function gbpHref(href) {
  const [path, hash = ''] = href.split('#', 2)
  const join = path.includes('?') ? '&' : '?'
  return `${path}${join}utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=profile${hash ? `#${hash}` : ''}`
}
