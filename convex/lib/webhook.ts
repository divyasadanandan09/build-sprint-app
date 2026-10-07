export async function validSignature(raw: ArrayBuffer, signature: string | null, secret: string): Promise<boolean> {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature || "")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from((signature as string).slice(7).match(/../g)!, (hex) => parseInt(hex, 16));
  return crypto.subtle.verify("HMAC", key, bytes, raw);
}
export type Incoming = { messageId: string; phone: string; name: string; text: string; type: string; forwarded?: boolean; mediaId?: string; responseId?: string };
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
// Log only designated IDs and a fixed vocabulary. Never log arbitrary types,
// fields, contacts, sender numbers, message IDs, bodies, or provider errors.
const knownTypes = new Set(["text", "audio", "image", "video", "document", "sticker", "location", "contacts", "interactive", "button", "reaction", "order", "system", "unsupported", "unknown"]);
export function inspectIncoming(body: unknown, phoneId: string | undefined) {
  const messages: Incoming[] = [];
  const phoneIds = new Set<string>();
  const types = new Set<string>();
  const reasons = new Set<string>();
  let containsMessages = false;
  let containsStatuses = false;
  const envelope = object(body);
  if (envelope?.object !== "whatsapp_business_account") reasons.add("wrong_webhook_object");
  else if (!Array.isArray(envelope.entry)) reasons.add("missing_entries");
  else if (!envelope.entry.length) reasons.add("empty_entries");
  else for (const entry of envelope.entry) {
    const changes = object(entry)?.changes;
    if (!Array.isArray(changes) || !changes.length) { reasons.add("missing_changes"); continue; }
    for (const change of changes) {
      const value = object(object(change)?.value);
      const payloadPhoneId = object(value?.metadata)?.phone_number_id;
      if (typeof payloadPhoneId === "string" && /^\d{1,40}$/.test(payloadPhoneId)) phoneIds.add(payloadPhoneId);
      const hasMessages = !!value && "messages" in value;
      const hasStatuses = !!value && "statuses" in value;
      containsMessages ||= hasMessages;
      containsStatuses ||= hasStatuses;
      if (Array.isArray(value?.messages)) for (const raw of value.messages) {
        const type = object(raw)?.type;
        types.add(typeof type === "string" && knownTypes.has(type) ? type : "unknown");
      }
      if (object(change)?.field !== "messages") { reasons.add("unsupported_webhook_field"); continue; }
      if (payloadPhoneId !== phoneId || !phoneId) { reasons.add(typeof payloadPhoneId === "string" ? "phone_number_id_mismatch" : "missing_payload_phone_number_id"); continue; }
      if (!Array.isArray(value?.messages)) { reasons.add(hasStatuses && !hasMessages ? "statuses_only" : hasMessages ? "invalid_messages_list" : "no_messages_or_statuses"); continue; }
      if (!value.messages.length) { reasons.add("empty_messages"); continue; }
      for (const raw of value.messages) {
        const msg = object(raw);
        if (typeof msg?.id !== "string") { reasons.add("missing_message_id"); continue; }
        if (typeof msg.from !== "string" || !/^\d{5,20}$/.test(msg.from)) { reasons.add("invalid_sender"); continue; }
        if (typeof msg.type !== "string") { reasons.add("missing_message_type"); continue; }
        const contact = Array.isArray(value.contacts) ? value.contacts.map(object).find((c) => c?.wa_id === msg.from) : null;
        const name = object(contact?.profile)?.name;
        const text = object(msg.text)?.body;
        const forwarded = object(msg.context)?.forwarded === true || object(msg.context)?.frequently_forwarded === true;
        const mediaId = object(msg.audio)?.id;
        const interactive = object(msg.interactive);
        const responseId = object(interactive?.button_reply)?.id ?? object(interactive?.list_reply)?.id ?? object(msg.button)?.payload;
        messages.push({ ...(forwarded ? { forwarded } : {}), ...(typeof mediaId === "string" && /^\d{1,40}$/.test(mediaId) ? { mediaId } : {}), ...(typeof responseId === "string" ? { responseId: responseId.slice(0, 256) } : {}), messageId: msg.id, phone: msg.from, name: typeof name === "string" ? name.slice(0, 80) : "", text: typeof text === "string" ? text.slice(0, 2001) : "", type: msg.type });
      }
    }
  }
  return { messages, diagnostics: { phone_number_id: [...phoneIds], contains_messages: containsMessages, contains_statuses: containsStatuses, message_type: [...types], ignored_entry_reasons: [...reasons] } };
}
export function incomingMessages(body: unknown, phoneId: string): Incoming[] {
  return inspectIncoming(body, phoneId).messages;
}
