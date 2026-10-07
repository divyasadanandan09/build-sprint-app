import { copy, reviewWording } from "./copy";
// Only change direct address to the instructor; keep the client's "I" intact.
export function groupWording(text: string): string {
  let wording = text.replace(/^Mayuri,\s+your\b/i, "Mayuri's")
    .replace(/\byou're\b/gi, "she's")
    .replace(/\byou are\b/gi, "she is")
    .replace(/\byou have\b/gi, "she has")
    .replace(/\byou were\b/gi, "she was")
    .replace(/\byour\b/gi, "her")
    .replace(/\byou\b/gi, "she");
  wording = wording.replace(/\bshe (make|help|motivate|encourage|teach|guide|keep|push|give|understand|listen)\b/gi, (_, verb: string) => "she " + ({ teach: "teaches", push: "pushes" }[verb.toLowerCase()] ?? verb.toLowerCase() + "s"));
  if (!/\bMayuri\b/i.test(text)) wording = wording.replace(/\b(she|her)\b/i, (pronoun) => pronoun.toLowerCase() === "her" ? "Mayuri's" : "Mayuri");
  wording = wording.replace(/(^|[.!?]\s+)(she|her)\b/g, (_, prefix: string, pronoun: string) => prefix + pronoun[0].toUpperCase() + pronoun.slice(1));
  return wording;
}

export function formatRecommendation(passages: string[], highlights: unknown, maxLength = 1024): string {
  const text = passages.join(" ");
  const phrases = Array.isArray(highlights) ? highlights.filter((phrase): phrase is string =>
    typeof phrase === "string" && phrase.length >= 4 && phrase.length <= 120 && !/[\n*]/.test(phrase) && text.includes(phrase)
  ).slice(0, 2) : [];
  // Two sentences per paragraph once a draft is long enough to need spacing.
  const sentences = text.match(/[\s\S]*?[.!?](?:[”’"'])?(?=\s|$)|[\s\S]+$/gu) ?? [text];
  const render = (sentences: string[]) => {
    const paragraphs: string[] = [];
    if (text.length > 280) {
      for (let i = 0; i < sentences.length; i += 2) paragraphs.push(sentences.slice(i, i + 2).join("").trim());
    } else paragraphs.push(sentences.join(""));
    return paragraphs.map((paragraph) => {
      const ranges: { start: number; end: number }[] = [];
      for (const phrase of phrases) {
        const start = paragraph.indexOf(phrase), end = start + phrase.length;
        if (start >= 0 && !ranges.some((range) => start < range.end && end > range.start)) ranges.push({ start, end });
      }
      for (const range of ranges.sort((a, b) => b.start - a.start)) paragraph = paragraph.slice(0, range.start) + "*" + paragraph.slice(range.start, range.end) + "*" + paragraph.slice(range.end);
      return paragraph;
    }).join("\n\n");
  };
  // An interactive message body has a smaller limit than plain text. Trim
  // whole trailing sentences, never part of a claim, to keep draft + CTA one
  // message. An unshortenable oversized sentence is rejected by the action.
  while (sentences.length) {
    const result = render(sentences);
    if (result.length <= maxLength) return result;
    sentences.pop();
  }
  return "";
}

export function combinedReview(name: string, recommendation: string): string | null {
  let draft = copy.happyAsk(name, recommendation);
  while (draft.length > 1024 && recommendation) {
    const sentences = recommendation.match(/[\s\S]*?[.!?](?:\*)?(?=\s|$)|[\s\S]+$/gu) ?? [];
    sentences.pop(); recommendation = sentences.join("").trim();
    draft = copy.happyAsk(name, recommendation);
  }
  return recommendation ? draft : null;
}

export function labelledReview(recommendation: string): string | null {
  const words = formatRecommendation([reviewWording(recommendation)], [], 1024);
  return words || null;
}
