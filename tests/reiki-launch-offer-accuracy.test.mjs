import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const landing = readFileSync(new URL('../components/reiki-referral-landing.tsx', import.meta.url), 'utf8');
test('all locales disclose the guest lesson and free private-account continuation', () => {
  for (const phrase of [
    'Lesson 1 is open to guests', 'Continue free with Google sign-in and private progress saving',
    'To continue to Lesson 2 and keep your progress, sign in with Google and consent to private saving',
    'Первый урок без регистрации', 'Далее бесплатно: вход через Google и приватное сохранение прогресса',
    'Чтобы перейти ко второму уроку и сохранить прогресс',
    'Lección 1 sin registro', 'para continuar gratis, accede con Google',
    'Para pasar a la segunda y guardar tu progreso',
  ]) assert.ok(landing.includes(phrase), phrase);
  assert.doesNotMatch(landing, /Google sign-in is only needed|Google solo para guardar|Google нужен только/);
});
test('initiation requirements do not understate current multi-question lessons', () => {
  for (const phrase of ['required lesson reports and study answers', 'обязательные учебные отчёты и ответы на вопросы курса', 'los informes y las respuestas requeridas del curso'])
    assert.ok(landing.includes(phrase), phrase);
  assert.doesNotMatch(landing, /five course answers|пять вопросов|cinco respuestas/);
});
test('free course and gift remain free, optional private sessions remain separate', () => {
  for (const phrase of ['The course remains free', 'Курс остаётся бесплатным', 'El curso sigue siendo gratuito',
    'free introductory Level 1 initiation', 'бесплатную вводную инициацию I ступени', 'iniciación introductoria gratuita de Nivel 1',
    'Optional private one-to-one sessions are separate paid services']) assert.ok(landing.includes(phrase), phrase);
  assert.doesNotMatch(landing, /guaranteed cure|automatic attunement|guaranteed income/i);
});
test('existing entry, privacy and explicit teacher arrangement are preserved', () => {
  assert.match(landing, /const courseHref = REIKI_FREE_COURSE_PATH/);
  assert.equal((landing.match(/href=\{courseHref\}/g) || []).length, 2);
  for (const phrase of ['Andrey will review and arrange the next step personally', 'Your reflections are not sent to Andrey automatically',
    'Ваши заметки не отправляются Андрею автоматически', 'Tus notas no se envían automáticamente']) assert.ok(landing.includes(phrase), phrase);
  assert.doesNotMatch(landing, /<form|<input|fetch\(/);
});
