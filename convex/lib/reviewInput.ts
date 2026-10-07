// Strip paired presentation markers while preserving every enclosed word,
// punctuation and paragraph break. Keep raw over-limit input over-limit.
export function normalizeReviewInput(text: string): string {
  if (text.length > 2000) return text;
  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/(^|[\s([{])(\*{1,2})(?=\S)([\s\S]*?\S)\2(?=$|[\s.,!?;:)\]}])/g, "$1$3");
  }
  return text;
}
