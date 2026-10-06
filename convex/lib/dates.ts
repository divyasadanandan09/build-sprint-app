const months: Record<string, number> = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
function normalizeClientInput(text: string): string {
  return text.replace(/[\u200B\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}
export function isClientMessage(text: string): boolean {
  const normalized = normalizeClientInput(text);
  return /^new client\b/i.test(normalized) || /^(?:Add\s+)?[\p{L} .'-]{1,80},\s*\d/iu.test(normalized);
}
export function parseClient(text: string, now: number): { name: string; startDate: string; dueDate: string; displayDueDate: string } | null {
  let normalized = normalizeClientInput(text);
  normalized = normalized.replace(/^Add\s+/i, "");
  const conversational = normalized.match(/^new client (.+?) joined on (.+?)\s*\.?$/i);
  if (conversational) normalized = `${conversational[1]}, ${conversational[2]}`;
  const match = normalized.match(/^([^,\n]{1,80}),\s*(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/);
  if (!match) return null;
  const name = match[1].trim();
  if (!name || /[\[\]{}<>]/.test(name)) return null;
  const month = months[match[3].toLowerCase()];
  if (month === undefined) return null;
  const today = new Date(now + 330 * 60_000).toISOString().slice(0, 10);
  let year = match[4] ? Number(match[4]) : Number(today.slice(0, 4));
  const day = Number(match[2]);
  let start = new Date(Date.UTC(year, month, day));
  if (!match[4] && start.toISOString().slice(0, 10) > today) start = new Date(Date.UTC(--year, month, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month || start.getUTCDate() !== day || year < 2000 || start.toISOString().slice(0, 10) > today) return null;
  const due = new Date(start.getTime() + 28 * 86_400_000);
  return { name, startDate: start.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10), displayDueDate: due.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) };
}
