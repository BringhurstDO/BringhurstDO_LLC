# Phase 9 — Meta (Facebook Pages)

Facebook Page OAuth, manual-approved text posting, and connection management for
BringhurstDO Ops. Instagram Business connect is supported for readiness; image
publish is not implemented yet.

## Shipped

| Capability | Route / entry |
|------------|---------------|
| OAuth connect | `GET /ops/api/social/meta/connect` → callback |
| Connection status | `GET /ops/api/social/meta/status` |
| Disconnect | `POST /ops/api/social/meta/disconnect` |
| Manual Facebook publish | `POST /ops/api/social/meta/publish` |
| Accounts UI | `/ops/accounts` — Meta panel |
| Calendar | Publish to Facebook on approved drafts |

**Not shipped:** Instagram image/video publish, autopublish, metrics read-sync.

## Prerequisites

1. [Meta for Developers](https://developers.facebook.com/) app (Business type recommended)
2. Facebook **Business verification** completed for the app/business
3. App added to your Business Portfolio with access to target Pages
4. Valid OAuth redirect:
   `https://www.bringhurstdo.com/ops/api/social/meta/callback`
5. You are admin on each Facebook Page you connect

## Env vars

| Variable | Example / notes |
|----------|-----------------|
| `OPS_META_ENABLED` | `true` |
| `META_APP_ID` | Facebook app id |
| `META_APP_SECRET` | Facebook app secret |
| `META_REDIRECT_URI` | Must match callback exactly |
| `META_ACCOUNTS` | JSON array (see below) |
| `OPS_SOCIAL_TOKEN_SECRET` | Same as LinkedIn/X (≥16 chars) |
| `OPS_STORAGE_MODE` | `database` |
| `DATABASE_URL` | Postgres for encrypted tokens |

### `META_ACCOUNTS` example

```json
[
  {
    "accountId": "account-bringhurstdo-facebook",
    "label": "BringhurstDO Facebook",
    "kind": "facebook_page",
    "pageId": "123456789012345"
  },
  {
    "accountId": "account-syncsoap-facebook",
    "label": "SyncSOAP Facebook",
    "kind": "facebook_page",
    "pageId": "234567890123456"
  },
  {
    "accountId": "account-bringhurstdo-instagram",
    "label": "BringhurstDO Instagram",
    "kind": "instagram_business",
    "instagramBusinessAccountId": "17841400000000000"
  }
]
```

`accountId` values must match `publicationTargets[].accountId` in `lib/ops/mock-data.ts`.

### Finding Page / Instagram IDs

- **Page ID:** Meta Business Suite → Settings → Page → Page ID, or Graph API Explorer `me/accounts`
- **Instagram Business account ID:** Graph API `/{page-id}?fields=instagram_business_account`

## Connect flow

1. Set env vars on Vercel (and `.env.local` for local dev).
2. Open `/ops/accounts` — Meta panel should show **Configured** with callback URL.
3. Click **Connect** on a Facebook Page row.
4. Approve Facebook permissions for Pages posting.
5. Confirm masked author id appears (no tokens in page source).

## Publish flow (Facebook)

1. Create or open a content package with a **Facebook** draft.
2. Approve the draft.
3. From publish calendar, click **Publish to Facebook**.
4. Confirm the operator dialog.
5. Public post URL is saved on the published post row.

## Instagram note

Instagram connect verifies the linked Business account is reachable, but Ops does
not publish to Instagram yet (requires image/video media workflow).

## Related docs

- `ops-phase-7a-linkedin-publish.md` — pattern reference
- `ops-phase-9-other-platforms.md` — X + Meta index
- `ops-security-boundaries.md` — global rules
