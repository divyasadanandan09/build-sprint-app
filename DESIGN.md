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
- **Owner update, 6 Oct:** send exactly two draft messages: recommendation with its own URL button in the same message, then personalized ask with its own URL button in the same message. Each URL contains only its own draft. Do not send separate duplicate instructions or standalone copies of the drafts. The first button says **Send revised review**. The second button says **Ask client to post**, as approved by the owner. WhatsApp’s URL button cannot deliver two separate messages in one tap.
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
| Draft 1 | The recommendation, in the client's own words, with its Send revised review button in the same message. |
| Draft 2 | The ask, in her voice, with its Ask client to post button in the same message. Example: "Priya, thank you for your lovely review! I turned your words into a short note. Would you be okay sharing it in your society group?" |
| Error | I couldn't read that one. Paste it as text, or try a different review. |

- **The recommendation follows the cleaning rules in 4.5.** Never add a claim she didn't make.
- **Owner update, 6 Oct:** never automatically ask who's coming up on four weeks after a review. The instructor initiates client additions by sending `New client Ananya joined on 12 Sept`. The earlier `Ananya, 12 Sept` format also works.
  - Done: "Got it. I'll remind you when Ananya hits week 4, on {date}."
  - Error: "I need a name and a date, like: Ananya, 12 Sept."
- **Conversational review trigger:** the instructor can send `This is a review`, then paste the review in her next message, or send `This is a review: {review}` together. The invitation response is `[COPY NEEDED: conversational invitation to paste a review after the instructor says This is a review]` until the owner supplies its exact wording. A name label accepts spaces around its colon.

- **Owner correction, 7 Oct:** when a direct review includes the client's name, return one combined ask/recommendation message using 4.5's exact happy-ask wording, with one Send to client button. This supersedes the separate Draft 1 / Draft 2 layout above for named reviews. Reviews without a client name retain the earlier separate drafts and missing-name placeholder.
- **Formatting input:** WhatsApp `*bold*` and pasted Markdown `**bold**` are presentation. Remove paired markers before recognizing the trigger/name or reading the review; keep the words, punctuation and paragraph breaks. Outgoing emphasis still follows the existing grounded-highlight rules.

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

- **M4 implementation choices, 6 Oct:** forwarding or sending a voice note starts client selection. Pasted text can also use `This is a reply: {text}`. A named short or unhappy pasted review enters these outcomes too. With no waiting clients, ask for a name with the placeholder below; the trainer's typed name identifies the reply without inventing a start date. A plain next text after the chosen follow-up continues that client's conversation; a forwarded next reply asks whose reply it is again.
- **M4 missing copy:** `[COPY NEEDED: forwarded reply with no waiting clients; ask for the client name]`, `[COPY NEEDED: list]` (list-opening button, max 20 characters), `[COPY NEEDED: more]` (next page), `[COPY NEEDED: voice note longer than two minutes]`, `[COPY NEEDED: voice transcript exceeds 2,000 characters]`. AGENTS.md's two-minute / 2,000-character limits take precedence over the earlier "any length" wording; the rejection words are not in DESIGN, so use these placeholders.
- **Grounding correction:** the free-demo sentence in the example below is illustrative, never an offer to add. PRODUCT.md prohibits invented claims. Owner correction, 7 Oct: use only the client's grounded recommendation; do not append a contact link.

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
  > "I've been doing Zumba with Mayuri for a month now. My knees don't hurt on the stairs anymore and I actually look forward to mornings. "
- **Owner correction, 7 Oct:** no contact link is appended to the draft. The Send to client button still opens WhatsApp with the approved draft; that button link is separate from the recommendation text.
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

### Owner-requested M5 status correction, 7 Oct
- After a posting question has been answered, tapping another outcome asks for confirmation before changing it. Buttons: **Yes** and **Leave it** (keep the saved answer). Typed Yes or No also answers the latest delivered confirmation.
- Exact confirmation copy is missing: `[COPY NEEDED: {name} already marked {previous}; confirm change to {target}]`.
- Yes applies the newly selected step: posted celebration, said-no thank-you, or the remaining Not yet repeat. Not yet acknowledgement: `[COPY NEEDED: {name} status changed to Not yet]`.
- Do not reset the one-repeat or one-reminder limits. A correction away from posted removes that original month's count; a newly confirmed posted answer counts once. Duplicate/old confirmations cannot change the saved state.

## 5. Landing page first screen
- **Headline:** Your happy clients already know your next ones.
- **Under it:** We tell you who to ask and when. They reply by voice note. Their society group sees a neighbour's word, not your ad.
- **Button:** Paste one review. It opens `https://wa.me/{agent number}?text=Hi`.

### M6 implementation notes, 7 Oct
- The four `refs/` files are missing. The page follows the written component, type, colour and motion rules above.
- Preview messages use the approved fictional Priya/Mayuri example in 4.5. The lifestyle photo is generated, not a real client's testimonial. No before/after result is invented.
- Missing visible copy: `[COPY NEEDED: illustrative preview label]`, `[COPY NEEDED: approved before/after example]`, and the configuration-error message `[COPY NEEDED: landing chat link unavailable]`.
- “How it works” is the section name already specified in section 2; its three captions reuse the three exact sentences under the first-screen headline. The marker annotation reuses “a neighbour's word”.
- Footer link: **Privacy policy**, using the owner's earlier approved privacy-page title.

### Owner refinement, 7 Oct — carousel and society thread
- Replace the fixed hero layout with a continuous right-to-left four-card coverflow. Hover or keyboard focus pauses it and zooms out; touch toggles pause/resume, and an icon control provides a persistent pause. Reduced-motion preferences disable autoplay.
- Top-right captions use the existing section 2 type names: **before/after photo**, **text message**, **voice note**, **short video**.
- The second section shows the same approved fictional recommendation inside a generic society-group thread on the lifestyle photo. No logo, pixel-copied WhatsApp UI, real group data or invented neighbour replies.
- New missing copy: `[COPY NEEDED: society group name]`, `[COPY NEEDED: pause testimonial carousel]`, `[COPY NEEDED: resume testimonial carousel]`. The last two are accessible labels for the icon control.

### Owner-requested page rewrite and hover correction, 7 Oct
The owner explicitly requested rewriting the headline, introduction and How it works, and refining the reference group scene. These replace the earlier page words/layout.
- Headline: **Turn happy clients' words into local enquiries.**
- Introduction: **Know who to ask, and when. We help turn their feedback into a recommendation they can share in their society group, so more neighbours hear about your classes from someone they trust.**
- How it works, step 1 heading: **Ask the right client at the right time.** Body: **We tell you who to check in with and draft the message for you.**
- Step 2 heading: **Let clients share in their own way.** Body: **A text, a voice note, a photo or a video. They choose what feels natural to share in their society group.** This describes the client's own group post; it does not claim that the assistant reads images/videos.
- Step 3 heading: **Give neighbours a reason to enquire.** Body: **A neighbour's recommendation builds trust in your classes and helps others picture joining.**
- Preview label: **Fictional examples**. No real customer results or enquiry claims are implied.
- Keep the existing Paste one review. button and second-section headline.
- Put a Caveat annotation on each card, just above its top-right corner, moving with it. Use the existing four media type names, dark lettering with lime marker strokes for contrast.
- Give neighbouring cards a small gap. Pause the track on hover/touch, lift only the selected card, and leave other card scales unchanged.
- On phones a horizontal swipe moves one card, including with Reduce Motion enabled, so every example remains reachable without autoplay. Vertical page scrolling remains available.
- Group scene: original generic chat pattern and header, centered Priya message with illustrative 👍 ❤️ 🙌 reactions, and a cropped following preview. Never copy reference people's names, numbers, profile photos or messages into the page/repo.
- Missing trailing preview wording: `[COPY NEEDED: trailing testimonial preview]`.
- Owner approved made-up fictional audio/video demos. Label: **Fictional demo**. The voice note uses synthetic speech of the approved music/session example; video is an animated generated photo with that voiceover, not an actual client's recording.
- Demo description: **Animated photo with synthetic voice**. Media control labels: **Play fictional demo**, **Pause fictional demo**. If browser autoplay blocks sound, show **Tap to play**. Stop media on exit, selecting another card, or leaving the page; never promise audible hover autoplay on every browser.
- If video sound is blocked, start the video muted and show **Tap for sound**. Its button label is **Play fictional demo with sound**; a tap enables sound. Audio-only demos retain Tap to play.

## 6. Principles (check every message against these)
1. **Never add words the client didn't say.** Clean, trim, fix grammar. Nothing new.
2. **The trainer always sends.** No message reaches a client or a group from the agent.
3. **One action per message.** If a message needs two, it's two messages.
4. **Voice notes are first-class.** Any language, any length. Text is never the "proper" option.
5. **An unhappy client is never asked to share.** The flow stops until the trainer says otherwise.
6. **Tone:** comforting, guiding, encouraging, confident. Say what to do next, never what went wrong without a fix.


## Owner clarification, 7 Oct — instructor/session context

Every recommendation explicitly identifies the instructor and her sessions. For unnamed reviews, prefix the standalone recommendation with the same line and a blank line. For combined drafts, put the neutral context line `Mayuri's sessions:` inside the quoted testimonial, then a blank line and the client's grounded words. This is attribution only: never add a result, claim, type of class, duration or feeling. Keep the client speaking as I. Mayuri is the instructor specified by the owner's earlier clarification; do not substitute the tester's WhatsApp profile name. The approved combined draft is:

`{client}, so happy it's working for you! I put your words together below. Would you be okay forwarding it to your society group?`

`"Mayuri's sessions:`

`{recommendation}"`


## Owner wording correction, 7 Oct — natural first-person attribution

Supersedes the context heading for English first-person reviews about classes/sessions: weave the attribution into the sentence using `I've been going to Mayuri's sessions and {client's first-person words}`. The owner's approved example, with the singular grammar corrected, is `I've been going to Mayuri's sessions and I enjoy the music in the class. I look forward to every session.` Do not add a duration, class type, result or feeling. Keep already-explicit references to Mayuri intact. For a thin reply without an attendance statement or a non-English recommendation, keep the earlier neutral attribution rather than inventing attendance or translating. The combined ask and Send to client button remain unchanged.

## M5 missing copy and implementation notes, 7 Oct

- The timer questions and button labels use sections 4.3 and 4.6 exactly, replacing Priya with the actual client name. The posted count replaces the illustrative 3 with this trainer's real count for the current IST month.
- A said-no reply uses the approved thank-you introduction, a blank line, the approved thank-you draft and one Send to client button. The button contains only the thank-you draft. Leave it and Not yet have no extra acknowledgement message; none is specified here.
- `[COPY NEEDED: unhappy client unpaused; forward her fresh reply]`: confirms a successful is happy now command. No sharing draft is created until fresh client words arrive.
- `[COPY NEEDED: client was not paused or name was not found]`: handles an unknown name, an already-unpaused client or a client who declined to post.
- `[COPY NEEDED: client declined to post; keep this feedback private]`: introduces later feedback from a declined client, followed by her supplied words; no public ask or new timer is created.
- No approved Meta template copy exists yet for the timed reminder or posting question outside the 24-hour reply window. Those sends remain pending, with their blocking reason recorded, until a fresh trainer message opens that window.

## Owner correction, 7 Oct — one pending question and named buttons

Supersedes the earlier M5 parallel timers and generic labels for known clients. Once a recommendation/share ask is drafted, ask only `Did {name} share her recommendation?`; do not also send the no-reply reminder while awaiting the instructor's choice. No-reply reminders remain for private check-ins and short follow-up questions. The existing Not yet repeat remains once only.

- Named send buttons: `Send to {name}` for check-in, recommendation, short follow-up, reminder, private unhappy reply and thank-you drafts. Unknown-client buttons retain their existing labels.
- Posting buttons: `{name} posted it`, `{name} said no`, `Not yet`. The displayed name can be shortened to fit the 20-character button limit; the message and stored client identity retain the full name.
- Celebration: `{name}'s society just heard about you from a neighbour. That's {count} referral this month.` Use `referrals` when the real count is greater than one. No leading emoji. These counts mean instructor-confirmed recommendation posts, not tracked enquiries.
- URL send-button taps are not reported by Meta. Keep the existing draft-time posting timer unless the owner chooses a separate explicit send-confirmation step.


### Owner refinement: arched previews and group names, 7 Oct
- Hero stack follows a shallow arch: the central card is highest, side cards sit lower and tilt outward. Right-to-left motion, attached top-right annotations and individual hover lift remain.
- Public group name: `Engrace 2 Owners`. Trailing message, as supplied: `Can someone recommend a good PDR agency about ` (unfinished wording retained pending owner correction).
- Preview senders: Priya for text, Ananya for voice, Meera for video and the matching before/after card. The same person has the same name across those two formats. These are preview aliases.
- Replace visible `Fictional demo` with `Demo`, and `Fictional examples` with `Example previews`. Accessible media controls: `Play demo`, `Pause demo`, `Play demo with sound`.
- Retain exact explanation `Animated photo with synthetic voice` until an actual talking-to-camera video replaces the current animation. This is a demo, not a client recording.
- Actual speaking footage and matching before/after photographs have not been supplied. Keep `[COPY NEEDED: approved before/after example]`; do not imply a verified 5–10 kg result from appearance or manufacture customer proof. A confirmed result and permission to publish are needed for real client media.


### Owner update: generated before/after and group conversation, 7 Oct
- Headline and page title: **Turn client testimonials into new enquiries.**
- Group header contains only **Engrace 2 Owners**, without the Example previews subtitle. This is an illustrative page composition, not a captured live group or monitored messages.
- Ananya's message: **Can someone recommend a good pediatrician nearby?**
- Add a third message from Kavya, in reply to Priya: **@Mayuri, what are your batch timings?** The quoted preview repeats Priya's approved session recommendation; do not add a new testimonial claim. Timestamp **09:47**.
- Replace the before/after placeholder with a generated two-panel photo of the existing demo avatar, Meera. Exact panel labels: **Before**, **After**. Label: **Demo**; explanation: **AI-generated illustration**. Image alt text: **Generated before and after demo of Meera**. No kilos, dates, fabricated verified result or claim of a real customer transformation.
- The owner now explicitly requests generation of the illustrative before/after asset; this replaces the previous requirement to await real photographs for this demo slot. Actual weight claims still require confirmation.
- Talking-avatar video is requested but no video-generation capability is available in this session. The existing animation's exact description stays **Animated photo with synthetic voice** until a genuinely talking clip is supplied.


### Phone layout correction, 7 Oct
- Desktop retains the arched, moving stack and individual hover lift. Phones use a native horizontal swipe row, readable full-width central card, a visible edge of the next card and four dot controls. Dots use existing exact format names as accessible labels: text message, voice note, before/after photo, short video. No new visible copy.
- Phone cards are ordinary in-flow content and remain visible before scripts load. Do not use off-screen 3D transforms or opacity to decide their visibility on phones. Advance one card every six seconds while visible and unpaused, respect reduced motion, and pause after manual swiping.
- Second-fold phone scene is compact: shorter photo background, full Priya recommendation with reactions, Kavya's batch-timings reply (quoted name Priya, without repeating the full review on a small screen), then a cropped Ananya preview. Keep all exact approved message words unchanged. Desktop keeps the full three-message scene.
- The layout supersedes showing all three entire messages on mobile; the recommendation and resulting enquiry are the main story, the generic question provides only surrounding context.


### Shared arched carousel and second fold, 7 Oct
- Remove the separate handwritten a neighbour's word annotation placed over the photo/chat window. Keep the section heading and its existing marker unchanged.
- Use the same compact society scene on desktop and phones: Priya's full recommendation/reactions, Kavya's enquiry with Priya quoted by name, and a cropped trailing Ananya message. Same typography, bubble structure and order; only outer width adapts. No full-length alternate desktop chat.
- Phones also get an arched continuously moving stack, with readable center and overlapping side previews. Render the phone arch with ordinary 2D position/rotation/scale rather than desktop 3D perspective. First-card native fallback remains visible if scripts fail.
- Desktop hover pauses the track and expands only the hovered card. Phone tap pauses and centers/expands the tapped card, tapping again resumes; horizontal swipe/dots choose another card, vertical gestures scroll the page. Respect reduced motion; manual selection works regardless. Existing media labels and all message copy unchanged.


### Phone screenshot refinement, 7 Oct
- Phone hero cards are smaller (maximum240px), with clear space between adjacent cards rather than overlapping. Keep the shallow arch and continuous motion. Reduce phone media preview heights and padding while keeping text readable at14/20px. Desktop and second fold unchanged.
- Hover pause applies only to devices that report a real hover pointer. Touch events clear stale hover state.
- Pause/play icon reflects manual pause and Reduce Motion pause. Respect Reduce Motion initially; pressing the existing Play control explicitly permits motion. User-initiated Play is allowed even if Reduce Motion remains on. No new labels: use existing COPY NEEDED pause/resume accessible wording.
