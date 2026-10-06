# AGENTS.md

## 1. How the product works
Interface: WhatsApp. The trainer chats with our agent on its own WhatsApp number. The one thing she does there: paste a client's review or forward a client's reply, and get back a draft to send from her own WhatsApp. The landing page is a single web page whose button opens that chat.

Business logic:
- Every message she sends hits a webhook. The agent works out what it is (a review, a forwarded reply, a new client, a command), runs the AI call and replies with a draft and one button.
- A daily job at 9am IST sends each trainer a nudge for every client who reached her wait period that day. Other timed jobs send the 3-day "no reply" reminder and the 2-day "did she post it?" question.

Database:
- trainers: WhatsApp number (her account), name, default wait period (28 days), date joined.
- clients: trainer, name, start date, wait period, status (due, checked in, short reply, happy, unhappy, asked, posted, said no, dropped), whether the one reminder has been used, date of last step.
- replies: trainer, client, text or voice, transcript, the AI's read (happy, short, unhappy), date. Voice files are deleted once transcribed. We keep only the transcript.
- drafts: client, kind (recommendation, ask, check-in, follow-up, reminder, unhappy reply, thank-you), text, date created.
- pending: what the agent is waiting on from each trainer (e.g. "which client is this reply from?"), so a button tap or a short answer lands in the right place.

Third party:
- WhatsApp Cloud API (Meta): receives her messages and sends the agent's replies and the daily nudge template. Keys: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET.
- OpenAI API (gpt-6.1-sol): reads replies and writes drafts. Key: OPENAI_API_KEY.
- Sarvam AI (speech to text): turns Kannada, Hindi and English voice notes into text. Key: SARVAM_API_KEY.
- Every key lives in Convex environment variables, dev and prod.

Not in v1: a login or web dashboard, the agent messaging clients, reading or monitoring WhatsApp groups, tracking links, payments, Instagram content, a testimonial library.

When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.

## 2. How we work
- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before writing any message the trainer sees or any part of the landing page.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (a test, or a real message exchange with the agent) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file.
- Every word the trainer sees comes from DESIGN.md, word for word. If a message isn't written there, ask me for the words. Never write your own.
- We can't see when she taps a "Send to client" button; WhatsApp doesn't report URL button taps. Treat the time a draft is created as the time it was sent.

## 3. Shipping
Live link: [TO FILL: prod .convex.site link, after the first deploy]
Repo: [TO FILL: github.com/you/your-repo], public
Deploy: npm run deploy (runs npx convex deploy). A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, OPENAI_API_KEY and SARVAM_API_KEY live in Convex environment variables, set for dev and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste them into chat.
.gitignore covers .env.local.
Real people's data (chats, names, phone numbers, voice notes) never goes in the repo, not even as a test file. Tests use made-up examples.
Every limit and every "is this allowed" check happens in a Convex function, never only in a message. The webhook rejects any request whose signature doesn't match WHATSAPP_APP_SECRET.
Before I share the link: I message the agent from a number that has never used it, on mobile data, and do the core flow once: paste a review, get both drafts, tap Send to client.

## 4. The AI call
Model: gpt-6.1-sol (OpenAI Responses API), reasoning effort low
What goes in, and its limit: one review or reply, at most 2,000 characters of text or a 2-minute voice note (transcribed by Sarvam first). Longer voice notes get "That one's long. Forward a shorter part, or paste her words as text."
Where it runs: a Convex action. Never in the interface.
Key: OPENAI_API_KEY in Convex environment variables, dev and prod. This is an API platform key, billed per token. It is not covered by my ChatGPT Pro plan.
Reply cap: max_output_tokens 1,500 (reasoning tokens count toward this cap, so it sits higher than the visible reply needs)
Calls cap: at most 100 AI calls an hour across the app, checked in the kitchen (Convex rate limiter)
Provider limit: a hard monthly budget of [$20] on the OpenAI API project, and [$10] on Sarvam, set by me
When a cap is hit or the call fails: the agent sends "I'm a bit busy right now. Try again in a few minutes."
Login: none. Her WhatsApp number is her account, and WhatsApp has already verified it.
The AI must never:
- Add a claim, result, feeling or detail the client didn't say.
- Give medical, injury, diet or weight-loss advice, even if a client mentions pain or kilos.
- Write anything addressed to someone other than the trainer or her client.
- Answer off-topic questions. It replies with the "I didn't catch that" line from DESIGN.md.
- Show one trainer anything about another trainer's clients.
