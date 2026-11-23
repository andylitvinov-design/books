# Samir conversational opening · 2026-11-23

Canonical screen: `/{en|ru|es}/app/messages?section=ai`, first conversation, guest and signed-in.

Approved source: owner-supplied cinematic Samir WhatsApp-like dialogue mockup (not the older homepage card design).

Implementation: change the existing `MessengerAiLanding` inside `HolisticAgentChat` without creating a second assistant. The default existing presenter ID `alex` now displays as Samir and reuses the approved genie poster and **same voice backend**; the other three presenters and all storage IDs remain. First screen contains header, genuine text bubble, goal-discovery and already-have-a-goal actions, real Free/Pro composer, microphone, and optional collapsed topic menu. It retains current secure chat/history, consent, menu, persona audio, EN/RU/ES, and video intro (in explicit expanded menu). One existing app dock only.

Release checks: Core/Specialist, TS/Next, real Chromium/WebKit 320/354/390/430 CSS px (same route/state as reference), keyboard, controls, handoff with existing homepage text, Gemini consent path and voice interruption. Overlap with open microphone PRs #5466/#5447 must be reconciled before protected merge. Zero additional paid builds/services. LIVE only after existing hourly publisher and canonical alias+SHA acceptance.
