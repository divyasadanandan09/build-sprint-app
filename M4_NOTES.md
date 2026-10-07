# M4 — Forwarded replies

Built and deployed to dev at https://giant-platypus-592.convex.site. M4 is uncommitted; phone confirmation is pending. M5 and M6 have not been started.

## Proof

- `npm run check`: TypeScript compile passed.
- `npm run test:m4`: 75 tests passed across 4 files. Full, real command output: M4_TEST_OUTPUT.txt. This includes 23 M4 checks and the existing M2/M3/Agent checks. WhatsApp, OpenAI and Sarvam are mocked in tests; no real provider calls occur in this suite.
- `npm run demo:m4`: mocked signed-webhook Kannada voice/client-selection/draft exchange, with synthetic container bytes. Real command output: M4_DEMO_OUTPUT.txt. This is explicitly a mock, not a phone exchange.
- One real Sarvam call from the deployed Convex action: generated English speech was uploaded to Meta, downloaded through the actual Meta media URL, transcribed correctly by Sarvam, then its temporary Meta media and Convex test records were deleted.
- One real OpenAI call through the deployed Agent: a made-up review returned a grounded happy recommendation with bold wording. The live command output is in M4_LIVE_CHECK_OUTPUT.txt.
- A generated, actual two-minute Ogg/Opus file split into five chunks; FFmpeg decoded every chunk successfully. The audio and verification tools stayed outside the repo. No real person's voice or feedback was used.
- Total real AI calls made by Codex for M4: 2 (one Sarvam, one OpenAI), below the milestone cap of 10.
- Required dev key names were checked without displaying values; no missing variables. These are WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, OPENAI_API_KEY and SARVAM_API_KEY.
- Final dev deploy output is in M4_DEPLOY_OUTPUT.txt. Production M4 deployment, commit and push wait for owner confirmation.

## Choices made

1. Keep M2's confirmed two draft/button messages intact. Forwarded happy replies use DESIGN 4.5's introduction followed by one combined ask/recommendation draft and Send to client button.
2. A forwarded text or any WhatsApp voice note asks whose reply it is before classification. Pasted replies can explicitly start `This is a reply: ...`. Named short/unhappy pasted reviews also enter M4, using the first classification without another AI call.
3. One active reply conversation per trainer. A new forwarded reply replaces the previous pending conversation. `This is a review: ...` explicitly starts a new M2 review, rather than answering the old client's follow-up. Greetings, client additions and Who's due? continue to work while a reply is pending.
4. The waiting-client list includes checked-in and short-reply clients. Show Yes/Someone else when there is exactly one; otherwise use a paginated list of up to nine owned clients and one next-page row. Names are shortened to Meta's 24-character list-title limit, but their IDs select the complete saved record. Page cursors stay on the server.
5. If there are no waiting clients, show the documented placeholder and accept the trainer's typed name (up to 80 characters and five words). An unknown name identifies the reply without inventing a client start date. Exact saved-name matching is used. The trainer can also type a different client's name after Someone else.
6. Allow one follow-up per client. Mark it used when its draft is created, consistent with the rule that URL-button taps cannot be observed. Keep this allowance across later replies and named reviews. A plain next text continues the active follow-up; a forwarded next reply asks whose reply it is again.
7. A second short reply gets a source-only recommendation from what's there. Do not fill gaps, translate, add outcomes or make a second model call just for rewriting. When sentiment is unclear, let the trainer choose Happy, Short reply or Not happy; use her choice without another model call.
8. An unhappy client receives only private feedback and the exact DESIGN private-response draft. Record the pause and prevent a later named review from bypassing it, including a name not yet in the client list. Unpausing remains M5.
9. Add reply conversations and typed reply drafts separately from M2's historical pending-question table. All selection, name, media and button handling is checked against the current trainer. Already-used, stale and other-trainer buttons are ignored. WhatsApp sends remain behind the existing single sendWhatsApp function.
10. Keep WhatsApp Ogg/Opus voice bytes only in action memory. Check the real container duration, reject over two minutes or over 8 MB, and reject non-voice/invalid containers. No voice files go into Convex storage. After transcription or failure, remove the temporary incoming media reference; only the transcript remains.
11. Sarvam's REST endpoint accepts under-30-second audio, so remux voice notes into at-most-29-second Ogg pieces without re-encoding; send them in order and join the transcripts in order. Use `saaras:v3`, `mode=transcribe`, `language_code=unknown`, which preserves Kannada/Hindi/English rather than translating. Official reference: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe . Check the shared 100-calls/hour allowance before each Sarvam call as well as OpenAI.
12. Limit transcripts to 2,000 characters too; use a separate placeholder when that limit is exceeded. Download only approved HTTPS Meta media hosts, reject redirects and enforce the byte cap while streaming, not only through a supplied size header.
13. Preserve the client's language and grounded claims. Use the existing paragraph/bold formatting. Keep the complete approved ask plus trainer wa.me link inside Meta's 1,024-character button-body limit by trimming complete trailing sentences; reject a single sentence that cannot fit.
14. Keys are read only from Convex environment variables. Temporary verification functions and fixtures were removed from dev before handoff; generated audio and local tools remain outside the repo. Test data is invented.

## Disagreements and missing copy

- PRODUCT forbids adding claims or offers. DESIGN 4.5's example contains an unestablished free demo and specific knee results. Those are examples, never added to an unrelated review. Only the actual client's selected words and the documented plain trainer wa.me link go in the recommendation.
- DESIGN says any voice length; AGENTS explicitly caps voice at two minutes and text at 2,000 characters. The caps are enforced server-side. DESIGN does not contain the rejection wording, so placeholders are used.
- Five new placeholders, written into DESIGN.md: `[COPY NEEDED: forwarded reply with no waiting clients; ask for the client name]`, `[COPY NEEDED: list]` (the list-opening button), `[COPY NEEDED: more]` (next page), `[COPY NEEDED: voice note longer than two minutes]`, `[COPY NEEDED: voice transcript exceeds 2,000 characters]`.
- The existing `[COPY NEEDED: busy or AI rate-limit reply]` remains the provider/rate-limit failure copy. Earlier M2/M3 placeholders remain listed in their notes.

## BLOCKED / still unverified

- Production daily nudges still wait for Meta's approved week4_nudge template, as recorded in M3. This does not block M4 dev replies.
- The real forwarded Kannada voice-note exchange and actual M4 selector/button behavior on a phone still need the owner's check below. The live English transcription and mocked Kannada flow passed; no claim is made that a real Kannada phone note has been tested.
- Missing wording stays visibly marked until the owner supplies it. No new trainer-facing words were invented.

## How to test this yourself

Use the same assistant chat you used for M2/M3. These are invented clients. Do the steps once, in order; that keeps real AI usage under the milestone cap. A response should arrive within one minute after selecting the client; allow up to 90 seconds for a dev nudge.

1. Open Terminal and paste `npm --prefix /Users/divyaabhilash/build-sprint-app run test:m4`. You should see `Tests 75 passed (75)` and `Test Files 4 passed (4)`. Fail: any failed test or command error.
2. Open the assistant in WhatsApp. Send exactly `New client Test Ria joined on 1 Sept 2026`. Expect the saved-client confirmation, followed within 90 seconds by a combined check-in/button (the overdue nudge line currently has COPY NEEDED). Send exactly `This is a reply: I enjoy the music in class. I look forward to every session.` If asked Is this Test Ria's reply?, tap Yes; otherwise open the client list and choose Test Ria. Expect the happy introduction and a combined ask/recommendation with Send to client. Tap that button and choose your own saved-messages chat, without sending to a real client. Expect the same ask and recommendation in the WhatsApp message box. Fail: wrong client, missing draft/button, invented claim, or different button text content.
3. In the same assistant chat send `New client Test Nila joined on 1 Sept 2026` and wait for the check-in. Send `This is a reply: Good! Loving it 😊`, then identify Test Nila. Expect What's changed?, What's easier now?, What do you enjoy?. Tap What's changed?. Expect `What's changed for you since you started?` with Send to client. Send exactly `Still good!` to the assistant. Expect a draft using those words, not another set of follow-up questions. Fail: unreadable-review error, invented improvement, or a second follow-up question.
4. Send `New client Test Tara joined on 1 Sept 2026` and wait for the check-in. Send `This is a reply: I am disappointed with the classes.` and choose Test Tara. Expect a private feedback message and `Thanks for telling me honestly, Test Tara. Can we talk after Thursday's class? I want to make this right.` with Send to client. Fail: any request to share publicly or any recommendation for a society group.
5. Send `New client Test Kavya joined on 1 Sept 2026` and wait for the check-in. Open your own saved-messages chat. Record a 5–15-second Kannada voice note saying `ನನಗೆ ತರಗತಿಯ ಸಂಗೀತ ಇಷ್ಟ. ಪ್ರತಿ ತರಗತಿಗೂ ಕಾತರದಿಂದ ಕಾಯುತ್ತೇನೆ.` (I like the class music and look forward to every class.) Long-press that voice note, choose Forward and send it to the assistant. Identify Test Kavya when asked. Expect a recommendation containing your Kannada words, the English approved ask and Send to client. Fail: the unreadable-review error, wrong name, translation into English instead of keeping Kannada, or a new result you did not say.
6. In the assistant chat send `This is a review: Test Tara: I enjoy the music in class. I look forward to every session.` Expect the private paused-client message, not a public sharing ask. Fail: Send revised review / Ask client to post or any society-group ask for Test Tara. Unpausing is not available until M5.

If any step fails, send me: the step number, the exact time you sent it, the assistant's reply or a screenshot, and Terminal's failed-test output if step 1 failed. Do not send any API key.


## 7 Oct — owner's review-message fixes

Owner screenshots confirmed that the waiting-client selector and happy forwarded-reply draft arrived on the phone. They also showed the old direct-review two-message route and the appended contact link. The owner reported that bold-formatted reviews fell into the off-topic fallback.

Choices for this correction: named direct reviews now produce one combined ask/recommendation draft with the existing Send to client button; forwarded drafts no longer append a contact link; paired WhatsApp/Markdown bold markers are removed before trigger/name recognition and AI classification, while their words and paragraph breaks are preserved. The explicit label identifies the client even if the model omits her name. The same combined-draft formatter enforces Meta's body limit for both routes. Unnamed reviews retain their existing flow and missing-name placeholder. No new visible copy was written; the combined ask is DESIGN 4.5's approved text. PRODUCT and DESIGN now record the owner's newer named-review layout, superseding the earlier two-message requirement for named reviews. No later milestone was built.

Proof: 79 mocked tests pass across four files, compile passes, dev deployment succeeds. A new real AI check using a made-up bold review is recorded in M4_REVIEW_FIX_LIVE_OUTPUT.txt. This adds one OpenAI call; total real AI calls made by Codex during M4 is now 3 (Sarvam 1, OpenAI 2). Tests, demo and deployment output are in M4_REVIEW_FIX_TEST_OUTPUT.txt, M4_REVIEW_FIX_DEMO_OUTPUT.txt and M4_REVIEW_FIX_DEPLOY_OUTPUT.txt. The owner's exact feedback and phone number were not copied into the repo.

How to recheck: open the assistant chat and send `This is a review: Test Nia: I enjoy the music in class. *I look forward to every session.*`. Expect one combined draft with Send to client, with no appended contact link. Tap the button and choose your own saved-messages chat; the message box should contain the same complete draft. A fallback/error, two separate drafts, invented words, added contact link or different button content is a fail. Also send `**Test Nia:** I enjoy the music in class. I look forward to every session.`; expect the same named-review behavior. M4 remains uncommitted pending phone confirmation.

## 7 Oct — explicit instructor/session context

Owner asked that tweaked reviews make clear they are about the instructor and her sessions. Choice: add the neutral context line `Mayuri's sessions:` above the grounded client words, with a blank line, inside combined drafts' quotes; unnamed standalone recommendations use the same context. The exact line is written in DESIGN.md. The client remains I; no new experiences, results, class types or offers are added. Both formats and their URL-button content have regression checks, and the context counts towards the existing 1,024-character message limit. 81 mocked tests and compile pass; dev deployment passed. Output is in M4_CONTEXT_TEST_OUTPUT.txt and M4_CONTEXT_DEPLOY_OUTPUT.txt. No additional real AI calls (M4 Codex total remains 3). No commit/push or later milestone.

Phone check: send `This is a review: Test Nia: I enjoy the music in class. I look forward to every session.` in the assistant chat. Expect one combined draft with `Mayuri's sessions:` followed by the client's words and Send to client. Missing context, invented claims or different text in the button's message box count as a fail.

## 7 Oct — natural first-person attribution

Owner clarified the desired wording with an explicit music-review example. Choice: English first-person class/session reviews without Mayuri's name receive the owner's neutral attendance clause as part of the sentence: `I've been going to Mayuri's sessions and ...`. The exact example is covered end to end: `I've been going to Mayuri's sessions and I enjoy the music in the class. I look forward to every session.` Already-explicit references to Mayuri remain intact; thin/non-English replies keep neutral attribution instead of adding attendance or translating. No duration, result or feeling is added. This supersedes the prior heading for the applicable English reviews. DESIGN records the owner's wording and the singular grammar correction. Combined/unnamed drafts use the same rule; full button content and body limits remain enforced.

82 mocked tests and compile pass; dev deployed. Real command output: M4_NATURAL_CONTEXT_TEST_OUTPUT.txt and M4_NATURAL_CONTEXT_DEPLOY_OUTPUT.txt. No new real AI calls; M4 Codex total stays 3. No commit/push or next milestone. Phone check: send `This is a review: Test Nia: I enjoy the music in class. I look forward to every session.` Expect the natural first-person wording above in the combined draft, with Send to client. A heading in place of that sentence, invented claims or missing button is a fail.
