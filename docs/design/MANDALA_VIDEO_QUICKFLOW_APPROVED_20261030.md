# Holistic House · Video Studio — owner-approved quick flow · 2026-10-30

**Source of truth:** owner's last approved cream/emerald/gold iPhone image in the Homeo Video Site conversation (saved artifact `holistic-house-video-studio-approved-2026-10-30.png`). This is a visual and behavioral specification, not proof of implementation or clinical efficacy.

**Identity gate:** guest / RU, EN, ES / public single Video Studio editor route `/{locale}/holistic-support/mandala` / local, browser-only media. DO NOT interpret it as the practitioner dashboard or add a second app/route. Baseline Vercel production branch `codex/public-book-library`, verified base `8dc437d80b83ab05a8313d3df4a7607192fde9a2` on 2026-10-30.

## Approved vertical hierarchy (mobile 320–430 px)

1. Existing site header and video editor identity; avoid unnecessary stacked hero art/bars.
2. **«Выберите тему для видеотерапии»**; six cards: Энергия, Здоровье, Отношения, Деньги, Смыслы/Цели, Спокойствие/Жизнь. One tap updates the real scene and available curated phrases.
3. **One large actual Canvas video** with Play/Pause, 16:9 landscape default. Optional portrait/square stays under Parameters. Keep HTMLVideoElement sources mounted for the same real Canvas decoder; don't show a second visible preview.
4. **Six compact controls immediately under the main video:** Стиль, Параметры, Персонализация, Фразы, Звук, Дополнительно. They navigate to existing, functioning editors, not cosmetic state.
5. **Gold banner:** «Сформировать индивидуальную программу видеотерапии бесплатно» opens the *existing* 8-session planner; the plan is free, but it does not automatically render eight films or call a paid provider.
6. **Стиль видео:** horizontal one-tap first-party scenes; selecting changes real chosen source and main Canvas. Show contextual posters/labels, not arbitrary repeated stock images.
7. **Установки и поддерживающие фразы:** theme-dependent, short, affirmative/encouraging formulations such as «Я тебя люблю», «Я в тебя верю, ты можешь», «Ты самый лучший». One tap changes the actual local Canvas/export overlay; optional «Индивидуальный подбор» opens the existing detailed Hypno panel.
8. **Музыка и голос:** short local first-party soundtrack rail; selecting one track attaches it for real export. Voice, microphone, user audio rights, external TTS and advanced controls remain in their pre-existing protected modules; do not clone recorder or fabricate a voice generation.
9. **«Сформировать видео»** remains the existing privacy/rights/error-gated `MediaRecorder` creation button. No fabricated credits, payments, generated footage or external APIs. Keep detailed editor, full licensed 24-film gallery and optional 49-question director accessible.

## Interaction/state contract
- Topic → scene/phrase suggestions only; user's arbitrary custom text remains intact. Theme-specific preset chosen by user follows theme.
- Style → selected actual scene/film; playback and export use identical renderer.
- Phrase → updates `AffirmationSettings` and live Canvas; only approved selected lines are used for export.
- Music → uses `mandalaAudioTracks` and real `attachedAudio`, no fake playable tile.
- Paid service quality remains unavailable until provider/payment verified. The gold banner opens the existing planner; it does not claim therapy, diagnosis or guaranteed results.
- EN/RU/ES copy; 320,354,390,430,768 desktop widths; keyboard/focus; no horizontal page scroll; touch target ~44px.
- Private photos stay device-local, audio file attachment requires rights, no test results/PHI are transmitted to an external model. "25th frame" is experimental text exposure, not proven clinical suggestion.

## Implementation map
- Existing `components/mandala-free-video-studio.tsx`: topic rail, source-backed Canvas/MP4, 6 compact controls, banner moved from legacy, quick styles, optional support phrases, local soundtrack.
- Existing `components/mandala-video-mobile.module.css`: phone-first hierarchy, compact tabs, gold CTA, scrollable rows, preservation of mounted source player while hiding its redundant visual widget.
- Existing `tests/mandala-mobile-video-design.test.mjs`: source structure/behavior regression, plus real Chromium/WebKit/ffprobe route suite on exact PR head.

## Acceptance gates — independent evidence
- [ ] Source/unit test + ESLint + TypeScript + production Next build green **exact head**.
- [ ] Chromium and WebKit 320/354/390/430: page geometry, screen topic/style/phrase/audio clicks; real MP4/WebM recorded & decoded audio/video, rights/privacy checks.
- [ ] Same route/state mobile reference/actual PNG overlay; not inferred from source/HTTP 200.
- [ ] PR diff and applicable specialist + release-ready checks green; safe squash merge only into `codex/public-book-library`.
- [ ] Vercel **production READY exact SHA** and alias `holistichouse.vercel.app`; post-release RU/EN/ES interaction smoke.
- [ ] Physical iPhone Safari / Save to Files owner QA remains separate.
