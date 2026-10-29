# Holistic House: screenshot-driven UI work

When the owner provides a screenshot, reference image, Figma export, or mockup and asks to create, rebuild, redesign, or correct any page, **read and follow .agents/skills/visual-to-code-pro/SKILL.md before changing UI code**. Use its reference specification, preserve working APIs/auth/data, perform rendered screenshot comparison, and never call CSS/unit tests alone a visual match.

The canonical website is https://holistichouse.vercel.app. The GitHub default branch codex/bootstrap-books is **not** automatically production. Production previously used codex/public-book-library: verify Vercel project, source branch, READY deployment, SHA and canonical domain every time.

Keep existing pages/components instead of adding duplicates. Preserve EN/RU/ES routes, signed-in navigation, private data, CSP nonce, CRM, protected media, real service IDs, consent and existing E2E contracts. Never claim real delivery, booking, payment, OAuth, or photo upload from a mock, a screenshot, HTTP 200 or CI alone. Use synthetic screenshots in public artifacts and respect privacy.
