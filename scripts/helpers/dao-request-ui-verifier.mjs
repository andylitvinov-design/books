import assert from 'node:assert/strict';
import { assertPublicEnquiryFixture, assertSingleEntryEnquiryUi, exercisePublicEnquiryUi } from './public-enquiry-ui-verifier.mjs';

const copy = {
  en: {
    title: 'Explore your inner resources through Wu Xing.',
    action: 'Request my free profile',
    topic: 'What would you like to explore?',
    topics: ['Balance & everyday energy', 'Focus & direction', 'Relationships & connection', 'Personal strengths & resources'],
    service: 'Free symbolic Wu Xing Resource Profile',
    qualification: 'I understand this is a self-reflection model, not a medical assessment.',
    safety: 'They do not diagnose or treat health conditions and do not replace qualified medical or mental-health care.',
    handoff: 'You review the prepared message and press Send in the messenger yourself.',
  },
  ru: {
    title: 'Исследуйте свои внутренние ресурсы через У-Син.',
    action: 'Запросить профиль У-Син',
    topic: 'Какой вопрос хотите исследовать?',
    topics: ['Баланс и энергия', 'Фокус и направление', 'Отношения и контакт', 'Сильные стороны и опоры'],
    service: 'Бесплатный символический профиль ресурсов У-Син',
    qualification: 'Понимаю, что это инструмент самоисследования, а не медицинская диагностика.',
    safety: 'Они не диагностируют и не лечат заболевания и не заменяют медицинскую или психиатрическую помощь.',
    handoff: 'Проверьте подготовленный текст и нажмите «Отправить» в самом мессенджере.',
  },
  es: {
    title: 'Explora tus recursos interiores con Wu Xing.',
    action: 'Solicitar perfil gratuito',
    topic: '¿Qué te gustaría explorar?',
    topics: ['Equilibrio y energía diaria', 'Enfoque y dirección', 'Relaciones y conexión', 'Fortalezas personales y recursos'],
    service: 'Perfil simbólico gratuito de recursos Wu Xing',
    qualification: 'Entiendo que no es una evaluación médica.',
    safety: 'No diagnostican ni tratan enfermedades y no sustituyen la atención médica o psicológica profesional.',
    handoff: 'Revisa el mensaje preparado y pulsa Enviar tú mismo.',
  },
};

export async function assertDaoLandingReady(page, expect, locale) {
  const text = copy[locale];
  assert.ok(text, 'DAO conversion acceptance requires an explicit supported locale');
  const main = page.locator('main[data-free-entry-landing="dao"]');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('lang', locale);
  await expect(main.locator('h1#free-entry-title')).toBeVisible({ timeout: 30000 });
  await expect(main.locator('h1#free-entry-title')).toHaveText(text.title);
  await expect(main.getByRole('link', { name: text.action, exact: true }))
    .toHaveAttribute('href', '#request-free-wu-xing');
  const capture = main.locator('section#request-free-wu-xing');
  await expect(capture).toHaveCount(1);
  const enquiry = capture.locator('[data-free-resource-enquiry="dao"]');
  await expect(enquiry).toHaveCount(1);
  await expect(enquiry).toBeVisible();
  // Shared FreeResourceEnquiry wraps its select/options in the visible label.
  const topic = enquiry.getByRole('combobox', { name: text.topic, exact: true });
  await expect(topic).toHaveCount(1);
  await expect(topic).toBeVisible();
  await expect(topic.locator('option')).toHaveText(text.topics);
  await assertSingleEntryEnquiryUi(enquiry, expect);
  await expect(enquiry.locator('button[data-contact-order]')).toBeVisible();
  await expect(main).toContainText(text.safety);
  await expect(main.locator('a[href="/' + locale + '/wu-xing"]')).toBeVisible();
  await expect(main.locator('a[href="/' + locale + '/services#free-insights"]')).toBeVisible();
  return { main, enquiry, text, topic };
}

// CRM single-entry contract: topic here; name, contact, consent and short enquiry
// exactly once in the save-gated chooser. No legacy optional duplicate fields.
export async function exerciseDaoRequestUi(page, expect, locale, { contactMode = 'email', noteMode = 'supplied' } = {}) {
  assertPublicEnquiryFixture(page, 'dao', locale);
  const { enquiry, text, topic } = await assertDaoLandingReady(page, expect, locale);
  await topic.selectOption('2');
  await expect(topic).toHaveValue('2');
  const { requestCount, mockedSave, messengerLinksOpened } = await exercisePublicEnquiryUi(page, enquiry, expect, {
    locale, kind: 'dao', requiredMessage: [text.qualification, text.topics[2]], contactMode, noteMode,
  });
  return { requestCount, mockedSave, messengerLinksOpened };
}
