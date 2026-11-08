# Telegram RU/EN Menu: first free-text question consent

Post-LIVE regression discovered after PR #3928: menu explicitly invites a free text question, but a Companion session in menu state returned handled:false and public diagnostic silently dropped this text until its own explicit /start hhreview_* was used. This is a real UX no-reply bug.

For a signed customer free-text message in menu mode, the same CRM Companion now sends the existing AI consent prompt with existing message-attached allowlisted buttons. The message is not stored or sent to external models; after explicit opt-in the existing local rules-based AI responds to further questions. Previously consented users receive a response immediately. Immediate-danger content receives existing urgent guidance without waiting for AI consent. STOP/natural stop, diagnostic, direct practitioner, photo/callback, rate limit and user suppression remain higher priority; no marketing or daily auto-enrollment. No Spanish added to new menu.

Small independent correctness follow-up: no new provider, webhook, migration, storage, credential, cron, API cost or unsolicited push. Full protected CI, Vercel exact READY deployment and real customer Telegram button/reply/STOP smoke still required.
