# M6 production release

Owner approved phone UI and instructed proceeding with M6. Scope is approved M5 follow-ups and M6 landing page; no M7 or new feature.

Pre-release proof: npm run check exit0 (M6_SHIP_CHECK_OUTPUT.txt), npm test113 passed across6 files (M6_SHIP_TEST_OUTPUT.txt). Current dev UI already has3 passing live browser checks. Actual provider-secret comparison found no keys in94 candidate files.

WHATSAPP_AGENT_NUMBER configured in Convex production from the existing dev assistant number after verifying dev/prod WhatsApp phone IDs match. No provider keys copied or written to files. Existing API keys present. APP_TIMING_MODE production is not dev; nudge-template gate stays disabled. Meta webhook remains on dev; this release does not change subscription or webhook configuration.

Remaining limitations: generated-demo video is an animated photo, not a talking avatar; page pause/resume/link-error copy gaps remain; approved nudge/follow-up templates and fresh-number/mobile-data owner checks still needed. These do not block shipping the currently approved landing page. No real AI/provider sends in this release check.

Production target: https://agreeable-walrus-235.convex.site. Deploy uses npm run deploy; git push never deploys by itself. Production deployment and live proof to follow the approved code checkpoint.
