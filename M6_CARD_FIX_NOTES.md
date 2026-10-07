# M6 — Card hover, fictional media and page copy

Dev page: https://giant-platypus-592.convex.site

The owner confirmed chat follow-ups work and requested landing-page corrections. The owner explicitly authorized rewritten marketing copy and clearly labelled made-up audio/video demos. These refinements are on dev only; no commit, push or production deploy.

## Causes and resulting behavior

The card width was 330px with only 265px between centers, which made adjacent cards overlap. The whole-track hover rule scaled the carousel to 90%, rather than lifting one selected card. A single outside caption identified the active card but did not move with its card. The apparent video/audio controls were decorative previews, not playable media.

Centers now have more space (350px desktop, 300px mobile). Hover freezes the track, straightens and lifts only the selected card to 106%, and preserves other card scales. On narrow screens, the selected card is kept inside the screen. Each media-type caption is now handwritten just above its own card's top-right corner, with dark text and lime marker strokes. The icon control can hold a pause, keyboard focus can select cards, touch can select/deselect, and horizontal swipe moves one card even when Reduce Motion stops autoplay.

The second section uses an original chat-pattern background and generic group header, the approved fictional Priya recommendation centered in a bubble, illustrative emoji reactions, and a cropped following preview. No real group names, numbers, messages or profile photos from the reference were copied into the repo or page.

## Copy

New words were recorded in DESIGN.md before being put on the page, under the owner's explicit request to rewrite:

- Headline: **Turn happy clients' words into local enquiries.**
- Introduction: **Know who to ask, and when. We help turn their feedback into a recommendation they can share in their society group, so more neighbours hear about your classes from someone they trust.**
- Step 1: **Ask the right client at the right time.** / **We tell you who to check in with and draft the message for you.**
- Step 2: **Let clients share in their own way.** / **A text, a voice note, a photo or a video. They choose what feels natural to share in their society group.**
- Step 3: **Give neighbours a reason to enquire.** / **A neighbour's recommendation builds trust in your classes and helps others picture joining.**

The headline makes local enquiries explicit without promising a number of new customers. The steps describe who/when, the client's choice of sharing format, then the reason a neighbour might enquire.

## Media / choices

1. Use the owner's approved fictional-demo option. No real customer recording, voice clone or new claim was used. Audio is macOS synthetic speech of the existing approved music/session example; video is an animated generated photo with the same synthetic voice. Both are labelled **Fictional demo**, and video also says **Animated photo with synthetic voice**. The scene is labelled **Fictional examples**.
2. Reuse the previous generated fictional photo and existing local FFmpeg tool. Outputs: public/media/fictional-voice-note.mp3 (~46KB), public/media/fictional-video.mp4 (~183KB). No new package, API key, hosting service or paid AI call is needed. Media is loaded on demand.
3. Attempt audible hover playback. If video sound is blocked, start it muted and show **Tap for sound**; a click enables sound. Audio-only playback shows **Tap to play** when blocked. Browser rules prevent guaranteeing audible hover autoplay in every fresh tab: https://developer.chrome.com/blog/autoplay/ .
4. Stop and reset the previous clip on another selection, pointer exit, keyboard exit, hidden page, lost window focus or leaving the carousel's visible area. Guard delayed play promises so an old clip cannot start after selection changes.
5. Use black handwritten labels with lime strokes. DESIGN forbids lime text on the light page because contrast is too low; this keeps the requested lime annotation treatment readable.
6. Keep the reference's structure, not its real people's data or an exact WhatsApp skin. Preserve the existing palette, original doodle pattern, public privacy route and direct Hi chat link. Emoji reactions/counts are illustrative, not tracked real reactions.
7. Keep explicit placeholders where no words/assets were supplied, including a before/after result instead of fabricating a fitness transformation.

## PRODUCT / DESIGN boundaries

- The owner request supersedes the previous whole-track zoom, detached caption and earlier hero/step wording; DESIGN now records the replacement.
- PRODUCT's assistant intake supports text and voice, not image/video processing. The new step 2 describes formats clients can post in their own society group; no new agent image/video intake or group access was built or advertised.
- A lime-only text caption on the light background conflicts with DESIGN's contrast rule. Use dark text and lime marker strokes instead.

## Real proof

- `npm run check`: backend/frontend compile pass, M6_CARD_FIX_CHECK_OUTPUT.txt.
- `npm test`: `Test Files 6 passed (6)` / `Tests 113 passed (113)`, M6_CARD_FIX_TEST_OUTPUT.txt. WhatsApp, OpenAI and Sarvam remain mocked.
- `npm run test:landing`: `3 passed (11.9s)` on the live dev page, M6_CARD_FIX_BROWSER_OUTPUT.txt. It verifies the direct Hi link, mobile/desktop overflow, image/privacy/group scene, card gaps, one selected card's scale, frozen track, attached label, audio and video clocks advancing, click fallback, stopping playback, touch selection and reduced-motion swipe. A fresh tab also verifies hover video playback and the muted/unmute path when required by the browser.
- One initial browser check failed because Playwright waited for an endlessly moving card to stabilize before hovering. Fixed the test to move the real pointer to the card's current position; no forced hover or simulated play result is used.
- Dev functions/build/static upload pass: M6_CARD_FIX_DEPLOY_OUTPUT.txt and the latest M6_CARD_FIX_UPLOAD_OUTPUT.txt. Inspected updated M6_LANDING_390.png after deployment.
- Real provider calls in this refinement: zero OpenAI, zero Sarvam, zero WhatsApp sends, zero image-generation calls. M6's earlier image-generation total remains one.

## Remaining copy / assets

- `[COPY NEEDED: approved before/after example]`
- `[COPY NEEDED: society group name]`
- `[COPY NEEDED: trailing testimonial preview]`
- `[COPY NEEDED: pause testimonial carousel]` — accessible name, not visible button text.
- `[COPY NEEDED: resume testimonial carousel]` — accessible name, not visible button text.
- `[COPY NEEDED: landing chat link unavailable]` — configuration failure only.

Fictional examples replaces the earlier missing illustrative-preview label. All four reference files from the original DESIGN remain absent; the supplied screenshots were viewed in chat without saving their real group data in the repo.

## How to test this yourself

1. Open `https://giant-platypus-592.convex.site` on your Mac and refresh. Expect the new local-enquiries headline, moving separated cards and a handwritten label attached to each card. Fail: old headline, detached caption, overlapping cards or sideways page scrolling.
2. Move your pointer onto the text card. Expect the track to pause and only that card to lift. Move away: expect movement to resume. Fail: all cards shrink/lift together, the selected card stays behind another card, or movement continues while hovering. If you clicked the persistent pause icon, click it again to release it first.
3. Hover the voice card. Expect playback or **Tap to play**. If shown, click its play button and turn your Mac volume up: hear the fictional music/session review. Move away: the audio stops. Hover the video card: expect the animated photo to play. If **Tap for sound** appears, click its play button to hear the synthetic voice. Fail: no playback after a click, a broken media file, or sound continuing after leaving/selecting another card.
4. On your phone open the same address. Tap a card to lift/pause it, tap again to release it, or swipe left/right to move between cards. Expect all four examples to be reachable, including with Reduce Motion enabled. Fail: stuck selection, sideways page scrolling instead of a card change, or unreachable media.
5. Scroll to the second section and How it works. Expect the centered group message, emoji reactions and a cropped trailing preview; then steps about who/when, four sharing formats, and neighbour trust/enquiries. The listed copy placeholders are expected. Fail: missing reactions, clipped Priya text, no trailing card or the old voice-only step.
6. Open Terminal and copy `npm --prefix /Users/divyaabhilash/build-sprint-app run test:landing`. Expect **3 passed**. Then run `npm --prefix /Users/divyaabhilash/build-sprint-app test`; expect **113 passed**. Fail: any failed test or command error. Tests do not send real WhatsApp messages or AI requests.

The earlier mobile-data loading failure is still OPEN: Mac and throttled-network checks passed, but the owner's exact browser error/carrier failure is not known. No mobile-data fix or sign-off is claimed.

If any step fails, send me: the step number, page address, screenshot or exact error, your browser/device, and full failed Terminal output if relevant. For the mobile-data failure include your carrier name. Never send an API key.
