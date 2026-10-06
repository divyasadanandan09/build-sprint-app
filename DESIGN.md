# DESIGN.md
Read this before building or changing anything the trainer sees. If a choice isn't covered here, ask me instead of guessing.
PRODUCT.md decides what the product does. This file decides how it looks and what it says. If they disagree, stop and ask.

## 0. What we're building
- **Two surfaces.**
  - **A. Landing page.** It sells the product to trainers. Its button opens the agent's WhatsApp chat.
  - **B. The agent, a WhatsApp chat.** The trainer uses it every day. There is no app and no web dashboard in v1.
- **How the agent runs.** WhatsApp Business Platform (Cloud API) on one number, `{agent number}`. Messages come in through a webhook to our Convex backend, and replies go out through the Cloud API.
- **Who talks to the agent.** Only the trainer. Clients never message the agent and never see it. Every message a client gets is sent by the trainer, from her own WhatsApp.
- **Names.** "Mayuri" (trainer) and "Priya" (client) are examples. In the build they are variables: `{trainer}` and `{client}`.
- **Languages.** Clients reply in Kannada, Hindi or English, by voice note or text. The agent talks to the trainer in English.
- **Account.** The trainer's WhatsApp number is her account. No login, no OTP.

## 1. The feeling
- **Visual (landing page):** Muted neutral base, one lime accent, with a foreground layer that overlaps the subject.
- **Voice (agent):** a calm coach at the trainer's shoulder. It tells her who to talk to and what to say, then gets out of the way. It is comforting, guiding, encouraging and confident.

## 2. Landing page references, one per component
Screenshots live in `refs/`. Open the file before building the component.
- Hero: `refs/hero-coverflow.png`
- Highlighted sub-sections: `refs/highlight-marker.png`
- Testimonial examples: `refs/testimonial-inset-card.png`
- Illustrations: `refs/empty-line-art.png`

**Hero** (reference: mental health coverflow)
- **Take:**
  - The coverflow layout: a centre card in focus, with side cards angled back (rotateY around 25°) and scaled down to about 85%.
  - Cards slide in from the left on load: 400ms, `cubic-bezier(0.16, 1, 0.3, 1)`, 80ms stagger between cards.
- **Each card is a chat bubble from a society group thread.** Mix four types:
  - A before/after photo
  - A text message
  - A voice note (waveform + duration)
  - A short video (thumbnail + play icon)
- **Ignore:**
  - That every card in the reference is a video.
  - The device frame, if it crowds the cards.
  - Any WhatsApp logo, WhatsApp green or pixel-copied WhatsApp UI. Use generic chat-thread styling: bubble, sender name, timestamp, double tick.

**Highlighted sub-sections** (reference: "Your 20s don't come with directions")
- **Take:** hand-drawn marker outline around the subject, and a circled handwritten annotation. Both in lime, drawn in the script font or as SVG strokes.
- **Ignore:** the bold headline style (type is set in section 3), the alarm clock icon and the hashtag.

**Testimonial examples** (reference: GoWork)
- **Take:** an inset UI card on a full-bleed photo, with ~16px radius and a soft diffuse drop shadow (large blur, about 12% opacity).
- **Use it to show** clients mid-routine (on the stairs, at the stove, on a walk) sending a voice note or a quick text. The point is that recommending takes ten seconds.
- **Ignore:** the office backdrop, the star rating and the "Book Now" button.

**Illustrations** (reference: Skyioneer)
- **Take:** white-fill line-art figures with black outlines.
- **Use only** in the "How it works" section. Never in the hero or the testimonial sections.

## 3. Type, colour and motion (landing page only)
The agent has no visual design of its own. It looks like WhatsApp because it is WhatsApp. Its design is its words, in section 4.

**Fonts**
- Headlines: **Space Grotesk Bold**.
- Body and UI: **Space Grotesk Regular / Medium**.
- Annotations only: **Caveat**. Never use it for buttons, labels or body text.

**Sizes (px)**
| Role | Mobile | Desktop |
|---|---|---|
| Headline | 36 / line height 42 | 48 / 54 |
| Subheading | 22 / 28 | 24 / 32 |
| Body | 16 / 24 | 18 / 28 |
| Caption | 13 / 18 | 14 / 20 |

**Colours**
| Token | Hex | Use |
|---|---|---|
| Base | #F6F3EE | Page background (warm off-white) |
| Surface | #FFFFFF | Cards, chat bubbles |
| Text | #1C1B19 | All primary text |
| Text secondary | #6B6760 | Timestamps, helper text |
| Border | #E4DFD7 | Dividers, card outlines |
| Lime | #C6F432 | Primary CTA fill (with #1C1B19 label), annotations |
| Maroon | #8A1C2B | Errors only |

- **Lime is never used as text on the light base.** It fails contrast.
- **One lime button per viewport:** the primary CTA. Annotations may also use lime.

**Motion**
- Default: 250ms, `cubic-bezier(0.16, 1, 0.3, 1)`.

## 4. The agent's messages
**Rules for every message**
- **Owner clarification, 6 Oct:** recommendations keep the client speaking as “I” and refer to instructor Mayuri in third person. Longer recommendations use blank lines between paragraphs; highlight a small number of the client’s own phrases about body metrics or overall feelings using WhatsApp single-asterisk bold. Never invent a change, result or feeling.
- **One action per message.** Use WhatsApp reply buttons (max 3, titles max 20 characters) or one URL button (text max 20 characters). Never ask her to type a command.
- **Short.** No message over 6 lines, except a draft she is going to send.
- **Drafts for clients go in their own message**, with nothing else in it, so she can long-press and forward or copy it whole.
- **Owner update, 6 Oct:** show the recommendation and personalized ask as two separate plain-text messages, with separate URL buttons, each containing only its own draft. The first button says **Send revised review**. The second button says **Ask client to post**, as approved by the owner. WhatsApp’s URL button cannot deliver two separate messages in one tap.
- **Sending to a client** always uses a URL button, **Send to client**, that opens `https://wa.me/?text={draft}`. WhatsApp asks her which chat to send to. We never need the client's number.
- **Slow replies:** if a reply will take more than 3 seconds, show the typing indicator. Never send a "please wait" message.
- **Anything she types that the agent doesn't understand** gets: "I didn't catch that. You can paste a review, forward a client's reply, or tell me a new client's name and start date."

### 4.1 First message (onboarding)
- **Trigger:** she opens the chat from the landing page link. The link prefills "Hi" so her first tap is send.
- **Purpose:** first value inside her first minute. She pastes one review she already has and reads a draft she'd actually send.
- **We ask for one review, copied and pasted. Nothing else.** No client list, no join dates, no contact access, no settings.

| Moment | Agent says |
|---|---|
| Welcome | Hi! I help your happy clients recommend you in their society groups. Paste one Google review a client left you, or forward something a happy client said. |
| She sends a review | (typing indicator) |
| Draft 1 | The recommendation, in the client's own words, in its own message. |
| Draft 2 | The ask, in her voice, in its own message. Example: "Priya, thank you for your lovely review! I turned your words into a short note. Would you be okay sharing it in your society group?" |
| Then | Priya's tweaked review to be shared in society wa group. forward review to Priya. [Send to client] |
| Error | I couldn't read that one. Paste it as text, or try a different review. |

- **The recommendation follows the cleaning rules in 4.5.** Never add a claim she didn't make.
- **Owner update, 6 Oct:** never automatically ask who's coming up on four weeks after a review. The instructor initiates client additions by sending `New client Ananya joined on 12 Sept`. The earlier `Ananya, 12 Sept` format also works.
  - Done: "Got it. I'll remind you when Ananya hits week 4, on {date}."
  - Error: "I need a name and a date, like: Ananya, 12 Sept."
- **Conversational review trigger:** the instructor can send `This is a review`, then paste the review in her next message, or send `This is a review: {review}` together. The invitation response is `[COPY NEEDED: conversational invitation to paste a review after the instructor says This is a review]` until the owner supplies its exact wording. A name label accepts spaces around its colon.

### 4.2 The daily nudge
- **Trigger:** 9am on any day one or more clients reach their wait period (4 weeks by default). Never earlier.
- **This is a Meta-approved utility template**, because the agent is messaging her first. Submit it for approval in week 1 of the sprint.
- **One message per client**, so each has its own button. Owner clarification, 6 Oct: combine the nudge line and check-in draft in that one message, separated by a blank line, with Send to client underneath. The button opens only the check-in draft. This overrides the separate-draft-message rule for nudges only.

| Moment | Agent says |
|---|---|
| Nudge | Priya hits week 4 today. Here's a check-in in your voice. |
| Draft | Hi Priya, it's Mayuri! You've done 4 weeks now, how's it feeling? |
| Button | [Send to client] |
| No one due | Send nothing. Silence is the empty state. |

- **This is a check-in, not a testimonial ask.** The reply decides what happens next.
- **M3 missing copy:** an overdue client needs `[COPY NEEDED: nudge for {name}, whose four-week date was {date}]`; never use the "today" nudge for a past date. Dev can use this placeholder; production catch-up waits for approved overdue template copy.
- **Who's due?** lists clients whose four-week dates fall in the current Monday–Sunday week, using IST. Each line currently uses `[COPY NEEDED: due-this-week line for {name}, due {date}]`; an empty list uses `[COPY NEEDED: no clients due this week]`. No scheduled nudge is sent when no client is due.
- **Unknown instructor name:** the check-in uses `[COPY NEEDED: check-in when the instructor name is unknown]`. Otherwise the instructor's stored WhatsApp profile name replaces Mayuri in the check-in example.

### 4.3 No reply
- **Trigger:** 3 days after a check-in or a recommendation ask, if she hasn't forwarded a reply.
- Agent says: "No reply from Priya yet. Want to send one gentle reminder?" [Send reminder] [Leave it]
- **Reminder draft:** "Hi Priya, just checking in again. No rush at all!"
- **One reminder per ask, ever.** After that, the agent drops it and says nothing more.

### 4.4 She forwards a client's reply
- **Input:** a forwarded voice note or text, any language, any length.
- **Forwarded messages don't show who sent them.** So the agent asks first:
  - One client waiting: "Is this Priya's reply?" [Yes] [Someone else]
  - Several waiting: a WhatsApp list message, "Whose reply is this?", with the waiting clients' names.
- Then the typing indicator, then one of the three outcomes in 4.5.
- **Error:** "I couldn't hear that voice note clearly. Forward it again, or paste her words as text."
- **Can't tell how she feels:** "I couldn't tell how Priya feels from this. Which is closer?" [Happy] [Short reply] [Not happy]

### 4.5 Three outcomes

**Happy client**
- **Cleaning rules:**
  - Fix grammar and trim.
  - Never add a claim, feeling or detail she didn't say.
  - Keep her language.
- Agent says: "Priya's happy! Here's her recommendation in her own words, with the ask. I only cleaned up grammar."
- **Draft (one message, ask and recommendation together):**
  > Priya, so happy it's working for you! I put your words together below. Would you be okay forwarding it to your society group?
  >
  > "I've been doing Zumba with Mayuri for a month now. My knees don't hurt on the stairs anymore and I actually look forward to mornings. Message her for a free demo: wa.me/{trainer number}"
- **The link is a plain wa.me link to the trainer's own number.** No tracking links in v1.
- Button: [Send to client]

**Reply too short** (e.g. "Good! Loving it 😊")
- Agent says: "Priya's reply is short. One easy question will help her say more. Pick one:"
- Reply buttons, max 20 characters each:
  - [What's changed?] → "What's changed for you since you started?"
  - [What's easier now?] → "What's easier now than in week 1?"
  - [What do you enjoy?] → "What do you look forward to in class?"
- Then the chosen question as a draft, with [Send to client].
- **One follow-up only.** If the next reply is still short, draft from what's there.

**Unhappy client**
- Agent says: "Priya isn't enjoying it yet. Talk to her before anything else. Here's what she said:" followed by her words.
- **Draft:** "Thanks for telling me honestly, Priya. Can we talk after Thursday's class? I want to make this right."
- Button: [Send to client]
- **Nothing is drafted for sharing, and no ask ever goes to Priya** until the trainer replies "Priya is happy now."

### 4.6 Did she post it?
- **Trigger:** 2 days after a recommendation ask is sent.
- Agent says: "Did Priya share her recommendation?" [She posted it] [She said no] [Not yet]
- **She posted it:** "🎉 Priya's society just heard about you from a neighbour. That's 3 this month."
- **She said no:** "No problem. Here's a thank-you." Draft: "No worries at all, Priya! Thank you for telling me how it's going. See you Thursday." [Send to client]. No further asks to Priya.
- **Not yet:** ask once more in 3 days, then stop.
- **We do not read WhatsApp groups.** The trainer tells us what happened.

### 4.7 Commands she can type any time
- "Add Ananya, 12 Sept": adds a client.
- "Who's due?": lists clients due this week, one line each.
- "Priya is happy now": unpauses Priya after an unhappy reply.

### Parked (not v1, do not build)
- Tracking links, link taps, or attributing enquiries to a post.
- Reading or monitoring any WhatsApp group.
- The agent messaging clients directly. Only the trainer messages clients.
- A web app or dashboard for the trainer.
- Instagram content, a testimonial library, brand templates.

## 5. Landing page first screen
- **Headline:** Your happy clients already know your next ones.
- **Under it:** We tell you who to ask and when. They reply by voice note. Their society group sees a neighbour's word, not your ad.
- **Button:** Paste one review. It opens `https://wa.me/{agent number}?text=Hi`.

## 6. Principles (check every message against these)
1. **Never add words the client didn't say.** Clean, trim, fix grammar. Nothing new.
2. **The trainer always sends.** No message reaches a client or a group from the agent.
3. **One action per message.** If a message needs two, it's two messages.
4. **Voice notes are first-class.** Any language, any length. Text is never the "proper" option.
5. **An unhappy client is never asked to share.** The flow stops until the trainer says otherwise.
6. **Tone:** comforting, guiding, encouraging, confident. Say what to do next, never what went wrong without a fix.
