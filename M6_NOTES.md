# M6 — Landing page

Dev preview: https://giant-platypus-592.convex.site

Latest owner-requested copy, card behavior and fictional media supersede the initial page below; see M6_CARD_FIX_NOTES.md for current proof, choices, remaining placeholders and phone steps.

M6 was authorized while Meta reviews the disabled WhatsApp account. This page is on dev only. M5 and M6 remain uncommitted and unpushed, awaiting owner confirmation. Production has not been deployed. No later milestone or parked feature was built.

## Proof

- `npm run check`: backend and frontend TypeScript checks both pass; actual output in M6_CHECK_OUTPUT.txt.
- `npm test`: `Test Files 6 passed (6)` and `Tests 110 passed (110)`; actual output in M6_TEST_OUTPUT.txt. This includes all 105 existing mocked checks plus five landing-configuration checks. WhatsApp, OpenAI and Sarvam remain mocked; no test sends a real message or real AI request.
- `npm run test:landing`: `2 passed (6.6s)` against the live dev site in installed Chrome, with a 390×844 phone viewport and reduced motion. Actual output in M6_BROWSER_OUTPUT.txt. The button navigates directly to `wa.me/{configured agent number}?text=Hi`; the browser test intercepts and aborts that external navigation, so it does not claim a real phone handoff or delivery. The second check verifies the image, no horizontal overflow at 390px and 1440px, and the existing privacy page.
- Inspected the full-page 390px screenshot: M6_LANDING_390.png. The screenshot contains only approved fictional examples and a generated fictional person.
- `npm run deploy:dev` built, deployed backend functions and uploaded the static page successfully; actual output in M6_DEPLOY_OUTPUT.txt.
- Live HTTP checks: `/` 200, `/privacy` 200, `/landing-config` 200, `/not-a-page` 404, unsigned/invalid-signature POST `/whatsapp` 401. Actual output in M6_HTTP_OUTPUT.txt. No valid inbound message or provider send was generated.
- Real calls for M6: zero OpenAI, zero Sarvam, zero WhatsApp sends; one image-generation call, within the ten-call cap.

## Choices

1. Continue with M6 only while M5's remaining real-number confirmation is blocked by Meta. Do not commit either milestone or deploy production without confirmation.
2. Use a small Vite/TypeScript page without React: this single page has no login, dashboard or application state. Use the exact DESIGN palette and typography, locally hosted Space Grotesk/Caveat, one lime button, and reduced-motion support.
3. Follow the written coverflow, marker, photo/inset and line-art descriptions because all four reference files in `refs/` are absent. No reference screenshot match is claimed.
4. Reuse DESIGN's approved headline, introduction, fictional testimonial and “How it works” section name. Its three step captions reuse the exact three introductory sentences; the annotation reuses “a neighbour's word”. No new marketing promises or client outcomes are written.
5. Show a generated fictional everyday-life photo. The before/after card is an explicit copy-needed placeholder rather than an invented fitness result. Voice/video cards are decorative previews, not playable recordings or buttons. Sender/time/duration metadata is illustrative. The preview-label placeholder must be replaced before a public launch.
6. Keep the business number in Convex `WHATSAPP_AGENT_NUMBER`. A same-origin `/landing-config` response exposes only the public direct chat URL, never API credentials. Validate the number on the server; malformed/missing settings fail closed. Disable the button while loading and show the copy-needed error if configuration fails. No click tracking or redirect is introduced.
7. Set dev `WHATSAPP_AGENT_NUMBER` from Meta's already-configured business number, using the existing token in memory only. No key was copied into source or an artifact. No API key is missing. M6 has not configured production's `WHATSAPP_AGENT_NUMBER`; this exact setting must be configured there before an approved production deploy.
8. Add Convex static hosting in app-owned root mode so `/whatsapp` and `/privacy` stay at their exact existing addresses. Use no single-page-app fallback, so unknown paths return 404. `npm run deploy` now uses the static-hosting wrapper: build, Convex production deploy, then static upload. `npm run deploy:dev` deploys dev instead.
9. Use existing Chrome for browser proof, with no downloaded browser and no sign-in. Save two checks for the landing chat link and the page/privacy path. Phone handoff remains an owner check, not a mocked claim.

## PRODUCT / DESIGN disagreements

No new M6 behavior disagreement was found: both specify a landing page that opens the agent chat, with no login or dashboard. DESIGN's written visual requirements lack reference files and some example wording; those are missing inputs, not disagreements. PRODUCT forbids invented client claims, so the before/after example remains a placeholder rather than fabricated results. Earlier WhatsApp layout/timer corrections are already recorded in their milestone notes and are unchanged here.

## Missing copy / references

- `[COPY NEEDED: illustrative preview label]` — distinguish the fictional preview from real customer proof.
- `[COPY NEEDED: approved before/after example]` — approved example words/assets before showing any result.
- `[COPY NEEDED: landing chat link unavailable]` — shown only if the chat-link setting cannot be fetched or validated.
- Missing files: `refs/hero-coverflow.png`, `refs/highlight-marker.png`, `refs/testimonial-inset-card.png`, `refs/empty-line-art.png`.

## BLOCKED

- RESOLVED, 7 Oct at 10:24: real WhatsApp replies are working in the owner's screenshot and Meta now reports CONNECTED. The landing number matches the current Meta number. Phone handoff and the fresh-number core-flow check are still owner checks, not automatically signed off.
- OPEN: owner reports that the page did not load without Wi-Fi. Public HTTP checks and live Chrome checks pass from the Mac connection. Asked which browser error/blank state occurred; the mobile-carrier failure has not been reproduced or fixed. Do not claim mobile-data sign-off.
- The three page copy gaps need exact owner-approved words/assets before public launch. Dev deliberately shows the placeholders.
- Existing M3/M5 approved-template blocks remain; this landing page does not resolve them.

## How to test this yourself

1. On your phone, turn Wi-Fi off and open `https://giant-platypus-592.convex.site` in Safari or Chrome. Expect “Your happy clients already know your next ones.”, the “Paste one review.” button, readable example cards, a photo and “How it works”. The preview-label and before/after placeholders are expected while copy is pending. Fail: a blank page, missing photo/button, sideways scrolling or unreadable/overlapping central text.
2. Tap “Paste one review.” Expect the assistant's WhatsApp chat/link with `Hi` filled in. Tap Send on `Hi`; expect DESIGN's welcome within a minute now that Meta reports CONNECTED. Fail: a different destination, no Hi, an unavailable-link placeholder, or no welcome/error after sending.
3. Return to the page, scroll to the bottom and tap “Privacy policy”. Expect the exact policy previously approved, beginning “This WhatsApp assistant helps fitness trainers turn their clients' feedback into recommendations.” Fail: page not found, a landing-page repeat or changed policy text.
4. Open Terminal on your Mac and copy `npm --prefix /Users/divyaabhilash/build-sprint-app test`. Expect `Test Files 6 passed (6)` and `Tests 110 passed (110)`. Fail: any failed test or command error. These checks use made-up examples and do not send WhatsApp messages.
5. In Terminal copy `npm --prefix /Users/divyaabhilash/build-sprint-app run test:landing`. Expect `2 passed`, including the direct WhatsApp-link and page/privacy checks. Fail: any failed test or command error. This opens installed Chrome in the background and saves a 390px screenshot; it does not message the assistant.

If any step fails, send me: the step number, the page address, a screenshot or exact warning, and the full failed Terminal output if you ran a command. Never send an API key.
