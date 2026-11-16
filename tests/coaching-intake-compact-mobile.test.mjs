import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public intake starts with required questions while private editor keeps its complete form',()=>{
 const form=read('components/coaching-intake-form.tsx');
 assert.match(form,/COACHING_FIELDS\.filter\(field => showMore \|\| privateCopyMode \|\| field\.required\)/);
 assert.match(form,/COACHING_GROUPS\.filter\(group => showMore \|\| privateCopyMode \|\| COACHING_FIELDS\.some/);
 assert.match(form,/className=\{styles\.moreToggle\} aria-expanded=\{showMore\}/);
 assert.match(form, /\(showMore \|\| privateCopyMode\) && group\.id === "session"/);
 assert.match(form,/setShowMore\(value => !value\)/);
 assert.match(form,/missing > 0/);
});
test('the mobile short form never skips verified Telegram and explicit consent guards',()=>{
 const form=read('components/coaching-intake-form.tsx');
 assert.match(form,/MandatoryMessengerActions/);
 assert.match(form,/websiteMessengerOnlyUi\(\)/);
 assert.match(form,/telegramHandoff/);
 assert.match(form,/telegramInitData/);
 assert.match(form,/contactConsent\s*:\s*true/);
 assert.match(form,/parseDiagnosticStart\(sessionStorage\.getItem\(DIAGNOSTIC_START_KEY\), locale\)/);
 assert.match(form,/setReplyContact\(\{ email: staged\.email, phone: staged\.phone \}\)/);
 assert.match(form,/\(showPhone \|\| Boolean\(replyContact\.phone\)\)/);
 for(const x of ['Бесплатно · €0','30 мин · €50','60 мин · €100','Free · €0','Gratis · €0'])assert.ok(form.includes(x),x);
});
test('three mobile service options remain side by side without new paid APIs',()=>{
 const css=read('components/coaching-intake-form.module.css');
 assert.match(css,/\.choiceGrid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.moreToggle\{/);
 assert.match(css,/\.phoneInstead\{/);
 const form=read('components/coaching-intake-form.tsx');
 assert.doesNotMatch(form,/OPENROUTER_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
