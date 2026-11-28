import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");

test("Support and both Shamanic headers open the shared iHelp dialog", () => {
 const support=read("components/services-assist-quiz.tsx");
 const shamanic=read("components/shamanica-mobile.tsx");
 const help=read("components/sitewide-ihelp.tsx");
 assert.match(support,/data-services-ihelp-trigger[\s\S]{0,250}hh:open-ihelp/);
 assert.doesNotMatch(support,/className=\{styles.help\} href=/);
 assert.match(shamanic,/data-shamanica-ihelp-trigger aria-haspopup="dialog"[\s\S]{0,180}hh:open-ihelp/);
 assert.ok(!shamanic.includes('"/holistic-support/mobile"}><Sparkles size={18}/>{t.help}'));
 assert.ok(help.includes('window.addEventListener("hh:open-ihelp",onBusinessHelp)'));
 assert.ok(help.includes('hidden={inlineHelpRoute}'));
 assert.ok(!help.includes('services\\/?$/.test(pathname))return null'));
 assert.ok(help.includes('[data-services-ihelp-trigger]'));
 assert.ok(help.includes('<IHelpTopics locale={locale}'));
});
