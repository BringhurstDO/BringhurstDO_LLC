# BringhurstDO Ops Phase 7A LinkedIn Publishing

Phase 7A is the first approved exception to the historical "no posting API / no
OAuth / no autoposting" boundary. It adds a server-only LinkedIn connection and
an operator-approved publish action for **one account at a time** (BringhurstDO
LinkedIn first).

It remains fail-closed: unless the integration is explicitly enabled and fully
configured, no OAuth or publish call can run.

## Scope

In scope:

- Server-only LinkedIn OAuth 2.0 connect flow with CSRF-protected state.
- Encrypted token storage in Postgres (AES-256-GCM at rest).
- A manual, per-draft, operator-confirmed publish action using the LinkedIn
  Posts API (`POST https://api.linkedin.com/rest/posts`) for text-only posts.
- A metadata-only publish audit log.
- Connection status + connect/disconnect UI on `/ops/accounts`.

Out of scope (later phases):

- Scheduling or queued autoposting.
- Read-only metric sync (Phase 8A).
- Instagram, Facebook (Meta), or X.
- Media/image/video upload, carousels, threads.
- Ad spend or budget control.

## Hard boundaries (still enforced)

- Tokens, refresh tokens, and client secrets are server-only. They are never
  serialized into client props, exports, screenshots, or logs. The browser only
  receives public status (configured/connected/expired, masked author id,
  expiry, scopes).
- Every publish requires explicit operator approval (`confirmApproved=true`) on
  a specific draft. There is no bulk or automatic posting.
- Publishable body is re-sanitized server-side with `sanitizePublishableBody`
  and rejected if it still contains internal workflow/operator artifacts.
- LinkedIn posts are text-only. The publish API rejects visible URLs in the body
  and rejects attached link cards or `linkUrl` payloads.
- No PHI, patient identifiers, encounter text, transcripts, clinical payloads,
  private messages, raw logs, or secret values are sent to LinkedIn.
- Connecting requires durable database storage (`OPS_STORAGE_MODE=database`).

## Required env vars (server-only)

| Variable | Purpose |
| --- | --- |
| `OPS_LINKEDIN_ENABLED` | `true` to enable the integration (default off). |
| `LINKEDIN_CLIENT_ID` | LinkedIn developer app client id. |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn developer app client secret. |
| `LINKEDIN_REDIRECT_URI` | Exact callback URL, e.g. `https://www.bringhurstdo.com/ops/api/social/linkedin/callback`. |
| `LINKEDIN_API_VERSION` | Optional `YYYYMM` Posts API version (default `202605`). |
| `OPS_SOCIAL_TOKEN_SECRET` | >= 16 chars; derives the AES-256 key for token encryption. |

Account configuration is one of the following:

**Phase 7B — multi-account (recommended).** Set `LINKEDIN_ACCOUNTS` to a JSON
array. Each entry's `accountId` must match the Ops publication-target
`accountId`. `organizationUrn` is required for `organization` entries:

```
LINKEDIN_ACCOUNTS=[
  {"accountId":"account-founder-linkedin","label":"Kyle Bringhurst","authorType":"member"},
  {"accountId":"account-bringhurstdo-linkedin","label":"BringhurstDO","authorType":"organization","organizationUrn":"urn:li:organization:12345678"},
  {"accountId":"account-syncsoap-linkedin","label":"SyncSOAP","authorType":"organization","organizationUrn":"urn:li:organization:23456789"},
  {"accountId":"account-syncsafety-linkedin","label":"SyncSafety","authorType":"organization","organizationUrn":"urn:li:organization:34567890"}
]
```

**Phase 7A fallback — single account.** If `LINKEDIN_ACCOUNTS` is unset, the
integration uses these instead:

| Variable | Purpose |
| --- | --- |
| `LINKEDIN_AUTHOR_TYPE` | `organization` (company page, default) or `member`. |
| `LINKEDIN_ORGANIZATION_URN` | Required for organization mode, e.g. `urn:li:organization:12345678`. |
| `LINKEDIN_ACCOUNT_ID` | Optional ops account id (default `account-bringhurstdo-linkedin`). |
| `LINKEDIN_ACCOUNT_LABEL` | Optional display label (default `BringhurstDO LinkedIn`). |

Existing required vars still apply: `DATABASE_URL`, `OPS_STORAGE_MODE=database`,
`OPS_BASIC_AUTH_USERNAME`, `OPS_BASIC_AUTH_PASSWORD_SHA256`.

## External LinkedIn app setup

1. Create a LinkedIn Developer app and associate it with the BringhurstDO
   company page.
2. Request the products that grant `w_organization_social` (Community Management
   API) for company-page posting, or `w_member_social` for personal posting.
   These require LinkedIn partner verification/approval.
3. Add the exact `LINKEDIN_REDIRECT_URI` to the app's authorized redirect URLs.
4. The authenticated operator must be an admin of the company page for
   organization posting to succeed.

## Database

Apply `db/migrations/0003_ops_social_connections.sql`:

```
npm run db:migrate
```

This creates `ops_social_connections` (encrypted tokens + connection metadata)
and `ops_social_publish_log` (metadata-only publish audit rows).

## Routes

All routes are under the Basic-Auth-protected `/ops` matcher.

- `GET /ops/api/social/linkedin/connect?account=<accountId>` — starts OAuth for
  a specific account, sets signed state + account cookies, redirects to LinkedIn.
- `GET /ops/api/social/linkedin/callback` — verifies state, resolves the account
  from the cookie, exchanges code, resolves author URN, stores the encrypted
  connection, redirects to `/ops/accounts`.
- `GET /ops/api/social/linkedin/status` — returns browser-safe status for every
  configured account (`{ configured, disabledReason, accounts: [...] }`).
- `POST /ops/api/social/linkedin/disconnect` — deletes a stored connection
  (`{ accountId }`).
- `POST /ops/api/social/linkedin/publish` — operator-approved publish of one
  draft as `accountId`. Refreshes the token if expired, sanitizes the body,
  posts, writes an audit row, and returns
  `{ accountId, platformPostId, postUrl, postedAt, publishLogId }`.
- `POST /ops/api/social/linkedin/reshare` — operator-approved native reshare of
  a published post (`reshareContext.parent`) from another connected account.
  Body: `{ accountId, contentPackageId, sourcePostUrn, sourcePlatformDraftId?,
  commentary?, confirmApproved: true }`.

## Publish request shape

```json
{
  "contentPackageId": "...",
  "platformDraftId": "...",
  "publicationTargetId": "...",
  "accountId": "account-bringhurstdo-linkedin",
  "body": "Publishable social copy only",
  "confirmApproved": true
}
```

Do not include `linkUrl`, article content, or visible URLs in `body`. Saved UTM
URLs remain useful for manual tracking/copy packets, but Ops LinkedIn publishing
does not send them to LinkedIn.

The client merges the returned result into the package's `PublishedPost` record
(public post URL, posted timestamp, posted status) using the existing
persistence flow.

## Publishing from the content builder

On `/ops/content/new`, each saved LinkedIn draft shows a "Publish to LinkedIn"
action when:

- the draft platform is `LinkedIn`,
- a LinkedIn connection is active (status `connected`), and
- the draft status is `approved`.

Clicking it asks for an explicit confirmation, re-sanitizes the body, calls the
publish API, and—on success—saves the public post URL, posted timestamp, and
`posted` status onto the package's `PublishedPost` record (and flips the draft
to `posted`). The post id is recorded in the published post's internal notes.

Non-LinkedIn drafts are unchanged and remain manual.

## Cross-posting and reposting (founder-first amplification)

Kyle Bringhurst's personal account is expected to be the **primary author** for
most content, with BringhurstDO, SyncSOAP, and SyncSafety **reposting /
amplifying** a majority of it. Phase 7A intentionally ships single-account
publishing first; founder-first amplification is the next step (Phase 7B) and is
documented here so the data model and connection design account for it now.

### The two amplification models

1. **Native reshare (recommended).** LinkedIn's Posts API supports a
   `reshareContext` that references an existing post URN. A brand page can
   reshare Kyle's original public post. This preserves attribution, shows as a
   reshare on the brand page, and avoids duplicate-content penalties. It
   requires the **original post URN** (already captured by Phase 7A and stored
   on the published post) and a separate brand connection with
   `w_organization_social`.
2. **Re-authored duplicate.** Each brand account posts its own copy of the same
   message (optionally tailored). More control over wording, but no attribution
   link to the founder post and a higher duplicate-content risk. Use this only
   when the brand voice must differ materially from the founder post.

### Phase 7B (implemented): multi-account + native reshare

Phase 7B is now shipped. The integration supports **multiple concurrent
connections** and **founder-first amplification via native reshare**:

- **Multi-account config.** Accounts are declared in a `LINKEDIN_ACCOUNTS` JSON
  allowlist (see env below). Each entry has an `accountId` (matching the Ops
  publication-target `accountId`), a `label`, an `authorType`
  (`member` for Kyle's personal profile, `organization` for a brand page), and
  an `organizationUrn` for org accounts. If `LINKEDIN_ACCOUNTS` is unset, the
  integration falls back to the Phase 7A single-account env vars.
- **Per-account OAuth.** `GET /ops/api/social/linkedin/connect?account=<id>`
  starts the flow for a specific account; member accounts request
  `w_member_social`, org accounts request `w_organization_social`. Each
  connection is stored as its own encrypted row keyed by `(platform, accountId)`.
- **Account-aware publish.** The publish route resolves the target account from
  the draft's publication target `accountId`, posts as that author, and returns
  the post URN. The URN is stored on the published post (`platformPostId`) so it
  can be reshared.
- **Native reshare.** `POST /ops/api/social/linkedin/reshare` creates a post
  with `reshareContext.parent = <source URN>` from a connected brand page. The
  builder surfaces an "Amplify (founder-first reshare)" block under any posted
  LinkedIn draft, listing every other connected LinkedIn account with a one-click
  Reshare button. Each reshare is a separate operator-approved, individually
  logged action.

Re-authored duplicates (each brand posting its own copy) are intentionally not
automated — publish a separate draft per account if a brand voice must differ.

### Operating model

1. Connect Kyle's personal LinkedIn (`account-founder-linkedin`, member mode) as
   the primary author, plus each brand page you administer.
2. Publish the founder draft from Ops. Its public post URN is captured
   automatically.
3. Use the Amplify block to reshare that post from BringhurstDO, SyncSOAP, and
   SyncSafety pages — one approved click each.

Per-account admin rights still apply: the connecting operator must be an admin of
each brand page for org posting and resharing to succeed.

### Other platforms

- **X**: native repost/quote-post is straightforward once an X connection
  exists; the same founder-first → amplify pattern applies.
- **Instagram / Facebook (Meta)**: no clean cross-account "reshare" for feed
  posts; amplification there is effectively re-authored content and depends on
  Meta app review. Defer until Meta is connected in a later phase.

## Verification

1. Apply the migration and set the env vars above.
2. On `/ops/accounts`, confirm the LinkedIn panel shows "Configured".
3. Click "Connect LinkedIn", complete OAuth, confirm it returns "Connected" with
   a masked author id and expiry.
4. Confirm tokens are absent from page source, network status payloads, and
   exports.
5. Publish one approved draft and confirm the post appears on LinkedIn with the
   correct UTM link, and that an audit row exists in `ops_social_publish_log`.
6. Confirm `/ops/*` still fails closed without Basic Auth.
