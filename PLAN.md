# PLAN.md
One milestone at a time, in this order. Each one works end to end before the next starts.
Build window: today, 6 Oct, about 7am to 3:30pm IST. Mayuri goes live once Meta approves the nudge template.

## Before and alongside Codex (by me, not Codex)
Order: do step 1 first and start Codex on M0 and M1. Do steps 2 to 4 while Codex builds. Step 5 happens during M2.

**Which number does what**
- Agent's number (sends replies): Meta's free test number today, the new SIM before Mayuri goes live.
- My personal number: the number I test from, chatting with the agent the way Mayuri will. It can't be the agent's number; registering it with the API removes it from my WhatsApp app.
- M1 needs no WhatsApp number at all.

**Keys never go into Codex or any chat.** I set each one myself in the Convex dashboard: Settings > Environment Variables, for dev and for prod.

### 1. OpenAI and Sarvam keys (10 min, needed for M1)
- [x] platform.openai.com: project `build-sprint-agent` created, API key created. This is `OPENAI_API_KEY`.
- [x] `OPENAI_API_KEY` set in Convex environment variables (dev). Add it to prod after M0 creates prod.
- [x] $5 prepaid credit added and $5 monthly budget set. This is separate from my ChatGPT Pro plan.
- [ ] dashboard.sarvam.ai: create an API key. This is `SARVAM_API_KEY`. Set its budget.
- [ ] Save 5 of Mayuri's real Google reviews and 1 real voice note on my laptop, outside this repo, for checking M1 by hand.

### 2. Meta app and test number (20 min, needed for M2)
Meta renames menus often; labels may differ slightly.
- [ ] developers.facebook.com > My Apps > Create App. Pick the WhatsApp use case ("Connect with customers through WhatsApp"). Create a business portfolio when asked.
- [ ] WhatsApp > API Setup: note the **test number** and its **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`). The temporary access token there lasts 24 hours only.
- [ ] In the "To" field, add my personal number and enter the code WhatsApp sends. Add Mayuri's number too (up to 5 numbers allowed).
- [ ] Send the sample `hello_world` message. If it reaches my phone, this part works.

### 3. A token that doesn't expire (10 min, before the build day ends)
- [ ] Business Settings > System users: add an admin system user and assign it my app.
- [ ] Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`. Copy it now; Meta shows it once. This is `WHATSAPP_TOKEN`.
- [ ] App settings > Basic: copy the App secret. This is `WHATSAPP_APP_SECRET`.
- [ ] Make up a long random phrase. This is `WHATSAPP_VERIFY_TOKEN`.

### 4. Nudge template (5 min, needed only for going live)
- [ ] WhatsApp Manager > Message templates > Create template.
- [ ] Category: Utility. Name: `week4_nudge`. Language: English.
- [ ] Body: `{{1}} hits week 4 today. Here's a check-in in your voice.` Sample value for {{1}}: `Priya`.
- [ ] Submit. Approval takes minutes to a day and doesn't block today's build.
- [ ] Order a SIM for the agent's real number.

### 5. Webhook (during M2, Codex gives me the URL)
- [ ] WhatsApp > Configuration: paste the callback URL Codex gives me (ends in `.convex.site`) and my `WHATSAPP_VERIFY_TOKEN`.
- [ ] Subscribe to the **messages** field.

## Rules for today
- **Timers run in minutes in dev.** Every timed step (9am nudge, 3-day reminder, 2-day "did she post?") reads its delay from one config value, so dev uses minutes and prod uses days.
- **The nudge sends as a normal message in dev.** I'll have messaged the agent within 24 hours, so WhatsApp allows it. Prod switches to the approved template.
- **Stop rule:** if M1 drafts aren't good enough to send by 9:30am, stop and fix them. Don't start M2 on bad drafts.
- **If time runs out,** drop M6 first, then M5. M1 to M4 are the product.

## M0. Set up (7:00 to 7:30am)
Git repo, public GitHub repo, `npm run deploy` script, Convex dev and prod deployments, all keys in Convex environment variables, .gitignore covering .env.local.
Done when: an empty Convex function deploys to prod, and the repo shows no keys.

## M1. The drafts are good (7:30 to 9:30am). The riskiest part, no WhatsApp yet.
A Convex action takes a review or reply (text) and returns the recommendation, the ask, and a read: happy, short or unhappy. It follows the cleaning rules in DESIGN.md 4.5.
Done when: Mayuri's 5 real reviews (plus 1 transcribed voice note) produce drafts she'd send without editing, with nothing invented. I check these by hand; the repo's tests use made-up examples only.

## M2. Paste a review in WhatsApp, get drafts back (9:30 to 11:00am)
Webhook with signature check, trainer created from her number, DESIGN.md 4.1 end to end, with instructor-initiated client additions and conversational review triggers. Owner update, 6 Oct: no automatic next-client question after reviews.
Done when: from my phone, I paste a review and get both drafts and a working Send to client button within a minute. I close WhatsApp, come back, and my client is still saved.

Status, 6 Oct: owner confirmed M2 and authorized commit, push and production deploy. 40 mocked tests, compile and demo pass. Meta webhook and Business-account subscription were repaired; real phone review flow was tested by owner. Latest CTA labels: Send revised review / Ask client to post. Client additions are instructor initiated. Missing invitation and unnamed-client copy remain listed in M2_NOTES.md; M1’s full real-review quality check is still unverified.

## M3. Clients and the daily nudge (11:00am to 12:00pm)
Add a client by message ("New client Ananya joined on 12 Sept", "Add Ananya, 12 Sept", or the existing short format), the nudge (DESIGN.md 4.2), and the "Who's due?" command.
Done when: a test client whose wait period has passed gets a nudge, and its Send to client button opens WhatsApp with the check-in.

Status, 6 Oct: M3 built and deployed to dev; 51 mocked tests pass, compile passes, real minute cron sent a made-up client’s nudge/check-in/button (Meta accepted all three), repeated ticks sent nothing more. Owner screenshot confirmed the original three messages arrived; updated per owner to one combined nudge/check-in message with a blank line and button. Owner confirmed the combined nudge on phone and approved M3. BLOCKED: no week4_nudge template exists in Meta; production nudges remain disabled. Due-list, empty-list, overdue-nudge and missing-instructor-name wording are placeholders in DESIGN.md. M3 approved for commit, push and production deployment; scheduled production nudges remain gated until Meta template approval. No M4 work.

## M4. Forwarded replies (12:00 to 1:30pm)
Voice notes through Sarvam, "whose reply is this?", and the three outcomes in DESIGN.md 4.4 and 4.5.
Owner clarification, 6 Oct: when a testimonial is too short, guide the instructor to ask the client to elaborate on changes she notices in herself, so the recommendation reflects more of her experience. Use DESIGN.md 4.5's existing short-reply choices and exact follow-up drafts, one follow-up only; never fill in missing results or feelings. Build this in M4, keeping M2 limited to its current scope.
Done when: a forwarded Kannada voice note, a short text and an unhappy text each get the right outcome and draft.

Status, 6 Oct: M4 built and deployed to dev; 75 mocked tests, compile and mocked Kannada exchange pass. One real generated-English Sarvam transcription and one grounded real OpenAI draft pass (2 real AI calls). Voice bytes remain in memory only; one short follow-up, client selection and unhappy pauses are enforced. Phone Kannada/selector check and owner confirmation pending; placeholders and choices in M4_NOTES.md. M4 uncommitted; no M5/M6.

Update, 7 Oct: owner confirmed selector/happy draft delivery and reported direct-review/bold-input issues. Named direct reviews now use one combined draft/button, contact link removed and bold input normalized; 79 mocked tests/compile pass, dev deployed, phone recheck pending.

Update, 7 Oct: owner confirmed M4 and final session wording; 82 mocked tests pass. M4 approved for commit, push and production deployment.

## M5. Follow-ups (1:30 to 2:30pm)
The reminder (once), "Did she post it?", said-no thank-you, "Priya is happy now", and the "I didn't catch that" fallback.
Done when: with dev timers in minutes, each follow-up fires once and never twice.

## M6. Landing page (2:30 to 3:30pm)
Landing page per DESIGN.md sections 2, 3 and 5. Its button opens the agent chat with "Hi".
Done when: I open the live link on my phone, on mobile data, and the button opens the agent chat.

## Going live with Mayuri (after today's build)
- [ ] Nudge template approved by Meta. Prod sends it at 9am IST.
- [ ] Agent moved from the test number to the real SIM number. Landing page link updated.
- [ ] Mayuri opens the link on her phone, on mobile data, and gets her first drafts from her own review.

## After the sprint
Mayuri runs it for 2 weeks without me in the loop. Success = she acts on 3+ nudges unprompted in week 2, and one enquiry mentions a neighbour's post.

## Parked
(Add anything new that comes up mid-milestone here.)
