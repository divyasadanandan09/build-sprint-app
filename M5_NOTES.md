# M5 — Follow-ups

M4 was approved, committed as 1004b50, pushed to GitHub and deployed to production before starting M5. The existing Meta webhook still points to dev. M5 is deployed only to dev at https://giant-platypus-592.convex.site and waits for owner phone confirmation before commit, push or production deploy. On 7 Oct the owner authorized M6 landing-page work while Meta reviews the disabled account; see M6_NOTES.md.

## Proof

- `npm run check`: TypeScript compile passed.
- `npm run test:m5`: 105 tests passed across five files, including 23 M5 tests and all 82 existing checks. Latest actual output: M5_QUESTION_FIX_TEST_OUTPUT.txt; initial output remains in M5_TEST_OUTPUT.txt. All WhatsApp, OpenAI and Sarvam traffic is mocked; test names, numbers and feedback are invented.
- `npm run demo:m5`: latest actual command output in M5_QUESTION_FIX_DEMO_OUTPUT.txt. The signed webhook receives a named review, makes the combined draft, sends the posting question after two fake-clock minutes, accepts She posted it, reports this trainer's actual monthly count and stays silent on later ticks. This is a mocked exchange, not a real phone exchange.
- Latest dev deployment succeeded: M5_QUESTION_FIX_DEPLOY_OUTPUT.txt. Two real deployed `m5:tick` invocations and the dev timing setting are recorded in M5_LIVE_CHECK_OUTPUT.txt; the empty queue returns 0 each time. This verifies the deployed timer function, not delivery of a real timed message.
- Real AI calls made by Codex in M5: **0 of 10**. Reminders, confirmations, counts, thank-yous and unpausing require no AI. Incoming reviews still use the already-tested drafting action.
- Tests cover exact 2/3-minute boundaries, production day delays, one reminder, Leave it, one Not yet repeat, cross-trainer/stale/forged/repeated buttons, queued-timer cancellation after an identified reply, declined-client privacy, unhappy unpause, IST monthly counts, more than 50 due events, Meta failures and the 24-hour window.
- The actual timed phone exchange remains for the owner's check below. No claim is made that these M5 messages have already arrived on the owner's phone.

## Choices made

1. One minute cron checks indexed due events in bounded batches of 50; Convex's existing serial workflow sends them. This works after closing WhatsApp or restarting the code and does not rely on the trainer keeping a page open.
2. Read all delays from APP_TIMING_MODE: dev uses two/three minutes; prod uses two/three days. A minute cron means a question can arrive up to one minute after its due time, plus provider processing.
3. Anchor timers to draft creation, since URL-button taps cannot be observed. Activate timers only if Meta accepted the draft send; a rejected send cannot create a chase for something the trainer never received. Check-ins, named pasted recommendations, happy forwarded replies and selected short-reply questions all enter the timers.
4. Start timers only for newly created drafts after this deploy. Do not send a backlog of follow-ups for historical M2–M4 test conversations.
5. Keep one flow per trainer and exact client name, including named reviews without a saved start date. Never invent an enrollment date. Unnamed reviews have no follow-up timers because there is no safe client identity.
6. Keep the existing per-client reminder-used flag across the client's check-in, short follow-up and recommendation ask. At most one gentle reminder is offered across that flow. A new pasted review does not reset the used allowance. This is the conservative choice for PRODUCT's one-reminder stop rule; DESIGN's wording can be read as one per separate ask.
7. When a reply is identified, cancel its old queued questions before reading it. Awaiting unidentified replies retain their timers until the trainer selects or types a client name. An unhappy outcome cancels all chases immediately, even if its private response fails to send.
8. Owner correction: after a recommendation ask, schedule only the posting question. Do not send a no-reply prompt while waiting for the instructor to choose. Also suppress old pending sharing-ask reminders and ignore old reminder buttons. Private check-ins and short follow-ups retain their one-time no-reply prompt. Not yet schedules only the one final posting question.
9. Send reminder creates only the exact approved private check-in reminder with Send to {client name}. Leave it stops all remaining prompts. There is no invented acknowledgement for Leave it or Not yet. No timed message reaches a client; only the trainer receives them.
10. She posted it closes the flow and increments a deduplicated counter for that trainer and IST calendar month. Repeat taps, cross-trainer taps and old-cycle buttons cannot increment it again. Groups and URL taps are never monitored.
11. She said no sends the introduction and thank-you together with one button containing only the thank-you. Keep the refusal final for future sharing asks; later feedback remains private. The is happy now command cannot clear a refusal to post.
12. Not yet asks again three minutes/days after the button response, exactly once. A second Not yet stops. Without a response to the second question there are no further timers, although its button can still be answered.
13. Unpause only the owning trainer's unhappy client, including names that were never enrolled. Record the override without deleting unhappy history. Do not reinterpret the old negative reply or automatically write a public ask; wait for fresh client words. A fresh unhappy reply pauses again.
14. Mark tracked clients asked/posted/said_no/dropped as appropriate. Include asked clients in the existing waiting-reply selector so a forwarded response to a sharing ask can be identified.
15. Use the existing exact off-topic fallback. Commands and M5 button responses are checked before M4's pending-name/reply handling so they cannot accidentally become testimonials or client names.
16. Use the existing sendWhatsApp function and persistent send deduplication. Never automatically retry a provider send: Meta could have accepted it even if the connection failed. Record errors without claiming delivery. Stale or cancelled events cannot be sent or answered.
17. Check the trainer's 24-hour messaging window before every timed send in dev and prod. Outside it, retain the event without calling Meta and record outside_24h_window_no_approved_followup_template. Check again on the next minute tick; a fresh trainer message permits one eventual send. No new environment variable or API key is needed.
18. Keep new unpause/private-feedback copy visibly marked as COPY NEEDED, rather than inventing words. All button labels and fixed successful-path messages come from DESIGN.

## PRODUCT / DESIGN disagreements

- Reminder scope is ambiguous: DESIGN says one per ask; PRODUCT says one gentle reminder then stop. The implementation conservatively preserves one reminder allowance across the client's entire flow, as recorded above.
- DESIGN's posted example uses 3; that is illustrative copy, not a fixed statistic. PRODUCT requires the trainer to tell us whether the client posted. Use that confirmation and the real trainer/month count in DESIGN's sentence.
- The fixed thank-you mentions Thursday, and the unhappy response uses Thursday too. These remain exactly as DESIGN specifies; no calendar-dependent alternative wording is invented.
- Earlier voice-length, example-claim and combined-message discrepancies remain documented in M4_NOTES.md and its subsequent owner corrections; M5 does not reopen them.

## Missing copy

These exact placeholders are now recorded in DESIGN.md:

- `[COPY NEEDED: unhappy client unpaused; forward her fresh reply]`
- `[COPY NEEDED: client was not paused or name was not found]`
- `[COPY NEEDED: client declined to post; keep this feedback private]`

Previous M2/M3/M4 placeholders remain; none were silently rewritten.

## BLOCKED

- RESOLVED, 7 Oct at 10:24: the owner's screenshot shows real questions/answers working again and Meta now reports CONNECTED. The earlier BANNED account block is no longer current. M5 phone checks can resume; this does not by itself approve every M5 path. The new confirmed status-correction path is in M5_STATUS_CHANGE_NOTES.md.

- Approved Meta templates for the M5 reminder and posting question outside the 24-hour reply window are absent. The current normal-message flow works within that window, including dev tests. Outside it, it waits for the trainer to message again; no unsupported send is attempted. Official WhatsApp policy, section 2: https://whatsappbusiness.com/policy/ .
- Production's existing week4_nudge template remains separately blocked from M3; this does not block new named reviews or the M5 dev phone checks.
- The three missing-copy placeholders need owner wording before those paths can be polished. No missing API key or new environment variable was found or introduced.

## How to test this yourself

Use the same assistant WhatsApp chat that worked for M4; its webhook still goes to dev. Each send should get a response within a minute. For timed questions allow the stated wait plus one minute for the minute check. These are invented client names. If repeating the checks later, use new names in place of Timer Nia/Leela/Mira/Tara/Kavya, because a posted/declined flow is saved and stops. These checks use at most seven OpenAI calls; no voice transcription is needed.

1. Open Terminal. Copy `npm --prefix /Users/divyaabhilash/build-sprint-app run test:m5`. Expect `Test Files 5 passed (5)` and `Tests 105 passed (105)`. Fail: any failed test or command error.
2. In Terminal copy `npm --prefix /Users/divyaabhilash/build-sprint-app run demo:m5`. Expect MOCK M5 EXCHANGE, the combined Test Nia draft, Did Test Nia share her recommendation?, a count of 1, and Later ticks: no further messages. Fail: a failed test or missing part of that printed exchange. This command uses mocks; it does not send to your phone.
3. Open your assistant WhatsApp chat. Send exactly `This is a review: Timer Nia: I enjoy the music in class. I look forward to every session.` Expect one combined draft and Send to Timer Nia. Tap that button and choose your own saved-messages chat: the box should contain the same complete draft. Return to the assistant chat without sending to a real client. Wait two to three minutes from the original draft. Expect `Did Timer Nia share her recommendation?` with Timer Nia posted it, Timer Nia said no and Not yet. Tap Timer Nia posted it. Expect the celebration with this month's real count, then no Timer Nia reminder during the next four minutes. Fail: no timed question, a different client, duplicate questions, mismatched button text, or a later Timer Nia chase.
4. In the assistant chat send `This is a review: Timer Leela: I enjoy the music in class. I look forward to every session.` At her posting question tap Not yet. Expect no immediate extra message. Wait three to four minutes from that tap. Expect the same posting question once more. Tap Not yet again, then wait four minutes. Expect no more Leela questions and no reminder. Fail: a reminder after Not yet, missing second question, or a third question.
5. Send `This is a review: Timer Mira: I enjoy the music in class. I look forward to every session.` At her posting question tap Timer Mira said no. Expect one message with `No problem. Here's a thank-you.`, a blank line, `No worries at all, Timer Mira! Thank you for telling me how it's going. See you Thursday.` and Send to Timer Mira. Tap Send to Timer Mira and choose your saved-messages chat: the message box should contain only the thank-you draft. Return to the assistant and resend the same review. Expect the private-feedback COPY NEEDED line and your supplied words, with no sharing ask. Wait four minutes: no Mira follow-up. Fail: a new public ask, a second thank-you after repeating the same button tap, or any later chase.
6. Send `This is a review: Timer Tara: Good! Loving it 😊`. Expect the three short-reply question buttons. Tap What's changed?. Expect `What's changed for you since you started?` and Send to Timer Tara. Do not send another reply yet. Wait three to four minutes. Expect `No reply from Timer Tara yet. Want to send one gentle reminder?` with Send reminder and Leave it. Tap Send reminder. Expect `Hi Timer Tara, just checking in again. No rush at all!` with Send to Timer Tara. Tap Send reminder again on the old question, then wait four minutes. Expect no duplicate draft or further reminder. Fail: two reminders, a sharing ask before any useful client reply, missing draft or wrong button content. Do not forward this reminder to a real client.
7. Send `This is a review: Timer Kavya: I am disappointed with the classes.` Expect private feedback and the approved private response, with no request to post. Send `Timer Kavya is happy now`. Expect `[COPY NEEDED: unhappy client unpaused; forward her fresh reply]`; no public draft is created from the old negative words. Then send `This is a review: Timer Kavya: I enjoy the music in class. I look forward to every session.` Expect the combined happy draft and Send to Timer Kavya. At her posting question choose Timer Kavya said no to close this test flow. Fail: a public ask before the new positive words, continued unhappy handling after unpause, or no happy draft after the fresh positive review.
8. Send exactly `thanks`. Expect `I didn't catch that. You can paste a review, forward a client's reply, or tell me a new client's name and start date.` Fail: the unreadable-review error, an AI-generated off-topic answer or a new sharing draft.

If any step fails, send me: the step number, exact send/tap time, the assistant's reply or screenshot, and the failed command's full Terminal output if relevant. Never send an API key.

## 7 Oct — owner correction after the real phone check

The owner screenshot confirmed a combined named draft at 7:18, the posting question at 7:20 and an unwanted no-reply prompt at 7:21. Cause: the two timers were independent, so no choice was needed for the third message. New regression tests reproduce that problem and require only the posting question after a sharing ask. Existing pending/queued sharing-ask reminders are suppressed; old already-delivered reminder buttons do nothing. WhatsApp cannot remove a message already on the phone.

New choices: named send buttons use Send to {name} everywhere a client is known; posting outcomes use {name} posted it / {name} said no; Not yet and private reminder-choice labels retain DESIGN wording. Shorten only the displayed button name to Meta's 20-character limit (https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/types/ButtonObject/); full names stay in messages, button IDs and saved identity. The celebration uses the owner's referral wording, no leading emoji, and grammatically plural referrals for counts above one. Counts continue to mean confirmed recommendation posts, not tracked enquiries.

The owner also asked to trigger the posting question from the send-button tap. AGENTS.md explicitly states that WhatsApp does not report URL-button taps. No tracking link is introduced. A separate sent-confirmation choice was offered; until an answer arrives, keep the existing posting timer. This product choice remains open and is not treated as approved merely because time passed.

PRODUCT and DESIGN now record the owner's newer single-question rule and named button wording, superseding the earlier parallel timers and generic labels. No later milestone, commit, push or production deploy. 105 mocked tests, compile and dev deploy pass; no additional real AI calls. The screenshot itself and any real trainer data were not copied into the repo.

Phone recheck: in the existing assistant WhatsApp chat send `This is a review: Button Nia: I enjoy the music in class. I look forward to every session.` Expect one combined draft with `Send to Button Nia`. Wait two to three minutes: expect `Did Button Nia share her recommendation?` with `Button Nia posted it`, `Button Nia said no`, `Not yet`. Leave it unanswered for another four minutes. Expect no no-reply prompt or extra question. Then tap `Button Nia posted it`: expect `Button Nia's society just heard about you from a neighbour. That's {your real count} referral(s) this month.` with the correct singular/plural. Fail: any third prompt, generic named-client button, duplicate or wrong client.

If any step fails, send me: the exact send/tap time, which button you pressed, and the assistant's response or screenshot.
