# BringhurstDO Ops Roadmap

Living roadmap for the private Ops console. Use this when pivoting tools (e.g.
Cursor → Codex) so the next agent understands **what shipped**, **what is in
progress**, and **what is intentionally deferred**.

Last updated: 2026-07-13 (weekly social scorecard rollup; Phase 10 + partial Phase 11).

## Product goal

Turn metadata-only operator updates into reviewable, platform-specific social
drafts with UTM discipline, manual approval, and (for LinkedIn) operator-confirmed
or **scheduled autopublish** when explicitly opted in — without ever mixing SyncSOAP
clinical data into Ops.

## Current state (shipped)

| Phase | Capability | Route / entry |
|-------|------------|---------------|
| 1 | Basic Auth fail-closed `/ops` | middleware |
| 2–4 | Content models, export, accounts registry | `/ops`, `/ops/accounts` |
| 5B–5C | Content package persistence (browser + Postgres) | `/ops/content/new` |
| 6A | AI improve existing drafts (OpenAI/Gemini) | builder AI panel |
| 7A–7B | LinkedIn OAuth, multi-account, publish + reshare | `/ops/accounts`, calendar |
| 8A | Weekly summary → AI series split + suggested dates | `/ops/content/series`, `/ops/content/new` |
| 8A+ | AI schedule plan, calendar rebalance, link-free bodies, delete draft/package | series + calendar |
| 8B | Publish calendar, approve/reschedule/remove, manual LinkedIn publish | `/ops/content/calendar` |
| 8C | Scheduled LinkedIn autopublish (opt-in per draft, approved only) | Vercel cron + calendar |
| 8D | Platform schedule **planning buckets** (morning/midday/evening guidance) | calendar + series UI |
| 8E | Platform connection readiness preflight | `/ops/accounts` |
| 9 (partial) | X + Meta OAuth, publish, and weekly metrics readback | `/ops/accounts`, `/ops/metrics`, cron |
| 10 (partial) | Social metrics into `performanceSnapshots` + weekly social scorecard rollup | `/ops/metrics`, `/ops`, `/ops/reports` |
| 11 (partial) | Live social weekly totals; business/project metrics still mock | same |
| — | Marketing context export (brand + saved packages for AI) | `/ops/reports`, `GET /ops/api/marketing-context` |
| — | Overview live content snapshot (when DB mode) | `/ops` |

**Production notes (2026-07):**

- Vercel deploys `main`.
- Kyle personal LinkedIn connected; org pages blocked pending Community Management API.
- Legacy mock **content packages**, **idea bank**, and **draft queue** removed from seeds; saved packages are source of truth.
- `/ops` overview shows live content stats + weekly social totals when `OPS_STORAGE_MODE=database`. Followers/clicks/leads/spend/revenue and project health stay red mock.
- **Red highlight** = mock sample data to ignore; **amber** = static repo config; **green** = live Postgres / social.

## Content workflow (end-to-end today)

```
Weekly summary (8A)
    → Optional: Suggest schedule with AI
    → AI split + suggested dates
    → Save content package (rebalances calendar)
    → Publish calendar (8B): today / overdue / upcoming
    → Approve draft + opt-in autopublish (optional)
    → Manual publish OR scheduled autopublish on date (8C, LinkedIn only)
```

Alternative path: single source update → platform slots → AI improve → same calendar.

**Marketing context for external AI:** Export from `/ops/reports` or
`GET /ops/api/marketing-context` (Basic Auth). Includes brand rules, audiences,
targets, recent packages, upcoming drafts, and posted copy previews — metadata only.

## Publish timing (important)

| Layer | What it does |
|-------|----------------|
| **Calendar date** | `suggestedScheduledFor` = YYYY-MM-DD (saved per draft) |
| **8D planning buckets** | LinkedIn morning, Instagram evening, etc. — **guidance only**, not saved per draft yet |
| **8C autopublish** | Single Vercel cron daily at **14:00 UTC** (~9:00 AM Eastern default) |
| **Manual publish** | Any time on the scheduled day |

**Not shipped:** per-draft time-of-day field, multiple cron runs per day, or autopublish aligned to 8D buckets. Codex 8D laid groundwork; next step would be save `scheduleBucketId` per draft + map buckets to cron slots within Vercel limits (max 20 crons on Pro).

## Explicitly NOT shipped

- Autonomous AI content **suggestions** (idea bank) — deferred by operator choice
- Instagram, Facebook, X OAuth or publish APIs (Phase 9)
- Autopublish for non-LinkedIn platforms
- Per-draft scheduled times enforced by cron
- Persisted manual scorecard ledger (followers, clicks, leads, conversations, spend, revenue)
- Live project/AWS metrics on `/ops/projects` and remaining Phase 11 report narrative
- Email or push “post today” reminders
- Browser-local packages in server-side marketing context export (DB only)

### Phase 9 — Other platforms (in progress)

Scaffold shipped: X and Meta env validation, status APIs, accounts UI panels.
OAuth callback + publish routes pending external API approval. See
`docs/ops-phase-9-other-platforms.md`.

| Platform | Prerequisite |
|----------|--------------|
| Instagram / Facebook | Meta Business verification, app review |
| X | OAuth app + posting API approval |

### Phase 10 — Metrics read sync (mostly done)

Pull impressions/engagement from connected accounts into `performanceSnapshots`
(X weekly API, Meta weekly API, LinkedIn Excel import). Weekly social scorecard
cards roll up posts + impressions/reactions/comments/saves for the current Ops
week (Mon–Sun, America/New_York). Website clicks still not available from these
APIs (snapshots store 0).

### Phase 11 — Dashboard live data (partial)

**Done:** live weekly social totals on `/ops`, `/ops/metrics`, `/ops/reports`.

**Still mock (red):** followers, website clicks, leads, conversations, spend,
revenue; manual metric entry ledger; project health / AWS; weekly report narrative.

### Phase 12 (candidate) — Per-draft schedule buckets + multi-cron autopublish

Save `scheduleBucketId` on drafts; add cron entries per bucket (within Vercel limits); autopublish only when date **and** bucket window match.

## Security boundaries (summary)

Full detail: `docs/ops-security-boundaries.md`.

- **Default:** no OAuth, no posting API, no autopost, no PHI.
- **7A/7B:** LinkedIn only, server-only tokens, per-action confirm.
- **8A:** AI series split; proposals not auto-saved.
- **8B:** Calendar + delete/reschedule metadata.
- **8C:** Daily cron LinkedIn autopublish for approved + opt-in only.
- **8D/8E:** Planning/preflight data only.
- **Marketing context API:** Metadata-only export; Basic Auth gated like all `/ops`.

## Key env vars

| Variable | Purpose |
|----------|---------|
| `OPS_BASIC_AUTH_*` | Gate `/ops` |
| `OPS_STORAGE_MODE`, `DATABASE_URL` | Durable packages + overview/marketing export |
| `OPS_AI_ENABLED`, `OPS_AI_PROVIDER`, API keys | 6A, 8A, plan-series |
| `OPS_LINKEDIN_ENABLED`, `LINKEDIN_*`, `OPS_SOCIAL_TOKEN_SECRET` | 7A/7B |
| `OPS_AUTOPUBLISH_ENABLED`, `OPS_AUTOPUBLISH_TIMEZONE`, `CRON_SECRET` | 8C |
| `OPS_X_ENABLED`, `X_*` | 9 (X scaffold) |
| `OPS_META_ENABLED`, `META_*` | 9 (Meta scaffold) |

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
| `ops-phase-9-other-platforms.md` | X + Meta scaffold |
| `ops-phase-5c-database-implementation.md` | Postgres persistence |

## Decision log

| Date | Decision |
|------|----------|
| 2026-06 | 8A/8B before Instagram/Facebook/X |
| 2026-06 | 8C = LinkedIn autopublish with per-draft opt-in + approve gate |
| 2026-06 | 8D = platform schedule buckets as **planning guidance only** (not per-draft yet) |
| 2026-06 | 8E = platform connection readiness preflight |
| 2026-06-15 | Remove legacy mock content seeds; saved packages = source of truth |
| 2026-06-15 | Marketing context export for external AI; defer autonomous idea suggestions |
| 2026-06-15 | Consolidate `/ops/content` to three workflow entry points; simplify `/ops` overview |
| 2026-06-15 | Red/amber/green data-status highlighting across Ops pages |
| 2026-06-15 | Phase 9 scaffold: X + Meta config, status APIs, accounts panels |
