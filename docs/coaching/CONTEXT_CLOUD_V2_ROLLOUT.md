# Context Cloud v2 rollout

Apply the protected migration before serving the consent endpoint. Keep
`HH_COACH_CONTEXT_ENABLED` off until the database integration and authenticated
review, grant, and revoke flows have passed. Turning the flag off stops model
context sharing and new grants. Existing permissions can still be revoked.

For each approved provider, configure its policy label and all three localized
data-handling notices. For Groq, use `HH_COACH_CONTEXT_GROQ_POLICY` and
`HH_COACH_CONTEXT_GROQ_NOTICE_EN`, `HH_COACH_CONTEXT_GROQ_NOTICE_RU`, and
`HH_COACH_CONTEXT_GROQ_NOTICE_ES`. The other recipient prefixes are
`GEMINI_FREE`, `GEMINI_PAID`, and `OPENROUTER`. Use notices that describe
the actual provider retention and training terms for the configured service.
Changing any notice or the label invalidates consent for that provider.

Release acceptance requires two isolated accounts and synthetic Life Plan
items. Verify approve and revoke through My Context, confirm the next typed and
spoken turns reflect the decision, and repeat after changing the source
revision or switching providers. Test cancellation during voice context lookup
and after the stream begins. Verify the final merged SHA on the canonical
production alias through the existing hourly publisher.

The consent ledger stores account-scoped decisions and source revision
references. Life Plan text remains in its existing encrypted store. Account
deletion cascades to ledger records. Revocation stops future use and cannot
recall content already sent to an external processor.
