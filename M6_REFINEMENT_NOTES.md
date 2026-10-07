# M6 — Moving previews and society-group scene

Live dev page: https://giant-platypus-592.convex.site

Owner requested right-to-left automatic movement for the four media types, pause/zoom-out on hover, top-right type captions, and a society-group thread in the second section. Built only those refinements, alongside the requested M5 answer-correction fix. No commit, push or production deploy.

## Proof

- `npm run check`: backend/frontend compile pass, M6_REFINEMENT_CHECK_OUTPUT.txt.
- `npm run test:landing`: `3 passed (8.9s)` against the live dev page in installed Chrome; actual output M6_REFINEMENT_BROWSER_OUTPUT.txt. The new check verifies movement to the left, a frozen card transform on hover, computed zoom scale 0.9, touch pause/resume and reduced-motion stop. Existing checks cover the direct Hi link, no horizontal scrolling at 390px/1440px, the image, visible group preview and /privacy.
- Inspected the updated full-page 390px screenshot, M6_LANDING_390.png.
- Dev build/backend/static upload pass: M6_REFINEMENT_DEPLOY_OUTPUT.txt.
- Mobile-data report remains OPEN. Public page/config/privacy/image returned 200 from the Mac. A fresh Chrome session with 400ms latency and 64KB/sec download showed the headline at 1.7 seconds and ready chat link at 2.2 seconds; actual output M6_MOBILE_NETWORK_DIAGNOSTIC.txt. This simulated slow connection uses the Mac network; it cannot prove the owner's mobile carrier works. Awaiting the exact error/blank-page description; no cause or fix is claimed yet.
- Meta status now CONNECTED, and the landing number matches the current configured Meta number. Owner's screenshot confirms real WhatsApp questions/replies. The earlier ban is resolved; new flow checks still need owner confirmation.
- No new image generation, OpenAI, Sarvam or WhatsApp send calls in this refinement. Tests mock external providers.

## Choices / DESIGN change

1. Four evenly spaced coverflow cards cycle continuously right to left, six seconds between neighbouring cards, with a seamless wrap. The owner request supersedes DESIGN's former fixed layout/initial entry animation; recorded in DESIGN.md.
2. Hover/focus pauses the track and zooms it to 90%. Touch toggles pause/resume. An icon control holds a pause independently; reduced-motion disables autoplay. Media content remains decorative illustrative previews, not fake playable customer recordings.
3. Captions reuse DESIGN's exact media names: before/after photo, text message, voice note, short video. No new explanatory marketing words are invented.
4. Put the approved fictional recommendation into a generic society-group header/thread on the existing photo. No actual group data, new neighbour replies, WhatsApp logo or copied WhatsApp interface. This retains DESIGN's generic chat style and PRODUCT's prohibition on reading/posting to real groups.
5. Reuse the generated photo; keep the before/after result placeholder. Do not invent a fitness transformation or customer proof.

## New missing copy

- `[COPY NEEDED: society group name]`
- `[COPY NEEDED: pause testimonial carousel]`
- `[COPY NEEDED: resume testimonial carousel]`

The pause/resume placeholders are accessible names for the icon button. Previous M6 placeholders remain in M6_NOTES.md; the two new M5 placeholders are in M5_STATUS_CHANGE_NOTES.md.

## How to test this yourself

1. On your phone or Mac open `https://giant-platypus-592.convex.site` and refresh it. Expect the four types of cards to move right to left and the top-right caption to change as each type reaches the middle. Fail: no movement (unless your device has Reduce Motion enabled), movement in the wrong direction or sideways page scrolling.
2. On your Mac move the pointer over the cards. Expect them to stop and become slightly smaller. Move away: expect movement to resume. On your phone tap the cards to pause, then tap again to resume. Fail: continued movement while paused, no zoom-out, or no resume. The round pause icon can hold a pause; tap it again to release it, then move away from the carousel.
3. Scroll to the next section. Expect Priya's example inside a society-group header/thread over the photo. The group-name COPY NEEDED placeholder is expected until wording is approved. Fail: missing group header, cropped message words or an actual-looking invented neighbour reply.
4. Open Terminal and run `npm --prefix /Users/divyaabhilash/build-sprint-app run test:landing`. Expect `3 passed`. Fail: a failed test or command error.
5. For the mobile-data problem, open the same address with Wi-Fi off and note the exact browser error or whether the page remains blank. Working on Wi-Fi is enough for checking these new visuals today; mobile-data access is still an unresolved release check. Fail: the page still won't open on mobile data. Copy the error and carrier name back; don't assume this is fixed from the Mac checks.

If any step fails, send me: the step number, page address, screenshot or exact browser error, carrier name for the mobile-data failure, and full failed Terminal output if relevant. Never send an API key.
