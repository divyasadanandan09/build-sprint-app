# M6 shared scene and phone arch — 7 Oct

Dev: https://giant-platypus-592.convex.site

## Choices
- Remove only the handwritten photo/chat overlay a neighbour's word. The section heading keeps its existing words and marker.
- One compact second-fold composition on both screen sizes: same message order, same font sizes and bubble styling; Priya/reactions, Kavya's enquiry quoting Priya by name, cropped Ananya preview. Only outer width/padding adapts.
- Phone hero restores continuous arched motion. Side cards overlap the center slightly because phone width is limited. Center remains readable; side cards sit lower and tilt. Desktop arch/hover spacing retained.
- Phone transforms use 2D translation/rotation/scale, without desktop perspective. The prior iPhone blank rendering was not reproduced; this avoids that previous reliance without claiming a proven WebKit root cause.
- Progressive enhancement: normal in-flow native card row is the fallback if scripts fail; add has-arch only once carousel setup completes. First card remains visible in no-script browser check.
- Hover pauses/expands on desktop. Phone tap pauses, centers and expands one card; second tap resumes. Swipe and dot controls choose cards. Vertical gestures remain page scroll. Touch buttons retain44px targets. Reduced Motion stops automatic animation but does not disable selection.
- Exact design update in DESIGN. No new visible wording or PRODUCT/DESIGN behavior conflict. No backend changes, no AI/provider calls.

## Proof
- npm run check exit0: M6_SHARED_CHECK_OUTPUT.txt.
- npm run test:landing: 3 passed (20.0s), actual output M6_SHARED_BROWSER_OUTPUT.txt. Live dev tests include continuous phone position movement, actual touch swipe/tap, selected card expansion, no-script visibility, dot selection, equal compact chat layout at390px/1440px, overlay absent, no sideways page scroll, chat URL, privacy and desktop hover/media regression.
- Static dev upload success: M6_SHARED_DEPLOY_OUTPUT.txt.
- M6_LANDING_390.png updated and visually inspected; M6_BEFORE_AFTER_390.png updated. No desktop screenshots captured.
- Chrome mobile/touch emulation is not a physical iPhone/WebKit test. Owner iPhone Chrome confirmation pending.

## Remaining limitations
- Talking-avatar video still requires a video-generation capability or supplied clip. Current MP4 is accurately labelled animated photo with synthetic voice.
- Mobile-data access failure remains an owner phone check.
- Existing missing copy: carousel pause, carousel resume, chat link unavailable. No new placeholders introduced.

## How to test this yourself
1. Open https://giant-platypus-592.convex.site in iPhone Chrome and refresh. Expect the central testimonial with tilted/lower cards on both sides, moving left automatically. If Reduce Motion is on, expect a stationary arch you can still navigate. Fail: blank area, flat swipe row or disappearing cards.
2. Tap a testimonial. Expect movement to pause and that one card to center/enlarge. Tap it again to resume; swipe or tap dots to change cards. Fail: every card expands, nothing pauses, cards become unreadable or vertical page scrolling stops working.
3. Open the same URL on a computer. Hover a card: only that card expands and the track pauses. Move away: movement resumes. Fail: all cards expand or motion does not resume.
4. Scroll to Engrace 2 Owners on both devices. Expect the same compact Priya/Kavya/trailing-Ananya layout, with no handwritten label floating over the chat. Fail: different full-length desktop chat, remaining overlay or clipped main recommendation/enquiry.

If any step fails, send me: the step number, a screenshot or screen recording and whether you tested on iPhone Chrome or desktop; include whether Reduce Motion is enabled.

PROGRESS updated; no commit/push/production deployment or next milestone. Waiting for owner phone confirmation.
