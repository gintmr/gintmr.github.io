import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, readConfig, dailyHashes, normalizeIp, isPublicIp, normalizeCountry, validateEvent } from '../supabase/functions/visitor-analytics/core.mjs';

const origin = 'https://gintmr.github.io';
const event = { eventId: '2f338636-4c51-48a7-85f6-91c2d420b101', path: '/' };
const env = {
  VISITOR_ALLOWED_ORIGINS: origin,
  VISITOR_HASH_SECRET: 'test-only-secret-at-least-32-characters',
  VISITOR_CLIENT_IP_HEADER: 'cf-connecting-ip',
  VISITOR_PROXY_HEADERS_VERIFIED: 'true',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};
const config = (overrides = {}) => readConfig(key => ({ ...env, ...overrides })[key]);
function request(method = 'POST', { headers = {}, body = event, url = 'https://test-project.supabase.co/functions/v1/visitor-analytics' } = {}) {
  return new Request(url, { method, headers: { origin, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Safari/605.1', 'cf-connecting-ip': '8.8.8.8', ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
}
function setup(overrides = {}, dependencies = {}) {
  const calls = [];
  const handler = createHandler(config(overrides), { now: () => new Date('2026-09-11T12:00:00Z'), rpc: async (name, args) => {
    calls.push({ name, args });
    if (name.endsWith('summary')) return { version: 1, totals: { pageviews: 3, visitorDays: 2 }, countries: [] };
    return true;
  }, ...dependencies });
  return { handler, calls };
}

test('only explicit public HTTPS origins and a verified proxy make configuration ready', () => {
  assert.equal(config().ready, true);
  assert.equal(config({ VISITOR_GEO_PROVIDER: 'country-is' }).ready, true);
  for (const overrides of [{ VISITOR_ALLOWED_ORIGINS: '*' }, { VISITOR_ALLOWED_ORIGINS: 'http://localhost:4173' },
    { VISITOR_HASH_SECRET: 'short' }, { VISITOR_PROXY_HEADERS_VERIFIED: 'false' }, { VISITOR_CLIENT_IP_HEADER: '' },
    { VISITOR_GEO_PROVIDER: 'ipinfo' }, { VISITOR_GEO_PROVIDER: 'proxy-header' },
    { VISITOR_GEO_PROVIDER: 'proxy-header', VISITOR_COUNTRY_HEADER: 'cf-ipcountry', VISITOR_PROXY_HEADERS_VERIFIED: 'false' }
  ]) assert.equal(config(overrides).ready, false);
});

test('HMAC identities are shared across pages, rotate at UTC midnight, and separate visitors from rate keys', async () => {
  const a = await dailyHashes(env.VISITOR_HASH_SECRET, '8.8.8.8', 'UA', '2026-09-11');
  assert.deepEqual(a, await dailyHashes(env.VISITOR_HASH_SECRET, '8.8.8.8', 'UA', '2026-09-11'));
  const next = await dailyHashes(env.VISITOR_HASH_SECRET, '8.8.8.8', 'UA', '2026-09-12');
  assert.notEqual(a.visitorHash, next.visitorHash);
  assert.notEqual(a.ipHash, next.ipHash);
  assert.notEqual(a.visitorHash, a.ipHash);
  assert.match(a.visitorHash, /^[a-f0-9]{64}$/);
  assert.notEqual(a.visitorHash, (await dailyHashes(env.VISITOR_HASH_SECRET, '8.8.8.8', 'OTHER-UA', '2026-09-11')).visitorHash);
  assert.equal(a.ipHash, (await dailyHashes(env.VISITOR_HASH_SECRET, '8.8.8.8', 'OTHER-UA', '2026-09-11')).ipHash);
});

test('IP normalization rejects comma chains and local addresses, canonicalizes IPv6 and mapped IPv4', () => {
  assert.equal(normalizeIp('8.8.8.8, 1.1.1.1'), null);
  assert.equal(normalizeIp('not-an-ip'), null);
  assert.equal(normalizeIp('::ffff:8.8.8.8'), '8.8.8.8');
  assert.equal(normalizeIp('2001:4860:0000:0000:0000:0000:0000:8888'), '2001:4860::8888');
  for (const ip of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.1.2', '172.16.0.1', '::1', 'fe80::1', 'fc00::1', '2001:db8::1']) assert.equal(isPublicIp(normalizeIp(ip)), false);
  assert.equal(isPublicIp('8.8.8.8'), true);
});

test('events only permit documented paths and UUIDv4 event IDs; client geography and extra payload rejected', () => {
  assert.deepEqual(validateEvent(event), event);
  for (const body of [{ ...event, country: 'US' }, { ...event, path: '/?secret=x' }, { ...event, path: '/admin/' }, { ...event, eventId: 'anything' }, null, []]) assert.equal(validateEvent(body), null);
  assert.equal(normalizeCountry('cn'), 'CN');
  assert.equal(normalizeCountry('XX'), null);
  assert.equal(normalizeCountry('ZZ'), null);
});

test('POST CORS does exact origin matching and never touches the database for other origins', async () => {
  const { handler, calls } = setup();
  for (const bad of ['https://gintmr.github.io.evil.example', 'null', 'http://localhost:4173', '']) {
    const response = await handler(request('POST', { headers: { origin: bad } }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  assert.equal(calls.length, 0);
  const response = await handler(request('OPTIONS'));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(calls.length, 0);
});

test('public GET permits localhost or other origins but can call only rate-limit and aggregate RPCs', async () => {
  const { handler, calls } = setup({ VISITOR_EXCLUDED_IPS: '8.8.8.8' });
  for (const readOrigin of ['http://127.0.0.1:4173', 'https://unrelated.example', 'null', '']) {
    const response = await handler(request('GET', { headers: { origin: readOrigin } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    assert.equal((await response.json()).totals.pageviews, 3);
  }
  assert.equal(calls.filter(c => c.name === 'visitor_analytics_rate_limit').length, 4);
  assert.equal(calls.every(c => ['visitor_analytics_rate_limit', 'visitor_analytics_summary'].includes(c.name)), true);
  assert.equal(calls.every(c => c.name !== 'visitor_analytics_rate_limit' || c.args.p_kind === 'summary'), true);
});

test('localhost GET preflight permits only reading, while POST and its preflight stay rejected', async () => {
  const { handler, calls } = setup();
  const local = { origin: 'http://127.0.0.1:4173' };
  const read = await handler(request('OPTIONS', { headers: { ...local, 'access-control-request-method': 'GET' } }));
  assert.equal(read.status, 204);
  assert.equal(read.headers.get('access-control-allow-origin'), '*');
  assert.equal(read.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
  assert.equal((await handler(request('OPTIONS', { headers: { ...local, 'access-control-request-method': 'POST' } }))).status, 403);
  assert.equal((await handler(request('POST', { headers: local }))).status, 403);
  assert.equal(calls.length, 0);
});

test('public GET remains rate-limited and fails closed when a verified client address is missing', async () => {
  const calls = [];
  const { handler } = setup({}, { rpc: async (name, args) => { calls.push({ name, args }); return false; } });
  const headers = { origin: 'http://127.0.0.1:4173' };
  assert.equal((await handler(request('GET', { headers: { ...headers, 'cf-connecting-ip': '' } }))).status, 503);
  assert.equal(calls.length, 0);
  const limited = await handler(request('GET', { headers }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(calls.map(c => [c.name, c.args.p_kind]), [['visitor_analytics_rate_limit', 'summary']]);
});

test('privacy signals, automated clients, private addresses and owner exclusions do not count', async () => {
  const { handler, calls } = setup({ VISITOR_EXCLUDED_IPS: '8.8.4.4' });
  for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { 'user-agent': 'Googlebot' },
    { 'user-agent': 'HeadlessChrome' }, { 'cf-connecting-ip': '127.0.0.1' }, { 'cf-connecting-ip': '::ffff:8.8.4.4' }]) {
    assert.equal((await handler(request('POST', { headers }))).status, 204);
  }
  assert.equal(calls.length, 0);
});

test('missing verified address fails closed; no fallback to spoofed forwarding or country headers', async () => {
  const { handler, calls } = setup();
  const response = await handler(request('POST', { headers: { 'cf-connecting-ip': '', 'x-forwarded-for': '8.8.8.8', 'cf-ipcountry': 'US' } }));
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test('body validation and actual byte limit happen before database or provider calls', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(request('POST', { body: '{bad' }))).status, 400);
  assert.equal((await handler(request('POST', { body: { ...event, path: '/unexpected' } }))).status, 400);
  assert.equal((await handler(request('POST', { headers: { 'content-type': 'text/plain' } }))).status, 415);
  assert.equal((await handler(request('POST', { body: 'x'.repeat(513) }))).status, 413);
  assert.equal(calls.length, 0);
});

test('valid event sends only date/hash/id/country to database, never IP/UA/referrer/path', async () => {
  const { handler, calls } = setup();
  assert.equal((await handler(request())).status, 202);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].name, 'visitor_analytics_rate_limit');
  assert.equal(calls[1].name, 'visitor_analytics_track');
  assert.deepEqual(Object.keys(calls[1].args).sort(), ['p_country_code', 'p_day', 'p_event_id', 'p_visitor_hash']);
  assert.equal(calls[1].args.p_country_code, null);
  assert.equal(JSON.stringify(calls).includes('8.8.8.8'), false);
});

test('database rate denial prevents both geolocation calls and recording', async () => {
  let providerCalled = false;
  const calls = [];
  const { handler } = setup({ VISITOR_GEO_PROVIDER: 'ipinfo', IPINFO_TOKEN: 'test-token' }, {
    rpc: async (name) => { calls.push(name); return false; }, fetch: async () => { providerCalled = true; },
  });
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.deepEqual(calls, ['visitor_analytics_rate_limit']);
  assert.equal(providerCalled, false);
});

test('optional country lookup is cached with hashed keys and rejected countries stay unknown', async () => {
  let providerCalls = 0;
  const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'ipinfo', IPINFO_TOKEN: 'test-token' }, {
    fetch: async (url) => {
      providerCalls++;
      assert.equal(url.hostname, 'api.ipinfo.io');
      assert.equal(url.pathname, '/lite/8.8.8.8');
      return Response.json({ country_code: 'CN' });
    },
  });
  assert.equal((await handler(request())).status, 202);
  assert.equal((await handler(request('POST', { body: { ...event, path: '/publication/' } }))).status, 202);
  assert.equal(providerCalls, 1);
  assert.equal(calls.filter(c => c.name.endsWith('_track')).every(c => c.args.p_country_code === 'CN'), true);
});

test('geolocation outage records unknown instead of losing the pageview', async () => {
  const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'ipinfo', IPINFO_TOKEN: 'test-token' }, {
    fetch: async () => { throw new Error('unavailable'); },
  });
  assert.equal((await handler(request())).status, 202);
  assert.equal(calls.at(-1).args.p_country_code, null);
});

test('country.is queries the exact trusted IP without credentials and caches only validated country results', async () => {
  let providerCalls = 0;
  const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'country-is' }, {
    fetch: async (url, options) => {
      providerCalls++;
      assert.equal(url.href, 'https://api.country.is/8.8.8.8');
      assert.equal(options.headers, undefined);
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ ip: '::ffff:8.8.8.8', country: 'US', city: 'ignored' });
    },
  });
  for (const path of ['/', '/publication/']) {
    assert.equal((await handler(request('POST', { body: { ...event, path }, headers: { 'x-forwarded-for': '1.1.1.1', 'cf-ipcountry': 'CN' } }))).status, 202);
    assert.equal(calls.at(-1).args.p_country_code, 'US');
    assert.equal(JSON.stringify(calls.at(-1)).includes('city'), false);
  }
  assert.equal(providerCalls, 1);
});

test('country.is mismatched IPs, invalid countries and provider errors remain unknown without losing pageviews', async () => {
  for (const providerResponse of [
    { ip: '1.1.1.1', country: 'US' }, { country: 'US' }, { ip: '8.8.8.8', country: 'XX' },
    { ip: '8.8.8.8', country: 'T1' }, { ip: '8.8.8.8', country: null }, { ip: '8.8.8.8', country: '<script>' }, null,
    404, 429, 503,
  ]) {
    const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'country-is' }, {
      fetch: async () => typeof providerResponse === 'number'
        ? new Response(null, { status: providerResponse }) : Response.json(providerResponse),
    });
    assert.equal((await handler(request())).status, 202);
    assert.equal(calls.at(-1).args.p_country_code, null);
  }
});

test('country.is is never called after rate denial, and timeout recovery retries after the negative cache expires', async () => {
  let providerCalls = 0;
  const limited = setup({ VISITOR_GEO_PROVIDER: 'country-is' }, {
    rpc: async () => false, fetch: async () => { providerCalls++; throw new Error('must not call'); },
  });
  assert.equal((await limited.handler(request())).status, 429);
  assert.equal(providerCalls, 0);
  let current = new Date('2026-09-11T12:00:00Z');
  const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'country-is' }, {
    now: () => current,
    fetch: async () => {
      if (++providerCalls === 1) throw new DOMException('Timed out', 'TimeoutError');
      return Response.json({ ip: '8.8.8.8', country: 'US' });
    },
  });
  assert.equal((await handler(request())).status, 202);
  assert.equal(calls.at(-1).args.p_country_code, null);
  current = new Date('2026-09-11T12:04:00Z');
  await handler(request());
  assert.equal(providerCalls, 1);
  current = new Date('2026-09-11T12:05:01Z');
  await handler(request());
  assert.equal(providerCalls, 2);
  assert.equal(calls.at(-1).args.p_country_code, 'US');
});

test('country headers are ignored by default even when the IP proxy has been verified', async () => {
  const { handler, calls } = setup({ VISITOR_COUNTRY_HEADER: 'cf-ipcountry' });
  assert.equal((await handler(request('POST', { headers: { 'cf-ipcountry': 'US' } }))).status, 202);
  assert.equal(calls.at(-1).args.p_country_code, null);
});

test('explicit verified proxy-country mode uses only its configured header and never calls an external provider', async () => {
  let externalCalls = 0;
  const { handler, calls } = setup({ VISITOR_GEO_PROVIDER: 'proxy-header', VISITOR_COUNTRY_HEADER: 'cf-ipcountry' }, {
    fetch: async () => { externalCalls++; throw new Error('must not call'); },
  });
  for (const [header, expected] of [['CN', 'CN'], ['ae', 'AE'], ['', null], ['XX', null], ['T1', null], ['CN, US', null], ['<script>', null]]) {
    assert.equal((await handler(request('POST', { headers: { 'cf-ipcountry': header, 'x-country': 'US' } }))).status, 202);
    assert.equal(calls.at(-1).args.p_country_code, expected);
  }
  assert.equal(externalCalls, 0);
});

test('summary uses aggregate RPC, cache stays bounded to one minute and expires across UTC date', async () => {
  let current = new Date('2026-09-11T23:59:59Z');
  const { handler, calls } = setup({}, { now: () => current });
  assert.equal((await handler(request('GET'))).status, 200);
  assert.equal((await handler(request('GET'))).status, 200);
  assert.equal(calls.filter(c => c.name.endsWith('_summary')).length, 1);
  current = new Date('2026-09-12T00:00:01Z');
  await handler(request('GET'));
  assert.equal(calls.filter(c => c.name.endsWith('_summary')).length, 2);
});

test('database failures never disclose credentials or internal errors to the browser', async () => {
  const { handler } = setup({}, { rpc: async () => { throw new Error('secret-value host internal-service'); } });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('secret-value'), false);
});
