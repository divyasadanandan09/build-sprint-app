# M6 phone carousel and compact scene — 7 Oct

Dev: https://giant-platypus-592.convex.site
Owner's browser: Chrome on iPhone.

## Finding and limits
- Old phone layout reused desktop absolute positions, 3D transforms and opacity. At 390px, side cards were outside the viewport and the carousel was 445px tall. Only the central card was readable; there was no clear native swipe row or card navigation.
- The previous tests resized desktop Chrome and simulated pointer events. They did not use a touch browser or actual native swiping, and did not prove physical iPhone visibility.
- Completely blank rendering was not reproduced on this computer. The exact iPhone rendering failure remains unconfirmed; no claim that WebKit caused it.
- Previous group scene was 790px tall. The regression check demonstrated this before deployment: Expected <=540, Received 790 (M6_PHONE_BEFORE_OUTPUT.txt).

## Choices and fix
- Desktop keeps the arch/hover/media behavior. Phones <=600px use ordinary in-flow cards with native horizontal scrolling and snap-to-card behavior. Native CSS keeps the first card visible even if JavaScript fails.
- A full center card plus a neighbouring edge and four dot controls make swiping apparent. Dot labels reuse DESIGN's format names, with 44px tap targets. No new copy placeholders.
- Auto advance every six seconds; respect reduced motion, stop on manual interaction, use the existing pause/resume button. Mobile stops desktop pointer capture so the browser owns both swipe and page scrolling.
- Track height follows the current card rather than the tallest card, with observations for media/font resizing. Live text-card carousel measured 342px instead of445px.
- Mobile group emphasizes Priya's complete recommendation/reactions, then Kavya's enquiry. The reply quote retains Priya's name without repeating the entire review. Ananya is a cropped trailing preview. Same exact approved message words; desktop retains all three full messages.
- Mobile photo becomes a shorter backdrop to the chat instead of a 790px frame. Live 390px group scene measured 482px (down308px,39%).
- DESIGN records the layout replacement. No PRODUCT/DESIGN behavior disagreement and no new trainer-facing wording.

## Proof
- npm run check: exit0; actual output M6_PHONE_CHECK_OUTPUT.txt.
- npm run test:landing: 3 passed (20.0s); actual output M6_PHONE_BROWSER_OUTPUT.txt. Live dev checks: actual Chrome touch input swipes the native row, dots choose cards, six-second auto advance, first card visible with scripts disabled, scene <=540px, phone/desktop without sideways page overflow, privacy/chat URL and desktop arch/media remain.
- Test context has phone viewport/mobile/touch settings but still uses desktop Chromium; it is not an iPhone/WebKit or physical-phone check. Owner should refresh and recheck iPhone Chrome.
- M6_LANDING_390.png captured and visually inspected; M6_BEFORE_AFTER_390.png refreshed.
- Dev upload successful: M6_PHONE_DEPLOY_OUTPUT.txt. git diff --check passes.
- Backend unchanged; latest backend evidence remains 113 mocked tests from M6_CARD_FIX_TEST_OUTPUT.txt. No real AI/provider calls.

## Still open
- Requested talking-avatar video remains unavailable; current clip is accurately labelled animated photo with synthetic voice.
- Owner's mobile-data loading failure still needs confirmation separately from this layout fix.
- Existing missing copy: pause carousel, resume carousel, landing chat link unavailable.

## How to test this yourself
1. In Chrome on your iPhone open https://giant-platypus-592.convex.site and refresh the page. Under Paste one review expect Priya's card, an edge of the next card and four dots. Fail: blank carousel or no card.
2. Swipe left across the card. Expect voice, before/after and video cards as you continue; you can tap dots instead. Fail: cards disappear, swipe does nothing, or the whole page moves sideways. If your phone allows motion, the next card appears after six seconds before you interact. If Reduce Motion is enabled, manual swiping still works.
3. Scroll to Engrace 2 Owners. Expect a shorter scene with Priya's complete words and reactions, Kavya asking @Mayuri for batch timings, and just part of Ananya's message. Fail: long full-message tower, clipped recommendation/enquiry or missing reactions.
4. Tap Paste one review. Expect WhatsApp opens the agent chat with Hi ready. Fail: wrong/missing chat.

If any step fails, send me: the step number, a screenshot or screen recording, your iPhone model and whether the problem appears after refreshing; include whether Wi-Fi was on.

PROGRESS updated; no commit, push or production deployment. Waiting for owner iPhone confirmation.
