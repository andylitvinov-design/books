import assert from 'node:assert/strict';
import { assertPreparedContactChannels } from './contact-channel-verifier.mjs';
import { assertPublicEnquiryFixture, assertSingleEntryEnquiryUi, exercisePublicEnquiryUi } from './public-enquiry-ui-verifier.mjs';

const copy = {
  en: {
    title: 'See your situation from a fresh perspective.',
    action: 'Request my free review',
    topic: 'What would you like to explore?',
    topics: ['Relationships & family', 'Personal decision', 'Work & business', 'Inner state / resources'],
    qualification: 'I understand this is not a live call.',
    problem: 'What is the problem or situation?',
    goal: 'What goal or change would you like?',
    prepare: 'Prepare my coaching answers',
    ready: 'Your questionnaire answers are ready to copy.',
    privacy: 'This questionnaire does not upload your answers or drawing.',
    submissionDisclosure: 'Submitting the separate request form sends your name, contact details, short enquiry and reply consent to the site for CRM registration.',
    nonMedical: 'The written report is a symbolic situation review, not a medical or mental-health diagnosis.',
    drawing: 'ME, MY GOAL and MY PROBLEM',
  },
  ru: {
    title: 'Взгляните на свою ситуацию под другим углом.',
    action: 'Запросить бесплатный разбор',
    topic: 'Какой вопрос хотите исследовать?',
    topics: ['Отношения и семья', 'Личное решение', 'Работа и бизнес', 'Внутреннее состояние и ресурсы'],
    qualification: 'Понимаю, что это не видеозвонок.',
    problem: 'В чём проблема или ситуация?',
    goal: 'Какую цель или изменение вы хотите?',
    prepare: 'Подготовить ответы анкеты',
    ready: 'Ответы анкеты готовы к копированию.',
    privacy: 'Эта анкета не загружает ваши ответы или рисунок.',
    submissionDisclosure: 'При отправке отдельной формы заявки имя, контакты, краткий запрос и согласие на личный ответ передаются на сайт для регистрации в CRM.',
    nonMedical: 'Отчёт — символический разбор ситуации, а не медицинский или психиатрический диагноз.',
    drawing: 'Я, МОЯ ЦЕЛЬ и МОЯ ПРОБЛЕМА',
  },
  es: {
    title: 'Mira tu situación desde otra perspectiva.',
    action: 'Solicitar revisión gratis',
    topic: '¿Qué te gustaría explorar?',
    topics: ['Relaciones y familia', 'Decisión personal', 'Trabajo y negocio', 'Estado interior y recursos'],
    qualification: 'Entiendo que no incluye videollamada.',
    problem: '¿Cuál es tu problema o situación?',
    goal: '¿Qué meta o cambio deseas?',
    prepare: 'Preparar mis respuestas',
    ready: 'Tus respuestas del cuestionario están listas para copiar.',
    privacy: 'Este cuestionario no sube tus respuestas ni tu dibujo.',
    submissionDisclosure: 'Al enviar el formulario separado de solicitud, tu nombre, datos de contacto, consulta breve y consentimiento para una respuesta personal se envían al sitio para registrar la solicitud en el CRM.',
    nonMedical: 'El informe es una reflexión simbólica sobre la situación, no un diagnóstico médico ni de salud mental.',
    drawing: 'YO, MI META y MI PROBLEMA',
  },
};

export async function assertFreeSituationLandingReady(page, expect, locale, { quickEntrySaved = false } = {}) {
  const text = copy[locale];
  assert.ok(text, 'Explicit supported free-review locale contract required');
  const main = page.locator('main[data-free-entry-landing="situation"]');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('lang', locale);
  await expect(main.locator('h1#free-entry-title')).toBeVisible({ timeout: 30000 });
  await expect(main.locator('h1#free-entry-title')).toHaveText(text.title);
  await expect(main.getByRole('link', { name: text.action, exact: true })).toHaveAttribute('href', '#request-free-review');
  const capture = main.locator('section#request-free-review');
  await expect(capture).toHaveCount(1);
  const enquiry = capture.locator('[data-free-resource-enquiry="situation"]');
  await expect(enquiry).toHaveCount(1);
  await expect(enquiry).toBeVisible();
  // A wrapping label includes option text for getByLabel; the select's
  // accessible name is the prompt, as exposed by the native combobox role.
  const topic = enquiry.getByRole('combobox', { name: text.topic, exact: true });
  await expect(topic).toHaveCount(1);
  await expect(topic).toBeVisible();
  await expect(topic.locator('option')).toHaveText(text.topics);
  if (quickEntrySaved) {
    // Explicit test phase after exerciseFreeSituationRequestUi confirmed the mock.
    // Do not infer a legacy/new layout from missing fields or accept unsaved links.
    await expect(enquiry.locator('form')).toHaveCount(0);
    await expect(enquiry.locator('[role="status"]')).toContainText('HH-0123456789AB');
    await expect(enquiry.locator('a[data-contact-channel]')).toHaveCount(2);
    await assertPreparedContactChannels(enquiry, expect);
    await expect(enquiry.locator('textarea')).toHaveCount(0);
  } else await assertSingleEntryEnquiryUi(enquiry, expect);
  await expect(enquiry.locator('button[data-contact-order]')).toBeVisible();
  const intake = capture.locator('[data-free-drawing-intake]');
  await expect(intake).toHaveCount(1);
  const advanced = capture.locator('details').filter({ has: page.locator('[data-free-drawing-intake]') });
  await expect(advanced).toHaveCount(1);
  assert.equal(await advanced.evaluate(node => node.open), false, 'Full drawing questionnaire starts collapsed');
  await expect(advanced.locator(':scope > summary')).toBeVisible();
  await expect(intake).toBeHidden();
  await expect(intake.locator('textarea[required]')).toHaveCount(2);
  await expect(intake).toContainText(text.privacy);
  await expect(intake).toContainText(text.submissionDisclosure);
  await expect(intake).toContainText(text.nonMedical);
  await expect(intake).toContainText(text.drawing);
  return { main, enquiry, intake, advanced, text, topic };
}

export async function exerciseFreeSituationRequestUi(page, expect, locale, { contactMode = 'email', noteMode = 'supplied' } = {}) {
  assertPublicEnquiryFixture(page, 'situation', locale);
  const { enquiry, text, topic } = await assertFreeSituationLandingReady(page, expect, locale);
  await topic.selectOption('2');
  await expect(topic).toHaveValue('2');
  return exercisePublicEnquiryUi(page, enquiry, expect, {
    locale, kind: 'situation', requiredMessage: [text.qualification, text.topics[2]],
    contactMode, noteMode,
  });
}

export async function prepareDrawingIntakeUi(page, expect, locale, { quickEntrySaved = false } = {}) {
  assertPublicEnquiryFixture(page, 'drawing', locale);
  const { intake, advanced, text } = await assertFreeSituationLandingReady(page, expect, locale, { quickEntrySaved });
  await advanced.locator(':scope > summary').click();
  await expect(intake).toBeVisible();
  const uniqueProblem = 'Synthetic public form value — ' + locale;
  const uniqueGoal = 'Synthetic public goal value — ' + locale;
  await intake.getByLabel(text.problem, { exact: true }).fill(uniqueProblem);
  await intake.getByLabel(text.goal, { exact: true }).fill(uniqueGoal);
  await intake.getByRole('button', { name: text.prepare, exact: true }).click();
  const ready = intake.locator('[role="region"]');
  await expect(ready).toHaveCount(1);
  await expect(ready).toBeVisible();
  await expect(ready.getByRole('heading')).toHaveText(text.ready);
  await expect(ready).toHaveAttribute('aria-live', 'polite');
  await expect(ready).toBeFocused({ timeout: 15000 });
  await expect(ready.locator('textarea[readonly]')).toHaveCount(1);
  await expect(ready.locator('textarea[readonly]')).toHaveAttribute('readonly', '');
  for (const value of [uniqueProblem, uniqueGoal]) {
    assert.ok((await ready.locator('textarea[readonly]').inputValue()).includes(value), 'Copy preview retains every answer');
  }
  return { intake, ready, uniqueProblem, uniqueGoal };
}
