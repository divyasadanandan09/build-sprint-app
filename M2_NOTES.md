# M2 — paste a review in WhatsApp and get drafts back

Built and verified with mocked providers on 6 Oct 2026. Deployed to Convex **dev only**. The owner reports the WhatsApp test number can now send and receive. The M2 phone exchange is still pending Meta webhook subscription; this is not a claim that our agent flow passed on a phone. No commit, GitHub push, production deploy, or later milestone started.

## What works in the mocked flow

- Meta GET verification and signed POST webhook at `/whatsapp`.
- Signature checks use the original request bytes and reject missing/invalid signatures before saving data. Missing configuration fails closed. Other agent numbers and delivery-status-only events are ignored.
- A trainer account is created from the sender's WhatsApp number. Duplicate message IDs are processed once.
- `Hi` returns the exact DESIGN welcome without an AI call.
- A happy text review produces separate recommendation and ask messages, followed by a `Send to client` URL button containing both drafts.
- All WhatsApp requests, including typing indicators, pass through `sendWhatsApp` in `convex/lib/whatsapp.ts`.
- Each send attempt is saved before calling Meta. Error 131031 records `blocked` and the provider code; it never counts as a successful send or schedules the next question. A partly sent sequence does not get blindly retried.
- Right after all three messages are accepted by Meta, the next-client question is sent once. The answer saves a client with a 28-day wait period and a due date. Invalid dates do not change saved clients.
- Trainer records and clients remain separate. Database reads after processing still find the saved client.
- Text above 2,000 characters is rejected before AI. Voice input is not transcribed in M2. No Sarvam request occurs.

Here `outbound.state = sent` means Meta accepted the request and returned an ID; delivery to a phone is not proven by that response. Live delivery and opening the button remain BLOCKED.

## Choices made

1. Followed the owner's explicit instruction to build M2 despite the reported Meta lock. This workspace contained M0 only: there was no M1 action to connect. Added only the text-draft dependency needed by M2; M1's real-review quality gate remains unverified.
2. Used Convex's Agent, Workflow and Rate Limiter components. No other database, authentication service, host, or API server was added.
3. Kept backend functions internal; only the signed webhook is public. Tests use a local mock Convex database.
4. Used one serial workflow queue for incoming messages, preserving arrival order. Disabled automatic send retries because a repeated Meta send could duplicate a message after an uncertain response.
5. Saved drafts before attempting sends, and kept send outcomes in a separate table. A network timeout leaves a failed attempt; a crash can leave a `sending` record requiring inspection. There is no automatic resend of historical messages.
6. Used separate messages for the two drafts and put both in the button's encoded share text. No client phone number is collected.
7. Followed the owner's PRODUCT-over-DESIGN rule: scheduled the next-client question immediately after successful draft sends. Only the latest question for a trainer remains active; a newer draft supersedes an unanswered earlier question.
8. Used 28 days for the next client's wait period. Dates are interpreted in IST. A missing year means the most recent occurrence of that date; invalid or explicitly future dates are rejected. Saved client dates are not silently overwritten by a repeated name with a different date.
9. The minimal draft adapter selects and trims verbatim passages instead of rewriting them, then verifies every passage appears in order in the input. It preserves language and cannot insert a new claim or link. This is conservative; grammar rewriting and send-quality assessment remain part of M1's review gate.
10. Used a client name only when the input explicitly begins with `Name:` and the model identifies that same name. Otherwise used copy placeholders instead of guessing or adding a name-collection step.
11. Kept the requested `gpt-6.1-sol` Responses model, low reasoning, 1,500 output tokens, zero SDK retries, and a server-side global 100-call fixed hourly window. Model access and one made-up happy review have now been verified live. One real AI call completed; two earlier attempts stopped inside the Agent before reaching OpenAI.
12. Used Meta Graph version `v25.0`, with optional server-side `WHATSAPP_GRAPH_VERSION` override. Sending and model calls have timeouts. Keys come only from Convex environment variables.
13. Short/unhappy replies do not get sharing asks in M2; their detailed handling is M4. The existing DESIGN review-error line handles unsupported reviews. The DESIGN fallback is used for off-topic input as required by AGENTS.md; no M5 commands/timers were built.
14. Added Vitest and convex-test only for backend rules and this complete mocked flow. OpenAI is replaced at its Agent call; WhatsApp fetches return fake Meta replies. Any unexpected external provider request fails the test. Sarvam is not called.
15. Fixed the missing Agent identity using a fresh per-review identity, with history and search disabled. Added one real-Agent regression test, keeping only OpenAI mocked.
16. Added fixed diagnostic error categories without logging sensitive error details.
17. Set workflow logs to warnings and errors. Mock timer advancement can produce workpool monitor-restart warnings; these are preserved in the raw proof output. All 25 tests finish successfully (24 onboarding tests plus a real-Agent regression test with OpenAI mocked).

## Document disagreements and missing words

- PRODUCT says the next-client ask is right after the first draft; DESIGN 4.1 and PLAN specify one minute after sending. Followed the owner's priority rule: PRODUCT controls timing, so ask immediately after the complete draft sequence succeeds; DESIGN supplies the exact question text.
- PRODUCT forbids invented claims; DESIGN 4.5's example inserts a free-demo claim and trainer link. M2 does not insert either.
- AGENTS has a busy/cap-hit message that DESIGN does not contain. The owner's instruction requires DESIGN-only wording, so the busy case uses a placeholder.
- IDEA_SCOPE describes contacting clients directly; PRODUCT and AGENTS say trainer-only. All outbound messages go to the trainer.
- DESIGN's unlimited voice length disagrees with AGENTS' two-minute cap. Voice processing remains M4; it was not implemented here.

Copy still needed (literal placeholders in the code):

- `[COPY NEEDED: review ask when the client's name is unknown]`
- `[COPY NEEDED: drafts-ready message when the client's name is unknown]`
- `[COPY NEEDED: busy or AI rate-limit reply]`
- `[COPY NEEDED: a client with this name already has a different start date]`

## Proof

Full actual output is in `M2_TEST_OUTPUT.txt` and `M2_DEMO_OUTPUT.txt`.

Commands checked:

- `npm run test:m2`: 25 passed (25), across two files; latest run at 10:29 IST.
- `npm run demo:m2`: prints the made-up Priya review, both drafts, the button URL, next-client question, Ananya's reply, confirmation and saved-client check; 1 passed, 23 intentionally skipped.
- `npm run check`: exit 0 after adding Node environment types to Convex's TypeScript settings. The initial compile check failed for the missing types and was fixed.
- `npx convex dev --once`: `Convex functions ready!` at 10:28:33 IST after fixing the missing Agent review identity.
- `curl --max-time 15 -sS -i https://giant-platypus-592.convex.site/whatsapp`: live dev route returns HTTP 503, `Webhook configuration missing`, as expected while dev keys are absent.
- `npx convex run health:check '{}'`: exit 0; null function prints nothing.
- `npx convex run drafting:fromText '{"text":"I enjoy the music in dance class."}'`: the live dev action returned `read: busy`, with null drafts, as expected with no dev OpenAI key; zero real AI calls.
- Final secret-pattern scan: 142 non-ignored files checked, 0 matches; `.env.local` ignored, no commits. This is a limited common-pattern scan, not a guarantee against every possible secret format.

No real WhatsApp, OpenAI or Sarvam calls were made by the tests. No landing page was built, so no screenshot applies.

## Latest live checks — 6 Oct, 10:29 IST

- The owner reports the Meta test number sends and receives. The previous account-lock blocker is resolved according to that report.
- All six provider variable names were verified present in both dev and prod. Values were not printed.
- Dev webhook verification returned HTTP 200 with the requested challenge.
- A correctly signed empty-event POST returned `200 EVENT_RECEIVED`. No messages were injected and no outgoing WhatsApp messages were sent by these probes.
- Meta's phone callback read returned no URL. A separate app-subscription read conclusively returned `Meta app subscriptions: 0`. This app is not yet subscribed to send incoming messages to our webhook.
- No inbound/outbound/client/pending rows were returned by dev data inspection at the time of checking. No personal data was copied to a file.
- The first live draft attempt returned busy. Safe diagnostics identified `agent_thread_configuration`; the installed Agent source requires userId or threadId, but our call supplied neither. The previous mocked Agent hid this bug.
- Added a regression test keeping the real Convex Agent and mocking only OpenAI. It failed with busy before the fix and passed after the fix.
- Fixed the actual cause with a fresh per-review identity, no history, no cross-thread search, and no Agent message storage. The live action then returned happy, Priya's exact praise and the DESIGN ask. No model or copy change was needed.
- The safe error log uses fixed categories and numeric status only; it does not log key values, reviews, provider error messages, or response bodies.
- 25 tests pass; compile passes; updated functions were pushed to dev. One successful real AI call, two failed attempts before OpenAI; no automated real WhatsApp sends. Full output is in M2_TEST_OUTPUT.txt and M2_LIVE_CHECK_OUTPUT.txt.
- Production now has all six variable names too, but application code is still M0. No production deploy was performed.

## BLOCKED / pending owner step

- **Meta webhook subscription:** in Meta app > WhatsApp > Configuration, set callback `https://giant-platypus-592.convex.site/whatsapp`, use the existing `WHATSAPP_VERIFY_TOKEN` value, and subscribe to `messages`. PLAN.md assigns this setup to the owner; Codex did not change Meta configuration.
- **Real M2 phone proof:** after subscription, send Hi, then the made-up review below, tap Send to client and add Ananya. Receiving generic Meta test messages is not yet proof of this application's flow. A successful phone exchange and button opening remain unverified.
- **M1 manual quality proof:** five real reviews plus one voice transcript still need the owner's assessment; they must not be saved in the repo.

`SARVAM_API_KEY` is not needed for M2; it is needed when M4 is built. Never paste real keys into chat or repository files.

## How to test this yourself

1. Open Terminal and copy:

   ```bash
   cd /Users/divyaabhilash/build-sprint-app
   npm run test:m2
   ```

   You should see `Tests 25 passed (25)`. Fail: any failed test, error, or command that does not finish. Monitor-restart warnings from the fake clock are not failed tests.

2. In the same Terminal, copy:

   ```bash
   npm run demo:m2
   ```

   You should see `MOCK EXCHANGE`, Priya's two drafts, `Send to client`, the next-client question, and `Saved client: Ananya; start 2026-09-12; due 2026-10-10; still present on a new read`. Fail: any of those is absent or the selected test fails. This is a fake exchange printed on your computer, not a message sent to your phone.

3. Copy:

   ```bash
   npm run check
   ```

   You should return to the command prompt without errors. Fail: an error is printed.

4. **Required to connect messages to M2:** open Convex Dashboard > `build-sprint-app` > dev `giant-platypus-592` > Settings > Environment Variables, and confirm the five M2 names listed above are present (verified on 6 Oct). Open your Meta app > WhatsApp > Configuration; the dev callback is `https://giant-platypus-592.convex.site/whatsapp`, with your existing verify-token value and a subscription to `messages`. Use this endpoint only when intentionally testing dev; do not replace a working callback unknowingly. Pass: Meta verifies the callback. Fail: verification fails. No key should be sent to me.

5. **Pending real-number check after subscribing Meta:** open WhatsApp on your phone, open the agent's chat, and send exactly `Hi`. You should receive `Hi! I help your happy clients recommend you in their society groups. Paste one Google review a client left you, or forward something a happy client said.` Fail after callback setup: no welcome within one minute.

6. Send this made-up review exactly:

   ```text
   Priya: I enjoy the dance classes. I look forward to the music every morning.
   ```

   You should receive a recommendation using only that praise, the exact DESIGN ask for Priya, and a `Send to client` button within a minute. Fail: invented details, a missing draft/button, or no reply. Tap the button: WhatsApp should offer a chat picker and include only the recommendation. Send it to your own test chat. Then use the second Send to client button for the ask, choosing the same chat. Fail: either button does not open WhatsApp, combines the drafts, or loses its draft.

7. Right after the drafts, you should receive `Who's the next client coming up on 4 weeks? Send me her name and start date, like: Ananya, 12 Sept.` Send exactly `Ananya, 12 Sept`. On 6 Oct 2026, the expected reply is `Got it. I'll remind you when Ananya hits week 4, on 10 Oct 2026.` Close and reopen WhatsApp, then open Convex Dashboard > dev > Data > `clients`: Ananya should still be there. Fail: missing confirmation, wrong date or missing saved client. This saves the client; daily nudges are M3 and are not built yet.

Next step: connect the dev callback and subscribe to messages in Meta, then run the phone steps. PLAN.md assigns this Meta configuration step to the owner. No later milestone will start automatically.

If any step fails, send me: the step number and Terminal output, or the agent's reply/button behaviour and the Meta error code, with names and phone numbers removed; never keys or tokens.


6 Oct M2 bug fix: emoji reactions were incorrectly sent to the unreadable-review branch. Reactions now finish silently without AI or outbound messages. Emoji-only text and the unsupported `say thanks` command use the exact DESIGN fallback before the pending-client branch; detailed reviews retain their emojis. No thank-you drafting from M5 was added. Regression proof: before the fix, 2 failed / 1 passed; after the fix, all 32 tests passed, compile passed, dev deployed at 15:16:21 IST. OpenAI, WhatsApp and Sarvam stayed mocked; zero real AI calls for this fix. Real-phone recheck awaits owner.

Choice: extend the acknowledgement match to plain thanks / thank you, with trailing punctuation or emojis. Exact DESIGN fallback retained; no AI call. Regression reproduced first, all 32 tests and compile passed; deployed to dev at 15:18:24 IST. Phone recheck pending.

Choice, 6 Oct: owner clarified client = I, instructor Mayuri = she; revised DESIGN to record that clarification. AI selects exact source passages and optional third-person versions, which Convex accepts only if unchanged or matching a fixed pronoun/verb conversion; no new result or feeling is accepted. At most two exact short phrases are highlighted, using WhatsApp single asterisks. Drafts over 280 characters get two sentences per paragraph. Invalid/invented highlights are dropped; invented rewritten claims reject the draft. Short drafts stay one paragraph. Formatting survives the Send to client link. Provider tests remain mocked; no real AI calls for this change. Phone proof still pending; no commit/push or next milestone.

Choice, 6 Oct: recommendation and ask retain separate plain-text messages, and now each has a separate URL button containing only that draft. Two taps into the same client chat are required; WhatsApp URL buttons cannot send two separate messages in one tap. Existing DESIGN ready/ask wording is reused for button bodies, with no new trainer copy. All 35 mocked tests and the demo command pass; dev deployed 15:32:19 IST. An initial call-limit test failed because draining fake scheduled timers could cross its hour window; the test now checks the AI action directly at the same instant and passes. No provider calls, commit, push or next milestone. Phone check pending.

Choice: preserve owner's exact replacement wording and capitalization, substituting the client's name in both places; keep the existing missing-name placeholder. DESIGN and application copy updated together; 35 tests and compile pass, dev deployed.

Choice: the second ask button uses Send to {client name}, as requested. Use the existing Send to client label when no name is available or the named label exceeds 20 characters. The URL still opens WhatsApp's chat picker; no client phone number is stored. DESIGN updated, 35 mocked tests and compile pass, deployed to dev.

Owner update, 6 Oct: no automatic next-client question. Client additions remain supported when the instructor sends a name/start date herself; obsolete queued question jobs retire silently, and existing pending questions no longer intercept reviews. This supersedes earlier timing choices and phone-test instructions that expected automatic questions. PRODUCT, DESIGN and PLAN now agree on this behavior.
Bug fix: whitespace around the reviewer's name/colon is accepted; reproduced with a made-up spaced-label regression. Optional AI wording no longer makes a valid extractive review fail: source passages remain verified exact/in order; rewrites are discarded in favor of fixed instructor-pronoun changes, preventing invented claims from entering drafts. Made-up direct-address regression also passes; the real user's review was not written to the repository.
Choice: `This is a review` introduces a review naturally; it works standalone or as a prefix with the review in the same message, with no extra AI call. Missing copy: `[COPY NEEDED: conversational invitation to paste a review after the instructor says This is a review]`. No new conversational response was invented.

Choice, 6 Oct: accept New client {name} joined on {date}, case-insensitively, with an optional ending full stop. Normalize copied Unicode whitespace and invisible word joiners; retain the previous name/date format and the existing date validation/confirmation copy. Natural client messages bypass AI, including invalid dates. Two regressions failed before the fix; all 40 mocked tests and compile pass after it. No real AI calls.

Owner update, 6 Oct: keep one CTA while retaining separate testimonial and personalized ask messages. Limitation explained: one wa.me link opens one prefilled message and cannot send two client messages in one tap. Simplest choice: one CTA contains only the testimonial; instructor manually forwards the separate ask. Removed the second button and duplicated ask body. This supersedes earlier two-button instructions.

Owner update: restore the second URL button and label the first Send revised review. The requested second label Request client to post is 22 characters; DESIGN/WhatsApp limit is 20, so owner was offered Ask client to post or Request to post. Both buttons are prepared and 40 mocked tests/compile pass; dev deployment waits for the second label.

Owner approved Ask client to post for the second button. Final labels: Send revised review / Ask client to post. Each opens only its respective draft, so the instructor sends them separately to the same chosen client chat. DESIGN updated; all 40 mocked tests, compile and demo pass; dev deployed. No real AI calls, commit or push.
