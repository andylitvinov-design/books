import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("next.config.ts");
const block=source.slice(source.indexOf("  async redirects() {"),source.indexOf("  // Vercel redirects these images"));
const rows=new Function(block.slice(block.indexOf("return ["),block.indexOf("];")+2))();
const entryRules=rows.filter(row=>["/","/en","/ru","/es"].includes(row.source));
function destination(url){
 const parsed=new URL(url,"https://holistichouse.vercel.app");
 return entryRules.find(row=>row.source===parsed.pathname&&(!row.has||row.has.every(rule=>rule.type==="query"&&parsed.searchParams.get(rule.key)===rule.value)))?.destination;
}
test("root and locale roots open the existing My Coach catalog without a separate Home",()=>{
 for(const [path,target] of [["/","/en/my-coach"],["/en","/en/my-coach"],["/ru","/ru/my-coach"],["/es","/es/my-coach"],["/?lang=ru","/ru/my-coach"],["/?lang=es&full=1","/es/my-coach"],["/en?lang=ru","/ru/my-coach"],["/en?lang=es","/es/my-coach"],["/?full=1","/en/my-coach"],["/?lang=unknown","/en/my-coach"]]){
  assert.equal(destination(path),target,path);
  assert.equal(destination(target),undefined,"No loop "+target);
 }
 assert.equal(entryRules.length,8);
 assert.ok(entryRules.every(row=>row.permanent===false));
 for(const path of ["/en/my-page","/ru/my-coach/programs","/es/services","/en/app/messages","/api/app/bootstrap","/privacy","/sitemap.xml"])assert.equal(destination(path),undefined);
 assert.match(read("app/[locale]/my-coach/page.jsx"),/<MyCoachCatalog locale=\{locale\}/);
 assert.match(read("app/[locale]/my-coach/page.jsx"),/locales = \['en', 'ru', 'es'\]/);
});
