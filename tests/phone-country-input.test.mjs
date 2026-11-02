import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHONE_COUNTRIES,E164_PHONE,phoneCountryFromValue,phoneNationalPart,composeCountryPhone} from "../lib/contact/phone-country.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("country selector joins national numbers without doubling copied calling codes",()=>{
 assert.equal(PHONE_COUNTRIES[0].iso,"CA");
 assert.equal(new Set(PHONE_COUNTRIES.map(c=>c.iso)).size,PHONE_COUNTRIES.length);
 for(const [dial,local,full] of [
  ["+1","4376066502","+14376066502"],["+1","14376066502","+14376066502"],
  ["+380","67 123 4567","+380671234567"],["+44","+44 (20) 7123 4567","+442071234567"],
  ["+52","55 1234 5678","+525512345678"]]){
   assert.equal(composeCountryPhone(dial,local),full);
   assert.ok(E164_PHONE.test(full));
 }
 assert.equal(composeCountryPhone("+1",""),"");
 assert.equal(composeCountryPhone("","447911123456"),"447911123456");
 assert.equal(composeCountryPhone("","+447911123456"),"+447911123456");
});
test("existing saved international phone is shown under the correct country",()=>{
 for(const [full,iso,dial,national] of [
 ["+14376066502","CA","+1","4376066502"],
 ["+380671234567","UA","+380","671234567"],
 ["+442071234567","GB","+44","2071234567"],
 ["+358401234567","FI","+358","401234567"]]){
  assert.equal(phoneCountryFromValue(full),iso);
  assert.equal(phoneNationalPart(full,dial),national);
  assert.equal(composeCountryPhone(dial,national),full);
 }
 assert.equal(phoneCountryFromValue("+99912345678"),"OTHER");
});
test("country code UI supports EN/RU/ES, 320px widths, iPhone keyboard and no tracking",()=>{
 const src=read("components/phone-country-input.tsx"),css=read("components/phone-country-input.module.css");
 for(const s of ["Код страны","Prefijo del país","Country calling code",
   "aria-label={words.country}","type=\"tel\"","data-phone-country-input",
   "phoneCountryFromValue","phoneNationalPart","composeCountryPhone"])assert.ok(src.includes(s),s);
 assert.match(css,/@media\(max-width:340px\)/);
 assert.match(css,/font:500 16px/);
 assert.doesNotMatch(src,/fetch\(|geolocation|localStorage|marketingSms/);
});

test("one dial-code component is used at every principal customer and CRM phone entry",()=>{
 const files=[
 "components/business-website-enquiry.tsx",
 "components/contact-channel-chooser.tsx",
 "components/app/client-contact-phone.jsx",
 "components/app/crm-contact-editor.jsx"];
 for(const p of files)assert.match(read(p),/<PhoneCountryInput\b/,p);
 const business=read(files[0]);
 assert.match(business,/replyMode==="whatsapp"/);
 assert.match(business,/reply\.replyChannel!==replyMode/);
 assert.match(business,/role="group" aria-label=\{t\.contact\}/);
 assert.match(business,/type="email"/);
 assert.match(read(files[1]),/id=\{panelId \+ "-phone"\}/);
 assert.match(read(files[2]),/normalizeClientPhone\(phone\)/);
 assert.match(read(files[3]),/update\('phone',value\)/);
});
