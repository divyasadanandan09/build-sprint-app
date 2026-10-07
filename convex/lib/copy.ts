// Owner-approved neutral attendance context; never add duration or results.
export function reviewWording(recommendation: string): string {
  if (/\bMayuri\b/i.test(recommendation)) return recommendation;
  if (/^\*?I\b/.test(recommendation) && /\b(?:class|classes|session|sessions)\b/i.test(recommendation)) {
    const words = recommendation.replace(/\bin class\b/g, "in the class").replace(/\bevery sessions\b/g, "every session");
    return `I've been going to Mayuri's sessions and ${words}`;
  }
  return `Mayuri's sessions:\n\n${recommendation}`;
}
// Fixed copy from DESIGN.md. Dynamic recommendation text is the client's text.
export const copy = {
  whose: "Whose reply is this?",
  isReply: (name: string) => `Is this ${name}'s reply?`,
  voiceError: "I couldn't hear that voice note clearly. Forward it again, or paste her words as text.",
  transcriptLong: "[COPY NEEDED: voice transcript exceeds 2,000 characters]",
  voiceLong: "[COPY NEEDED: voice note longer than two minutes]",
  noWaiting: "[COPY NEEDED: forwarded reply with no waiting clients; ask for the client name]",
  happy: (name: string) => `${name}'s happy! Here's her recommendation in her own words, with the ask. I only cleaned up grammar.`,
  reviewContext: "Mayuri's sessions:",
  happyAsk: (name: string, recommendation: string) => `${name}, so happy it's working for you! I put your words together below. Would you be okay forwarding it to your society group?\n\n"${reviewWording(recommendation)}"`,
  short: (name: string) => `${name}'s reply is short. One easy question will help her say more. Pick one:`,
  unsure: (name: string) => `I couldn't tell how ${name} feels from this. Which is closer?`,
  unhappy: (name: string) => `${name} isn't enjoying it yet. Talk to her before anything else. Here's what she said:`,
  unhappyDraft: (name: string) => `Thanks for telling me honestly, ${name}. Can we talk after Thursday's class? I want to make this right.`,
  nudge: (name: string) => `${name} hits week 4 today. Here's a check-in in your voice.`,
  overdueNudge: (name: string, date: string) => `[COPY NEEDED: nudge for ${name}, whose four-week date was ${date}]`,
  checkIn: (client: string, trainer: string) => trainer ? `Hi ${client}, it's ${trainer}! You've done 4 weeks now, how's it feeling?` : "[COPY NEEDED: check-in when the instructor name is unknown]",
  dueLine: (name: string, date: string) => `[COPY NEEDED: due-this-week line for ${name}, due ${date}]`,
  noDue: "[COPY NEEDED: no clients due this week]",
  sendReview: "Send revised review",
  reviewInvitation: "[COPY NEEDED: conversational invitation to paste a review after the instructor says This is a review]",
  sendAsk: "Ask client to post",
  welcome: "Hi! I help your happy clients recommend you in their society groups. Paste one Google review a client left you, or forward something a happy client said.",
  reviewError: "I couldn't read that one. Paste it as text, or try a different review.",
  nextClient: "Who's the next client coming up on 4 weeks? Send me her name and start date, like: Ananya, 12 Sept.",
  dateError: "I need a name and a date, like: Ananya, 12 Sept.",
  fallback: "I didn't catch that. You can paste a review, forward a client's reply, or tell me a new client's name and start date.",
  busy: "[COPY NEEDED: busy or AI rate-limit reply]",
  duplicateClient: "[COPY NEEDED: a client with this name already has a different start date]",
  ask: (name: string | null) => name ? `${name}, thank you for your lovely review! I turned your words into a short note. Would you be okay sharing it in your society group?` : "[COPY NEEDED: review ask when the client's name is unknown]",
  ready: (name: string | null) => name ? `${name}'s tweaked review to be shared in society wa group. forward review to ${name}.` : "[COPY NEEDED: drafts-ready message when the client's name is unknown]",
  saved: (name: string, date: string) => `Got it. I'll remind you when ${name} hits week 4, on ${date}.`,
};
