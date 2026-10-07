import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("dev nudge check", { minutes: 1 }, internal.m3.tick, { source: "dev" });
// Convex cron times use UTC; 03:30 UTC is 09:00 IST.
crons.daily("9am IST nudges", { hourUTC: 3, minuteUTC: 30 }, internal.m3.tick, { source: "daily" });
crons.interval("follow-up check", { minutes: 1 }, internal.m5.tick, {});
export default crons;
