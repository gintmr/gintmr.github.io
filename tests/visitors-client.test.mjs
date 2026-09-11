import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeVisitorConfig, canRecordVisit, validateVisitorSummary, validateVisitorActivity, initializeVisitors } from '../visitors.js';

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
  return { children: [], textContent: '', hidden: false, disabled: false, open: false,
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) { listeners.set(type, (listeners.get(type) || []).filter(value => value !== handler)); },
    emit(type, event = {}) { for (const handler of listeners.get(type) || []) handler(event); },
  };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function setupVisitorDOM(t, fetch, search = '') {
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
  const globals = { location: new URL(`http://127.0.0.1:4173/${search}`), navigator: {}, window, fetch,
    document: { visibilityState: 'visible', createElement: () => makeNode(),
      getElementById: () => ({ textContent: JSON.stringify({ ...config, enabled: true }) }), querySelector: () => card },
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

const makeActivity = (count = 25, nextCursor = '9007199254740993') => ({ version: 1,
  records: Array.from({ length: count }, (_, index) => ({ visitedAt: `2026-09-11T09:00:${String(index).padStart(2, '0')}+00:00`, countryCode: 'CN', path: '/' })),
  nextCursor,
});

test('client records only known deployed pages and respects privacy choices', () => {
  for (const path of ['/', '/publication/', '/project/', '/cv/']) {
    assert.equal(canRecordVisit(config, new URL(`https://gintmr.github.io${path}`)), true);
  }
  for (const url of ['http://127.0.0.1:4173/', 'http://localhost:4173/', 'https://preview.example/',
    'https://gintmr.github.io/output/', 'https://gintmr.github.io/MaskGuide/', 'http://gintmr.github.io/']) {
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

test('activity validates bounded records and preserves exact opaque bigint cursors', () => {
  assert.equal(validateVisitorActivity(makeActivity()).nextCursor, '9007199254740993');
  assert.ok(validateVisitorActivity(makeActivity(0, null)));
  assert.ok(validateVisitorActivity({ version: 1, records: [{ visitedAt: '2026-09-10T12:34:56Z', countryCode: null, path: null }], nextCursor: null }));
  for (const mutate of [
    value => { value.records.push(value.records[0]); },
    value => { value.records[0].visitedAt = 'yesterday'; },
    value => { value.records[0].countryCode = '<script>'; },
    value => { value.records[0].path = 'https://example.com/'; },
    value => { value.records[0].path = '/private/'; },
    value => { value.records[0].path = undefined; },
    value => { value.nextCursor = 9007199254740992; },
    value => { value.nextCursor = '01'; },
    value => { value.nextCursor = '0'; },
    value => { value.nextCursor = '-1'; },
    value => { value.nextCursor = '9223372036854775808'; },
    value => { value.records = []; },
  ]) {
    const value = makeActivity(); mutate(value);
    assert.equal(validateVisitorActivity(value), null);
  }
});

test('activity stays lazy, prevents duplicate reads, and retries the same cursor without losing rows', async t => {
  const calls = [];
  let firstPageResolve;
  let reads = 0;
  const { node, today } = setupVisitorDOM(t, async (url, options) => {
    assert.notEqual(options.method, 'POST');
    const request = new URL(url);
    calls.push(request);
    if (request.searchParams.get('view') !== 'activity') return { ok: true, json: async () => makeSummary() };
    reads += 1;
    if (reads === 1) return new Promise(resolve => { firstPageResolve = resolve; });
    if (reads === 2) return { ok: false, status: 503 };
    return { ok: true, json: async () => makeActivity(2, null) };
  });
  initializeVisitors();
  await settle();
  assert.equal(calls.length, 1, 'closed details fetch only the summary');
  assert.equal(today[1].textContent, '1');
  assert.equal(node('[data-visitor-country-rows]').children.length, 2, 'unknown location remains visible in the full country table');
  const details = node('[data-visitor-details]');
  const button = node('[data-visitor-load-more]');
  details.open = true;
  details.emit('toggle');
  await settle();
  details.emit('toggle');
  button.emit('click');
  await settle();
  assert.equal(reads, 1, 'an in-flight page cannot be requested twice');
  assert.equal(button.disabled, true);
  firstPageResolve({ ok: true, json: async () => makeActivity() });
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 25);
  button.emit('click');
  await settle();
  assert.equal(button.textContent, 'Retry');
  assert.equal(button.disabled, false);
  assert.equal(node('[data-visitor-activity-rows]').children.length, 25);
  button.emit('click');
  await settle();
  assert.deepEqual(calls.slice(2).map(url => url.searchParams.get('before')), ['9007199254740993', '9007199254740993']);
  assert.equal(node('[data-visitor-activity-rows]').children.length, 27);
  assert.equal(button.hidden, true);
  assert.equal(node('[data-visitor-activity-status]').textContent, 'All 27 available visit records shown.');
  details.emit('toggle');
  await settle();
  assert.equal(reads, 3, 'reopening complete history does not duplicate it');
});

test('activity aborts on pagehide and resumes the interrupted page after BFCache restoration', async t => {
  const requests = [];
  const { node, window } = setupVisitorDOM(t, async (url, options) => {
    const request = new URL(url);
    if (request.searchParams.get('view') !== 'activity') return { ok: true, json: async () => makeSummary() };
    if (requests.length === 0) {
      requests.push({ request, signal: options.signal });
      return { ok: true, json: async () => makeActivity(25, '30') };
    }
    return new Promise((resolve, reject) => {
      requests.push({ request, signal: options.signal, resolve });
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  });
  initializeVisitors();
  const details = node('[data-visitor-details]');
  details.open = true;
  details.emit('toggle');
  await settle();
  const button = node('[data-visitor-load-more]');
  button.emit('click');
  await settle();
  window.emit('pagehide');
  assert.equal(requests[1].signal.aborted, true);
  window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(requests.length, 3);
  assert.equal(requests[2].request.searchParams.get('before'), '30');
  assert.equal(requests[2].signal.aborted, false);
  requests[2].resolve({ ok: true, json: async () => makeActivity(2, null) });
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 27);
  assert.equal(button.disabled, false);
  assert.equal(button.hidden, true);
  assert.equal(node('[data-visitor-activity-status]').textContent, 'All 27 available visit records shown.');
});

test('local design preview paginates sample history without contacting or recording to the service', async t => {
  const { node } = setupVisitorDOM(t, () => { throw new Error('Demo must not fetch'); }, '?visitor-demo=1');
  initializeVisitors();
  assert.equal(node('[data-visitor-demo]').hidden, false);
  assert.equal(node('[data-visitor-activity-rows]').children.length, 0);
  const details = node('[data-visitor-details]');
  details.open = true;
  details.emit('toggle');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 25);
  node('[data-visitor-load-more]').emit('click');
  await settle();
  assert.equal(node('[data-visitor-activity-rows]').children.length, 40);
  assert.equal(node('[data-visitor-history-note]').hidden, false);
  const lastRow = node('[data-visitor-activity-rows]').children.at(-1);
  assert.equal(lastRow.children[1].textContent, 'Not recorded');
  assert.equal(lastRow.children[2].textContent, 'Not recorded');
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
