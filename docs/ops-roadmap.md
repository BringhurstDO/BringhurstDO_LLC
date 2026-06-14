# BringhurstDO Ops Roadmap

Living roadmap for the private Ops console. Use this when pivoting tools (e.g.
Cursor → Codex) so the next agent understands **what shipped**, **what is in
progress**, and **what is intentionally deferred**.

Last updated: 2026-06-14 (after Phase 8C).

## Product goal

Turn metadata-only operator updates into reviewable, platform-specific social
drafts with UTM discipline, manual approval, and (for LinkedIn) operator-confirmed
or **scheduled autopublish** when explicitly opted in — without ever mixing SyncSOAP
clinical data into Ops.

## Current state (shipped)

| Phase | Capability | Route / entry |
|-------|------------|---------------|
| 1 | Basic Auth fail-closed `/ops` | middleware |
| 2–4 | Mock dashboard, content models, export | `/ops`, `/ops/content` |
| 5B–5C | Content package persistence (browser + Postgres) | `/ops/content/new` |
| 6A | AI improve existing drafts (OpenAI/Gemini) | builder AI panel |
| 7A–7B | LinkedIn OAuth, multi-account, publish + reshare | `/ops/accounts`, builder |
| 8A | Weekly summary → AI series split + suggested dates | `/ops/content/series` |
| 8B | Publish calendar, approve/reschedule, manual LinkedIn publish | `/ops/content/calendar` |
| 8C | Scheduled LinkedIn autopublish (opt-in per draft, approved only) | Vercel cron + calendar |

**Production notes (2026-06):**

- Vercel deploys `main`.
- Kyle personal LinkedIn connected; org pages blocked pending Community Management API.
- Privacy policy at `/privacy` for LinkedIn app registration.

## Content workflow (end-to-end today)

```
Weekly summary (8A)
    → AI split + suggested dates
    → Save content package
    → Publish calendar (8B): today / overdue / upcoming
    → Approve draft + opt-in autopublish (optional)
    → Publish calendar (8B): today / overdue / upcoming
    → Manual publish OR scheduled autopublish on date (8C, LinkedIn only)
    → Optional: reshare from founder to brand (7B, when org connected)
```

Alternative path: single source update → platform slots → AI improve → same calendar.

## Explicitly NOT shipped

- Instagram, Facebook, X OAuth or publish APIs
- Autopublish for non-LinkedIn platforms
- Read-only social metrics sync into scorecard
- Dashboard pages reading live persisted data (still mock on `/ops`, `/ops/metrics`, etc.)
- Email or push “post today” reminders

### Phase 9 — Other platforms (after 8A–8C feel stable)

**Status:** Deferred until LinkedIn series + autopublish workflow is proven.

| Platform | Prerequisite |
|----------|--------------|
| Instagram / Facebook | Meta Business verification, app review |
| X | OAuth app + posting API approval |

8A/8B were **intentionally moved ahead** of Meta/X connect so Kyle can run a
LinkedIn-only content series without waiting on org API or Meta trust.

### Phase 10 — Metrics read sync

**Status:** Idea only.

- Pull impressions/clicks from connected accounts into performance snapshots
- Still metadata-only aggregates; no audience exports

### Phase 11 — Dashboard live data

**Status:** Idea only.

- Replace `mock-data.ts` on `/ops`, `/ops/metrics`, `/ops/reports` with Postgres reads

## Security boundaries (summary)

Full detail: `docs/ops-security-boundaries.md`.

- **Default:** no OAuth, no posting API, no autopost, no PHI.
- **7A/7B exception:** LinkedIn only, server-only tokens, per-action operator confirm.
- **8A exception:** AI series split, proposals not auto-saved.
- **8B exception:** Calendar view + reschedule metadata; manual publish from calendar.
- **8C exception:** Daily cron LinkedIn autopublish for approved + opt-in drafts only.

## Key env vars

| Variable | Purpose |
|----------|---------|
| `OPS_BASIC_AUTH_*` | Gate `/ops` |
| `OPS_STORAGE_MODE`, `DATABASE_URL` | Durable packages |
| `OPS_AI_ENABLED`, `OPS_AI_PROVIDER`, API keys | 6A, 8A |
| `OPS_LINKEDIN_ENABLED`, `LINKEDIN_*`, `OPS_SOCIAL_TOKEN_SECRET` | 7A/7B |
| `OPS_AUTOPUBLISH_ENABLED`, `OPS_AUTOPUBLISH_TIMEZONE`, `CRON_SECRET` | 8C |
| `LINKEDIN_ACCOUNTS` | Multi-account allowlist JSON |

## Doc index

| Doc | Topic |
|-----|-------|
| `ops-security-boundaries.md` | Global rules + approved exceptions |
| `ops-content-package-workflow.md` | Package builder workflow |
| `ops-phase-6a-ai-draft-improvement.md` | AI improve |
| `ops-phase-7a-linkedin-publish.md` | LinkedIn OAuth + publish |
| `ops-phase-8a-content-series.md` | Series split |
| `ops-phase-8b-publish-calendar.md` | Publish calendar |
| `ops-phase-8c-scheduled-autopublish.md` | Scheduled autopublish |
| `ops-phase-5c-database-implementation.md` | Postgres persistence |

## Codex / handoff checklist

When continuing in a new agent session:

1. Read this file and `ops-security-boundaries.md` first.
2. Confirm branch (`main`) and Vercel env match `.env.local` patterns (never commit secrets).
3. Run `npm run lint`, `npm run build`, `npm run ops:check-ai-safety`, `npm run ops:check-publishable-copy`.
4. Content packages live in browser localStorage **or** Postgres — test both if touching persistence.
5. LinkedIn org posting blocked until LinkedIn approves Community Management API — not a code bug.
6. Next likely user ask: **first live series on Kyle LinkedIn** or Phase 9 Meta/X.

## Decision log

| Date | Decision |
|------|----------|
| 2026-06 | 8A/8B before Instagram/Facebook/X |
| 2026-06 | 8C = LinkedIn autopublish with per-draft opt-in + approve gate |
| 2026-06 | Kyle founder LinkedIn first; brand org pages when API approved |
| 2026-06 | Single LinkedIn Developer app for all pages; connect in Ops UI |
