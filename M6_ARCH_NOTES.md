# M6 arched preview refinement — 7 Oct

Dev: https://giant-platypus-592.convex.site

## Implemented choices
- Shallow arch with the central card highest and side cards lowered/tilted. Continuous right-to-left motion, gaps, attached labels, hover pause and individual lift remain.
- Priya = text; Ananya = voice; Meera = video and matching before/after identity. Three distinct aliases across four format cards; the matching character keeps one name.
- Visible and accessible “fictional” replaced with “Demo” or “Example previews”. Asset filenames retain their existing names.
- Engrace 2 Owners is the group name. Trailing text copied exactly as requested, including its unfinished ending “about”. No other private screenshot data copied.
- Exact copy additions recorded in DESIGN before editing the page. No new product behavior or later milestone.

## Proof
- npm run check: exit 0; actual output in M6_ARCH_CHECK_OUTPUT.txt.
- npm run test:landing: 3 passed (12.3s); actual output in M6_ARCH_BROWSER_OUTPUT.txt. Checks run against live dev: direct chat link, phone/desktop overflow, privacy, arc geometry, client aliases, no visible “fictional”, playback/pause/swipe behavior.
- Static dev upload succeeded: M6_ARCH_DEPLOY_OUTPUT.txt.
- M6_LANDING_390.png captured and visually inspected.
- Backend unchanged in this refinement; previously 113 mocked backend tests passed, output M6_CARD_FIX_TEST_OUTPUT.txt. No new AI or provider calls.

## BLOCKED / still needed
- Actual talking-to-camera testimonial and before/after photographs of the same woman are not supplied. Current video is explicitly “Animated photo with synthetic voice”; it is not a speaking-person recording. No video-generation capability is available in this session.
- A 5–10 kg result cannot be established from appearance. Need the person's confirmed result and publishable media; do not fabricate customer proof. Before/after remains [COPY NEEDED: approved before/after example].
- Mobile-data access report remains unresolved; browser success on this computer does not prove the user's carrier works.
- Missing copy remains: pause carousel, resume carousel, landing chat link unavailable. Those use existing [COPY NEEDED: ...] placeholders.

## How to test this yourself
1. Open https://giant-platypus-592.convex.site on a computer and refresh. Watch the cards move right to left: center higher, sides lower/tilted. Hover a card: motion pauses and only that card lifts. Fail: straight horizontal lineup or every card lifts together.
2. Hover the voice/video card. Playback starts, or a visible Tap to play/Tap for sound control lets you start it. Move away: playback stops. Demo labels remain; no “fictional” wording. Fail: broken playback, sound continues after leaving, or a demo represented as a genuine recording. The current video is an animated photo, so it does not yet satisfy the requested speaking-video replacement.
3. Scroll to the group preview: Engrace 2 Owners, Priya's review, emoji reactions, and a partial Ananya message ending “PDR agency about”. Fail: missing group name, old copy placeholder or missing reactions/trailing message.
4. On your phone, turn off Wi-Fi, open the same URL, and tap Paste one review. Expected: page loads and WhatsApp opens the agent chat with Hi ready to send. Fail: page doesn't load or wrong/missing chat opens. Capture the exact error if this still fails.

If any step fails, send me: the step number, a screenshot, your browser and whether Wi-Fi was on; for playback include whether you tapped Play, and for mobile-data loading copy the exact error.

No commit, push or production deployment. Actual media replacement still requires supplied assets.
