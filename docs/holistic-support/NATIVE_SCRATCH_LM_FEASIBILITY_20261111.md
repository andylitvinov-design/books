# Holistic Native AI — scratch language-model feasibility (no spend)

**Issue:** https://github.com/andylitvinov-design/books/issues/4367  
**Scope:** NAI-012 research. **Decision:** research only; no GPU, paid inference or hosting authorization.

Native Secretary #4361 trains first-party statistical intent weights from 364 original RU/EN/ES examples on the project's server. It is **not** a generative LLM and its quality is not independently established. A neural language model from scratch needs fully random initial weights and a lawful corpus orders of magnitude larger than these examples.

**Independence:** No external language-model inference API is necessary for the target. The model must not run on the owner's computer or visitors' devices. Vercel and any separately controlled server still depend on underlying providers/network hardware; physical independence from all third-party IPs is unrealistic. Third-party research code/architecture needs license review. Do not download, fine-tune or rebrand other vendors' pretrained model weights.

## Research gates (not production authorization)
1. **G0 lawful data:** inventory original fictional dialogues and licensable public data; prove rights, deduplication, PII screening, audit, deletion and retention. Never train on clinical/test data or private transcripts without explicit individual consent and review.
2. **G1 tokenizer:** original reproducible byte/BPE research tokenizer, configurable 8k–16k vocabulary; RU/EN/ES and code switching; hash the artifact. Existing approved CPU only.
3. **G2 toy scratch network:** small decoder-only neural network with all parameters randomly initialized, e.g. 1M–10M experimental weights to prove next-token loss decrease, not human-level conversation. No paid GPU.
4. **G3 compute/cost:** obtain current validated quotes for training tokens, accelerator hours, storage, checkpoints, inference concurrency and jurisdiction. Compute cost formula: billed GPU-hours × quoted rate + storage + egress + security/QA time, plus sensitivity analysis and hard stop ceiling.
5. **G4 explicit budget approval:** only after owner-approved data rights, privacy, hosting and budget may larger 10M–100M+ parameter experiments run; sizes are hypotheses, not quality guarantees.
6. **G5 production acceptance:** a neural realizer, if demonstrated useful, stays behind ONE trusted Native cognitive controller; identity, safety, consent, verified facts, bookings and payments never delegated to raw generation. Blind human quality comparison, critical safety suite, isolation, rollback and server-side smoke required.

**No-Go today:** no approved large multilingual corpus, independent quality demonstration or consented GPU budget. Continue improving the non-generative context-aware secretary and QA instead. No new server, token, scheduled job, dataset collection or spending is authorized by this document. Personas remain style-only.