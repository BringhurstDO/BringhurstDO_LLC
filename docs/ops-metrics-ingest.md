# Ops metrics ingest (LinkedIn Excel + Meta insights)

## LinkedIn Aggregate Analytics import

1. In LinkedIn, export **Aggregate analytics** for the account/date range (`.xlsx`).
2. Open `/ops/metrics` (database persistence required).
3. Click **Import LinkedIn Excel** and pick the file.
4. Ops parses the workbook **in the browser**, POSTs only compact JSON (period totals + TOP POSTS URL metrics), and **does not store the Excel file**.
5. Matched posts upsert `performanceSnapshots` with source `linkedin-import`. Unmatched TOP POSTS URLs are listed in the UI.

Supported sheets: DISCOVERY, ENGAGEMENT (period total only), TOP POSTS, FOLLOWERS. DEMOGRAPHICS are ignored on purpose.

## Meta Facebook / Instagram insights

### Operator setup

1. In Meta App / Facebook Login for Business, add insights permissions:
   - `pages_read_engagement`
   - `read_insights`
   - `instagram_manage_insights` (IG Business)
2. Update the Login config used by Ops (`META_LOGIN_CONFIG_ID` if set).
3. **Reconnect every Meta Page/IG account** on `/ops/accounts` so tokens include the new scopes.
4. Use **Refresh Meta** on `/ops/metrics`, or wait for weekly cron `/api/cron/ops-meta-metrics` (Wed 16:00 UTC).

### Runtime notes

- Snapshots use source `meta-api-weekly` and replace the prior Meta snapshot per post.
- Lookback default is 28 days.
- Empty insights usually mean missing scopes, App Review pending, or post IDs older than insights entitlement.

## Storage boundary

Keep: small JSON aggregates on `ops_performance_snapshots` (impressions/reactions/comments/saves + source + notes).

Never store: LinkedIn workbooks, raw Insights API dumps, demographics tables, audience exports.
