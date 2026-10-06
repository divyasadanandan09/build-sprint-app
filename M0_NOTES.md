# M0 setup — 6 Oct 2026

## Choices

- M0 is first unfinished: no Git repository, deploy script or application functions existed. M1 has not started.
- Reused the existing Convex project and its dev/prod deployments.
- Initialized Git on `main`; created public repository https://github.com/divyasadanandan09/build-sprint-app. No commit or push until confirmation.
- `npm run deploy` runs `convex deploy`. No frontend or hosting component until the landing-page milestone; production's future HTTP/hosting address is https://agreeable-walrus-235.convex.site, with no page served yet.
- Added an internal `health:check` query returning null: accessible through the authenticated Convex command, with no public endpoint, data or provider calls.
- Installed TypeScript and Node types for compile checks. Used deployment checks instead of adding a test runner for this setup-only milestone.
- Ignored environment files, dependencies, built files and coverage. Scanned non-ignored files for common secret patterns; this is a limited pattern check, not a guarantee against every possible secret format.
- Read only Convex environment variable names, never their values. Left key entry to the owner in the dashboard.
- Used zero real AI calls; no WhatsApp, OpenAI or Sarvam integration exists yet to mock.

## Missing setup

Set these in both dev (`giant-platypus-592`) and prod (`agreeable-walrus-235`) through Convex Dashboard > Settings > Environment Variables:

- WHATSAPP_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_VERIFY_TOKEN
- WHATSAPP_APP_SECRET
- SARVAM_API_KEY

Set `OPENAI_API_KEY` in dev too; it is already present in prod. Do not paste keys into chat or repository files. M0's deploy check passes, but its requirement for all keys remains incomplete.

## Document disagreements

- PRODUCT.md's nudge example differs from DESIGN.md 4.2; use DESIGN.md's exact wording when M3 is built.
- PRODUCT.md says to ask for the next client right after the first draft; DESIGN.md 4.1 specifies one minute later. PRODUCT.md decides timing when M2 is built; DESIGN.md supplies the question's words. PLAN.md also specifies one minute, so that timing needs to be recorded in M2.
- DESIGN.md 4.5's example adds a free demo and trainer link, while PRODUCT.md forbids invented claims. A free-demo claim must never be inserted without support. No draft logic built in M0.
- DESIGN.md says voice notes can be any length; AGENTS.md caps them at two minutes. The two-minute cap applies when voice input is built in M4.
- IDEA_SCOPE.md describes the agent contacting clients directly; PRODUCT.md and AGENTS.md specify trainer-only contact. Follow PRODUCT.md.
- PLAN.md/PROGRESS.md say OPENAI_API_KEY is in dev; the live names-only check found it only in prod.

No trainer-facing words were added, so no copy placeholders were needed.

## Proof

- `npm run check`: TypeScript completed with exit 0.
- `npx convex dev --once`: `Convex functions ready!`
- `npm run deploy -- --yes`: `Deployed Convex functions to https://agreeable-walrus-235.convex.cloud`
- `npx convex run health:check '{}'` and `npx convex run --prod health:check '{}'`: exit 0; null functions print no output.
- `git check-ignore .env.local node_modules/`: both paths ignored.
- Secret-pattern scan: 125 non-ignored files checked; 0 matches (before this note was added).
- GitHub reports repository visibility `PUBLIC`.

No browser screenshot: this milestone has no landing page. No phone exchange: WhatsApp starts in M2. No committed or pushed files.
