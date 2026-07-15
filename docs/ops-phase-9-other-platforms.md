# Phase 9 — X publishing

X OAuth 2.0 (PKCE), manual-approved text posting, and connection management for
BringhurstDO Ops. Meta (Facebook/Instagram) remains scaffold-only.

Last updated: 2026-06-15

## Shipped (X)

| Capability | Route / entry |
|------------|---------------|
| OAuth connect (PKCE) | `GET /ops/api/social/x/connect` → callback |
| Connection status | `GET /ops/api/social/x/status` |
| Disconnect | `POST /ops/api/social/x/disconnect` |
| Manual publish | `POST /ops/api/social/x/publish` |
| Accounts UI | `/ops/accounts` — X panel |
| Builder + calendar | Publish to X on approved drafts |

**Not shipped for X:** autopublish, quote-tweet/retweet amplification, metrics read-sync.

## Prerequisites

1. [X Developer Portal](https://developer.x.com/) project with **OAuth 2.0** enabled
2. App type: **Web App, Automated App or Bot** (confidential client with client secret)
3. User authentication settings:
   - Callback URL: `https://<your-domain>/ops/api/social/x/callback`
   - Website URL: your production site
   - Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
4. API access tier that includes **POST /2/tweets** (Basic tier or higher for most operators)

## Env vars

| Variable | Example / notes |
|----------|-----------------|
| `OPS_X_ENABLED` | `true` |
| `X_CLIENT_ID` | From X developer app |
| `X_CLIENT_SECRET` | From X developer app |
| `X_REDIRECT_URI` | Must match callback exactly, e.g. `https://www.bringhurstdo.com/ops/api/social/x/callback` |
| `X_ACCOUNTS` | `[{"accountId":"account-founder-x","label":"Kyle Bringhurst X"},{"accountId":"account-bringhurstdo-x","label":"BringhurstDO X"},{"accountId":"account-syncsoap-x","label":"SyncSOAP X"},{"accountId":"account-syncsafety-x","label":"SyncSafety X"}]` |
| `OPS_SOCIAL_TOKEN_SECRET` | Same as LinkedIn (≥16 chars) |
| `OPS_STORAGE_MODE` | `database` |
| `DATABASE_URL` | Postgres for encrypted tokens |

`accountId` values must match `publicationTargets[].accountId` in `mock-data.ts`
(e.g. `account-founder-x`).

## Connect flow

1. Set env vars on Vercel (or `.env.local` for local dev).
2. Open `/ops/accounts` — X panel should show **Configured**.
3. Confirm one **Connect** button appears for every configured X account.
4. Sign in to each X identity and authorize its matching account row separately.
   Reusing one `accountId` overwrites that row's previous stored identity.
5. Confirm all four rows report **Connected**. Short-lived access tokens renew
   automatically using the rotating refresh token granted by `offline.access`.

## Publish flow

1. Create or open a content package with an **X** draft.
2. Set draft status to **approved**.
3. From package builder or publish calendar, click **Publish to X**.
4. Confirm the operator dialog — body is sanitized, max **280** characters.
5. Public tweet URL is saved on the published post row; audit log in `ops_social_publish_log`.

## Security (same as LinkedIn Phase 7)

- Server-only tokens, AES-256-GCM at rest
- Manual operator approval per publish (`confirmApproved=true`)
- Basic Auth on all `/ops` routes
- No autopublish for X until explicitly approved in a future phase

## Meta (Facebook / Instagram)

Still scaffold-only: status APIs and disabled connect stub. See env section in
`docs/ops-roadmap.md` when Meta Business verification completes.

## Related docs

- `ops-phase-7a-linkedin-publish.md` — pattern reference
- `ops-security-boundaries.md` — global rules
- `ops-roadmap.md` — phase index
