# Profile Work = My Space · visual parity (12 Nov 2026)

## Page/state identity
- **Visual reference:** owner’s first iPhone screenshot, personal **Live** dashboard at `/{locale}/app/portrait`, selected Today. Brand ivory/cream, compact teal 6-tab navigation, real landscape video and four green quick actions.
- **Actual to replace:** owner’s second screenshot of **Work** `/{locale}/practice`, guest and signed-in practitioner home. This is the *dashboard*, never the protected `/{locale}/app/practice?panel=...` editor.
- Layout reference is deliberate shared **visual hierarchy**, not pixel-identical content. RU/EN/ES copy and user state vary; browser chrome and safe area excluded from screenshots.

## Work page hierarchy, top to bottom
1. Keep the existing global Holistic House chrome and universal Profile navigation.
2. Within one ivory outlined bar, eyebrow **MY SPACE · PROFESSIONAL GROWTH**, serif **My Space** and existing teal **Live / Work** switch (Work active). Remove *Master Network*, its subtitle, and the oversized *Find a Master / I’m a Master* pair **from Work only**. The public `/masters` finder keeps its own navigation.
3. Six compact tabs *above* film: **Today, Services, Clients, Requests, Courses, Materials** (and translated RU/ES). Today selected. Actions reach existing authenticated practitioner tools.
4. Use Live’s **same** scenic autumn film and poster, source and responsive CSS, controls, and compact cream frame. No static competing “Share a new practice” banner.
5. Four quick actions *directly under the video*: **My services, Add service, Create course, Requests**, primary action teal.
6. Preserve the published practitioner identity, real active-services and request counters, six existing creation tiles, offer categories, toolbox and current protected editors below the film. Signed-out state uses placeholders only, not fake counts.
7. Global seven-item dock shows **Profile** active when viewing public Work. Protected practitioner editor retains its established internal navigation and authorization.

## Public viewing, actions and permissions
- Both Profile modes remain publicly viewable. Merely switching Live/Work or opening the page **never** triggers OAuth, private account reads in SSR, or a public data leak.
- A meaningful signed-out Work action reuses the existing on-demand accessible login dialog. Google stays the working primary path. Telegram is visible **only** if `auth/providers` explicitly confirms it is configured; existing `auth/start` creates a secure provider redirect. Google and Telegram identities are not linked silently.
- Authenticated actions route to existing server-protected practice modules. The provider callback returns to this dashboard, never automatically to an editor. Existing moderation, private API and practitioner consent stay unchanged.

## Screenshot verification and boundaries
- Must compare rendered Work and Live visual hierarchy at widths **320, 354, 390 and 430** on Chromium and WebKit: heading/6 tabs/film/4 actions/real tools, no horizontal overflow, tab legibility, icon labels and fixed dock.
- Synthetic `scripts/verify-practice-visual-browser.mjs` checks guest and synthetic signed-in states without real data; `practice-visual-browser.yml` currently runs full browser screenshots on trusted production pushes, not PRs. Green source or CI alone is **not** visual screenshot proof; separately validate actual production alias and real signed-in iPhone flow.
- Historic 28 Oct reference fixture belongs to the previous **different** practitioner dashboard layout and must not be used as a pixel-perfect comparator for the new owner-approved Live parity.
- No new auth, payment, database, scheduled workflow, paid vendor or second practitioner backend.
