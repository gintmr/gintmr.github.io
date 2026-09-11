# Visitor analytics for the academic homepage

This is a custom Supabase Edge Function and private PostgreSQL schema. The
homepage stays on GitHub Pages. No Vercel, Neon, new Supabase project, visitor login,
or browser database key is required. An existing Supabase project can be reused;
its storage and function quotas are shared with this feature.

## Deployment status — 11 September 2026

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

The temporary token-protected `visitor-proxy-check` function was removed after
the two-network verification. It never accessed the database or returned raw
addresses. Only `visitor-analytics` remains deployed. The unit suite passes all
29 tests after removing the unused choropleth-shading test. Never enable the
frontend based only on unit tests.

## What is implemented

- `POST /functions/v1/visitor-analytics` records an allowed page load.
- `GET /functions/v1/visitor-analytics` exposes aggregate statistics only, with
  public CORS so the localhost preview can display the existing live totals.
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
  city coordinates, exact visitor dots or visitor history are exposed.
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

Daily and country aggregates are retained indefinitely. The first pageview assigns
a visitor's country for that UTC day; country pageviews use each event's lookup.
An unknown first location is not retroactively guessed. Hashed daily identifiers
are removed after the previous UTC day, retry UUIDs after seven days, and rate
buckets after two hours. One request per hour performs cleanup, so it resumes on
the next request after an idle period. No cron or always-on process is required.
These identifiers are pseudonymous during their short retention window.

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
3. Keep `visitor_analytics` **out of the Data API's exposed schemas**. Tables have
   RLS enabled and no browser policies or grants. Only the service role can call
   the three public RPC wrappers; `anon`, `authenticated` and `PUBLIC` cannot.
4. Merge the `[functions.visitor-analytics]` entry from `config.toml` into an
   existing Supabase configuration if needed. `verify_jwt = false` allows visitors
   without accounts to reach this intentionally public collector. No other
   function's authentication setting should be changed.
5. Copy `.env.example` to `.env.local`; fill the HMAC secret and review origins,
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
6. Verify trusted proxy behavior before setting `VISITOR_PROXY_HEADERS_VERIFIED=true`.
   In a temporary restricted diagnostic, compare requests from two known networks;
   the selected header must contain their client address, not the gateway address.
   Send forged values in `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for` and
   country headers; ensure clients cannot replace the chosen address. Remove the
   diagnostic afterwards. Do not log real visitor headers or addresses.
7. Configure the public Edge Function endpoint in the homepage's visitor config,
   then enable it after a real browser check from the allowed production origin.
   `localhost` can read public totals but is intentionally excluded from tracking.
   Before enabling, check that an anonymous
   direct Data API call to each RPC is denied, retrying one event adds one pageview,
   and the same browser visiting a second page adds no second daily visitor.

The initial SQL should be applied as the single reviewed migration on a shared
project, not by resetting it or pushing an unrelated migration history.

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

## Public API contract (version 1)

The browser sends its `Origin` automatically. POST accepts only configured HTTPS
origins; localhost POST requests and their preflights are rejected. GET is a
public aggregate read with `Access-Control-Allow-Origin: *`, including localhost
preview, and does not need an Origin header. GET still requires a verified client
address and passes the same database rate limiter, including when the summary is
cached. Owner IP exclusions skip tracking but do not prevent reading totals.
GET preflight grants only GET/OPTIONS, never cross-origin POST. Do not send a
Supabase API key or browser credentials. Requests with query parameters are
rejected. Allowed POST paths: `/`, `/publication/`, `/project/`, `/cv/`.

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

## Local checks

```sh
node --test tests/backend-visitor-analytics.test.mjs
```

These tests exercise validation, exact CORS, proxy failure, privacy/exclusion,
hash rotation, backend payload minimization, rate-limit ordering, geolocation
failure/cache and summary caching using mocked network/RPC boundaries. They do
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
