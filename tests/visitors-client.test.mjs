import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeVisitorConfig, canRecordVisit, validateVisitorSummary } from '../visitors.js';

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
