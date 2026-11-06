# Holistic House · CI 10/5/0 daytime signals — 6 November 2026

Control-plane only. Reuses the existing GitHub Watchdog 10-minute schedule, the same Actions totals and the same issue #3128 writer. No new cron, runner job, bot token, provider, subscription or mandatory-check bypass.

**Source and meaning.** Only verified in-progress workflow counts are signal thresholds, not open PR counts or individual runner jobs. An exact authenticated current Watchdog run is subtracted at most once, so its own ongoing job cannot prevent the signal from reaching zero; unrelated CI runs remain counted. When the Watchdog cannot be identified, no subtraction is assumed. The dashboard may show one more active workflow than the signal count.

**Thresholds.** First verified running >10 arms a cycle. Running 6–10 generates one bell; running 5 still belongs to level one; running 1–4 generates two bells. Running zero, queued zero and confirmed GitHub pending/waiting/requested zero generates three bells. If pending statuses are unknown or nonzero, there is no false all-done signal. A rapid jump sends only the highest reached alert. Re-arm only on a new verified >10 cycle.

**Time.** No signal between 23:00 and 08:00 America/Toronto, evaluated at both measurement and send time with DST awareness. Night crossings are recorded as suppressed and never replayed automatically in the morning. Missing, partial, future or stale data is not zero.

**Deduplication.** The current state persists inside the existing Control Tower #3128 KPI snapshot. An alert uses one existing GitHub issue comment with a bot-authored stable cycle/level marker and a direct owner mention. On comment failure it keeps the old state for safe retry; when the comment succeeded but the issue-body write failed, its marker prevents a duplicate.

**iPhone.** Sign in to GitHub Mobile as andylitvinov-design, go to Profile → Settings → Notifications and turn on Direct mentions. In iOS Settings → Notifications → GitHub enable notifications and sounds. Focus/silent mode and iOS grouping may mute or combine notifications. One/two/three bell emojis denote alert urgency; they do not guarantee one/two/three physical chimes. A native push app and iOS user permission would be needed for controlled custom audio; none is added here.

**Acceptance.** Relevant unit tests are included in the existing Watchdog contract job; no fake test event is sent to the owner's phone. Verify protected control-plane merge, the next real Watchdog run and a dated ci_daytime_signals field in #3128. The site and separate Vercel monitor are not changed by this control-plane PR.
