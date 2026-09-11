import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeVisitorConfig, canRecordVisit, validateVisitorSummary, initializeVisitors } from '../visitors.js';
import { normalizeVisitHistoryConfig, validateVisitorActivity, initializeVisitHistory } from '../visit-history.js';

const config = normalizeVisitorConfig({ enabled: true,
  endpoint: 'https://example.supabase.co/functions/v1/visitor-analytics',
  allowedOrigins: ['https://gintmr.github.io'],
});
const makeSummary = () => ({ version: 1, generatedAt: '2026-09-11T00:00:00Z', since: '2026-09-10',
  totals: { pageviews: 3, visitorDays: 2 }, today: { date: '2026-09-11', pageviews: 2, visitors: 1 },
  countries: [{ code: 'CN', pageviews: 2, visitorDays: 1 }, { code: null, pageviews: 1, visitorDays: 1 }],
});

function makeNode() {
  const listeners = new Map();
  return { children: [], textContent: '', value: '', hidden: false, disabled: false, open: false, validityMessage: '',
    setCustomValidity(message) { this.validityMessage = message; },
    reportValidity() { return this.validityMessage === ''; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) { listeners.set(type, (listeners.get(type) || []).filter(value => value !== handler)); },
    emit(type, event = { preventDefault() {} }) { for (const handler of listeners.get(type) || []) handler(event); },
  };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function setupVisitorDOM(t, fetch, search = '', surface = 'history') {
  const nodes = new Map();
  const totals = ['pageviews', 'visitorDays', 'countries'].map(visitorValue => ({ dataset: { visitorValue }, textContent: '—' }));
  const today = ['pageviews', 'visitors'].map(visitorTodayValue => ({ dataset: { visitorTodayValue }, textContent: '—' }));
  const card = { dataset: { state: 'unconfigured' },
    querySelectorAll: selector => selector === '[data-visitor-value]' ? totals : selector === '[data-visitor-today-value]' ? today : [],
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, makeNode());
      return nodes.get(selector);
    },
  };
  const window = makeNode();
  const globals = { location: new URL(`http://127.0.0.1:4173/${surface === 'history' ? 'visit-history/' : ''}${search}`), navigator: {}, window, fetch,
    document: { visibilityState: 'visible', createElement: () => makeNode(),
      getElementById: () => ({ textContent: JSON.stringify({ ...config, enabled: true }) }),
      querySelector: selector => selector === (surface === 'history' ? '[data-visitor-history]' : '[data-visitor-card]') ? card : null },
  };
  const saved = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    window.emit('pagehide');
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  return { card, window, today, totals, node: selector => card.querySelector(selector) };
}

const makeActivity = (requestedPage = 1, totalRecords = 43, snapshot = '9007199254740993') => {
  const totalPages = Math.ceil(totalRecords / 20);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const offset = (page - 1) * 20;
  return { version: 2, page, pageSize: 20, totalRecords, totalPages, snapshot: totalRecords ? snapshot : null,
    records: Array.from({ length: Math.min(20, totalRecords - offset) }, (_, index) => ({
      visitedAt: new Date(Date.UTC(2026, 8, 11, 9) - (offset + index) * 60000).toISOString(), countryCode: 'CN', path: '/',
    })),
  };
};

test('client records only known deployed pages and respects privacy choices', () => {
  for (const path of ['/', '/publication/', '/project/', '/cv/']) {
    assert.equal(canRecordVisit(config, new URL(`https://gintmr.github.io${path}`)), true);
  }
  for (const url of ['http://127.0.0.1:4173/', 'http://localhost:4173/', 'https://preview.example/',
    'https://gintmr.github.io/output/', 'https://gintmr.github.io/MaskGuide/', 'https://gintmr.github.io/visit-history/', 'http://gintmr.github.io/']) {
    assert.equal(canRecordVisit(config, new URL(url)), false);
  }
  for (const privacy of [{ globalPrivacyControl: true }, { doNotTrack: '1' }, { doNotTrack: 'yes' }]) {
    assert.equal(canRecordVisit(config, new URL('https://gintmr.github.io/'), privacy), false);
  }
  assert.equal(canRecordVisit(null, new URL('https://gintmr.github.io/')), false);
  assert.equal(normalizeVisitorConfig({ enabled: false }), null);
  assert.equal(normalizeVisitorConfig({ enabled: true, endpoint: 'http://example.com/' }), null);
  assert.equal(normalizeVisitorConfig({ enabled: true, endpoint: 'https://secret:password@example.com/' }), null);
});

test('summary distinguishes empty real counts from unknown or invalid service responses', () => {
  assert.ok(validateVisitorSummary(makeSummary()));
  assert.ok(validateVisitorSummary({ version: 1, generatedAt: '2026-09-11T00:00:00Z', since: null,
    totals: { pageviews: 0, visitorDays: 0 }, today: { date: '2026-09-11', pageviews: 0, visitors: 0 }, countries: [],
  }));
  for (const mutate of [
    s => { s.totals.pageviews = '3'; },
    s => { s.totals.visitorDays = 4; },
    s => { s.countries[0].code = '<script>'; },
    s => { s.countries.push(s.countries[0]); },
    s => { s.countries[0].pageviews = 100; },
    s => { s.countries[0].visitorDays = -1; },
    s => { s.generatedAt = 'invalid date'; },
  ]) {
    const value = makeSummary(); mutate(value);
    assert.equal(validateVisitorSummary(value), null);
  }
});

test('Home reads only the summary and renders its compact today/country information without history hooks', async t => {
  const calls = [];
  const { node, today } = setupVisitorDOM(t, async (url, options) => {
    calls.push({ url: new URL(url), method: options.method || 'GET' });
    return { ok: true, json: async () => makeSummary() };
  }, '', 'home');
  initializeVisitors();
  initializeVisitHistory(); // No history root: even an accidental call is inert.
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url.search, '');
  assert.equal(today[1].textContent, '1');
  assert.equal(node('[data-visitor-country-rows]').children.length, 2);
  const source = await readFile(new URL('../visitors.js', import.meta.url), 'utf8');
  assert.equal(source.includes('data-visitor-activity'), false);
  assert.equal(source.includes('data-visitor-details'), false);
  assert.equal(source.includes("'activity'"), false);
});

test('standalone history has read-only configuration and never collects or requests a summary on the live route', async t => {
  assert.deepEqual(normalizeVisitHistoryConfig({ enabled: true, endpoint: config.endpoint }), { endpoint: config.endpoint });
  for (const endpoint of ['http://example.com', 'https://user:password@example.com', `${config.endpoint}?view=other`, `${config.endpoint}#fragment`]) {
    assert.equal(normalizeVisitHistoryConfig({ enabled: true, endpoint }), null);
  }
  assert.equal(normalizeVisitHistoryConfig({ enabled: false, endpoint: config.endpoint }), null);
  const calls = [];
  setupVisitorDOM(t, async (url, options) => {
    calls.push({ url: new URL(url), method: options.method, credentials: options.credentials });
    return { ok: true, json: async () => makeActivity() };
  });
  globalThis.location = new URL('https://gintmr.github.io/visit-history/');
  initializeVisitHistory();
  initializeVisitors(); // Path allowlist and absent Home root independently prevent a POST/summary.
  await settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].credentials, 'omit');
  assert.equal(calls[0].url.searchParams.get('view'), 'activity');
  assert.equal(calls[0].url.searchParams.get('page'), '1');
  assert.equal(calls[0].url.searchParams.has('snapshot'), false);
});

test('activity validates fixed 20-row pages, totals, and exact bigint snapshots', () => {
  assert.equal(validateVisitorActivity(makeActivity()).snapshot, '9007199254740993');
  assert.ok(validateVisitorActivity(makeActivity(1, 0)));
  const historical = makeActivity(1, 1);
  historical.records[0].countryCode = null;
  historical.records[0].path = null;
  assert.ok(validateVisitorActivity(historical));
  assert.ok(validateVisitorActivity(makeActivity(3)));
  for (const mutate of [
    value => { value.version = 1; },
    value => { value.pageSize = 25; },
    value => { value.page = 0; },
    value => { value.page = 4; },
    value => { value.page = 1.5; },
    value => { value.totalRecords = -1; },
    value => { value.totalRecords = Number.MAX_SAFE_INTEGER + 1; },
    value => { value.totalPages = 4; },
    value => { value.records.push(value.records[0]); },
    value => { value.records[0].visitedAt = 'yesterday'; },
    value => { value.records[0].countryCode = '<script>'; },
    value => { value.records[0].path = 'https://example.com/'; },
    value => { value.records[0].path = '/private/'; },
    value => { value.records[0].path = undefined; },
    value => { value.snapshot = 9007199254740992; },
    value => { value.snapshot = '01'; },
    value => { value.snapshot = '0'; },
    value => { value.snapshot = '-1'; },
    value => { value.snapshot = '9223372036854775808'; },
    value => { value.records = []; },
    value => { value.snapshot = null; },
  ]) {
    const value = makeActivity(); mutate(value);
    assert.equal(validateVisitorActivity(value), null);
  }
});

test('standalone activity loads immediately and navigates fixed pages with retries, direct jumps, and a fresh snapshot', async t => {
  const calls = [];
  let firstPageResolve;
  let reads = 0;
  const { node } = setupVisitorDOM(t, async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    const request = new URL(url);
    calls.push(request);
    assert.equal(request.searchParams.get('view'), 'activity', 'history never fetches the summary');
    reads += 1;
    if (reads === 1) return new Promise(resolve => { firstPageResolve = resolve; });
    if (reads === 2) return { ok: false, status: 503 };
    const snapshot = request.searchParams.get('snapshot');
    return { ok: true, json: async () => makeActivity(Number(request.searchParams.get('page')), snapshot ? 43 : 45, snapshot || '9007199254740995') };
  });
  initializeVisitHistory();
  await settle();
  assert.equal(calls.length, 1, 'history starts its first GET without opening a disclosure');
  const next = node('[data-visitor-next]');
  const previous = node('[data-visitor-previous]');
  const input = node('[data-visitor-page-input]');
  await settle();
  node('[data-visitor-refresh]').emit('click');
  await settle();
  assert.equal(reads, 1, 'an in-flight page cannot be requested twice');
  assert.equal(next.disabled, true);
  firstPageResolve({ ok: true, json: async () => makeActivity() });
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  assert.equal(node('[data-visitor-page-label]').textContent, 'Page 1 of 3');
  assert.equal(previous.disabled, true);
  next.emit('click');
  await settle();
  assert.equal(node('[data-visitor-retry]').hidden, false);
  assert.equal(node('[data-visitor-retry]').disabled, false);
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  assert.equal(node('[data-visitor-page-label]').textContent, 'Page 1 of 3', 'failed reads retain the previous page');
  node('[data-visitor-retry]').emit('click');
  await settle();
  assert.deepEqual(calls.slice(1, 3).map(url => [url.searchParams.get('page'), url.searchParams.get('snapshot')]),
    [['2', '9007199254740993'], ['2', '9007199254740993']]);
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20, 'pagination replaces rather than appends rows');
  assert.equal(node('[data-visitor-activity-status]').textContent, 'Showing 21–40 of 43 visit records.');
  assert.equal(previous.disabled, false);
  next.emit('click');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 3);
  assert.equal(next.disabled, true);
  previous.emit('click');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  input.value = '0';
  const beforeInvalid = reads;
  node('[data-visitor-page-form]').emit('submit');
  assert.equal(reads, beforeInvalid);
  assert.equal(input.validityMessage, 'Enter a page between 1 and 3.');
  input.value = '99';
  node('[data-visitor-page-form]').emit('submit');
  assert.equal(reads, beforeInvalid);
  input.value = '1';
  node('[data-visitor-page-form]').emit('submit');
  await settle();
  assert.equal(node('[data-visitor-page-label]').textContent, 'Page 1 of 3');
  assert.equal(input.validityMessage, '');
  node('[data-visitor-refresh]').emit('click');
  await settle();
  assert.equal(calls.at(-1).searchParams.get('snapshot'), null, 'refresh requests a new snapshot');
  assert.equal(calls.at(-1).searchParams.get('page'), '1');
  assert.equal(node('[data-visitor-activity-status]').textContent, 'Showing 1–20 of 45 visit records.');
  next.emit('click');
  await settle();
  assert.equal(calls.at(-1).searchParams.get('snapshot'), '9007199254740995');
});

test('activity aborts on pagehide and resumes the same page and snapshot after BFCache restoration', async t => {
  const requests = [];
  const { node, window } = setupVisitorDOM(t, async (url, options) => {
    const request = new URL(url);
    assert.equal(request.searchParams.get('view'), 'activity', 'history never fetches the summary');
    if (requests.length === 0) {
      requests.push({ request, signal: options.signal });
      return { ok: true, json: async () => makeActivity() };
    }
    return new Promise((resolve, reject) => {
      requests.push({ request, signal: options.signal, resolve });
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
  initializeVisitHistory();
  await settle();
  node('[data-visitor-next]').emit('click');
  await settle();
  window.emit('pagehide');
  assert.equal(requests[1].signal.aborted, true);
  window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(requests.length, 3);
  assert.equal(requests[2].request.searchParams.get('page'), '2');
  assert.equal(requests[2].request.searchParams.get('snapshot'), '9007199254740993');
  assert.equal(requests[2].signal.aborted, false);
  requests[2].resolve({ ok: true, json: async () => makeActivity(2) });
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  assert.equal(node('[data-visitor-next]').disabled, false);
  assert.equal(node('[data-visitor-activity-status]').textContent, 'Showing 21–40 of 43 visit records.');
});

test('activity renders empty snapshots and server-clamped pages without inventing records', async t => {
  let response = makeActivity(1, 0);
  const { node } = setupVisitorDOM(t, async url => ({ ok: true, json: async () => new URL(url).searchParams.get('view') === 'activity' ? response : makeSummary() }));
  initializeVisitHistory();
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 0);
  assert.equal(node('[data-visitor-pagination]').hidden, true);
  assert.equal(node('[data-visitor-activity-status]').textContent, 'No visit records available yet.');
  assert.equal(node('[data-visitor-refresh]').disabled, false);
  response = makeActivity();
  node('[data-visitor-refresh]').emit('click');
  await settle();
  response = makeActivity(3, 30);
  node('[data-visitor-page-input]').value = '3';
  node('[data-visitor-page-form]').emit('submit');
  await settle();
  assert.equal(node('[data-visitor-page-label]').textContent, 'Page 2 of 2');
  assert.equal(node('[data-visitor-page-input]').value, '2');
  assert.equal(node('[data-visitor-activity-rows]').children.length, 10);
});

test('local design preview replaces sample history pages without contacting or recording to the service', async t => {
  const { node } = setupVisitorDOM(t, () => { throw new Error('Demo must not fetch'); }, '?visitor-demo=1');
  initializeVisitHistory();
  assert.equal(node('[data-visitor-demo]').hidden, false);
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  node('[data-visitor-page-input]').value = '3';
  node('[data-visitor-page-form]').emit('submit');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 3);
  assert.equal(node('[data-visitor-history-note]').hidden, false);
  const lastRow = node('[data-visitor-activity-rows]').children.at(-1);
  assert.equal(lastRow.children[1].textContent, 'Not recorded');
  assert.equal(lastRow.children[2].textContent, 'Not recorded');
  node('[data-visitor-refresh]').emit('click');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 20);
  assert.equal(node('[data-visitor-page-label]').textContent, 'Page 1 of 3');
});

test('visible visitor card reads after collection settles, and local previews only read', async t => {
  for (const scenario of ['accepted', 'HTTP failure', 'network failure', 'local preview']) {
    await t.test(scenario, { timeout: 3000 }, async t => {
      const local = scenario === 'local preview';
      const calls = [];
      let resolvePost;
      let rejectPost;
      const pendingPost = new Promise((resolve, reject) => { resolvePost = resolve; rejectPost = reject; });
      let resolveRead;
      const readStarted = new Promise(resolve => { resolveRead = resolve; });
      const nodes = new Map();
      const totals = ['pageviews', 'visitorDays', 'countries'].map(visitorValue => ({
        dataset: { visitorValue }, textContent: '—',
      }));
      const card = {
        dataset: { state: 'unconfigured' },
        querySelectorAll: selector => selector === '[data-visitor-value]' ? totals : [],
        querySelector(selector) {
          if (!nodes.has(selector)) nodes.set(selector, makeNode());
          return nodes.get(selector);
        },
      };
      const summary = { version: 1, generatedAt: '2026-09-11T00:00:00Z', since: null,
        totals: { pageviews: 0, visitorDays: 0 }, today: { date: '2026-09-11', pageviews: 0, visitors: 0 }, countries: [] };
      const globals = {
        location: new URL(local ? 'http://127.0.0.1:4173/' : 'https://gintmr.github.io/'),
        navigator: {},
        window: { addEventListener() {}, removeEventListener() {} },
        document: {
          visibilityState: 'visible',
          getElementById: () => ({ textContent: JSON.stringify({ ...config, enabled: true }) }),
          querySelector: () => card,
        },
        fetch: async (_url, options) => {
          const method = options.method || 'GET';
          calls.push(method);
          if (method === 'POST') {
            if (calls.length === 1) return pendingPost;
            throw new Error('Simulated network failure on retry');
          }
          resolveRead();
          return { ok: true, json: async () => summary };
        },
      };
      const saved = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
      t.after(() => {
        for (const [key, descriptor] of Object.entries(saved)) {
          if (descriptor) Object.defineProperty(globalThis, key, descriptor);
          else delete globalThis[key];
        }
      });
      for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });

      initializeVisitors();
      await new Promise(resolve => setImmediate(resolve));
      if (!local) {
        assert.deepEqual(calls, ['POST'], 'a pending collection must not race with the summary GET');
        assert.equal(card.dataset.state, 'loading');
        if (scenario === 'network failure') rejectPost(new Error('Simulated network failure'));
        else resolvePost({ ok: scenario === 'accepted', status: scenario === 'accepted' ? 202 : 403 });
      }
      await readStarted;
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(calls, local ? ['GET'] : scenario === 'network failure' ? ['POST', 'POST', 'GET'] : ['POST', 'GET']);
      assert.equal(card.dataset.state, 'empty', 'the public summary must still render after failed collection');
      assert.equal(totals[0].textContent, '0');
      assert.equal(card.querySelector('[data-visitor-status]').textContent, 'No visits recorded yet.');
    });
  }
});

test('generated pages load one collector each; only Home includes the map and outline link', async () => {
  for (const page of ['index.html', 'publication/index.html', 'project/index.html', 'cv/index.html']) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.equal((html.match(/src="\/visitors\.js\?v=/g) || []).length, 1);
    assert.equal(html.includes('/visit-history.js'), false);
    assert.equal((html.match(/id="visitor-config"/g) || []).length, 1);
    const value = JSON.parse(html.match(/id="visitor-config" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.deepEqual(Object.keys(value).sort(), ['allowedOrigins', 'enabled', 'endpoint']);
    assert.equal(html.includes('data-visitor-card'), page === 'index.html');
    if (page === 'index.html') {
      assert.ok(html.includes('href="#visitors"'));
      assert.ok(html.includes('Visitor statistics are not connected yet.'));
      assert.ok(html.includes('tabindex="-1"'));
    }
  }
});
