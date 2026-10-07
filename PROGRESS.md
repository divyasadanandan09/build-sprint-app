# PROGRESS.md
One line per milestone, added after I confirm it works: date, milestone, what now works.

- 6 Oct, setup: OpenAI project `build-sprint-agent` created, $5 credit and $5 monthly budget set, `OPENAI_API_KEY` set in Convex dev. Build started.
- 6 Oct, M0: Git/public GitHub repo and deploy command set up; empty function deployed and checked on dev/prod, compile and secret-pattern checks pass; provider keys still missing (see M0_NOTES.md), awaiting owner setup and confirmation; no commit or push.
- 6 Oct, M2: signed webhook and saved trainer/draft/client flow pass 25 mocked tests; fixed missing Agent review identity and verified one live AI draft; dev compiled/pushed, keys present dev/prod and owner reports Meta lock resolved; app has zero webhook subscriptions, so owner callback setup and phone proof remain pending; no commit/GitHub push, prod deploy or later milestone.

- 6 Oct, M2 bug fix: emoji reactions no longer trigger unreadable-review replies; emoji-only text and `say thanks` use DESIGN fallback, detailed reviews preserve emojis; 32 mocked tests pass, compile passes, deployed to dev; phone recheck pending, no commit or push.

- 6 Oct, M2 fix: plain thanks and thank you now use the DESIGN fallback; punctuation/emoji variants covered, 32 mocked tests and compile pass, dev deployed; phone recheck pending, no commit or push.

- 6 Oct, M2 draft refinement: client-I/instructor-third-person wording, blank-line paragraphs and up to two grounded bold phrases now covered by 35 mocked tests; compile passes, deployed to dev at 15:21:53 IST; phone proof pending, no commit or push.

- 6 Oct, M2 sharing fix: separate recommendation/ask URL buttons preserve two client messages; 35 mocked tests and demo pass, compile passes, dev deployed; phone check pending, no commit or push.

- 6 Oct, M2 copy tweak: replaced recommendation sharing instruction with owner's exact wording in DESIGN and WhatsApp copy, substituting the actual client name; 35 mocked tests and compile pass, dev deployed; no commit or push.

- 6 Oct, M2 CTA copy: second ask button names the client (Send to Priya), with existing label fallback for missing/long names; 35 mocked tests and compile pass, dev deployed, no commit or push.

- 6 Oct, M2 refinements: spaced name labels/direct-address reviews accepted, automatic next-client prompts removed, instructor-initiated clients retained, natural review trigger added with missing invitation copy listed; 38 mocked tests and compile pass, dev deployed, phone recheck pending; no commit or push.

- 6 Oct, M2 conversational client input: New client Ananya joined on 12 Sept saves the client, copied Unicode spacing handled, invalid dates rejected without AI; 40 mocked tests and compile pass, dev deployed; no commit or push.

- 6 Oct, M2 single CTA: separate testimonial/ask messages retained, one button opens only the testimonial and ask is forwarded manually; WhatsApp single-message link limitation explained; 40 mocked tests, compile and demo pass, dev deployed, no commit or push.

- 6 Oct, M2 two CTAs restored with approved labels Send revised review / Ask client to post; separate draft URLs verified, 40 mocked tests, compile and demo pass, dev deployed; phone check pending, no commit or push.

- 6 Oct, M2 confirmed by owner: signed WhatsApp review/draft flow, separate approved send buttons and conversational client input work; 40 mocked tests, compile and dev demo pass; owner authorized commit, push and production deploy, then M3.

- 6 Oct, M3: conversational client additions, trainer-scoped due lists and one-time check-in nudges work in dev; 51 mocked tests/compile/demo pass, real minute cron nudged a made-up client with all 3 messages accepted by Meta and no duplicates on repeat ticks; production blocked on approved template/missing copy, owner phone-button confirmation pending; M3 uncommitted, no M4.

- 6 Oct, M3 nudge layout: owner screenshot confirmed receipt; combined nudge and check-in into one message with blank-line spacing and one button that shares only the check-in, 51 mocked tests/compile/demo pass, dev deployed; no commit or push.

- 6 Oct, M3 approved by owner: combined check-in nudge and Send to client button verified on phone, clients/due lists and duplicate prevention pass 51 mocked tests; approved for commit/push/production deploy with production nudges gated until Meta template approval; no M4 started.

- 6 Oct, M2 compact messages: revised review/CTA and personalized ask/CTA now form exactly two messages, duplicated text/instructions removed, long drafts fit button-message limit via whole-sentence trimming; 52 mocked tests and compile pass, dev deployed for phone check; uncommitted, no M4.

- 6 Oct, M2 compact layout confirmed by owner screenshot: exactly two draft/CTA messages work on phone, 52 mocked tests and compile pass; owner requested M4 next.

- 6 Oct, M4: client identification, voice transcription, one short-reply follow-up and private unhappy routing built for dev; 75 mocked tests/compile/Kannada demo pass and 2 real AI checks pass using generated speech/made-up feedback; phone confirmation pending, choices/missing copy in M4_NOTES.md, no M4 commit/push or M5.

- 7 Oct, M4 review fix: owner phone screenshots confirmed client selection/happy drafts; named direct reviews now use one combined draft/button, appended contact links removed and bold markers normalized before recognition/AI; 79 mocked tests/compile pass, dev deployed, one additional real AI check (M4 total 3), phone recheck pending, no commit/push or M5.

- 7 Oct, M4 context refinement: owner requested explicit instructor/session attribution; every recommendation now carries Mayuri's sessions context while preserving the client's words, combined/unnamed button content and limits verified by 81 mocked tests; compile/dev deploy pass, no extra real AI calls, phone check pending, uncommitted.

- 7 Oct, M4 wording refinement: instructor/session context now flows naturally in eligible first-person reviews using the owner's attendance wording; exact music-review example, combined/unnamed button drafts and limits covered by 82 mocked tests; compile/dev deploy pass, no extra real AI calls, phone check pending, uncommitted.

7 Oct: Owner confirmed M4 including instructor/session wording; 82 mocked tests and compile pass. Approved for commit, push and production deploy; M5 next.
