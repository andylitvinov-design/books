# One modern test picker for public and account entrypoints

The public `/[locale]/client` page and the My tests **Open test filters** action use the same `TestExplorer` engine and the same modern topic/problem/recommendation presentation. The component's historical `SimpleTestPicker` name does not represent a separate catalog or filtering implementation.

## Account behavior

- Start with an empty pending selection. No suggested battery is silently saved.
- The account action is **Add selected tests** / **Добавить выбранные тесты**. It uses the existing `appendActive` server transaction. Existing tests, saved answers, progress and results remain unchanged.
- Show stored selection preferences when reopening the account picker. Category links retain their category-specific focus; Wu Xing retains its area filter.
- Switching to the detailed catalog and Back preserves selected tests and filters, including measured-scale filters. Resetting filters does not clear explicitly selected tests.
- Back to My tests hides the same mounted picker. Reopening it restores the unsaved selection. A confirmed plan revision creates a fresh pending selection using the saved preferences.
- Course-origin links (`course=1`) keep the return-to-course contract introduced by PR #393. Account selection remains explicit even outside the course.
- Account copy does not ask an already signed-in user to sign in again. The public sign-in/selection handoff is unchanged.

## Verification

- `tests/account-modern-test-picker.test.mjs` checks shared presentation, explicit selection, additive saving, category preferences and preservation across view changes.
- `scripts/verify-account-test-picker.mjs` uses the isolated synthetic browser environment. It exercises the actual dashboard button, keyboard opening, EN/RU, 320/390/1280px layouts, filter/reset, detailed-catalog Back, dashboard Back/reopen, additive save, stored filter reload and category entrypoints. It asserts preservation of earlier plan items, saved answers and result IDs.
- Existing public picker and account test-plan tests remain required.

This change introduces no database schema, role, credential, browser persistence store or personal-data export.
