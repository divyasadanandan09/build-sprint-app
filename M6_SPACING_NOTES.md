# M6 smaller phone cards and motion controls — 7 Oct

Dev: https://giant-platypus-592.convex.site

## Cause
Owner confirmed iPhone Reduce Motion is enabled. Existing carousel correctly respected it, but its pause icon only reflected manual pause and incorrectly showed Pause while settings stopped motion. Play only toggled manual pause, so it could not override Reduce Motion. Hover handlers also accepted non-touch events without checking device hover support; the latter was a potential mobile pause issue, not a proven cause on this phone.

## Choices/fix
- Keep Reduce Motion respected on first load. Show Play while settings pause motion. Explicitly tapping Play allows movement without changing iPhone settings. When the preference changes, reset the override.
- Accept hover only when the device reports a hover-capable fine pointer. Touch clears stale hover. Desktop retains hover pause/expansion.
- Phone cards max240px (was280), padding16px, readable14/20px review text, smaller media previews. Space their centers by card width+38px so the normal arch has visible gaps instead of overlap. Selected card still centers/expands.
- Phone canvas390px (was420). Shared compact second fold unchanged.
- Exact behavior recorded in DESIGN; no new visible copy. Existing missing copy stays carousel pause/resume and chat link failure. No backend/provider/AI changes.

## Proof
- npm run check exit0, M6_SPACING_CHECK_OUTPUT.txt.
- npm run test:landing: 3 passed (27.4s), actual output M6_SPACING_BROWSER_OUTPUT.txt. Includes240px max card width, gaps >15px in the normal phone arch, native touch input, tap expansion, continuous movement, Reduce Motion pause icon and explicit Play producing movement with the setting still enabled, no-script visibility, desktop/media/privacy/chat regression.
- Dev upload succeeded: M6_SPACING_DEPLOY_OUTPUT.txt.
- M6_LANDING_390.png visually inspected; before/after390px screenshot updated too.
- Browser touch emulation is not a physical iPhone/WebKit test; owner phone recheck pending. Talking-avatar asset and mobile-data loading check remain open from earlier notes.

## How to test this yourself
1. In iPhone Chrome open https://giant-platypus-592.convex.site and refresh. Expect smaller, separated cards and a round Play icon above them while Reduce Motion is on. Fail: old large overlapping cards or Pause icon with no user-initiated pause.
2. Tap the round Play icon. Expect cards move left even with Reduce Motion still on. Fail: nothing moves.
3. Tap a testimonial. Expect it expands and motion pauses. Tap again or use Play: movement resumes. Fail: no pause/expansion or Play does not resume.

If any step fails, send me: the step number and a short screen recording showing the control you tapped; include whether Reduce Motion is still on.

No commit/push/production deploy. PROGRESS updated; wait for owner confirmation.
