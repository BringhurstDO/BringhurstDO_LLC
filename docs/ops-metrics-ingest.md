# Ops metrics ingest (LinkedIn Excel + Meta insights)

## LinkedIn Aggregate Analytics import

1. In LinkedIn, export **Aggregate analytics** for the account/date range (`.xlsx`).
2. Open `/ops/metrics` (database persistence required).
3. Click **Import LinkedIn Excel** and pick the file.
4. Ops parses the workbook **in the browser**, POSTs only compact JSON (period totals + TOP POSTS URL metrics), and **does not store the Excel file**.
5. Matched posts upsert `performanceSnapshots` with source `linkedin-import` and **replace any manual placeholders** for those posts.
6. TOP POSTS URLs with no Ops published row are **backfilled** into package `content-package-linkedin-import-backfill` (draft + posted row + metrics). Incoming Excel is treated as source of truth.
7. URLs that still cannot be parsed (no share/activity id) remain listed in the UI.

Matching uses the LinkedIn share/activity numeric id, so Excel vanity URLs (`/posts/…-share-7478…-unOr`) align with Ops URN URLs (`urn:li:share:7478…`).

Supported sheets: DISCOVERY, ENGAGEMENT (period total only), TOP POSTS, FOLLOWERS. DEMOGRAPHICS are ignored on purpose.

## Source of truth

Inbound metrics (LinkedIn Excel import, Meta weekly API, X weekly API) overwrite manual zero placeholders for the same published post. The metrics table prefers ingest sources over `manual`.

## Meta Facebook / Instagram insights

### Operator setup

1. In Meta App / Facebook Login for Business, add insights permissions:
   - `pages_read_engagement`
   - `read_insights`
   - `instagram_manage_insights` (IG Business)
2. Update the Login config used by Ops (`META_LOGIN_CONFIG_ID` if set).
3. **Reconnect every Meta Page** on `/ops/accounts` (IG insights use the linked Page token). Page connect now requests `instagram_manage_insights` / `instagram_basic` in addition to Page scopes.
4. Use **Refresh Meta** on `/ops/metrics`, or wait for weekly cron `/api/cron/ops-meta-metrics` (Wed 16:00 UTC).

If Instagram refresh returns `(#10) Application does not have permission`, the Page token is missing `instagram_manage_insights` — update the Login for Business config, reconnect the Facebook Pages, then refresh again.

### Runtime notes

- Snapshots use source `meta-api-weekly` and replace the prior Meta snapshot per post.
- Lookback default is 28 days.
- Empty insights usually mean missing scopes, App Review pending, or post IDs older than insights entitlement.
- Facebook post insights use `post_media_view` / reaction metrics (not deprecated `post_impressions*`, which Graph rejects after the June 2026 Insights migration). Metrics are fetched one-at-a-time so one invalid name does not fail the whole post.
- Common Graph errors:
  - `#100` / `valid insights metric` → deprecated metric name (Ops should already avoid `post_impressions*`).
  - `#100` / `Unsupported get request` / subcode `33` → wrong Page token for that post, deleted post, or missing Page analyze access.
  - `#10` on Instagram → token missing `instagram_manage_insights` (reconnect after adding it to the Login config).

## Storage boundary

Keep: small JSON aggregates on `ops_performance_snapshots` (impressions/reactions/comments/saves + source + notes).

Never store: LinkedIn workbooks, raw Insights API dumps, demographics tables, audience exports.
