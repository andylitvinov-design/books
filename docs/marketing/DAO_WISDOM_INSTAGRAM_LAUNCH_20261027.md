# DAO WISDOM — Instagram organic launch pack, 27 October 2026

**Status: prepared for editorial review, NOT published.** Canonical task [books #2257](https://github.com/andylitvinov-design/books/issues/2257). No Instagram provider connection, live Reel, verified bot handoff, media render or paid advertising is implied by this file.

## 1. Product in one line
**«Даосская мудрость»** — короткие авторские беседы ученика и воображаемого даосского наставника, которые помогают человеку сформулировать один жизненный вопрос и добровольно перейти к **бесплатному персональному письменному блиц-разбору** по авторской символической модели У-Син с Андреем.

This is educational/self-reflective content. Neither Taoist five-element categories nor a short dialogue establish medical conditions, psychological diagnoses, or experimentally validated test scores.

## 2. Accounts / brand / compliance
- **ONE EXISTING Instagram account, specified by owner on 27 October 2026: [@tao.ideas](https://www.instagram.com/tao.ideas/).** Do NOT create/rename any additional account. User confirms it exists; API ownership, account type (Creator/Business), publication scopes and profile bio edit remain unverified. The earlier `@dao.wisdom.house` candidate is retired.
- Proposed display name for existing account **Даосская мудрость | Dao Wisdom**, only after actual profile-owner sign-in and review; preserve existing username **@tao.ideas**. Brand association **by Holistic House / Andrey** must be visible.
- Editorial audience: adults seeking reflection around everyday decisions, relationships, purpose and work. Avoid targeting people by mental/physical health or diagnoses.
- RU pilot voice/captions first; EN/ES landing mirrors are ready. Do not mix narration languages inside every single Reel. Make additional language versions only after demand, editorial review and voice QA.
- Exactly one first CTA in [@tao.ideas](https://www.instagram.com/tao.ideas/) bio. Proposed existing public route (HTTP 200 on EN/RU/ES verified 27 October, actual user bio link and provider E2E not verified):
  `https://holistichouse.vercel.app/ru/services/dao-health-profile?utm_source=instagram&utm_medium=organic_social&utm_campaign=dao_wisdom_launch`
  These params are public campaign codes, contain no identifying or sensitive data. Do **not** put client responses or private token in the URL.
- Bio draft (RU):

  > 🌿 Даосские притчи и мудрость У-Син  
  > О выборе, опоре и внутреннем пути  
  > Авторский проект Holistic House  
  > 🎁 Бесплатный личный блиц-разбор ↓

- Highlight set: **Начать · Притчи · Пять стихий · Об авторе · Вопросы**.
- Three pinned posts: (A) why the Taoist teacher speaks, (B) five-element symbolic primer, (C) *what is free and how consent/privacy works*.
- Attribution/provenance: user-supplied `Даосские коаны-.docx` (Drive ID `15CAS2FlgjthN8TX-G5mfKu7vnt9KKtzY`), `ДАО УСИН.docx` (`15kumFpIEHN7Q6Zlgvix2BlirDdEVTMRs`), `АКЦИЯ — ДАОССКАЯ ДИАГНОСТИКА.docx` (`1QQXJGuphxGoONeYyzZSv29uahC3H33DV`). The **original teacher–student koans are Andy's working writings**, not reliable verbatim quotations of Laozi/Zhuangzi; credit as *«Авторская притча по мотивам даосской традиции»*. Do not represent a fictional character as a real historical teacher.

## 3. Funnel contract (reuse all existing infrastructure)
1. Reel/Story → named public organic campaign link in bio → `/{locale}/services/dao-health-profile` (existing SEO/canonical, multilingual page).
2. Page presents primary direct **Telegram bot CTA only if** current `/api/public/telegram-diagnostic` says `available=true` and a locale-matched `hhdao_<locale>` URL was read back. Otherwise **existing secure first-party CRM enquiry form** remains, without broken buttons or accidental public Telegram admission. No extra bot or backend namespace.
3. Current author-approved Telegram V2: intro/consent → four themes → optional portrait → personal goal & obstacle → optional drawing of **Я / Цель / Препятствие** → secure coaching intake. The `hhdao` variant prepends only a clear thematic, non-medical label to the canonical introduction. Existing flow, STOP, rate limits, photo access, event-id dedupe and signed webhook must stay unchanged.
4. No CRM lead on link click or `/start`. The first CRM contact is server-stored only after a positive consent event. The secure coaching questionnaire must be verified as linked to the SAME lead, not guessed by name/email; separate acceptance in #2257, #985/#990. A bot session is **not** a verified completed questionnaire.
5. Andy manually reviews in the existing owner CRM; return client feedback only via allowed private channel, without sending health details or test results to marketing or push notices. Offer an optional consultation only after useful free feedback. Old Drive price listings (€10 and €100) are **not currently confirmed/public**.
6. Track separately: Reel impression → public landing → safe CTA click → server-acknowledged Telegram opt-in → secure form submission → owner-qualified follow-up → confirmed booking → captured payment. Distinguish unmeasured from zero. Avoid Meta/GA4 tracking while privacy hold remains.
7. Instagram OAuth/Creator account and later auto-publishing belong to [Growth Studio #1214](https://github.com/andylitvinov-design/books/issues/1214). Current Metricool connection to YouTube alone does NOT mean Instagram is connected.

## 4. Video art direction / QA
**Vertical 9:16, 1080×1920, 15–35 seconds**, readable in silent autoplay:
- Ink-and-watercolor fictional Taoist sage in mountain landscape, bamboo grove, teahouse or by a river. No identifiable historical face and no claim of documentary authenticity.
- Illustrations may have gentle camera motion, ink appearing on paper and minimal parallax. **No fabricated lifelike speaking guru/avatar and no uncanny lipsync.** Give the sage a voice through clean on-screen dialogue text and optional authorised Andrey narrator, rather than an unapproved cloned third-party voice.
- If using HeyGen in the Holistic House pipeline, **ONLY** verified Andrey Digital Twin + approved voice and realistic original background, default 1080p, as per [AI Video SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219). Do not substitute stock avatar. Fictional sage still artworks, not HeyGen presenter.
- Native audio at human pacing; captions in 2 lines max, safe margins for Instagram UI; last card 2.5–3s. No stock audio without rights/provenance. CTA not a treatment promise.
- Produce `draft = script + timestamps + visual prompt + voice/subtitle text + estimate`, **no charge/render**. `Generate` only after explicit owner instruction. `Publish` separately after human QA and Instagram provider confirmation.
- Store approved final MP4 on canonical Drive master, then use only approved publishing provider with readback of exact IG post ID/URL. No automatic video reposts or imported rights-unknown footage.

## 5. First three complete Reel scripts (RU, draft)

### REEL 01 · Крепость (29–32 sec) · ID dao_wisdom_fortress_01
*Source: user-authored koan «Защита и свобода», adapted.*

| Time | Visual / captions | Voice |
|---|---|---|
| 00:00–00:03 | Ink fortress, close-up, words «Твои стены защищают тебя?» | «Ученик однажды спросил мастера…» |
| 00:03–00:11 | Student silhouette in fortress doorway | «Я построил вокруг себя крепкие стены. Теперь я в безопасности?» |
| 00:11–00:17 | Elder sage as static ink illustration, mist moves | «Мастер спросил: ты в безопасности — или в плену?» |
| 00:17–00:25 | Door opens; sunlight beyond | «Иногда граница защищает. А иногда не даёт сделать следующий шаг.» |
| 00:25–00:32 | Clean cream background, Dao Wisdom brand + CTA | «Что сейчас охраняет твоя крепость? Начни с бесплатного личного разбора. Ссылка в профиле.» |

Caption:
> Стены могут быть опорой. Но когда они превращаются в привычку не выходить, приходит время спросить: что мне действительно нужно сохранить?  
> 🌿 Авторская притча по мотивам даосской традиции.  
> 🎁 Бесплатный письменный блиц-разбор ситуации — ссылка в профиле. Не медицинская диагностика.  
> #ДаосскаяМудрость #Усин #Самопознание

Alt: «Рисованный наставник и ученик возле крепостной стены; ворота открываются к свету».

### REEL 02 · Бамбук (23–27 sec) · ID dao_wisdom_bamboo_02
*Source: user-authored koan «Сила и мягкость», adapted.*

| Time | Visual / captions | Voice |
|---|---|---|
| 00:00–00:03 | Wind sweeps across pine and bamboo | «Что выдержит бурю?» |
| 00:03–00:11 | Young pupil holds rigid branch, bamboo sways | «Ученик хотел стать сильным и несгибаемым.» |
| 00:11–00:18 | Sage gently bends a bamboo stem | «Мастер показал бамбук: он не борется с ветром. Он умеет возвращаться.» |
| 00:18–00:24 | Vertical bamboo close-up + reflective question | «Где сегодня сила для тебя — в жёсткости или в гибкости?» |
| 00:24–00:27 | Minimal brand, no hard sell | «Сохрани эту мысль.» |

Caption:
> Иногда мягкость — это не уступка, а способность возвращаться к себе.  
> Авторская притча, вдохновлённая даосскими образами.  
> #ДаосскиеПритчи #ВнутренняяОпора #DaoWisdom

### REEL 03 · Ручей (25–30 sec) · ID dao_wisdom_stream_03
*Source: user-authored koan «Движение и доверие», adapted.*

| Time | Visual / captions | Voice |
|---|---|---|
| 00:00–00:03 | Close-up of water meeting stone | «Что делать, когда нет сил идти?» |
| 00:03–00:10 | Pupil by a quiet stream | «Ученик спросил: как мне найти силу двигаться дальше?» |
| 00:10–00:18 | River finds a channel between stones | «Мастер показал ручей: он не спорит с камнями. Он ищет путь.» |
| 00:18–00:25 | Footstep on a small bridge | «Не всегда нужен большой рывок. Иногда достаточно одного малого шага.» |
| 00:25–00:30 | CTA with stylized Water character 水 | «Хочешь увидеть свой следующий шаг? Бесплатный блиц-разбор — по ссылке в профиле.» |

Caption:
> Когда мы не видим всего пути, можно начать с движения, которое доступно сегодня. 🌊  
> Это образ для самоисследования, не измерение «энергии» и не лечебный совет.  
> 🎁 Личный письменный разбор по запросу и рисунку — ссылка в профиле.  
> #ДаосскаяМудрость #Ресурсы #Усин

## 6. Nine more editorial cards (draft, not historical citations)

| ID | Hook / core line | Proposed visual | CTA |
|---|---|---|---|
| 04 мост | «Как идти, когда не видишь, куда ведёт мост?» | Footbridge fades into cloud | Save / share |
| 05 факел | «Свет важнее жара» | Quiet lantern instead of wildfire | Comment: что согревает? |
| 06 капитан | «Можно ли держать руль, не сжимая его?» | Sailboat, river currents | Free review profile link |
| 07 озеро | «Когда вода успокаивается, становится видно дно» | Ink settles in bowl | Save |
| 08 корни | «Какая опора не превращается в стену?» | Tree roots in rain | Question in story |
| 09 башня | «Откроешь окно — и мир войдёт» | Window in quiet tower | Reflect |
| 10 светильник | «Светильник не ищет чужих глаз» | One warm lamp at dawn | Save |
| 11 границы | «Говорить “нет” — не исчезать» | Stone rests in open palm | Free review profile link |
| 12 Пять стихий | «Какую силу ты хочешь развивать?» | Five hand-painted icons (Wood, Fire, Earth, Metal, Water) | What is your question? |

No guaranteed «you are Water/Fire» personal classification from watching content. These are symbolic reflection prompts, not validated psychometrics.

## 7. 30-day pilot calendar (America/Toronto)
| Week | Reels | Stories / operator activities | Release gate |
|---|---|---|---|
| 1 | 01 fortress, 02 bamboo, 03 stream | About author, origin/meaning of Wu Xing, how free review works | Owner reserves Instagram handle; bio link readback; bot actually works; media QA/publication approval |
| 2 | 04 bridge, 05 torch, 06 captain | One non-sensitive audience question, static re-share | Readback of actual platform posts |
| 3 | 07 lake, 08 roots, 09 tower | Optional illustrated five-element primer | First-party received leads only |
| 4 | 10 lamp, 11 boundaries, 12 five elements | Free-review process recap and FAQ | 30-day qualitative decision; no invented conversion ROI |

**Draft only.** Posting cadence 3 Reels per week is a trial, not an automation. Comment replies should not solicit personal health details, push diagnoses, or initiate unsolicited DMs.

## 8. Acceptance and owner decisions
- [x] Original DAO/koan and offer documents found; canonical existing site and bot code identified.
- [x] New issue #2257 tracks source, acceptance and blockers.
- [ ] Product branch PR exact-head CI + Next build + scoped bot policy tests.
- [ ] Exact production Vercel READY+SHA/alias and real mobile CTA.
- [ ] Public bot token/rollout / provider webhook E2E and consented Telegram→CRM→form correlation.
- [x] Instagram handle chosen by owner: [@tao.ideas](https://www.instagram.com/tao.ideas/); [ ] authenticated owner/Creator/Business status, OAuth and native bio link readback.
- [ ] Human content/voice/video QA, explicit post approval and exact provider post receipts.
- [ ] Only then mark completed, update issue and declare actual confirmed leads.

Owner actions only after engineering gates: **sign into already-created @tao.ideas in the Meta/Metricool connection flow, verify it is Creator/Business and grant publishing permissions**, **review or set that profile's bio link**, **approve specific renders/posts**. No account creation, ad spend or credit spend assumed.
