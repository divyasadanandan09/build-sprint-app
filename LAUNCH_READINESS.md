# Launch readiness — 7 Oct

Latest: approved M5/M6 code is committed/pushed as d3c7955 and production is deployed at https://agreeable-walrus-235.convex.site.113 mocked tests/compile and3 production browser checks pass; production public number is configured. The checks below are the earlier pre-release snapshot, superseded by M6_SHIP_NOTES.md.

Owner confirms smaller/spaced phone carousel and Play override work. This approves the UI fix; no additional feature milestone exists after M6.

Read-only current checks:
- Dev / and /landing-config and /privacy: HTTP200; latest headline present.
- Production / and /landing-config: HTTP404; /privacy: HTTP200. M5/M6 have not been shipped to production.
- All six provider variable names are present in production. No values printed or stored.
- Production WHATSAPP_AGENT_NUMBER missing. This is the public assistant number used for the landing chat URL, not an API key.
- Production nudges are not enabled; production does not use dev-minute timing mode. Do not enable nudges before Meta approves the template. Follow-ups outside the24-hour window remain blocked on approved templates.

Still needed before sharing:
- Ship approved changes to GitHub/production after determining final launch scope and reviewing outstanding assets/copy.
- Configure production public assistant number and confirm Meta webhook deployment. Current webhook points to dev.
- Approved nudge/follow-up templates and missing exact-copy paths, tracked in milestone notes.
- Requested talking-avatar clip remains unavailable; current demo is a labelled animated photo.
- Owner mobile-data/fresh-number core-flow check. Earlier loading failure is not signed off by the UI approval.

No new feature, commit, push or production deployment performed during this read-only check. Awaiting next-scope choice: prepare Mayuri launch or define another feature.
