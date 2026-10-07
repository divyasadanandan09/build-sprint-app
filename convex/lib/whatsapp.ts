export type WhatsAppPayload = Record<string, unknown>;
export type SendResult = { ok: true; messageId: string | null } | { ok: false; code: number | null; reason: "account_locked" | "provider_error" | "network_error" | "missing_configuration" };

export function textPayload(to: string, body: string): WhatsAppPayload {
  return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body, preview_url: false } };
}
export function buttonPayload(to: string, body: string, draft: string, label = "Send to client"): WhatsAppPayload {
  return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive", interactive: { type: "cta_url", body: { text: body }, action: { name: "cta_url", parameters: { display_text: label, url: `https://wa.me/?text=${encodeURIComponent(draft)}` } } } };
}
export function typingPayload(messageId: string): WhatsAppPayload {
  return { messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } };
}

// The only WhatsApp sending call in the app. Tests replace fetch; production
// never substitutes a successful result when Meta refuses to send.
export async function sendWhatsApp(payload: WhatsAppPayload): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, code: null, reason: "missing_configuration" };
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneId)) return { ok: false, code: null, reason: "missing_configuration" };
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json() as { error?: { code?: number }; messages?: { id?: string }[] };
    if (!response.ok || body.error) {
      const code = typeof body.error?.code === "number" ? body.error.code : null;
      return { ok: false, code, reason: code === 131031 ? "account_locked" : "provider_error" };
    }
    const isTyping = "typing_indicator" in payload;
    const messageId = body.messages?.[0]?.id;
    if (!isTyping && typeof messageId !== "string") return { ok: false, code: null, reason: "provider_error" };
    return { ok: true, messageId: typeof messageId === "string" ? messageId : null };
  } catch {
    return { ok: false, code: null, reason: "network_error" };
  }
}

export function replyButtons(to: string, body: string, options: { id: string; title: string }[]): WhatsAppPayload {
  return { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "button", body: { text: body }, action: { buttons: options.map(reply => ({ type: "reply", reply })) } } };
}
export function replyList(to: string, body: string, rows: { id: string; title: string }[], button: string): WhatsAppPayload {
  return { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "list", body: { text: body }, action: { button, sections: [{ rows }] } } };
}
