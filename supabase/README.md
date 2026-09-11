# Visitor analytics for the academic homepage

This is a custom Supabase Edge Function and private PostgreSQL schema. The
homepage stays on GitHub Pages. No Vercel, Neon, new Supabase project, visitor login,
or browser database key is required. An existing Supabase project can be reused;
its storage and function quotas are shared with this feature.

## Deployment status — 12 September 2026

At the owner's request, the 71 timestamp-only legacy history rows (IDs 1–71,
with both country and path null) were deleted in a guarded transaction. The
actual deletion count was checked, and the five newer complete records plus
all aggregate statistics were verified unchanged. History now starts with the
complete records; the collector remains enabled. This was a one-time data
cleanup, not a schema migration: do not rerun the activity backfill to restore
these intentionally removed rows. All-time totals still include those visits.

The numbered-page RPC, transaction-ordered collector and updated Edge Function
are deployed. Read-only live checks returned 75 records across four pages
(20/20/20/15), a reusable snapshot, public CORS and `no-store`; invalid page zero
returned HTTP 400 and the legacy cursor route still worked. Migration checks
preserved all 75 pageviews, visit rows and six blog tables. The new page RPC and
replacement collector remain executable only by `service_role` at the Data API
level. History is still public through the Edge Function; pagination does not
add authentication or make the records private.

The visit-history upgrade (`202609110002_visitor_activity.sql`) and updated
collector were deployed at approximately 19:29 UTC. Read-only checks before and
after migration retained 71 pageviews and 11 visitor-days, with all six existing
blog tables unchanged. All 71 retained event timestamps were backfilled; their
unrecorded country/page fields were null (those rows have since been deleted
at the owner's request, as noted above). The new table has RLS enabled, and
the activity RPC is denied to `anon` and `authenticated` and allowed to
`service_role`. Anonymous Edge Function GET returned HTTP 200 with public CORS
and `no-store`; three cursor pages returned all 71 records, and an invalid cursor
returned HTTP 400. No synthetic visits were added for these checks.

The reviewed SQL migration and the `visitor-analytics` function have been deployed
to `gjofwuihpzjfqeaysuuy`. A live read-only check confirmed six existing blog tables,
six separate analytics tables, no analytics RPC access for `anon` or
`authenticated`, and RPC access for `service_role`. Initial aggregate totals are
zero before the controlled live smoke test. Do not rerun the creation migration
on this project.

Six `VISITOR_*` settings are saved in Edge Function secrets. The HMAC secret was
generated securely and is not in this repository. With explicit owner approval,
`VISITOR_PROXY_HEADERS_VERIFIED=true` and `VISITOR_GEO_PROVIDER=country-is` were
saved at 00:08 UTC on 11 September. Platform JWT verification is off for the
collector. The deployed `country-is` provider is active. The frontend `enabled`
flag is true after successful test cleanup and a real browser read check.

Two distinct network exits passed live proxy checks: `cf-connecting-ip` matched
each exit's independently obtained address; forged, comma-separated and duplicate
CF address headers were rejected with HTTP 403. Caller-supplied `x-real-ip`,
`x-forwarded-for` and `cf-ipcountry` did not replace the trusted CF address.
The platform does not provide a country header. Country.is independently returned
AE and SG for the two exits, with matching response addresses.

The live anonymous smoke test passed: OPTIONS 204, public GET 200, accepted
POST 202, rejected origins 403, invalid events 400, and DNT/GPC skip 204.
Three synthetic pageviews produced two visitor-days in AE; retrying the same
event did not increase counts, and the same visitor across pages was deduplicated.
The existing blog is unchanged.

**Cleanup completed at 01:53 UTC on 11 September 2026:** test run
`2026-09-11T00-10-42-518Z-fc19f63f` created exactly
three event UUIDs (`9139c7e7-950f-44db-bce6-d817c3b59371`,
`ec326080-ec3a-41de-bf29-ad2467164f3f`, `f8786450-e30c-4575-9fbf-e83c3244b047`).
Its manifest and strictly guarded cleanup SQL are in
`/tmp/visitor-analytics-smoke-2026-09-11T00-10-42-518Z-fc19f63f.json` and the
adjacent `-cleanup.sql`. After exact event-ID and aggregate validation, the guarded
transaction removed only that test run. SQL returned zero totals, zero daily
counts, an empty country list and null start date. Public GET at 01:54 UTC and
the normal local browser preview independently confirmed the same empty data.
The frontend is enabled; localhost is excluded from tracking. Do not rerun that
cleanup or smoke test. Existing blog data and unrelated SQL drafts were preserved.

GitHub Pages deployed the new site successfully on 11 September (initial release
`2acd1ba`, run `34553337572`). All four public pages return HTTP 200 with the
collector enabled, and the served map matches the official source checksum.
One normal production-browser page load after cleanup produced one pageview,
one visitor-day and country `AE`, verified through the public API at 02:09 UTC.
These are actual page loads after enablement, not the removed synthetic events.
The Home card waits for its own collection attempt before requesting totals;
other clients' cached aggregates can still be up to one minute old.

The temporary token-protected `visitor-proxy-check` function was removed after
the two-network verification. It never accessed the database or returned raw
addresses. Only `visitor-analytics` remains deployed. The client, backend and
database checks pass. Never enable the frontend based only on unit tests.

## What is implemented

- `POST /functions/v1/visitor-analytics` records an allowed page load.
- `GET /functions/v1/visitor-analytics` exposes aggregate statistics only, with
  public CORS so the localhost preview can display the existing live totals.
- `GET /functions/v1/visitor-analytics?view=activity&page=1` exposes minimized
  visit history in numbered pages of 20: server receipt time, IP-derived
  country/region and an allowed site path. A reusable snapshot fixes the visible
  record set while changing pages. The previous 25-row cursor route remains
  available for older clients during rollout.
- Exact production-origin allowlist for tracking and four fixed page paths.
- No cookies, raw IPs, user agents, referrers, query strings or full URLs in the
  analytics database. A per-day HMAC of IP + user agent approximates one visitor
  across all four pages. A separate per-IP HMAC supports rate limiting even when
  the user agent changes.
- Page-load UUIDs make retries idempotent for seven days. SQL uniqueness and
  increments handle simultaneous requests without double-counting daily visitors.
- Rate limiting is atomic in PostgreSQL: 20 tracking requests and 120 summary
  requests per IP per minute. It runs before an external geolocation lookup.
- Country-level geolocation only. Unknown locations remain unknown. No fabricated
  city coordinates, exact visitor dots, raw IPs or visitor identifiers are exposed.
- Optional verified proxy-country header (`proxy-header`, disabled by default)
  reads only a configured header and needs no additional geolocation service.
- Optional country.is (no account/key) or IPinfo Lite lookup (disabled by default);
  a provider timeout/outage does not
  lose a valid pageview. The in-memory cache uses hashed keys, expires in one hour
  (five minutes for unknown), and is limited to 1,000 entries per Edge isolate.
- Summary results can be up to one minute old; cached results expire at UTC midnight.

## Counting and retention

`pageviews` is accumulated accepted page loads. `today.visitors` is the approximate
number of unique IP + user-agent combinations seen on the site today, in UTC.
`totals.visitorDays` is **the sum of daily unique visitors**, not the number of
different humans who have ever visited. A returning visitor on two dates adds two
visitor-days. Shared networks, user-agent changes, VPNs, blockers and bot filtering
also affect estimates. Do not label this number “all-time unique visitors”.

Daily and country aggregates are retained indefinitely. Country `visitorDays`
uses the same daily visitor definition as the overall metric; it is available
for historical aggregates as well as new visits. The first pageview assigns
a visitor's country for that UTC day; country pageviews use each event's lookup.
An unknown first location is not retroactively guessed. Hashed daily identifiers
are removed after the previous UTC day, the retry-deduplication table is cleared
after seven days, and rate buckets after two hours. One request per hour performs cleanup, so it resumes on
the next request after an idle period. No cron or always-on process is required.
These identifiers are pseudonymous during their short retention window.

The additive activity migration retains minimized visit records indefinitely in
private `visitor_analytics.visit_records`. Its internal sequence ID and page-load
UUID are never returned in record objects. The sequence ID is used only as an
opaque decimal-string pagination cursor; the UUID does not identify a browser
across pages or extend the seven-day retry window. No IP, user agent or daily
visitor hash is copied into this history. Timestamp and broad location are public
through the activity endpoint; the table and its RPC remain inaccessible directly
to browser database roles.

At migration time, surviving `recent_events` can supply their original timestamps
only. They are backfilled with null country and path; those values must display
as unknown/not recorded rather than being inferred from country totals. Events
already removed from the retry table cannot be reconstructed. The new history
therefore need not contain as many rows as the all-time pageview total. New
records include the validated page path and any country resolved by the existing
provider. The history does not change visitor deduplication or existing totals.

The database still needs capacity, a working Supabase project and backups. The
Free plan may pause after extended inactivity. Changing the HMAC secret midway
through a day causes returning visitors to be counted again that day.

## Reuse an existing Supabase project

The owner selected project `gjofwuihpzjfqeaysuuy`, currently used by the personal
blog. Its blog `public.page_views` / `public.visitor_sessions` records do not have
a site dimension, so the academic site deliberately has separate tables and
functions. Do not run the blog's schema or maintenance scripts from this project.
Dashboard owner login is required for deployment; visitors do not need accounts.

1. Choose the existing project and review its remaining capacity. Do not delete
   either existing project to install this feature.
2. Inspect `migrations/202609110001_visitor_analytics.sql`. Run it once in that
   project's SQL Editor as its database owner. The migration is one transaction:
   it creates only the private `visitor_analytics` schema and three explicitly
   named `public.visitor_analytics_*` RPC wrappers. It deliberately fails on name
   collisions instead of overwriting objects. It does not alter the existing
   application's schemas, grants, auth settings or tables.
3. For a new installation, also run
   `migrations/202609110002_visitor_activity.sql` once, after the initial migration.
   For the existing deployed project, run **only this additive second migration**.
   It creates the private visit-history table and two service-role-only RPCs,
   and replaces only the known academic-site legacy tracking wrapper so an older
   Edge Function keeps working during rollout. Backfill never changes totals.
   The next migration, `migrations/202609120001_visitor_activity_pages.sql`, adds
   only the service-role-only numbered-page RPC. On the project where both
   September 11 migrations already ran, apply **only the two September 12 migrations**.
   The numbered-page migration changes no stored rows, aggregates or older RPCs.
   `migrations/202609120002_visitor_history_write_order.sql` then replaces only
   `track_v2`, preserving its grants, to serialize record-ID allocation through
   commit. This prevents a late-committing lower ID from entering an already
   captured pagination snapshot. It does not change historical records or totals.
   Apply each missing SQL
   migration before deploying the corresponding updated Edge Function.
   Apply the SQL **before** deploying the updated Edge Function, then deploy the
   frontend. Old collectors can record history during this interval, with null
   page paths because their old RPC has no path argument. Never reset the shared
   project, rerun the initial migration or alter blog tables to add this feature.
4. Keep `visitor_analytics` **out of the Data API's exposed schemas**. Tables have
   RLS enabled and no browser policies or grants. Only the service role can call
   the six public RPC wrappers; `anon`, `authenticated` and `PUBLIC` cannot.
5. Merge the `[functions.visitor-analytics]` entry from `config.toml` into an
   existing Supabase configuration if needed. `verify_jwt = false` allows visitors
   without accounts to reach this intentionally public collector. No other
   function's authentication setting should be changed.
6. Copy `.env.example` to `.env.local`; fill the HMAC secret and review origins,
   the trusted IP header, owner exclusions and geography setting. Use the
   Supabase dashboard's Edge Function secrets or the CLI, keeping values private:

   ```sh
   supabase secrets set --env-file supabase/.env.local --project-ref YOUR_EXISTING_PROJECT_REF
   supabase functions deploy visitor-analytics --project-ref YOUR_EXISTING_PROJECT_REF
   ```

   The hosted runtime provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   Never put the service role in a page, `user-data` file, git commit or public URL.

   For dashboard-only deployment, run `npm run analytics:bundle` in the academic
   repository and use `output/visitor-analytics/index.ts` as the new function's
   `index.ts`. That generated bundle combines the source modules without secrets.
   Name the function `visitor-analytics` and disable Verify JWT **for this function
   only**. Enter secrets through the project's Edge Function secrets screen.
7. Verify trusted proxy behavior before setting `VISITOR_PROXY_HEADERS_VERIFIED=true`.
   In a temporary restricted diagnostic, compare requests from two known networks;
   the selected header must contain their client address, not the gateway address.
   Send forged values in `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for` and
   country headers; ensure clients cannot replace the chosen address. Remove the
   diagnostic afterwards. Do not log real visitor headers or addresses.
8. Configure the public Edge Function endpoint in the homepage's visitor config,
   then enable it after a real browser check from the allowed production origin.
   `localhost` can read public totals but is intentionally excluded from tracking.
   Before enabling, check that an anonymous
   direct Data API call to each RPC is denied, retrying one event adds one pageview,
   and the same browser visiting a second page adds no second daily visitor.

Apply each reviewed migration once on the shared project, not by resetting it or
pushing an unrelated migration history. To verify an existing production upgrade,
compare aggregate totals before and after migration and read activity pages;
do not create artificial production pageviews to test the UI.

## Client IP and geography

The client cannot supply country or IP in the payload. The handler reads exactly
one configured proxy header, accepts one canonical IPv4/IPv6 address, and never
falls back to a caller-supplied forwarding chain. Missing/invalid addresses fail
closed. The configuration defaults to an **unverified** proposed
`cf-connecting-ip` header. Supabase documentation/examples also use
`x-forwarded-for`, but the public documentation does not fully establish
anti-spoofing behavior for every hosting path. This must be verified on the actual
project; setting a header name alone does not make it trustworthy.

With `VISITOR_GEO_PROVIDER=none`, events are still counted but locations are unknown;
all supplied country headers are ignored. If the project's trusted hosting proxy
provides and overwrites country information, set `VISITOR_GEO_PROVIDER=proxy-header`
and `VISITOR_COUNTRY_HEADER=cf-ipcountry`. This path does not call an external
geolocation API. It requires the same explicit proxy verification flag, plus a
live check that forged country headers are overwritten and that the returned
location corresponds to the client network. Supabase's Cloudflare network does
not by itself establish that this header is available or safe on every Edge
Function route. Missing, malformed, `XX` and `T1` values remain unknown.

If a trustworthy proxy country header is unavailable, set
`VISITOR_GEO_PROVIDER=country-is` to use the no-account country.is API. The handler
calls the fixed HTTPS endpoint `https://api.country.is/{trustedClientIp}`, with no
API key and no extra fields. Its response is `{ "ip": "...", "country": "US" }`
(country can be null). The response IP must normalize to the exact IP queried;
only a valid ISO country code is retained. Never use the provider's bare `/`
endpoint from the Edge Function, because that resolves the server's address.
Missing/mismatched IPs, invalid countries, HTTP errors and timeouts remain unknown
without dropping the pageview. The existing 1.5-second timeout, 1-hour positive
cache, 5-minute unknown cache, 1,000-entry cap and prior database rate limit apply.

country.is's official documentation permits commercial use without a key or quota;
infrastructure limits are 10 requests per second per requesting IP. Shared Supabase
egress can share that limit. The provider states it does not log requests; this is
its published statement, not an independent infrastructure audit or uptime SLA.
Using this option sends the visitor IP over HTTPS to country.is for lookup. The
analytics database stores only the country and daily pseudonymous identifiers.

Another explicitly configured option is `VISITOR_GEO_PROVIDER=ipinfo` and `IPINFO_TOKEN` with an
IPinfo Lite token. This uses the fixed official endpoint
`https://api.ipinfo.io/lite/{ip}` and retains only `country_code`. Enabling this
option sends the requesting IP to IPinfo over HTTPS; the analytics database does
not store it. Supabase and IPinfo infrastructure can have their own request logs
and retention policies. Leave the provider disabled until that choice is accepted.

CORS and the origin allowlist prevent accidental browser use by unrelated sites;
they are not authentication against scripts that forge headers. IP-based rate
limits and basic bot filtering reduce noise but do not guarantee fraud-proof
visitor counts. The service should not be used for billing or access control.

## Public API contracts

The browser sends its `Origin` automatically. POST accepts only configured HTTPS
origins; localhost POST requests and their preflights are rejected. GET is a
public read with `Access-Control-Allow-Origin: *`, including localhost
preview, and does not need an Origin header. GET still requires a verified client
address and passes the same database rate limiter, including when the summary is
cached. Owner IP exclusions skip tracking but do not prevent reading totals.
GET preflight grants only GET/OPTIONS, never cross-origin POST. Do not send a
Supabase API key or browser credentials. GET without query parameters returns the
summary. `view=activity&page=N`, optionally with `snapshot`, selects numbered
history pages. `view=activity`, optionally with `before`, preserves the previous
cursor contract. Mixing `before` with numbered pagination, supplying a snapshot
without a page, duplicate/extra/invalid query values and all POST query parameters
are rejected. Allowed POST paths: `/`, `/publication/`, `/project/`, `/cv/`.

```json
{"eventId":"2f338636-4c51-48a7-85f6-91c2d420b101","path":"/publication/"}
```

POST accepts `application/json` up to 512 bytes and returns `202 {"ok":true}` for
new events and retries. Do Not Track, Global Privacy Control, obvious bots,
local/private client addresses and configured owner addresses are ignored (`204`).
Invalid input is `400`/`413`/`415`; disallowed origins `403`; rate limits `429`;
unconfigured or unavailable backend `503`. The page must not break if statistics
cannot load and must not replace an error with a fake zero count.

Example GET response (illustrative numbers, not actual visits):

```json
{
  "version": 1,
  "generatedAt": "2026-09-11T12:00:00Z",
  "since": "2026-09-11",
  "totals": {"pageviews": 3, "visitorDays": 2},
  "today": {"date": "2026-09-11", "pageviews": 3, "visitors": 2},
  "countries": [
    {"code": "CN", "pageviews": 2, "visitorDays": 1},
    {"code": null, "pageviews": 1, "visitorDays": 1}
  ]
}
```

`since` is `null` before the first event. Country codes are ISO 3166-1 alpha-2;
`null` is unknown and should not be placed on a map. GET is a public aggregate
response, with no row-level visitor identifiers.

Numbered activity response (illustrative records, not actual visits):

```json
{
  "version": 2,
  "records": [
    {"visitedAt": "2026-09-12T12:00:00+00:00", "countryCode": "CN", "path": "/publication/"},
    {"visitedAt": "2026-09-12T11:00:00+00:00", "countryCode": null, "path": null}
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 2,
  "totalPages": 1,
  "snapshot": "42"
}
```

An initial `?view=activity&page=1` captures the current maximum record ID as a
decimal-string `snapshot`. Send that same value on all previous, next and direct
page requests: `?view=activity&page=3&snapshot=42`. Counts and records include only
IDs at or below this snapshot, ordered by descending ID. Newer visits therefore
cannot shift already viewed page positions. Omit the snapshot to refresh the
record set. A supplied value greater than the current maximum is bounded to the
current maximum in the response. This is an insertion-bound snapshot, not a
permanent historical database copy; administrative deletion of old records can
still change counts and positions.

Each page replaces the visible rows with up to 20 records. `totalRecords` counts
actual rows in the snapshot, so sequence gaps do not inflate it. `totalPages` is
`ceil(totalRecords / 20)`. `page` is a canonical positive integer request from
1 through 1,000,000; values beyond the available pages are clamped to the final
page and the response supplies that actual page number. With no records, the
response is `records: []`, `page: 1`, `pageSize: 20`, `totalRecords: 0`,
`totalPages: 0`, `snapshot: null`. Nonempty snapshot values must be canonical
positive int64 strings; never convert them to JavaScript numbers.

The new RPC is `visitor_analytics_activity_page(p_page integer, p_snapshot text)`.
Only `service_role` can execute it. It reads existing records without changing
tracking, aggregates, retention or the old cursor RPC. The Edge Function validates
integer metadata, page clamping, snapshot bounds and exact page length before
projecting the same three public record fields. Both history routes share the
existing 120 requests/IP/minute summary budget and `Cache-Control: no-store`.
The summary response and its one-minute cache remain unchanged.

Collectors use a transaction-scoped advisory lock before their first write, so
record IDs follow transaction completion order. The migration drains existing
writes before replacing the collector. Administrative deletes or manual inserts
remain outside this pagination guarantee. The database test checks that the lock
is held before insertion, remains through the transaction and releases at commit;
PGlite does not simulate multiple simultaneous PostgreSQL sessions.

Legacy cursor activity response (illustrative records, not actual visits):

```json
{
  "version": 1,
  "records": [
    {"visitedAt": "2026-09-11T12:00:00+00:00", "countryCode": "CN", "path": "/publication/"},
    {"visitedAt": "2026-09-11T11:00:00+00:00", "countryCode": null, "path": null}
  ],
  "nextCursor": null
}
```

The legacy page size remains fixed at 25 and records are ordered by descending private
insertion ID. When more records exist, `nextCursor` is the last returned row's ID
as a **string**. Request `?view=activity&before=...` to fetch strictly older IDs.
This keyset pagination prevents newer pageviews shifting previously fetched
pages. Cursors must be canonical positive decimal strings from `1` through
`9223372036854775807`, not JavaScript numbers; no signs or leading zeros. The
query string is limited to 80 characters. Empty results have `records: []` and
`nextCursor: null`. The Edge Function explicitly projects the three public record
fields, rejects malformed or oversized database responses and never returns
internal UUIDs, row IDs, hashes or addresses as record fields. Activity responses
use `Cache-Control: no-store` and share the summary's 120 requests/IP/minute
budget. The existing summary response and its one-minute cache are unchanged.

## Local checks

```sh
node --test tests/backend-visitor-analytics.test.mjs tests/visitors-database.test.mjs
```

These tests exercise validation, exact CORS, proxy failure, privacy/exclusion,
hash rotation, backend payload minimization, rate-limit ordering, geolocation
failure/cache, summary caching and activity query/response minimization using
mocked network/RPC boundaries. PGlite tests exercise the additive migration,
unchanged aggregate counts, legacy compatibility, idempotency, numbered-page
clamping, insertion-stable snapshots, bigint precision, unknown historical fields,
retention and role grants. They do
not establish that the hosted Supabase proxy or secrets are configured correctly.

## Official references

- [Supabase public Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Database functions and execution privileges](https://supabase.com/docs/guides/database/functions)
- [Supabase client IP example](https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/location)
- [Supabase network logs and Cloudflare](https://supabase.com/docs/guides/telemetry/logs)
- [IPinfo Lite API and country response](https://ipinfo.io/developers/lite-api)
- [country.is API, usage limits and privacy statement](https://country.is/)
- [country.is response contract](https://api.country.is/openapi.json)
