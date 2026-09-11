import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeVisitorConfig, canRecordVisit, validateVisitorSummary, initializeVisitors } from '../visitors.js';

const config = normalizeVisitorConfig({ enabled: true,
  endpoint: 'https://example.supabase.co/functions/v1/visitor-analytics',
  allowedOrigins: ['https://gintmr.github.io'],
});
const makeSummary = () => ({ version: 1, generatedAt: '2026-09-11T00:00:00Z', since: '2026-09-10',
  totals: { pageviews: 3, visitorDays: 2 }, today: { date: '2026-09-11', pageviews: 2, visitors: 1 },
  countries: [{ code: 'CN', pageviews: 2, visitorDays: 1 }, { code: null, pageviews: 1, visitorDays: 1 }],
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
        querySelectorAll: () => totals,
        querySelector(selector) {
          if (!nodes.has(selector)) nodes.set(selector, { textContent: '', hidden: false, replaceChildren() {} });
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
