import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const source = () => readFile("components/principles-of-energywork.tsx","utf8");
const css = () => readFile("components/principles-of-energywork.module.css","utf8");
test("Free landing presents the compact rail, three photo-led systems and initiation without redundant sections", async () => {
 const [page,styles]=await Promise.all([source(),css()]);
 for(const marker of ['data-energywork-screen="intro"','data-reiki-details-screen','data-energywork-screen={system.key}','data-energywork-screen="initiation"','data-reiki-yggdrasil-intro-videos']) assert.ok(page.includes(marker),marker);
 for(const marker of ['data-energywork-screen="meditation"','data-energywork-screen="foundations"','id="energywork-systems"','<ReikiPublicReviews']) assert.ok(!page.includes(marker),marker);
 assert.ok(styles.includes("width:100%;max-width:100%;min-width:0;aspect-ratio:auto"));
 assert.ok(styles.includes("grid-template-columns:minmax(0,33%) minmax(0,1fr) 17px"));
 assert.ok(styles.includes("grid-template-columns:minmax(0,31%) minmax(0,1fr) 14px"));
 assert.ok(styles.includes("min-width:0;max-width:100%;overflow-wrap:anywhere"));
});
test("Each overview keeps the existing study and free-entry destinations; only original Yggdrasil videos are featured", async () => {
 const page=await source();
 for(const marker of ["href={academyUrl(locale, system.free)}","href={academyUrl(locale, system.study)}",'youtubeId="DYo-fG-SyKw"',"youtubeId={yggdrasilMeditation.youtubeId}",'academyUrl(locale, "reiki/yggdrasil/archive")']) assert.ok(page.includes(marker),marker);
 assert.ok(!page.includes("<EnergyworkVideoArchive"));
});
