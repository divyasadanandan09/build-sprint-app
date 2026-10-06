# M3 — clients and the daily nudge

M2 was confirmed, committed as `4d80fb4`, pushed to `origin/main`, and deployed using `npm run deploy -- --yes`. Production health returned successfully and `/privacy` returned HTTP 200. M3 changes remain uncommitted and are deployed only to dev; Meta's existing callback still points to dev while testing.

M3 now supports `New client Ananya joined on 12 Sept`, `Add Ananya, 12 Sept`, and `Ananya, 12 Sept`; the existing date checks and 28-day minimum remain. `Who's due?` lists only that instructor's clients with due dates in the current IST Monday–Sunday week. Daily nudges contain a check-in, never a sharing ask. A recorded check-in prevents duplicate sends, including concurrent ticks and failed/partial sequences. No M4/M5 functionality was added.

## Proof

- `npm run test:m3`: 3 files passed; 51 tests passed, including all M2 regressions. WhatsApp, OpenAI and Sarvam are mocked/trapped in tests. Zero real AI calls in M3. Full output: `M3_TEST_OUTPUT.txt`.
- `npm run check`: passed.
- `npm run demo:m3`: the made-up client receives one combined DESIGN nudge/check-in message with a blank line, and a Send to client URL containing only the check-in. A second tick sends nothing. Full command output: `M3_DEMO_OUTPUT.txt`.
- Real dev check: an internal test event added the made-up M3 Test Priya to the owner's existing test account. The actual minute cron queued its check-in and Meta accepted nudge/check-in/button messages. Client state changed to checked_in. Two subsequent `npx convex run m3:tick '{"source":"dev"}'` calls returned 0; its outbound count stayed 3. `Who's due?` was also processed and accepted by Meta. Sanitized proof: `M3_LIVE_CHECK_OUTPUT.txt`. Actual phone numbers, profile names and private list contents are not written to the repo.
- Meta acceptance is verified. Actual delivery/read and tapping the button on the owner's phone still require confirmation.

## Choices

1. One Convex environment setting, `APP_TIMING_MODE`, chooses timing: `dev` checks every minute; `prod` (also the safe default when missing) runs at 9am IST, scheduled as 03:30 UTC. Dev does not shorten the client's required four weeks; testing uses a made-up client who already completed them. Dev setting is configured.
2. Keep the 28-day minimum in Convex, independently checking start date/wait period rather than trusting a stored early due date. Keep clients saved and mark checked_in only after the entire send sequence succeeds. Last-step time is the draft creation time, never a URL-button tap.
3. One check-in event per client; serial durable workflows and outbound records prevent duplicate sequences. Blocked or ambiguous failures are recorded and are not automatically retried, avoiding duplicate nudges.
4. Process clients in pages of 50 and continue automatically. A failed client cannot hide later clients. Due lists use at most five lines per message and pagination rather than truncating someone's list.
5. Use the instructor's stored WhatsApp profile name in the DESIGN check-in template. Missing names use a copy placeholder; no name is guessed.
6. Production uses an approved `week4_nudge` English template with a URL button, not free-form messages outside the 24-hour window. Sending stays disabled unless `WHATSAPP_NUDGE_TEMPLATE_READY=true` is deliberately set after approval. No new API key is required.
7. Overdue clients can be caught up in dev, but the DESIGN text says "today". An overdue copy placeholder avoids asserting an incorrect date; production catch-up waits for suitable approved copy/template.

## Disagreements and missing copy

PLAN's already-passed test client and catch-up behavior need an overdue nudge, while DESIGN only writes a nudge saying the client hits four weeks "today". We preserved the behavior using a placeholder in dev and blocked the incompatible production template for overdue clients. PRODUCT and DESIGN do not otherwise disagree on M3's behavior.

New missing lines now recorded in DESIGN:
- `[COPY NEEDED: due-this-week line for {name}, due {date}]`
- `[COPY NEEDED: no clients due this week]`
- `[COPY NEEDED: nudge for {name}, whose four-week date was {date}]`
- `[COPY NEEDED: check-in when the instructor name is unknown]`

## BLOCKED

- Meta read-only check found zero templates named `week4_nudge`. Production nudges cannot be verified or enabled until an approved English template exists. Its body must match DESIGN: `{{1}} hits week 4 today. Here's a check-in in your voice.\n\n{{2}}` (a real blank line before {{2}}, which is the full check-in draft) Its URL button should be `Send to client`, using `https://wa.me/?text={{1}}`; the application supplies the encoded check-in as the button parameter. After its body/language/button are verified, set `WHATSAPP_NUDGE_TEMPLATE_READY=true` in Convex production. Do not enable it before that verification. Existing API keys were already present; none is requested here.
- Production overdue catch-up also needs its exact nudge wording and corresponding approved template. It currently sends nothing for overdue clients.
- Owner phone confirmation of the real check-in/button remains pending; it does not block the completed mocked and Meta-acceptance checks.

## How to test this yourself

Use the same existing WhatsApp chat with the assistant that you used for M2. These dates and expected confirmations are for 6 Oct 2026, and these clients are made up.

1. Send exactly `New client M3 Test Maya joined on 8 Sept 2026`. Expect `Got it. I'll remind you when M3 Test Maya hits week 4, on 6 Oct 2026.` Fail: no confirmation, a different date, or review drafts instead of a saved client. If you already used this test name and it was nudged, choose a fresh made-up name in the same message.
2. Wait up to 90 seconds. Expect `M3 Test Maya hits week 4 today. Here's a check-in in your voice.`, `Hi M3 Test Maya, it's {your WhatsApp profile name}! You've done 4 weeks now, how's it feeling?` after a blank line in the same message, with a `Send to client` button underneath. Fail: no nudge, a sharing/testimonial ask, or a wrong client name. You should also already have a similar real test exchange for `M3 Test Priya` from Codex's check.
3. Tap `Send to client`, choose your own test chat, and send. Expect only the check-in draft in that receiving chat. Fail: the button does not open WhatsApp, picks the wrong draft, or combines a testimonial/share ask into it.
4. Wait two more minutes. Expect no second nudge for that same client. Fail: repeated nudge, draft or button.
5. Send exactly `Who's due?`. Expect this week's clients, including M3 Test Maya, with their dates, using the visible `[COPY NEEDED: ...]` due-list placeholders for now. Fail: next-week dates, another trainer's clients, an AI review error, or missing M3 Test Maya. If the week has no clients, expect `[COPY NEEDED: no clients due this week]`.
6. Send exactly `New client M3 Future joined on 6 Oct 2026`. Expect confirmation with 3 Nov 2026. Wait two minutes; expect no nudge for this client. Fail: any early check-in.
7. For the saved-client check, open Convex Dashboard, select `build-sprint-app` > dev `giant-platypus-592` > Data > clients. Expect M3 Test Maya saved with startDate `2026-09-08`, dueDate `2026-10-06`, and status `checked_in`; M3 Future should have status `due`. Fail: either client missing or wrong dates/status.
8. To rerun the safe mocked proof, open Terminal and copy `cd /Users/divyaabhilash/build-sprint-app && npm run test:m3`. Expect `51 passed (51)` and `3 passed (3)`. Then run `cd /Users/divyaabhilash/build-sprint-app && npm run demo:m3`. Expect `MOCK M3 EXCHANGE`, the check-in-only button URL, and `Second tick: no additional messages`. Fail: any failed test or an error instead of that exchange. These commands do not contact real providers.

No M3 commit, push, production deploy or M4 work until the owner confirms M3.

If any step fails, send me: the step number, time sent, exact agent reply or receiving-chat text, or the full Terminal output; remove real names and phone numbers, and never send keys.

Owner simplification, 6 Oct: old dev flow sent the nudge, draft and repeated nudge/button as three separate messages. Now it sends one interactive message containing nudge + blank line + check-in, with a button whose URL contains only the check-in. Production template body now needs two parameters (client name and check-in), matching the combined layout; no existing template exists to migrate. Regressions failed before the change; 51 tests and compile pass after it. No new trainer words, real AI calls, commit or push.

Owner confirmation: the real M3 Test Tara event at 20:08:36 was saved, the minute job queued at 20:09:40, and Meta accepted one combined interactive nudge at 20:09:41. Owner confirmed it arrived and approved M3. This supersedes earlier pending phone-confirmation notes. Shipping M3 is authorized; production nudges remain gated on approved templates/copy, and M4 has not started.
