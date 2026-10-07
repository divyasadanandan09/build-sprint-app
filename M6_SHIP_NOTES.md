# M6 production release

Owner approved phone UI and instructed proceeding with M6. Scope is approved M5 follow-ups and M6 landing page; no M7 or new feature.

Pre-release proof: npm run check exit0 (M6_SHIP_CHECK_OUTPUT.txt), npm test113 passed across6 files (M6_SHIP_TEST_OUTPUT.txt). Current dev UI already has3 passing live browser checks. Actual provider-secret comparison found no keys in94 candidate files.

WHATSAPP_AGENT_NUMBER configured in Convex production from the existing dev assistant number after verifying dev/prod WhatsApp phone IDs match. No provider keys copied or written to files. Existing API keys present. APP_TIMING_MODE production is not dev; nudge-template gate stays disabled. Meta webhook remains on dev; this release does not change subscription or webhook configuration.

Remaining limitations: generated-demo video is an animated photo, not a talking avatar; page pause/resume/link-error copy gaps remain; approved nudge/follow-up templates and fresh-number/mobile-data owner checks still needed. These do not block shipping the currently approved landing page. No real AI/provider sends in this release check.

Production target: https://agreeable-walrus-235.convex.site. Deploy uses npm run deploy; git push never deploys by itself. Approved code saved/pushed as d3c7955. npm run deploy succeeded after rerunning in an interactive terminal and confirming the already-authorized production prompt. Backend schema validation passed and static files were uploaded. Initial non-interactive attempt is preserved in M6_SHIP_DEPLOY_OUTPUT.txt; successful terminal output (formatting/spinners stripped; one returned chunk was truncated) is M6_SHIP_DEPLOY_SUCCESS.txt.


## Production proof
- npm test: Test Files6 passed(6), Tests113 passed(113), duration6.63s. M6_SHIP_TEST_OUTPUT.txt. WhatsApp, OpenAI and Sarvam mocked.
- npm run check: exit0, M6_SHIP_CHECK_OUTPUT.txt.
- LANDING_TEST_URL=https://agreeable-walrus-235.convex.site npm run test:landing:3 passed(20.3s), M6_SHIP_BROWSER_OUTPUT.txt. Direct WhatsApp Hi link, no JavaScript errors, phone touch/swipe/dots/expansion, gaps/240px width, reduced-motion Play override, no-script visibility, equal compact group layout, desktop arch/hover/media and privacy all pass against production.
- M6_SHIP_HTTP_OUTPUT.txt: /200, /landing-config200 with direct Hi link, /privacy200 identical to existing policy, unauthenticated /whatsapp GET403 and unknown page404. No secrets/phone numbers printed.
- M6_LANDING_390.png and M6_BEFORE_AFTER_390.png captured against production; landing screenshot visually inspected. Browser emulation is not physical iPhone handoff or carrier proof.
- No new AI, WhatsApp or Sarvam calls in release verification. M6 image-generation total remains2.

## Choices
1. Ship the owner-approved current design and earlier confirmed follow-ups together; no new feature/milestone.
2. Configure only production WHATSAPP_AGENT_NUMBER from validated existing dev public number; keep credentials in Convex.
3. Leave Meta webhook and template gates unchanged. Production page opens the same agent chat that the owner tested; incoming Meta messages still go to the existing dev webhook. Moving that webhook is a separate launch step.
4. Keep labelled generated demos. The video is a photo animation with synthetic voice, not the requested talking avatar.
5. Keep exact missing-copy markers rather than inventing words. Page gaps: [COPY NEEDED: pause testimonial carousel], [COPY NEEDED: resume testimonial carousel], [COPY NEEDED: landing chat link unavailable]. Earlier WhatsApp copy gaps remain listed in milestone notes.
6. Strip only trailing whitespace from committed proof text; preserve result text and failed-deploy evidence.

## Product/design disagreements
No new disagreement introduced in M6. Phone/desktop layout and wording refinements are documented as approved replacements in DESIGN. Reduce Motion initially pauses animation; owner-authorized Play overrides it.

## How to test this yourself
1. On your iPhone turn off Wi-Fi, open Chrome and open https://agreeable-walrus-235.convex.site. Expect Turn client testimonials into new enquiries., the lime Paste one review. button and the smaller separated arch cards. Fail: blank page, old headline, broken images or sideways page scrolling. This checks the previously unresolved carrier issue.
2. With Reduce Motion still on, tap the round Play icon above the cards. Expect cards move left; tap a card to pause/expand it, then tap again to resume. Fail: no movement after Play, no pause/expansion or disappearing cards.
3. Scroll down to Engrace 2 Owners. Expect Priya's complete review/reactions, Kavya's batch-timings enquiry and a cropped Ananya question, with no floating handwritten overlay. Fail: clipped main review/enquiry or old long scene.
4. Tap Paste one review. Expect WhatsApp opens the existing assistant chat with Hi ready to send. Fail: missing/wrong chat or no Hi. This last app handoff needs your phone; browser proof verifies the outgoing URL only.
5. Back on the page, tap Privacy policy at the bottom. Expect the exact policy already approved, including Voice notes are deleted once transcribed. Fail: missing page or different policy.

If any step fails, send me: the step number, a screenshot or screen recording, whether Wi-Fi was off, and any exact error shown.

Next: physical production-link/mobile-data check before sharing with Mayuri. No next feature started.
