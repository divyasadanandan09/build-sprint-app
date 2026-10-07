// Synthetic container bytes, not a recording of any person.
export function voiceFixture(seconds = 10): Uint8Array {
  function page(body: Uint8Array, granule: number, sequence: number, flags = 0) {
    const p = new Uint8Array(28 + body.length), view = new DataView(p.buffer);
    p.set(new TextEncoder().encode("OggS")); p[5] = flags; view.setBigUint64(6, BigInt(granule), true); view.setUint32(14, 7, true); view.setUint32(18, sequence, true); p[26] = 1; p[27] = body.length; p.set(body, 28);
    return p;
  }
  const head = new Uint8Array(19); head.set(new TextEncoder().encode("OpusHead")); head[8] = 1; head[9] = 1; new DataView(head.buffer).setUint16(10, 312, true);
  const pages = [page(head, 0, 0, 2), page(new TextEncoder().encode("OpusTags"), 0, 1)];
  for (let s = 1; s <= seconds; s++) pages.push(page(new Uint8Array([0xf8, 0xff, 0xfe]), 48000 * s + 312, s + 1, s === seconds ? 4 : 0));
  const result = new Uint8Array(pages.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of pages) { result.set(p, at); at += p.length; } return result;
}
