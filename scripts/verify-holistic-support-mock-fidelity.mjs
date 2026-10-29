// Screenshot parity for the owner-approved Support mobile mock.
 // Local loopback only; synthetic data, no real client upload/CRM/checkout,
 // no external YouTube playback or health/test data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { qaSupportDirectoryResponse } from "./fixtures/holistic-support-directory.mjs";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3118";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Loopback only");
const output = "artifacts/holistic-support-mock-fidelity";
await mkdir(output, { recursive: true });
const evidence = [];
const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2WQAAAABJRU5ErkJggg==", "base64");
for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const locale of ["ru", "en", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = browserType.name() + "/" + locale + "/" + width;
        const page = await browser.newPage({ viewport: {width, height: 844}, deviceScaleFactor: 1,
          hasTouch: true, isMobile: true, reducedMotion: "reduce", serviceWorkers: "block" });
        const errors = [];
        const directoryEvents = [];
        const watched = url => url.includes("/api/public/remote-energy-support-masters");
        page.on("pageerror", error => errors.push(error.message));
        page.on("requestfailed", req => { if (watched(req.url()))
          directoryEvents.push("FAILED " + (req.failure()?.errorText ?? "unknown") + " " + req.url()); });
        page.on("response", res => { if (watched(res.url()))
          directoryEvents.push("HTTP " + res.status() + " " + res.url()); });
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        await page.route(/\/api\/public\/remote-energy-support-masters(?:\?.*)?$/, async route => {
          const kind = new URL(route.request().url()).searchParams.get("kind");
          directoryEvents.push("MOCK " + (kind || "masters"));
          await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(qaSupportDirectoryResponse(locale, kind)) });
        });
        try {
          const res = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
            { waitUntil: "domcontentloaded", timeout: 75000 });
          assert.equal(res?.status(), 200, label + " status");
          const root = page.locator("[data-holistic-mobile-alternative]");
          await root.waitFor({state:"visible", timeout:35000});
          // SSR HTML precedes React hydration. Do not synthesize slider changes
          // against a native-only input before React has attached handlers.
          await page.waitForFunction(() => {
            const input = document.querySelector('[data-support-scale="relationships"] input[type="range"]');
            return Boolean(input && Object.keys(input).some(key => key.startsWith("__reactProps$")));
          }, null, {timeout:30000});

          assert.equal(await root.locator('[data-support-scale] input[type="range"]').count(), 4,
            label + " four top check-ins; Goals is part of Meaning");
          assert.equal(await root.locator('[data-support-scale="goals"]').count(),0,
            label+" no duplicate Goals scale");
          assert.equal(await root.locator('[data-support-tool]').count(), 7, label + " four modes plus Courses/Masters/Tests");
          const testsAction=root.locator('[data-support-photo]').locator('..').locator('[data-support-tool="tests"]');
          assert.equal(await testsAction.count(),1,label+" Tests shortcut is directly under the portrait");
          assert.equal(await testsAction.getAttribute("aria-controls"),"support-tests-panel",label+" Tests stays in-page");
          const mandalaAction=root.locator('#support-tools [data-support-video-mandala]');
          assert.equal(await mandalaAction.count(),1,label+" Video Mandala is the right-hand full-width green tab");
          assert.equal(await mandalaAction.getAttribute("href"),
            "/"+locale+"/holistic-support/mandala",label+" genuine existing video studio route");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav] a').nth(0).getAttribute("href"),
            "/"+locale+"/holistic-support/mobile",label+" Home stays in the new Support UI");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav] a').nth(1).getAttribute("href"),
            "/"+locale+"/practice",label+" Practice opens approved public guest showcase");
          assert.equal(await root.locator('[aria-labelledby="mobile-assessment-title"] [data-support-goal-filter-trigger]').count(), 1,
            label + " goal filter beneath the self-ratings");
          assert.equal(await root.locator('[data-support-active-focus]').count(), 1,
            label + " current focus beneath the portrait");
          assert.equal(await root.locator('[data-support-recommendations]').count(), 1,
            label + " quick match beneath the portrait");
          assert.equal(await root.locator('[aria-labelledby="mobile-assessment-title"] [data-support-detailed-analysis]').count(), 0,
            label + " no extra Tests CTA in check-in");
          assert.equal(await root.locator('[data-support-video]').count(), 4, label + " visible video cards");
          assert.equal(await root.locator('[data-support-mobile-bottom-nav]').count(), 1, label + " dock");
          // These two locally bundled original-mock visuals must actually load.
          await page.waitForFunction(() => {
            const images = [...document.querySelectorAll(
              '[data-support-photo] img, [data-support-player] > img'
            )];
            return images.length >= 2 && images.every(img => img.complete && img.naturalWidth > 0);
          }, null, { timeout: 20000 });

          const geometry = await page.evaluate(() => {
            const root = document.querySelector("[data-holistic-mobile-alternative]");
            const measure = sel => [...root.querySelectorAll(sel)].map(el => {
              const r = el.getBoundingClientRect();
              return {x:r.left, y:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, shown:getComputedStyle(el).display!=="none"};
            });
            return {
              client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
              a:measure('[aria-labelledby="mobile-assessment-title"]'),
              photo:measure('[data-support-photo]'),
              tools:measure('[data-support-tool]'),
              toolsSection:measure('#support-tools'),
              readableTools: [...root.querySelectorAll('[data-support-tool]')].map(btn => {
                const caption = [...btn.querySelectorAll('span')].find(x => getComputedStyle(x).display !== 'none');
                const b = btn.getBoundingClientRect(), t = caption?.getBoundingClientRect();
                return { left: t?.left ?? b.left, right: t?.right ?? b.right,
                  top: t?.top ?? b.top, bottom: t?.bottom ?? b.bottom,
                  buttonLeft: b.left, buttonRight: b.right, buttonTop: b.top, buttonBottom: b.bottom,
                  textFits: !caption || (caption.scrollWidth <= caption.clientWidth+2 &&
                    caption.scrollHeight <= caption.clientHeight+2) };
              }),
              readableScores: [...root.querySelectorAll('[data-support-scale]')].map(label => {
                const txt = label.querySelector('span[class*="scaleLabel"]');
                const lr = label.getBoundingClientRect(), tr = txt?.getBoundingClientRect();
                return { name: txt?.textContent, fits: Boolean(txt && tr &&
                  txt.scrollWidth <= txt.clientWidth+2 && tr.left>=lr.left-2 && tr.right<=lr.right+2) };
              }),
              guide:measure('[data-support-goal-results]'),
              gallery:measure('[data-support-meditation-gallery]'),
              hero:measure('[data-support-player]'),
              tabs:measure('[data-support-mode], [data-support-filter]'),
              videos:measure('[data-support-video]'),
              footer:measure('[data-support-mobile-bottom-nav]'),
            };
          });
          const allowedMargin=3;
          assert.ok(geometry.scroll<=geometry.client+allowedMargin, label+" overflow "+JSON.stringify(geometry));
          assert.ok(geometry.hero.length===1, label+" main scenic hero");
          if(width===320) {
            const headHeight=Math.round(geometry.hero[0].y-geometry.a[0].y);
            console.log("Support top dashboard "+label+": "+headHeight+"px, assessment "+
              Math.round(geometry.a[0].height)+"px, tools "+Math.round(geometry.toolsSection[0].height)+"px");
            await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-320.png",fullPage:true});
          }
          assert.equal(geometry.guide.length,0,
            label+" personalized dialogue must not appear before the visitor starts it");
          assert.ok(geometry.hero[0].y>=geometry.a[0].bottom-2,
            label+" unchanged four-score dashboard precedes the scenic player");
          assert.ok(geometry.gallery.length===1 && geometry.hero[0].bottom<=geometry.gallery[0].y+2,
            label+" other meditations appear BELOW the scenic player");
          assert.ok(geometry.readableTools.every(t =>
            t.textFits && t.left>=t.buttonLeft-2 && t.right<=t.buttonRight+2 &&
            t.top>=t.buttonTop-2 && t.bottom<=t.buttonBottom+2),
            label+" all action captions visible within buttons: "+JSON.stringify(geometry.readableTools));
          assert.ok(geometry.readableScores.every(t=>t.fits),
            label+" all four focus labels visible: "+JSON.stringify(geometry.readableScores));
          assert.ok(geometry.hero[0].height>=268, label+" hero remains the dominant workspace");
          assert.equal(geometry.videos.length,4,label+" all four videos exist");
          assert.ok(geometry.videos.every(v=>v.right<=geometry.client+2 && v.x>=-2), label+" all four cards visible without swipe");
          assert.ok(geometry.videos.every(v=>Math.abs(v.y-geometry.videos[0].y)<3), label+" four cards in one row");
          const tabs = await page.locator('[data-support-mode], [data-support-filter]').all();
          assert.equal(tabs.length, 4, label+" four real filter/meditation pills");
          for (const tab of tabs) {
            const box=await tab.boundingBox();
            assert.ok(box && box.x>=0 && box.x+box.width<=width+2,label+" all filter pills visible");
          }
          {
            const assessment=geometry.a[0], tools=geometry.toolsSection[0], photo=geometry.photo[0];
            assert.ok(Math.abs(assessment.y-tools.y)<4,label+" ratings and tools same row");
            assert.ok(photo.y<=assessment.bottom && photo.y>=assessment.y-2,label+" photo centered between panels");
          }
          if(width===390) await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-"+width+".png",fullPage:true});

          // Real input and the accessible mock's actual single-screen interactions.
          const current = root.locator('[data-support-scale="relationships"] input[type="range"]');
          await current.focus();
          await current.press("Home");
          await current.press("ArrowRight");
          assert.equal(await current.inputValue(),"2",label+" keyboard slider works");
          await page.waitForFunction(() => document.querySelector('[data-support-scale="relationships"] output')?.textContent?.trim() === "2",
            null,{timeout:8000});

          await root.locator('[data-support-recommendations]').click();
          const initialGuide=root.locator('[data-support-inline-guide]');
          await initialGuide.waitFor({state:"visible",timeout:8000});
          const statusText=await initialGuide.locator('[data-support-guide-message="guide"]').nth(1).innerText();
          assert.ok(statusText.includes("2/10"),label+" only changed check-in reflected in first reply");
          assert.ok(statusText.includes(locale==="ru"?"Отношения":locale==="es"?"Relaciones":"Relationships"),
            label+" focus comes from the user's edited rating");
          assert.equal(await root.locator('[data-support-meditation-gallery] [data-support-video]').count(),
            4,label+" all source-backed thumbnail cards are retained");
          // The workspace expands into four sectors, including merged Meaning and Goals.
          await root.locator('[data-support-goal-filter-trigger]').click();
          const filter=root.locator('[data-support-goal-filter]');
          await filter.waitFor({state:"visible",timeout:8000});
          // Regression for real iPhone screenshot: heading must not sit behind
          // the iOS status bar after the programmatic scroll to this panel.
          await page.waitForFunction(() => {
            const title=document.getElementById("support-goal-filter-title");
            return !!title && title.getBoundingClientRect().top >= 59;
          }, null, {timeout:4000});
          assert.equal(await filter.locator('[data-goal-sector]').count(),4,label+" four merged goal sectors");
          assert.equal(await filter.locator('[data-goal-sector="goals"]').count(),0,
            label+" no standalone Goals category");
          // Live two-way sync between upper-left check-ins and the new compact
          // first slider in the filter, without dragging the separate axes.
          const checkinPairs = [
            ["energy","energy"], ["money","money"],
            ["love","relationships"], ["meaning","meaning"],
          ];
          for (const [sector, key] of checkinPairs) {
            await filter.locator('[data-goal-sector="'+sector+'"]').click();
            const inside=filter.locator('[data-support-goal-checkin-input]');
            const top=root.locator('[data-support-scale="'+key+'"] input[type="range"]');
            assert.equal(await inside.inputValue(),await top.inputValue(),
              label+" "+sector+" inherits the exact top-left score");
            assert.equal(await filter.locator('[data-support-goal-checkin="'+sector+'"]').count(),1,
              label+" one shared slider ahead of concerns for "+sector);
            const placement=await filter.locator('[data-support-goal-details]').evaluate(el=>{
              const a=el.querySelector('[data-support-goal-checkin]')?.getBoundingClientRect();
              const b=el.querySelector('#goal-problems')?.getBoundingClientRect();
              return {firstBottom:a?.bottom,problemsTop:b?.top,visible:a?.width>0};
            });
            assert.ok(placement.visible && placement.firstBottom<=placement.problemsTop+2,
              label+" shared score comes before category questions: "+JSON.stringify(placement));
            if(width===390 || sector==="meaning" || sector==="love") {
              await inside.focus(); await inside.press("End");
              assert.equal(await top.inputValue(),"10",
                label+" dragging goal-filter "+sector+" immediately updates top card");
              await top.focus(); await top.press("Home"); await top.press("ArrowRight");
              assert.equal(await inside.inputValue(),"2",
                label+" editing top-left "+key+" immediately updates filter");
            }
          }
          // One Meaning score and category includes ALL former Goals choices.
          const meaningTop=root.locator('[data-support-scale="meaning"] input[type="range"]');
          await filter.locator('[data-goal-sector="meaning"]').click();
          await meaningTop.focus(); await meaningTop.press("End");
          assert.equal(await filter.locator('[data-support-goal-checkin-input]').inputValue(),"10",
            label+" Meaning rating is synchronized");
          for (const id of ["unclearGoals","stuck","lostPurpose","valueConflict"]) {
            assert.equal(await filter.locator('[data-goal-concern="'+id+'"]').count(),1,
              label+" merged Meaning concern "+id);
          }
          for (const id of ["direction","nextStep","habits","motivation","values","purpose"]) {
            assert.equal(await filter.locator('[data-goal-task="'+id+'"]').count(),1,
              label+" merged Meaning action "+id);
          }
          for (const id of ["goalClarity","actions","progress","meaningAxis","selfContact","inspirationAxis"]) {
            assert.equal(await filter.locator('[data-goal-axis="'+id+'"]').count(),1,
              label+" retained Meaning/Goals measured axis "+id);
          }
          assert.equal(await filter.locator('[data-goal-axis]').count(),6,
            label+" merged Meaning has six independent editable indicators");
          await filter.locator('[data-goal-sector="money"]').click();
          for (const concern of ["income","moneyStress","workStuck","decisions"]) {
            await filter.locator('[data-goal-concern="'+concern+'"] input').check();
          }
          for (const goal of ["stableIncome","moneyConfidence","growth","clearPlan"]) {
            await filter.locator('[data-goal-task="'+goal+'"] input').check();
          }
          assert.equal(await filter.locator('[data-goal-concern] input:checked').count(),4,
            label+" more than three problems can be selected");
          assert.equal(await filter.locator('[data-goal-task] input:checked').count(),4,
            label+" more than three goals can be selected");
          assert.equal(await filter.locator('[data-goal-axis]').count(),3,label+" three money indicators");
          assert.equal(await filter.locator('[data-goal-axis] input[type="range"]').count(),2,
            label+" one subjective indicator has now and want sliders");
          assert.equal(await filter.locator('[data-support-goal-details] [data-support-goal-axes]').count(),1,
            label+" now/want measures are inside the right-hand diagnostic column");
          assert.equal(await filter.locator('[data-goal-metric]').count(),4,
            label+" income and reserve have real-unit now and want controls");
          assert.equal(await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="current"]').inputValue(),"",
            label+" no fabricated default income");
          await filter.locator('[data-goal-currency]').selectOption("EUR");
          await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="current"]').fill("2000");
          await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="desired"]').fill("4000");
          await filter.locator('[data-goal-metric="reserveMonths"][data-metric-field="current"]').fill("1");
          await filter.locator('[data-goal-metric="reserveMonths"][data-metric-field="desired"]').fill("6");
          // Next must auto-accept unsaved money edits. No separate Save click.
          await filter.locator('[data-support-goal-next]').click();
          // WebKit can resolve a click before React commits accepted/next state.
          // Wait for actual acceptance and navigation; never bypass either gate.
          await filter.locator('[data-goal-accepted="money"]').waitFor({state:"attached",timeout:6000});
          await filter.locator('[data-goal-sector="love"][aria-pressed="true"]').waitFor({state:"attached",timeout:6000});
          assert.equal(await filter.locator('[data-goal-accepted="money"]').count(),1,
            label+" Next automatically Saves and marks Money Accepted");
          assert.equal(await filter.locator('[data-goal-sector="love"][aria-pressed="true"]').count(),1,
            label+" Next moves to the next diagnostic sector");
          assert.equal(await filter.locator('[data-goal-accepted="money"]').count(),1,
            label+" prior Accepted category retains its checkmark");
          await filter.locator('[data-goal-concern="loneliness"] input').check();
          await filter.locator('[data-goal-task="closeness"] input').check();
          // The explicit Save button remains independently useful.
          await filter.locator('[data-support-goal-save]').click();
          // React may flush the Accepted badges after the click resolves in WebKit.
          // Wait for the actual saved state; do not treat a paint race as lost data.
          await page.waitForFunction(() => document.querySelectorAll('[data-goal-accepted]').length === 2,
            null, { timeout: 6000 });
          assert.equal(await filter.locator('[data-goal-accepted]').count(),2,
            label+" independent Save and auto-Next keep separate Accepted marks");
          await filter.locator('[data-goal-sector="money"]').click();
          assert.equal(await filter.locator('[data-goal-concern] input:checked').count(),4,
            label+" return restores Money selections");
          assert.equal(await filter.locator('[data-goal-task] input:checked').count(),4,
            label+" return restores Money tasks");
          // A later edit to the global check-in makes a previously accepted
          // sector stale until it is explicitly saved again.
          const topMoney=root.locator('[data-support-scale="money"] input[type="range"]');
          await topMoney.focus(); await topMoney.press("End");
          assert.equal(await filter.locator('[data-support-goal-checkin-input]').inputValue(),"10",
            label+" check-in changes in upper-left remain live during accepted review");
          assert.equal(await filter.locator('[data-goal-accepted="money"]').count(),0,
            label+" accepted badge disappears when global score changes");
          await filter.locator('[data-support-goal-save]').click();
          assert.equal(await filter.locator('[data-goal-accepted="money"]').count(),1,
            label+" saving again accepts updated top rating");
          assert.equal(await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="current"]').inputValue(),"2000",
            label+" accepted Money amount remains when switching categories");
          const formats=filter.locator('[data-support-goal-format]');
          assert.equal(await formats.count(),9,label+" nine real recommendation formats");
          assert.equal(await filter.locator('[data-support-goal-format] input:checked').count(),9,
            label+" all formats are checked by default");
          await filter.locator('[data-support-goal-format="consultation"] input').uncheck();
          await filter.locator('[data-support-goal-format="initiations"] input').uncheck();
          assert.equal(await filter.locator('[data-support-goal-format] input:checked').count(),7,
            label+" visitor can remove unwanted consultation and initiation formats");
          // The third measure must finish BEFORE the buttons begin: no
          // sticky overlay, no oversized reset card, no squeezed primary CTA.
          const layout=await filter.evaluate(el=>{
            const last=el.querySelector('[data-goal-axis]:last-child');
            const footer=el.querySelector('[data-support-goal-actions]');
            const apply=el.querySelector('[data-support-goal-apply]');
            const reset=el.querySelector('[data-support-goal-reset]');
            const sector=el.querySelector('[data-goal-sector]');
            const details=el.querySelector('[data-support-goal-details]');
            const metrics=el.querySelector('[data-support-goal-axes]');
            const save=el.querySelector('[data-support-goal-save]');
            const next=el.querySelector('[data-support-goal-next]');
            const panel=el.getBoundingClientRect(), a=apply.getBoundingClientRect(),
              f=footer.getBoundingClientRect(), l=last.getBoundingClientRect(),
              d=details.getBoundingClientRect(), m=metrics.getBoundingClientRect(),
              sa=save.getBoundingClientRect(), ne=next.getBoundingClientRect();
            return {
              position:getComputedStyle(footer).position,
              panelWidth:panel.width, actionWidth:a.width,
              footerTop:f.top, lastAxisBottom:l.bottom,
              footerHeight:f.height, applyHeight:a.height,
              metricLeft:m.left, metricRight:m.right, metricWidth:m.width,
              detailsLeft:d.left, detailsRight:d.right,
              saveY:sa.y, nextY:ne.y, saveRight:sa.right, nextLeft:ne.left,
              applySize:parseFloat(getComputedStyle(apply).fontSize),
              resetSize:parseFloat(getComputedStyle(reset).fontSize),
              sectorSize:parseFloat(getComputedStyle(sector).fontSize),
              saveSize:parseFloat(getComputedStyle(save).fontSize),
              applyClipped:apply.scrollHeight>apply.clientHeight+2 || apply.scrollWidth>apply.clientWidth+2,
              resetClipped:reset.scrollHeight>reset.clientHeight+2 || reset.scrollWidth>reset.clientWidth+2,
              saveClipped:save.scrollHeight>save.clientHeight+2 || save.scrollWidth>save.clientWidth+2,
              nextClipped:next.scrollHeight>next.clientHeight+2 || next.scrollWidth>next.clientWidth+2,
            };
          });
          assert.equal(layout.position,"static",label+" actions must be in document flow");
          assert.ok(layout.footerTop>=layout.lastAxisBottom-2,
            label+" CTA must never cover final slider: "+JSON.stringify(layout));
          assert.ok(layout.actionWidth>=layout.panelWidth*.76,
            label+" recommendation CTA must use the panel width, not narrow left cell: "+JSON.stringify(layout));
          assert.ok(layout.metricLeft>=layout.detailsLeft-2 &&
              layout.metricRight<=layout.detailsRight+2 && layout.metricWidth<layout.panelWidth*.8,
            label+" all measures must fit the right diagnostic column: "+JSON.stringify(layout));
          assert.ok(Math.abs(layout.saveY-layout.nextY)<=3 && layout.saveRight<=layout.nextLeft+3,
            label+" Save and Next must share one row without overlap: "+JSON.stringify(layout));
          assert.ok(layout.applySize<=17 && layout.resetSize<=15 && layout.sectorSize<=15 &&
              layout.saveSize<=15,
            label+" button font sizes must override parent .page button shorthand: "+JSON.stringify(layout));
          assert.ok(!layout.applyClipped && !layout.resetClipped && !layout.saveClipped &&
              !layout.nextClipped,
            label+" full action labels must remain visible: "+JSON.stringify(layout));
          const readability=await filter.evaluate(el=>{
            const rail=el.querySelector('[data-support-goal-sectors]');
            const details=el.querySelector('[data-support-goal-details]');
            const heading=details.querySelector('#goal-problems');
            const option=details.querySelector('[data-goal-concern]');
            const optionInput=option.querySelector('input');
            const sector=rail.querySelector('[data-goal-sector]');
            const right=details.getBoundingClientRect(),left=rail.getBoundingClientRect();
            const optionBoxes=[...details.querySelectorAll('[data-goal-concern],[data-goal-task]')];
            return {
              leftWidth:left.width,rightWidth:right.width,
              headingFont:parseFloat(getComputedStyle(heading).fontSize),
              optionFont:parseFloat(getComputedStyle(option).fontSize),
              sectorFont:parseFloat(getComputedStyle(sector).fontSize),
              checkboxWidth:optionInput.getBoundingClientRect().width,
              contentOverflow:optionBoxes.some(item=>{
                const rect=item.getBoundingClientRect();
                return rect.left<right.left-2||rect.right>right.right+2;
              }),
            };
          });
          assert.ok(readability.rightWidth>=readability.leftWidth*1.85,
            label+" narrower left rail must give more room to questions: "+JSON.stringify(readability));
          assert.ok(readability.headingFont>=14.4 && readability.optionFont>=12 &&
            readability.sectorFont>=11.4 && readability.checkboxWidth>=17,
            label+" readable iPhone goal labels and tap targets: "+JSON.stringify(readability));
          assert.equal(readability.contentOverflow,false,
            label+" large option labels must wrap within right column");
          if (width===390) await page.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-goal-filter-390.png",fullPage:true});
          const filterOverflow=await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.ok(filterOverflow<=3,label+" goal filter must not overflow horizontally: "+filterOverflow);
          await filter.locator('[data-support-goal-apply]').click();
          await root.locator('[data-support-applied-goal]').waitFor({state:"visible",timeout:8000});
          const results=root.locator('[data-support-inline-guide]');
          await results.waitFor({state:"visible",timeout:8000});
          const filterSummary=await results.locator('[data-support-guide-message="guide"]').nth(1).innerText();
          assert.ok(filterSummary.includes(locale==="ru"?"Деньги":locale==="es"?"Dinero":"Money"),
            label+" accepted goal filter overrides earlier relationship check-in");
          assert.equal(await results.locator('[data-support-guide-phase="review"]').count(),1,
            label+" invite visitor to confirm the suggestion");
          await results.locator('[data-support-guide-phase="review"] button').first().click();
          assert.equal(await results.locator('[data-support-guide-phase="test-invite"]').count(),1,
            label+" user can choose test or go straight to practice");
          assert.equal(await results.locator('[data-support-guide-recommendation]').count(),0,
            label+" no early recommendation");
          await results.locator('[data-guide-skip-test]').click();
          assert.equal(await results.locator('[data-support-guide-phase="practice-invite"]').count(),1,
            label+" practice is optional and independent of tests");
          await results.locator('[data-guide-short-practice]').click();
          await results.locator('[data-support-guide-phase="exercise"] button').first().click();
          await results.locator('[data-support-guide-phase="feedback"] button').first().click();
          assert.equal(await results.locator('[data-support-guide-recommendation]').count(),0,
            label+" recommendation still hidden before My Path action");
          await results.locator('[data-support-guide-show-recommendations]').click();
          assert.equal(await results.locator('[data-support-guide-recommendation]').count(),1,
            label+" user confirms personal path after conversation");
          assert.equal(await results.locator('[data-support-guide-program]').count(),1,
            label+" optional path proposed only after consent");
          assert.equal(await results.locator('[data-support-guide-alternative="consultation"]').count(),0,
            label+" opted-out consultation excluded from final alternatives");
          assert.equal(await results.locator('[data-support-guide-alternative]').count()<=2,true,
            label+" no more than two alternative formats");
          assert.equal(await root.locator('[data-support-meditation-gallery] [data-support-video]').count(),4,
            label+" only published video catalogue");
          assert.equal(await root.locator('[data-support-player] iframe').count(),0,label+" no autoplay");
          await root.locator('[data-support-tool="tests"]').click();
          const testsFromGoals=root.locator('[data-support-tests-panel]');
          await testsFromGoals.waitFor({state:"visible",timeout:8000});
          assert.equal(await testsFromGoals.locator('[data-support-open-tests]').getAttribute('href'),
            '/'+locale+'/client/tests',label+" free Test Explorer");
          assert.equal(await testsFromGoals.locator('[data-support-tests-personality]').getAttribute('href'),
            '/'+locale+'/personality-profiles',label+" existing profile builder");
          assert.equal(await testsFromGoals.locator('[data-support-tests-guide]').getAttribute('href'),
            '/'+locale+'/tests',label+" test privacy explanation");
          await root.locator('[data-support-tool="meditation"]').click();
          await root.locator('[data-support-tool="talisman"]').click();
          const talisman=root.locator('[data-support-talisman-viewer]');
          await talisman.waitFor({state:"visible",timeout:8000});
          // Owner-approved shopping mock: verify actual category navigation,
          // three selectors and the existing quote dialog at all iPhone sizes.
          const categories=talisman.locator("[data-support-talisman-category]");
          assert.equal(await categories.count(),6,label+" six scrollable intentions");
          const labels=await talisman.evaluate(el=>{
            const cards=Array.from(el.querySelectorAll('[data-support-talisman-category]')).slice(0,4);
            const arrow=el.querySelector('[data-support-talisman-categories-next]');
            const arrowLeft=arrow?.getBoundingClientRect().left ?? 0;
            return cards.map(card=>{
              const name=card.querySelector('span');
              const rect=card.getBoundingClientRect();
              return {text:name?.textContent,aria:card.getAttribute('aria-label'),
                whiteSpace:name ? getComputedStyle(name).whiteSpace : '',
                overflow:(name?.scrollWidth ?? 0)-(name?.clientWidth ?? 0),
                fitsBeforeArrow:rect.right <= arrowLeft+2,
                height:rect.height};
            });
          });
          const expectedShortLabels={
            en:["Strength","Money","Love","Goals"],
            ru:["Сила","Деньги","Любовь","Цель"],
            es:["Fuerza","Dinero","Amor","Metas"],
          }[locale];
          assert.deepEqual(labels.map(item=>item.text),expectedShortLabels,
            label+" short words instead of torn-up 3-line talisman titles");
          assert.ok(labels.every(item=>item.aria && item.aria !== item.text &&
              item.whiteSpace==="nowrap" && item.overflow<=1 && item.fitsBeforeArrow),
            label+" four fully readable single-line categories with full accessible names: "+JSON.stringify(labels));
          const compactSizes=await talisman.evaluate(el=>{
            const category=el.querySelector('[data-support-talisman-category-switcher]')?.getBoundingClientRect();
            const first=el.querySelector('[data-support-talisman-category]')?.getBoundingClientRect();
            const filters=el.querySelector('[data-support-talisman-filters]')?.getBoundingClientRect();
            const artwork=el.querySelector('[data-support-talisman-artwork]')?.getBoundingClientRect();
            return {categoryHeight:category?.height,cardWidth:first?.width,cardHeight:first?.height,
              filtersHeight:filters?.height,artWidth:artwork?.width,artHeight:artwork?.height};
          });
          assert.ok(compactSizes.categoryHeight<=158 && compactSizes.cardWidth<=96 &&
            compactSizes.cardHeight<=90 && compactSizes.filtersHeight<=65,
            label+" compact 4-up categories and filters: "+JSON.stringify(compactSizes));
          assert.ok(compactSizes.artWidth>=100 && compactSizes.artHeight>=125,
            label+" featured source artwork must remain clearly visible");
          assert.equal(await talisman.locator('[data-support-talisman-artwork] img').count(),1,
            label+" original Fu image must be framed once, not swapped for fake jewellery");
          const expand=talisman.locator('[aria-controls="talisman-category-options"]');
          await expand.click();
          assert.equal(await expand.getAttribute("aria-expanded"),"true",
            label+" All categories expands six choices without adding a catalogue");
          await expand.click();
          assert.equal(await expand.getAttribute("aria-expanded"),"false",
            label+" compact carousel returns after expanding");
          const catRail=talisman.locator("[data-support-talisman-categories]");
          assert.ok(await catRail.evaluate(el=>el.scrollWidth>el.clientWidth),
            label+" more categories must really exist beyond the visible row");
          await talisman.locator("[data-support-talisman-categories-next]").click();
          await page.waitForFunction(()=>document.querySelector("[data-support-talisman-categories]")?.scrollLeft>0,
            null,{timeout:5000});
          await talisman.locator('[data-support-talisman-category="relationships"]').click();
          assert.equal(await talisman.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-harmony",label+" love selects the existing harmony artwork");
          await talisman.locator('[data-support-talisman-category="money"]').click();
          assert.equal(await talisman.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-prosperity",label+" money selects the existing prosperity artwork");
          if(width===390) await talisman.screenshot({path:output+"/"+browserType.name()+"-"+locale+"-premium-talisman-390.png",
            animations:"disabled",timeout:12000});
          await talisman.locator('[data-support-talisman-filter="master"]').click();
          assert.equal(await talisman.locator("#talisman-master-note").isVisible(),true,
            label+" maker disclosure does not invent a named master");
          await talisman.locator('[data-support-talisman-filter="tradition"] select').selectOption("daoist");
          await talisman.locator('[data-support-talisman-filter="description"] select').selectOption("fu-harmony");
          assert.equal(await talisman.locator('[data-support-talisman-thumb]').count(),1,
            label+" description filter narrows to one real item");
          await talisman.locator('[data-support-talisman-filter="description"] select').selectOption("all");
          assert.equal(await talisman.locator('[data-support-talisman-thumb]').count(),3,
            label+" clearing description restores all actual Fu art");
          await talisman.locator('[data-support-talisman-thumb="fu-prosperity"]').click();
          await talisman.locator("[data-support-talisman-request]").click();
          const order=page.locator('dialog[aria-labelledby="support-talisman-order-title"]');
          await order.waitFor({state:"visible",timeout:8000});
          assert.equal(await order.locator('[data-cart-talisman="fu-prosperity"]').count(),1,
            label+" Order opens the existing cart for the selected public item");
          assert.equal(await order.locator("[data-talisman-quote-saved]").count(),0,
            label+" opening a quote does not fabricate a CRM receipt or payment");
          await order.locator("button[aria-label]").first().click();
          await order.waitFor({state:"hidden",timeout:8000});
          await root.locator('[data-support-tool="meditation"]').click();
          await root.locator('[data-support-goal-filter-trigger]').click();
          assert.equal(await filter.locator('[data-goal-accepted]').count(),2,
            label+" two Accepted sector badges persist after closing/reopening the editor");
          assert.equal(await filter.locator('[data-support-goal-format] input:checked').count(),7,
            label+" opt-out preference persists after closing and reopening");
          assert.equal(await filter.locator('[data-goal-currency]').inputValue(),"EUR",
            label+" chosen currency preserved when editing");
          assert.equal(await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="current"]').inputValue(),"2000",
            label+" factual income draft survives editing");
          await filter.locator('[data-goal-currency]').selectOption("USD");
          assert.equal(await filter.locator('[data-goal-metric="monthlyIncome"][data-metric-field="current"]').inputValue(),"",
            label+" changing currency must not silently convert or relabel prior income");
          assert.equal(await filter.locator('[data-goal-metric="reserveMonths"][data-metric-field="current"]').inputValue(),"1",
            label+" reserve months remain unaffected by currency");
          if(width===390) {
            // Empty selection must NOT silently show an unrequested meditation.
            while (await filter.locator('[data-support-goal-format] input:checked').count()) {
              await filter.locator('[data-support-goal-format] input:checked').first().uncheck();
            }
            await filter.locator('[data-support-goal-apply]').click();
            await root.locator('[data-support-goal-empty]').waitFor({state:"visible",timeout:8000});
            await root.locator('[data-support-goal-no-inline]').waitFor({state:"visible",timeout:8000});
            assert.equal(await root.locator('[data-support-player]').count(),0,
              label+" no default video when all formats opted out");
            await root.locator('[data-support-goal-no-inline] button').click();
            await filter.waitFor({state:"visible",timeout:8000});
          }
          await filter.locator('[data-support-goal-reset]').click();
          assert.equal(await filter.locator('[data-support-goal-format] input:checked').count(),9,
            label+" Reset restores all formats checked");
          assert.equal(await root.locator('[data-goal-sector="energy"][aria-pressed="true"]').count(),1,
            label+" reset restores sector");
          assert.equal(await root.locator('[data-goal-axis]').count(),3,
            label+" energy has three compact measures in the right column");
          assert.equal(await root.locator('[data-goal-accepted]').count(),0,
            label+" Reset clears all previously accepted sector badges");
          await root.locator('[data-support-goal-filter] button[aria-label]').first().click();
          assert.equal(await root.locator('[data-support-applied-goal]').count(),0,label+" reset clears goal");
          assert.equal(await root.locator('[data-support-inline-guide]').count(),0,
            label+" after resetting the filter the default dashboard remains without invented advice");
          if(width===390) {
            await root.locator('[data-support-photo] input[type="file"]')
              .setInputFiles({name:"synthetic.png",mimeType:"image/png",buffer:photo});
            await root.locator('[data-support-photo] img[class*="photoPreview"]').waitFor({state:"attached",timeout:5000});
            // Selecting a thumb changes the player, but only explicit Play opens YouTube.
            const target=root.locator('[data-support-video]').last();
            await target.click();
            assert.equal(await root.locator('[data-support-player] iframe').count(),0,label+" no autoplay on selection");
            await root.locator('[data-support-play]').click();
            const src=await root.locator('[data-support-player] iframe').getAttribute("src");
            assert.match(src??"", /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?autoplay=1/,
              label+" consent-to-play original");
          }
          // Talisman has the same hero-first stage and source images in a
          // three-tile shelf. Navigation and local quote must not submit.
          await root.locator('[data-support-tool="talisman"]').click();
          await talisman.waitFor({state:"visible",timeout:8000});
          assert.equal(await talisman.locator('[data-support-talisman-thumb]').count(),3,
            label+" three verified Fu illustrations below their large hero");
          const talismanHeight = await talisman.locator('[data-support-talisman]').evaluate(
            element => element.getBoundingClientRect().height);
          assert.ok(Math.abs(talismanHeight - geometry.hero[0].height) <= 10,
            label+" talisman stage uses the same compact height as meditation");
          const tRects=await talisman.evaluate(el=>{
            const a=el.querySelector('[data-support-talisman]')?.getBoundingClientRect();
            const b=el.querySelector('[data-support-talisman-rail]')?.getBoundingClientRect();
            return {heroBottom:a?.bottom,railTop:b?.top};
          });
          assert.ok(tRects.railTop>=tRects.heroBottom-2,
            label+" Fu thumbnail shelf must follow the selected talisman");
          await root.locator('[data-support-tool="meditation"]').click();
          await root.locator('[data-support-tool="pump"]').click();
          await root.locator('[data-support-player]').waitFor({state:"visible",timeout:8000});
          assert.equal(await root.locator('[data-support-profile-hero]').count(),0,
            label+" Courses must not show diagnostic profiles");
          assert.ok(await root.locator('[data-support-video]').count()>0,
            label+" original video lessons are reachable");
          if(locale==="ru") {
            const mysteryPicker=root.locator('[data-support-mystery-courses]');
            assert.equal(await mysteryPicker.locator('[data-support-mystery-course]').count(),4,
              label+" four Russian original Maya/Egypt/Dionysus/Demeter series restored");
            await mysteryPicker.locator('[data-support-mystery-course="egypt"]').click();
            assert.equal(await mysteryPicker.locator('[data-support-mystery-course="egypt"]').getAttribute('aria-pressed'),"true",
              label+" Egypt programme selection works");
            assert.match(await root.locator('[data-support-active-course-link]').getAttribute('href')??"",
              /^\/ru\/academy\//,label+" source Academy programme link");
            for (const [channel,total] of [["greek-dionysus",7],["greek-demeter",5]]) {
              await mysteryPicker.locator('[data-support-mystery-course="'+channel+'"]').click();
              const episodes=root.locator('[data-support-meditation-gallery] [data-support-video]');
              assert.equal(await episodes.count(),total,label+" "+channel+" retains complete sequence");
              assert.deepEqual(await episodes.evaluateAll(nodes=>nodes.map(el=>Number(el.getAttribute("data-source-order")))),
                Array.from({length:total},(_,i)=>i+1),label+" "+channel+" numbered episodes 1–"+total);
              assert.equal(await root.locator('[data-support-lesson-navigation]').count(),1,
                label+" "+channel+" previous/next episode navigation exists");
              assert.match(await root.locator('[data-support-active-course-link]').getAttribute("href")??"",
                new RegExp("^/ru/academy/videos/greek-mysteries-"+(channel==="greek-dionysus"?"dionysus":"demeter")+"$"),
                label+" canonical original channel course link");
              assert.equal(await root.locator('[data-support-player] iframe').count(),0,
                label+" changing original channel never auto-plays");
            }
          }
          const academyHrefs=await root.locator('[data-support-courses-panel] a')
            .evaluateAll(links => links.map(a => a.getAttribute("href")));
          // Academy's two canonical links remain, while optional published
          // Maya/Egyptian/Greek course links may increase the total.
          assert.ok(academyHrefs.includes("/"+locale+"/academy") &&
            academyHrefs.includes("/"+locale+"/academy/reiki/tantra-reiki/discover"),
            label+" existing Academy and free Reiki paths remain available");
          assert.ok(academyHrefs.length>=2 && academyHrefs.every(href =>
            typeof href === "string" && href.startsWith("/"+locale+"/academy")),
            label+" additional published course links stay in localized Academy: "+JSON.stringify(academyHrefs));
          assert.equal(await root.locator('[data-support-player] iframe').count(),0,
            label+" changing category never autoplays");
          await root.locator('[data-support-tool="healing"]').click();
          const healing=root.locator('[data-support-healing-panel] [data-support-master-viewer]');
          await healing.waitFor({state:"visible",timeout:8000});
          const heroMaster=healing.locator('[data-support-master-hero]');
          // An isolated WebKit fixture request may fail once after many
          // browser cases. Verify that the real public-directory Retry works;
          // never accept the error placeholder as a successful master card.
          await healing.locator('[data-support-master-hero], [role="alert"]')
            .first().waitFor({state:"visible",timeout:15000});
          const retry = healing.locator('[role="alert"] button');
          if (await retry.count()) await retry.click();
          await heroMaster.waitFor({state:"visible",timeout:20000}).catch(async error => {
            const status = await healing.innerText().catch(() => "(directory unmounted)");
            throw new Error(label + " master gallery failed after bounded retry: " + status +
              " | directory=" + JSON.stringify(directoryEvents) + " / " + error.message);
          });
          const reikiTabs=healing.locator('[data-support-reiki-filters] [data-support-reiki-focus]');
          assert.equal(await reikiTabs.count(),4,label+" four Reiki intentions above the hero");
          const intentionLabels = {
            ru: ["Поддержка энергии","Поддержка любви","Поддержка цели","Поддержка сознания"],
            en: ["Energy support","Love support","Goal support","Consciousness support"],
            es: ["Apoyo a la energía","Apoyo al amor","Apoyo a las metas","Apoyo a la conciencia"],
          };
          assert.deepEqual((await reikiTabs.allInnerTexts()).map(text=>text.trim()),intentionLabels[locale],
            label+" session tiles show just four intentions, no Reiki system captions");
          assert.equal(await reikiTabs.locator("small").count(),0,
            label+" session goals must not expose methodology captions");
          assert.equal(await healing.locator('[data-support-reiki-focus="love"]').getAttribute('aria-pressed'),
            "true",label+" only published Tantra Reiki selected initially");
          const marketplace=healing.locator('[data-support-reiki-marketplace]');
          assert.equal(await marketplace.count(),1,label+" one Reiki sales marketplace in the new mobile shell");
          assert.equal(await marketplace.locator('[data-support-reiki-quick-kind]').count(),3,
            label+" session, initiation and course share one visible format switch");
          const findButton=marketplace.locator('[data-support-reiki-find]');
          assert.equal(await findButton.count(),1,label+" original detailed service picker stays discoverable");
          const masterHeight=await heroMaster.evaluate(element => element.getBoundingClientRect().height);
          assert.ok(masterHeight>=330 && masterHeight<=460,
            label+" Reiki uses a readable scenic sales card, not a clipped 288px filter card: "+masterHeight);
          // Advanced options remain available with the original published-offer filters.
          const tab = value => healing.locator('[data-support-reiki-tab="' + value + '"]');
          assert.equal(await tab("main").count(),1,label+" central Main tab");
          assert.equal(await tab("filter").count(),1,label+" central Filter tab");
          assert.equal(await tab("description").count(),1,label+" central Description tab");
          assert.equal(await tab("media").count(),1,label+" central Video/audio tab");
          const mainTabPosition = await heroMaster.evaluate(element=>{
            const tabs=element.querySelector('[role="tablist"]')?.getBoundingClientRect();
            const content=element.querySelector('[data-support-reiki-panel="main"]')?.getBoundingClientRect();
            return {tabsBottom:tabs?.bottom,contentTop:content?.top};
          });
          assert.ok(Number.isFinite(mainTabPosition.tabsBottom) &&
            Number.isFinite(mainTabPosition.contentTop) &&
            mainTabPosition.tabsBottom <= mainTabPosition.contentTop+2,
            label+" Main / Filter / Description / Video tabs must sit ABOVE the scenic hero content: "+
              JSON.stringify(mainTabPosition));
          const topFilterPosition = await healing.locator('[data-support-reiki-hero-filter]')
            .evaluate(element => {
              const box=element.getBoundingClientRect();
              const stage=element.closest('[data-support-reiki-central]').getBoundingClientRect();
              return {top:box.top,bottom:box.bottom,stageTop:stage.top,stageHeight:stage.height};
            });
          assert.ok(topFilterPosition.top >= mainTabPosition.tabsBottom-1 &&
            topFilterPosition.top - mainTabPosition.tabsBottom <= 25 &&
            topFilterPosition.bottom <= topFilterPosition.stageTop+topFilterPosition.stageHeight/2,
            label+" large Filter CTA must be at the top of the photo, not beside the lower hero copy: "+
              JSON.stringify(topFilterPosition));
          assert.ok(topFilterPosition.bottom <= mainTabPosition.contentTop+1,
            label+" floating top Filter cannot collide with the published provider text panel: "+
              JSON.stringify({topFilterPosition,mainTabPosition}));
          // Screenshot regression: shared .page button {font:inherit} used to inflate
          // every Reiki tab into a huge two-line block on real iPhone Safari.
          const tabSizes=await healing.locator('[data-support-reiki-tab]').evaluateAll(elements =>
            elements.map(element => {
              const rect=element.getBoundingClientRect();
              const css=getComputedStyle(element);
              return {height:rect.height,fontsize:parseFloat(css.fontSize),left:rect.left,
                right:rect.right,top:rect.top,content:element.textContent?.trim()};
            }));
          assert.ok(tabSizes.every(item => item.height >= 40 && item.height <= 50 &&
            item.fontsize <= 13 && item.left >= -1 && item.right <= width+1),
            label+" Reiki tabs are compact, readable and on-screen: "+JSON.stringify(tabSizes));
          assert.ok(Math.max(...tabSizes.map(item=>item.top)) -
            Math.min(...tabSizes.map(item=>item.top)) <= 2,
            label+" four action tabs occupy a single row");
          if (width === 390) await page.screenshot({
            path: output+"/"+browserType.name()+"-"+locale+"-reiki-main-390.png", fullPage: true,
          });
          await tab("filter").click();
          const reikiFilter=healing.locator('[data-support-reiki-filter]');
          await reikiFilter.waitFor({state:"visible"});
          const navPosition=await root.locator('[data-support-mobile-bottom-nav]')
            .evaluate(element => getComputedStyle(element).position);
          assert.equal(navPosition, "static",
            label+" the bottom nav must not obscure an expanded Reiki filter");
          if (width === 390) await page.screenshot({
            path: output+"/"+browserType.name()+"-"+locale+"-reiki-filter-390.png", fullPage: true,
          });
          const intro=healing.locator('[data-support-reiki-photo-intro]');
          const introHeight=await intro.evaluate(element => element.getBoundingClientRect().height);
          assert.ok(introHeight >= 68 && introHeight <= 160,
            label+" scenic photo remains visible ABOVE the filter, "+introHeight);
          const art=healing.locator('[data-support-reiki-central] img').first();
          assert.ok((await art.getAttribute('src')).includes("reiki-approved-sunrise-v3.webp"),
            label+" approved high-resolution Reiki image, not low-quality mock thumbnail");
          const artHeight=await art.evaluate(element => element.parentElement.getBoundingClientRect().height);
          assert.ok(artHeight >= 180 && artHeight <= 230,
            label+" filter photo is framed in a scenic header, not stretched over the whole sheet: "+artHeight);
          const filterLayout=await reikiFilter.evaluate(element => {
            const buttons=Array.from(element.querySelectorAll(
              '[data-support-reiki-format] button,[data-support-reiki-price] button,'+
              '[data-support-reiki-timing] button,[data-support-reiki-report] button,'+
              '[data-support-reiki-provider] button'));
            const rect=element.getBoundingClientRect();
            return {height:rect.height,buttons:buttons.map(button=>{
              const box=button.getBoundingClientRect();
              return {height:box.height,font:parseFloat(getComputedStyle(button).fontSize)};
            }),scrollWidth:document.documentElement.scrollWidth,
              viewportWidth:document.documentElement.clientWidth};
          });
          assert.ok(filterLayout.height <= 565,
            label+" Reiki filters should be a compact sheet, not an enormous page: "+
              JSON.stringify(filterLayout));
          assert.ok(filterLayout.buttons.every(button =>
            button.height >= 40 && button.height <= 60 && button.font <= 13),
            label+" Reiki chips must keep 44px touch targets without inflated typography: "+
              JSON.stringify(filterLayout.buttons));
          assert.ok(filterLayout.scrollWidth <= filterLayout.viewportWidth + 2,
            label+" no page-wide overflow while price choices remain horizontally scrollable");
          assert.equal(await reikiFilter.locator('[data-support-reiki-format] button').count(),3,
            label+" session initiation training all available");
          assert.equal(await reikiFilter.locator('[data-support-reiki-price] button').count(),5,
            label+" five real price bands; Reset is the unfiltered choice");
          assert.equal(await reikiFilter.locator('[data-support-reiki-report] button').count(),3,
            label+" brief text voice report");
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),1,
            label+" provider preference only for sessions");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),0,
            label+" session has no certificate toggle");
          await reikiFilter.locator('[data-support-reiki-format] button').nth(2).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),0,
            label+" courses never show session practitioner selector");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),1,
            label+" courses show certificate preference");
          assert.equal(await healing.locator('[data-reiki-academy-offer]').count(),4,
            label+" four real Academy training cards, including free practitioner programme");
          assert.equal(await healing.locator('[data-reiki-academy-cta="reiki-practitioner-course"]').count(),1,
            label+" one canonical free programme CTA");
          await reikiFilter.locator('[data-support-reiki-certificate] input').check();
          assert.ok((await reikiFilter.locator('[data-support-reiki-apply]').innerText()).includes("0"),
            label+" no fictional certified training offers");
          await reikiFilter.locator('[data-support-reiki-format] button').nth(1).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),1,
            label+" initiation may request a certificate");
          await reikiFilter.locator('[data-support-reiki-certificate] input').uncheck();
          assert.equal(await healing.locator('[data-reiki-academy-offer]').count(),3,
            label+" three real linked initiation pathways appear on selection");
          const initiationPicker=marketplace.locator('[data-support-reiki-initiation-types]');
          assert.equal(await initiationPicker.count(),1,
            label+" initiation brings its own lower Reiki type menu");
          assert.equal(await initiationPicker.locator('[data-support-reiki-initiation-id]').count(),4,
            label+" All + exactly the three approved Academy initiation types");
          for(const id of ["tantra-initiation","kundalini-initiation","yggdrasil-initiation"]) {
            assert.equal(await initiationPicker.locator('[data-support-reiki-initiation-id="'+id+'"]').count(),1,
              label+" source-backed initiation "+id);
          }
          await initiationPicker.locator('[data-support-reiki-initiation-id="yggdrasil-initiation"]').click();
          assert.equal(await healing.locator('[data-reiki-academy-offer]').count(),1,
            label+" Yggdrasil selector hides unrelated initiations");
          assert.equal(await healing.locator('[data-reiki-academy-offer="yggdrasil-initiation"]').count(),1,
            label+" retains the original Yggdrasil path");
          await initiationPicker.locator('[data-support-reiki-initiation-id="kundalini-initiation"]').click();
          assert.equal(await healing.locator('[data-reiki-academy-offer="kundalini-initiation"]').count(),1,
            label+" Kundalini selector opens the original Academy entry");
          await initiationPicker.locator('[data-support-reiki-initiation-id="all"]').click();
          assert.equal(await healing.locator('[data-reiki-academy-offer]').count(),3,
            label+" All restores exactly the three original initiations");
          await reikiFilter.locator('[data-support-reiki-price] button').nth(2).click();
          assert.equal(await healing.locator('[data-reiki-academy-offer]').count(),1,
            label+" 21–50 EUR selects only published-price Tantra initiation");
          assert.equal(await healing.locator('[data-reiki-academy-offer="tantra-initiation"]').count(),1,
            label+" canonical Tantra €50 level-one option");
          await reikiFilter.locator('button').filter({hasText:/^(Сбросить|Reset filters|Restablecer)$/}).click();
          await reikiFilter.locator('[data-support-reiki-format] button').nth(0).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider]').count(),1,
            label+" return to session resets certificate and restores provider");
          assert.equal(await reikiFilter.locator('[data-support-reiki-certificate]').count(),0,
            label+" certificate absent in session");
          await reikiFilter.locator('[data-support-reiki-report] button').nth(2).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-report] button').nth(2)
            .getAttribute("aria-pressed"),"true",label+" voice preference selectable");
          await reikiFilter.locator('[data-support-reiki-timing] button').nth(1).click();
          await reikiFilter.locator('[data-support-reiki-provider] button').nth(1).click();
          assert.equal(await reikiFilter.locator('[data-support-reiki-provider] button').nth(1)
            .getAttribute("aria-pressed"),"true",label+" Reiki master preference selectable");
          await reikiFilter.locator('button').filter({hasText:/^(Сбросить|Reset filters|Restablecer)$/}).click();
          // Apply must remain clickable even with the fixed bottom navigation.
          await reikiFilter.locator('[data-support-reiki-apply]').click();
          assert.equal(await healing.locator('[data-support-reiki-panel="main"]').count(),1,
            label+" apply action returns to the existing large photo");
          await tab("media").click();
          assert.equal(await healing.locator('[data-support-reiki-media]').count(),1,
            label+" media tab does not autoplay or invent a video");
          await tab("description").click();
          assert.equal(await healing.locator('[data-support-reiki-panel="description"]').count(),1,
            label+" original stage shows description");
          await tab("main").click();
          assert.equal(await healing.locator('[data-support-reiki-main]').count(),1,
            label+" original photo returns without a new panel");
          await healing.locator('[data-support-reiki-focus="strength"]').click();
          await healing.locator('[data-support-reiki-unavailable]').waitFor({state:"visible"});
          assert.equal(await healing.locator('[data-support-master-request]').count(),0,
            label+" no fake Kundalini Reiki offering");
          await healing.locator('[data-support-reiki-focus="purpose"]').click();
          await healing.locator('[data-support-reiki-unavailable]').waitFor({state:"visible"});
          await healing.locator('[data-support-reiki-focus="balance"]').click();
          await healing.locator('[data-support-master-hero]').waitFor({state:"visible"});
          await healing.locator('[data-support-reiki-focus="love"]').click();
          await healing.locator('[data-support-master-hero]').waitFor({state:"visible"});
          assert.equal(await healing.locator('[data-support-master-thumb]').count(),2,
            label+" fixture's published specialist options beneath large hero");
          await healing.locator('[data-support-master-thumb="qa-energy-two"]').click();
          assert.equal(await heroMaster.getAttribute("data-support-master-hero"),"qa-energy-two",
            label+" clicking master thumbnail changes selection");
          await root.locator('[data-support-tool="masters"]').click();
          assert.equal(await root.locator('[data-support-master-viewer][data-support-directory-kind="masters"]').count(),1,
            label+" Masters shortcut opens same-page hero catalogue");
          await root.locator('[data-support-tool="consultation"]').click();
          const offers=root.locator('[data-support-master-viewer][data-support-directory-kind="consultation"]');
          await offers.locator('[data-support-master-hero], [role="alert"]')
            .first().waitFor({state:"visible",timeout:15000});
          const offerRetry = offers.locator('[role="alert"] button');
          if (await offerRetry.count()) await offerRetry.click();
          await offers.locator('[data-support-master-hero]').waitFor({state:"visible",timeout:20000});
          assert.equal(await offers.locator('[data-support-master-thumb]').count(),2,
            label+" published-only consultation gallery reuses the scenic stage");
          assert.equal(await offers.locator('a[data-support-offer-request]').count(),1,
            label+" secure service request is an explicit navigation, not a silent booking");
          const consultChips=await offers.locator('[data-support-consultation-category]').evaluateAll(elements =>
            elements.map(button => {
              const box=button.getBoundingClientRect(), caption=button.querySelector('span');
              return {height:box.height,aria:button.getAttribute('aria-label'),caption:caption?.textContent,
                fits:Boolean(caption && caption.scrollWidth<=caption.clientWidth+2)};
            }));
          assert.equal(consultChips.length,5,label+" published consultation categories");
          assert.ok(consultChips.every(item=>item.height>=44 && item.height<=52 && item.fits && item.aria),
            label+" compact, non-broken, accessible 44px service chips "+JSON.stringify(consultChips));
          await root.locator('[data-support-tool="tests"]').click();
          const testsPanel=root.locator('[data-support-tests-panel]');
          await testsPanel.waitFor({state:"visible",timeout:8000});
          assert.equal(await testsPanel.locator('[data-support-profile]').count(),4,
            label+" four self-assessment profiles shown in Tests");
          assert.equal(await root.locator('[data-support-player]').count(),0,
            label+" course player not shown in Tests");
          const moneyProfile=testsPanel.locator('[data-support-profile="money"]');
          await moneyProfile.click();
          assert.equal(await moneyProfile.getAttribute('aria-pressed'),"true",
            label+" Tests money profile changes active state");
          assert.equal(await testsPanel.locator('[data-support-profile-hero]').getAttribute('data-sector'),"money",
            label+" Tests hero reflects selected profile");
          assert.equal(await testsPanel.locator('[data-support-profile-test]').count(),1,
            label+" tests hero has a real CTA");
          assert.equal(await root.locator('[data-support-master-viewer]').count(),0,
            label+" Tests do not mix with a consultation/CRM booking");
          assert.equal(await testsPanel.locator('[data-support-open-tests]').getAttribute('href'),
            '/'+locale+'/client/tests',label+" actual free Test Explorer");
          if(width===390) await page.screenshot({
            path:output+"/"+browserType.name()+"-"+locale+"-tests-390.png",fullPage:true});
          const testOverflow=await page.evaluate(() =>
            document.documentElement.scrollWidth-document.documentElement.clientWidth);
          assert.ok(testOverflow<=3,label+" Tests panel has no horizontal overflow: "+testOverflow);
          assert.deepEqual(errors,[],label+" browser exceptions");
          evidence.push({label,geometry:{client:geometry.client,scroll:geometry.scroll,heroHeight:geometry.hero[0].height},
            fourVideos:true,threeZones:width>350,photo:width===390,noAutoplay:true});
        } finally { await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
await writeFile(output+"/results.json",JSON.stringify({checks:evidence},null,2));
console.log("Support mock fidelity browser cases: "+evidence.length+" passed.");
