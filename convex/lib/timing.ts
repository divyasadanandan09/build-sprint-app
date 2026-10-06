export function timingMode(): "dev" | "prod" {
  return process.env.APP_TIMING_MODE === "dev" ? "dev" : "prod";
}
export function istDay(now: number): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}
export function istWeek(now: number): { start: string; end: string } {
  const day = new Date(istDay(now) + "T00:00:00Z");
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  const start = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: day.toISOString().slice(0, 10) };
}
export function isNudgeTime(source: "dev" | "daily", now: number): boolean {
  if (timingMode() === "dev") return source === "dev";
  const ist = new Date(now + 330 * 60_000);
  return source === "daily" && ist.getUTCHours() === 9 && ist.getUTCMinutes() === 0;
}
export function displayDate(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
