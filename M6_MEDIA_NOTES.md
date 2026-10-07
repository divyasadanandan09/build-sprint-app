# M6 demo image and conversation update — 7 Oct

Dev: https://giant-platypus-592.convex.site

## Changes and choices
- Headline exactly: Turn client testimonials into new enquiries.
- Ananya: Can someone recommend a good pediatrician nearby?
- Group header exactly Engrace 2 Owners, with the Example previews subtitle removed. Hero retains Example previews; generated media retain Demo descriptions.
- Third message from preview alias Kavya quotes Priya and asks: @Mayuri, what are your batch timings? This is a composed illustration, not a monitored group or real enquiry.
- Generated the before/after demo using the existing avatar as a reference. Same character, clothing, room, daylight and camera; modest body-shape difference. No numeric weight claim. The slot says Before / After / Demo / AI-generated illustration.
- Image generated with the built-in image-generation tool; copied to public/images/meera-before-after-demo.jpg. Original PNG preserved under Codex generated_images. Full prompt: design/meera-before-after-prompt.txt. One generation call this update; M6 total two image calls. No OpenAI drafting, Sarvam or WhatsApp provider calls.
- Taller carousel accommodates the photo card; group scene accommodates all three messages. Phone card does not overlap the caption.
- DESIGN exact words updated before UI. The owner explicitly authorized a generated demo; the earlier real-before/after-assets blocker is resolved for the illustrative slot. Product's rule against inventing client results still applies to genuine drafts and claims.

## Proof
- npm run check exit 0, actual output M6_MEDIA_CHECK_OUTPUT.txt.
- npm run test:landing: 3 passed (10.4s), actual live browser output M6_MEDIA_BROWSER_OUTPUT.txt checks chat link, 390px/desktop overflow, group text/reply visibility, photo decoding, arc geometry, playback, pause, touch swipe and privacy.
- Dev upload succeeded, actual output M6_MEDIA_DEPLOY_OUTPUT.txt.
- M6_LANDING_390.png and M6_BEFORE_AFTER_390.png captured and visually inspected.
- Backend unchanged; earlier 113 mocked backend tests remain the last backend verification, M6_CARD_FIX_TEST_OUTPUT.txt.

## BLOCKED
- Talking-avatar video: this session has image generation but no video-generation capability. The current MP4 plays but is a panning still with synthetic voice; it does not satisfy the requested avatar speaking directly to the camera. Its accurate description remains on the card. Need a generated talking clip from a connected video tool or a supplied clip; no external service/account silently added.
- Mobile-data page issue remains unverified on the owner's carrier.
- Remaining missing copy: landing chat link unavailable, pause carousel, resume carousel. Existing COPY NEEDED markers remain. The before/after placeholder is removed.

## How to test this yourself
1. Open https://giant-platypus-592.convex.site and refresh. Expect Turn client testimonials into new enquiries. Fail: older headline.
2. Watch the moving cards or swipe left twice on your phone from the initial text card. Expect Meera's two-panel Before/After image, Demo and AI-generated illustration. Fail: placeholder, missing image or cropped feet/labels.
3. Scroll to Engrace 2 Owners. Expect no subtitle under its name; Priya's review and reactions, Ananya's pediatrician question, then Kavya quoting Priya and tagging @Mayuri for batch timings. Fail: older PDR text, missing reply or cut-off message.
4. On a computer hover the voice/video card, tapping Play or Tap for sound if prompted. Expect playback and stop when you move away. Fail: nothing plays or sound continues after leaving. The current panning-photo video is explicitly still pending replacement by a talking avatar.
5. Turn off Wi-Fi on your phone, open the same URL and tap Paste one review. Expect WhatsApp opens the agent chat with Hi ready. Fail: loading error or wrong/missing chat.

If any step fails, send me: the step number, screenshot, exact error and whether Wi-Fi was on; for playback say whether you pressed Play.

No commit, push or production deployment. Next required asset is a genuine talking-avatar video clip.
