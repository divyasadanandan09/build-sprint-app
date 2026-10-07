# M5 — Correct a posting answer

Cause: the first answer marked the question complete. The old handler accepted only awaiting questions, so other buttons on the completed question were ignored. The owner's screenshot confirms the posted celebration and then silent alternative taps.

Owner-requested correction is deployed to dev only. No commit, push or production deploy.

## Proof

- Two new signed-webhook regression checks failed before the fix: M5_STATUS_CHANGE_BEFORE.txt (`2 failed | 23 skipped`).
- Full mocked suite after the fix: `Test Files 6 passed (6)` / `Tests 113 passed (113)`, actual output M5_STATUS_CHANGE_TEST_OUTPUT.txt.
- Three new checks cover confirmation before state/count changes, decline-to-posted reversal, cancellation, cross-trainer rejection, obsolete/repeated confirmations, Not yet's one-repeat limit, and correcting the original month's count across the IST month boundary.
- Backend/frontend compile pass: M5_STATUS_CHANGE_CHECK.txt. Latest dev functions ready at 10:30:42: M5_STATUS_CHANGE_DEPLOY_OUTPUT.txt.
- WhatsApp, OpenAI and Sarvam are mocked in tests. No real AI call or real WhatsApp send was made for this correction. The owner's new phone confirmation is pending.

## Choices / conflicts

1. Apply a different answer only after Yes, either a button tap or typed `Yes` in response to the latest confirmation. Leave it or typed `No` retains the saved answer; tapping the same saved option still does not duplicate the step. A typed answer is only associated when the latest delivered assistant message is that confirmation.
2. Reuse existing approved Yes / Leave it labels. New messages remain explicit copy-needed placeholders; no new trainer wording was invented.
3. A confirmed posted-to-other correction subtracts from the original posted month, not today's month. Confirming posted again adds once in the current month. Counts cannot become negative.
4. Said no replays the approved thank-you draft. Not yet resumes the one remaining repeat if unused, never resets the repeat/reminder limit. Posted uses the approved celebration with the corrected count.
5. Confirmation is scoped to trainer, question, current draft and answer revision. A newer conflicting selection replaces its previous confirmation; old or repeated Yes taps cannot overwrite a newer answer.
6. Preserve existing data with optional fields; completed questions sent before this deploy infer the saved outcome from their flow. A new pasted review still cannot undo a refusal. The owner's explicit confirmed correction can undo a wrongly recorded refusal; this supersedes PRODUCT's earlier final-refusal rule only for this correction path, recorded in PRODUCT/DESIGN.

## Missing copy

- `[COPY NEEDED: {name} already marked {previous}; confirm change to {target}]`
- `[COPY NEEDED: {name} status changed to Not yet]`

## Phone check / How to test this yourself

1. Open the assistant WhatsApp chat and its existing “Did Nia share her recommendation?” question. Tap **Nia said no** after the previously saved posted answer. Expect a COPY NEEDED confirmation showing the saved and requested outcomes, plus **Yes** / **Leave it**. Fail: silence, an immediate thank-you, or a count change before Yes.
2. Tap **Leave it**. Expect the saved posted answer and count to stay unchanged; no new thank-you. Tap **Nia said no** again, then **Yes** on the newest confirmation. Expect the approved thank-you draft with **Send to Nia**. Fail: no thank-you, a different client, or a repeat thank-you after tapping that same Yes again.
3. On the original question tap **Nia posted it**, then **Yes** on the new confirmation. Expect the celebration with the corrected count, without counting Nia twice. Fail: no celebration or an extra count for the same active posted record.
4. Tap **Not yet** on the original question, then **Yes**. Expect the status-changed COPY NEEDED acknowledgement and, if Nia's repeat was unused, one posting question after three to four minutes. A previously used repeat stays stopped. Fail: two repeat questions, an unrelated no-reply reminder, or a changed count before confirmation.
5. Open Terminal and run `npm --prefix /Users/divyaabhilash/build-sprint-app test`. Expect **113 passed** across six files. Fail: any failed test or command error. This command uses mocks and sends no real messages.

If any step fails, send me: the step number, exact tap time, the response or screenshot, and full failed command output. Never send an API key.
