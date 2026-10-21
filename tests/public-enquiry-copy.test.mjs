import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
// Inspect the actual locale catalogues, without importing components, rendering,
// running hooks, or making requests. This is a factual copy contract, not browser QA.
function catalogue(path, name = 'copy') {
  const source = read(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) === name) initializer = declaration.initializer;
    }
  }
  assert.ok(initializer, `${path}: ${name}`);
  const compiled = ts.transpileModule('exports.catalogue = ' + initializer.getText(ast), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {} };
  vm.runInNewContext(compiled, context, { timeout: 1000 });
  return context.exports.catalogue;
}
const quick = catalogue('components/free-resource-enquiry.tsx', 'text');
const landing = catalogue('components/free-entry-landing.tsx');
const drawing = catalogue('components/free-drawing-intake.tsx');
const alchemy = catalogue('components/alchemy-soul-landing.tsx');
const lead = catalogue('components/alchemy-soul-lead-form.tsx');
// Reviewed first-party registration disclosures. Keep these specific to the lead
// form: accepting its revised wording must not loosen the other copy contracts.
const leadDisclosure = {
  en: {
    note: 'The form sends your contact details, reply consent and optional note to the site for CRM registration. After receipt confirmation, WhatsApp and Telegram are optional. We confirm the session time personally; there is no automatic charge.',
    privacy: "Please don't enter diagnoses or confidential health details here. We can discuss your question directly.",
  },
  ru: {
    note: 'Форма отправляет на сайт ваши контакты, согласие на личный ответ и необязательный комментарий для регистрации заявки в CRM. После подтверждения получения можно по желанию открыть WhatsApp или Telegram. Время подтверждается лично, автоматической оплаты нет.',
    privacy: 'Не вводите здесь диагнозы или медицинские сведения — подробности обсудим лично.',
  },
  es: {
    note: 'El formulario envía tus datos de contacto, consentimiento para una respuesta personal y nota opcional al sitio para registrar la solicitud en el CRM. Tras confirmar la recepción, WhatsApp y Telegram son opcionales. Confirmamos la hora personalmente; no hay cobro automático.',
    privacy: 'No incluyas diagnósticos ni datos médicos confidenciales. Podemos hablar de los detalles personalmente.',
  },
};
const patterns = {
  en: { local: /local draft/, separate: /separate|separately/, consent: /reply consent|consent for a personal reply/, submit: /[Ss]ubmi/, copy: /copy/, receipt: /[Aa]fter receipt confirmation/, optional: /optional/, noCharge: /no automatic (?:booking or )?charge/, form: /request form/, manual: /You decide|you decide|choose whether/ },
  ru: { local: /локальный черновик/, separate: /[Оо]тдельн/, consent: /согласи(?:е|ем|я) на личный ответ/, submit: /отправк|отправляет/, copy: /копирован/, receipt: /[Пп]осле подтверждения получения/, optional: /необязател|по желанию/, noCharge: /без автоматической оплаты|автоматической записи и списания денег нет/, form: /форм[ауы] заявки/, manual: /[Вв]ы по своему решению|вы сами|самим отправить/ },
  es: { local: /borrador local/, separate: /separad[oa]/, consent: /consentimiento para una respuesta personal/, submit: /[Ee]nv[ií]/, copy: /copi/, receipt: /[Tt]ras la confirmación de recepción/, optional: /opcional/, noCharge: /No hay reserva ni cobro automáticos|no se realiza ningún cobro automático/, form: /formulario de solicitud/, manual: /[Tt]ú decides|decidir si envías/ },
};
for (const locale of ['en', 'ru', 'es']) {
  const p = patterns[locale];
  test(`${locale}: quick enquiry explains a single consented CRM request`, () => {
    const note = quick[locale].note;
    assert.match(note, { en: /once in the request form/, ru: /один раз/, es: /una sola vez/ }[locale]);
    assert.doesNotMatch(note, p.local);
    for (const pattern of [p.consent, p.submit, p.receipt, p.optional, p.manual, /CRM/, /WhatsApp/, /Telegram/]) assert.match(note, pattern);
  });
  test(`${locale}: free-review FAQ distinguishes questionnaire from submitted contact request`, () => {
    const answer = landing[locale].situation.faq[2][1];
    for (const pattern of [p.separate, p.consent, p.submit, p.copy, p.manual, /CRM/]) assert.match(answer, pattern);
  });
  test(`${locale}: prepared questionnaire copy cannot deny a separately submitted CRM request`, () => {
    for (const pattern of [p.separate, p.consent, p.submit, /CRM/]) assert.match(drawing[locale].privacy, pattern);
    assert.match(drawing[locale].ready, p.copy);
    assert.match(drawing[locale].readyNote, p.separate);
    assert.match(drawing[locale].sendNote, p.manual);
    assert.doesNotMatch(drawing[locale].ready, /Nothing has been sent|ничего не отправлено|no se ha enviado nada/i);
  });
  test(`${locale}: Alchemy FAQ, intro and note explain registration before optional messenger handoff`, () => {
    const faq = alchemy[locale].faq.at(-1).a;
    for (const pattern of [p.submit, p.consent, p.receipt, p.optional, p.noCharge, p.manual, /CRM/, /WhatsApp/, /Telegram/]) assert.match(faq, pattern);
    assert.match(alchemy[locale].requestIntro, p.form);
    assert.match(alchemy[locale].requestIntro, p.optional);
    assert.equal(lead[locale].note, leadDisclosure[locale].note, `${locale}: first-party CRM disclosure`);
    assert.equal(lead[locale].privacy, leadDisclosure[locale].privacy, `${locale}: no medical data`);
  });
}
test('quick entry has no redundant private draft; full questionnaire still copies locally without uploads', () => {
  const quickSource = read('components/free-resource-enquiry.tsx');
  const drawingSource = read('components/free-drawing-intake.tsx');
  assert.doesNotMatch(quickSource, /privateContext|copyPrivateContext|navigator\.clipboard|<input|<textarea/);
  assert.match(drawingSource, /navigator\.clipboard\.writeText\(answers\)/);
  for (const source of [quickSource, drawingSource]) {
    assert.match(source, /<ContactChannelChooser/);
    assert.doesNotMatch(source, /fetch\(|sendBeacon|localStorage|sessionStorage|indexedDB|FileReader/);
  }
  const quickUrl = quickSource.match(/const whatsappUrl = whatsappEnquiryUrl\(\{([\s\S]*?)\n  \}\);/)[1];
  const drawingUrl = drawingSource.match(/const whatsappUrl = whatsappEnquiryUrl\(\{([\s\S]*?)\n  \}\);/)[1];
  assert.doesNotMatch(quickUrl.replace(/\/\/[^\n]*/g, ''), /privateContext|name\.trim|question\.trim/);
  assert.doesNotMatch(drawingUrl.replace(/\/\/[^\n]*/g, ''), /answers|problem|goal|obstacle|tried/);
});
test('neither corrected flow claims that the whole page sends or stores nothing before messenger confirmation', () => {
  const text = [quick.en.note, quick.ru.note, quick.es.note,
    landing.en.situation.faq[2][1], landing.ru.situation.faq[2][1], landing.es.situation.faq[2][1]].join('\n');
  assert.doesNotMatch(text, /Nothing is stored on this page|Nothing is submitted automatically|Сайт не сохраняет ответы|автоматической передачи нет|no almacena ni envía/i);
});

test('Alchemy renders the reviewed registration and medical-data notices beside its actual shared chooser', () => {
  const source = read('components/alchemy-soul-lead-form.tsx');
  assert.match(source, /import \{ ContactChannelChooser \} from "@\/components\/contact-channel-chooser"/);
  assert.match(source, /const t = copy\[locale\]/);
  assert.match(source, /<ContactChannelChooser locale=\{locale\} whatsappUrl=\{whatsappUrl\} label=\{t\.action\}/);
  assert.match(source, /<p className=\{styles\.formNote\}>\{t\.note\}<\/p>/);
  assert.match(source, /<p className=\{styles\.formPrivacy\}>[\s\S]*?\{t\.privacy\}<\/p>/);
});
