// WhatsApp voice notes are Ogg/Opus. Remux existing encoded pages without
// decoding, writing files, or changing their speech. Sarvam receives <=29s.
export function splitVoice(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length > 8_000_000) throw new Error("invalid_audio");
  const pages: Uint8Array[] = [];
  let offset = 0, serial: number | null = null;
  while (offset < bytes.length) {
    if (offset + 27 > bytes.length || new TextDecoder().decode(bytes.slice(offset, offset + 4)) !== "OggS" || bytes[offset + 4] !== 0) throw new Error("invalid_audio");
    const count = bytes[offset + 26];
    if (offset + 27 + count > bytes.length) throw new Error("invalid_audio");
    let size = 27 + count;
    for (let i = 0; i < count; i++) size += bytes[offset + 27 + i];
    if (offset + size > bytes.length) throw new Error("invalid_audio");
    const page = bytes.slice(offset, offset + size), view = new DataView(page.buffer);
    if (serial !== null && serial !== view.getUint32(14, true)) throw new Error("invalid_audio");
    serial = view.getUint32(14, true); pages.push(page); offset += size;
  }
  if (pages.length < 3) throw new Error("invalid_audio");
  const body = (p: Uint8Array) => p.slice(27 + p[26]);
  if (new TextDecoder().decode(body(pages[0]).slice(0, 8)) !== "OpusHead" || new TextDecoder().decode(body(pages[1]).slice(0, 8)) !== "OpusTags") throw new Error("invalid_audio");
  const head = body(pages[0]);
  if (head.length < 19 || head[9] !== 1) throw new Error("invalid_audio");
  const skip = new DataView(head.buffer).getUint16(10, true);
  const end = Number(new DataView(pages.at(-1)!.buffer).getBigUint64(6, true));
  if (!Number.isSafeInteger(end) || end <= skip) throw new Error("invalid_audio");
  if ((end - skip) / 48000 > 120) throw new Error("long_audio");
  const groups: Uint8Array[][] = []; let group: Uint8Array[] = [], start = 0, previous = 0;
  for (let i = 2; i < pages.length; i++) {
    const page = pages[i], granule = Number(new DataView(page.buffer).getBigUint64(6, true));
    if (!Number.isSafeInteger(granule) || granule < previous) throw new Error("invalid_audio");
    // Split only at a complete packet boundary, never midway through speech.
    if (group.length && (granule - start) / 48000 > 29 && !(page[5] & 1)) { groups.push(group); group = []; start = previous; }
    if ((granule - start) / 48000 > 29) throw new Error("invalid_audio");
    group.push(page); previous = granule;
  }
  if (group.length) groups.push(group);
  let base = 0;
  return groups.map((audio, chunk) => {
    const output = [pages[0].slice(), pages[1].slice(), ...audio.map(p => p.slice())];
    if (chunk) new DataView(output[0].buffer).setUint16(27 + output[0][26] + 10, 0, true);
    output.forEach((page, sequence) => {
      const view = new DataView(page.buffer);
      view.setUint32(18, sequence, true);
      page[5] = sequence === 0 ? 2 : sequence === output.length - 1 ? 4 : page[5] & 1;
      if (sequence >= 2) view.setBigUint64(6, BigInt(Number(view.getBigUint64(6, true)) - base), true);
      view.setUint32(22, 0, true);
      let crc = 0;
      for (const byte of page) { crc ^= byte << 24; for (let bit = 0; bit < 8; bit++) crc = crc & 0x80000000 ? (crc << 1) ^ 0x04c11db7 : crc << 1; }
      view.setUint32(22, crc >>> 0, true);
    });
    base = Number(new DataView(audio.at(-1)!.buffer).getBigUint64(6, true));
    const joined = new Uint8Array(output.reduce((sum, p) => sum + p.length, 0));
    let at = 0; for (const page of output) { joined.set(page, at); at += page.length; }
    return joined;
  });
}
export async function limitedBytes(response: Response, limit = 8_000_000): Promise<Uint8Array> {
  if (!response.ok || Number(response.headers.get("content-length") || 0) > limit || !response.body) throw new Error("invalid_audio");
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error("invalid_audio"); parts.push(value); } } finally { await reader.cancel(); }
  const result = new Uint8Array(size); let at = 0; for (const part of parts) { result.set(part, at); at += part.length; } return result;
}
