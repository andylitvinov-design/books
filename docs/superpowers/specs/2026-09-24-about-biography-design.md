# Localized Andy biography and About navigation

## Scope

Create a dedicated public About page at `/en/about` and `/ru/about`. It is an
editorial, long-form personal biography for Andy, not a marketing landing page
or a client-account surface.

The EN route contains the complete supplied English text. The RU route contains
a complete, natural Russian translation that preserves every paragraph,
chronological fact, school, proper name, and unusual detail. The page uses the
supplied square photograph prominently without cropping it to a conventional
headshot; Andy, the library, the writing desk, and the classical interior remain
visible.

## Navigation and localization

- Replace the existing fifth mobile item, `Cabinet`, with `About` / `Обо мне`.
  Keep the existing `UserRound` icon and preserve exactly five items:
  Home, Book, Remedies, Services, About (localized in Russian).
- The fifth item links to `/en/about` or `/ru/about` according to the active UI
  locale.
- Extend the language switcher so `/en/about` and `/ru/about` switch directly
  between each other.
- Add locale-specific title, description, canonical URL, and hreflang
  alternates.

## Page composition

1. Reuse the public site header and its language switcher.
2. Use a large, responsive introductory photo and personal introduction. On
   desktop, place the image beside the opening content; on mobile, render the
   image first. Use `object-fit: cover` only with a deliberately wide framing
   that retains the room and desk.
3. Render the full biography in reading order using only light editorial
   headings: Let me introduce myself, Experience, Specializations / Studies,
   Tantric Workshops, Psychotherapy & Guided Imagery, Body-oriented
   Psychotherapy, Temple Studies, and Reiki Initiations. Experience and
   specializations may use semantic lists and dividers but never cards,
   badges, metric tiles, or generic wellness copy.
4. Add `Explore my work` / `Исследуйте мою работу` with only actual public
   destinations and labels: Book (`/books`), Remedies (`/{locale}/homeopathy`),
   and Services (`/{locale}/services`).
5. End with a deliberately small `Client Cabinet` / `Кабинет клиента` notice.
   It explains that access is through the client's private individual link; it
   offers the existing contact channel for a missing link. It must not link to
   `/admin`, invent a public Cabinet destination, add registration, or alter
   authentication and authorization.

## Boundaries

- Existing `/admin`, private client-link routes, sessions, authorization, and
  security logic remain unchanged.
- No public accounts, passwords, sign-in forms, registration, or generic
  Cabinet URL are created.
- The supplied image becomes a version-controlled public asset; no generated
  or substituted imagery is used.

## Verification

- Add focused automated coverage for the About route/content and mobile
  navigation where the existing test setup permits.
- Run the applicable existing tests, lint, and production build.
- Inspect `/en/about` and `/ru/about` at desktop and mobile widths. Confirm
  full language-specific biography, photo framing, five-item navigation,
  About-to-About language switching, metadata/canonical/hreflang, valid
  Explore links, and absence of public/private Cabinet regressions.
