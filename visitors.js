const TRACKED_PATHS = new Set(['/', '/publication/', '/project/', '/cv/']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const numberFormat = new Intl.NumberFormat('en');
const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

export function normalizeVisitorConfig(value) {
  if (!value || value.enabled !== true) return null;
  try {
    const endpoint = new URL(value.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return null;
    const allowedOrigins = Array.isArray(value.allowedOrigins)
      ? value.allowedOrigins.filter(origin => {
        try { const url = new URL(origin); return url.protocol === 'https:' && url.origin === origin; }
        catch { return false; }
      }) : [];
    return { endpoint: endpoint.href, allowedOrigins };
  } catch { return null; }
}

export function canRecordVisit(config, location, privacy = {}) {
  return Boolean(config && location.protocol === 'https:'
    && !LOCAL_HOSTS.has(location.hostname)
    && config.allowedOrigins.includes(location.origin)
    && TRACKED_PATHS.has(location.pathname)
    && privacy.globalPrivacyControl !== true
    && privacy.doNotTrack !== '1' && privacy.doNotTrack !== 'yes');
}

const isCount = value => Number.isSafeInteger(value) && value >= 0;
const isTimestamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));

export function validateVisitorSummary(value) {
  if (!value || value.version !== 1 || !isTimestamp(value.generatedAt)
    || (value.since !== null && !isTimestamp(value.since))
    || !isCount(value.totals?.pageviews) || !isCount(value.totals?.visitorDays)
    || value.totals.visitorDays > value.totals.pageviews
    || !/^\d{4}-\d{2}-\d{2}$/.test(value.today?.date || '')
    || !isCount(value.today?.pageviews) || !isCount(value.today?.visitors)
    || value.today.visitors > value.today.pageviews
    || !Array.isArray(value.countries) || value.countries.length > 300) return null;
  const seen = new Set();
  let mappedViews = 0;
  let mappedDays = 0;
  for (const country of value.countries) {
    if (!country || (country.code !== null && !/^[A-Z]{2}$/.test(country.code))
      || seen.has(country.code) || !isCount(country.pageviews) || !isCount(country.visitorDays)
      || country.visitorDays > country.pageviews) return null;
    seen.add(country.code);
    mappedViews += country.pageviews;
    mappedDays += country.visitorDays;
  }
  if (!Number.isSafeInteger(mappedViews) || mappedViews > value.totals.pageviews
    || !Number.isSafeInteger(mappedDays) || mappedDays > value.totals.visitorDays) return null;
  return value;
}

const countryName = code => {
  try { return regionNames?.of(code) || code; } catch { return code; }
};

async function requestWithTimeout(url, options = {}, milliseconds = 6500, parentSignal, consume = response => response) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, milliseconds);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    return await consume(response);
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abort);
  }
}

async function recordVisit(config) {
  if (typeof crypto.randomUUID !== 'function') return;
  // One ID per document, reused for a transient retry. Never persisted as an identity.
  const body = JSON.stringify({ eventId: crypto.randomUUID(), path: location.pathname });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await requestWithTimeout(config.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
      }, 4000);
      if (response.ok || response.status < 500) return;
    } catch { /* A failed statistic must never affect the academic page. */ }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 800));
  }
}

function createCountryRow(country) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'visitor-country-row';
  const name = document.createElement('span');
  name.textContent = countryName(country.code);
  const count = document.createElement('span');
  count.textContent = numberFormat.format(country.pageviews);
  row.append(name, count);
  li.append(row);
  return li;
}

function renderSummary(card, summary, demo) {
  const countries = summary.countries.filter(country => country.code !== null && country.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews || a.code.localeCompare(b.code));
  const values = { ...summary.totals, countries: countries.length };
  for (const node of card.querySelectorAll('[data-visitor-value]')) node.textContent = numberFormat.format(values[node.dataset.visitorValue]);
  card.dataset.state = summary.totals.pageviews > 0 ? 'ready' : 'empty';
  card.querySelector('[data-visitor-demo]').hidden = !demo;
  const firstList = card.querySelector('[data-visitor-country-list]');
  const restList = card.querySelector('[data-visitor-country-rest]');
  firstList.replaceChildren(...countries.slice(0, 5).map(createCountryRow));
  restList.replaceChildren(...countries.slice(5).map(createCountryRow));
  card.querySelector('[data-visitor-more]').hidden = countries.length <= 5;
  const unknown = summary.countries.find(country => country.code === null);
  const unknownNode = card.querySelector('[data-visitor-unknown]');
  unknownNode.hidden = !unknown?.pageviews;
  if (unknown?.pageviews) unknownNode.textContent = `Unknown location · ${numberFormat.format(unknown.pageviews)} page views`;
  card.querySelector('[data-visitor-country-panel]').hidden = countries.length === 0 && !unknown?.pageviews;
  const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const since = summary.since ? `Since ${dateFormat.format(new Date(summary.since))}` : '';
  card.querySelector('[data-visitor-status]').textContent = demo
    ? 'Sample data for design review. No visits are recorded in this preview.'
    : summary.totals.pageviews === 0
      ? 'No visits recorded yet.'
      : `${since ? `${since} · ` : ''}Updated ${dateFormat.format(new Date(summary.generatedAt))} UTC`;
}

// Explicitly local-only, never a fallback for a failed service or real statistics.
function designPreviewSummary() {
  const countries = [
    { code: 'CN', pageviews: 138, visitorDays: 73 }, { code: 'US', pageviews: 92, visitorDays: 48 },
    { code: 'AE', pageviews: 53, visitorDays: 26 }, { code: 'GB', pageviews: 26, visitorDays: 15 },
    { code: 'DE', pageviews: 18, visitorDays: 9 }, { code: 'JP', pageviews: 12, visitorDays: 7 },
    { code: 'SG', pageviews: 9, visitorDays: 4 }, { code: 'AU', pageviews: 6, visitorDays: 3 },
    { code: null, pageviews: 5, visitorDays: 4 },
  ];
  return { version: 1, generatedAt: '2026-09-11T12:00:00Z', since: '2026-09-01T00:00:00Z',
    totals: { pageviews: 359, visitorDays: 189 }, today: { date: '2026-09-11', pageviews: 15, visitors: 8 }, countries };
}

function initializeVisitorCard(card, config, demo, recording = Promise.resolve()) {
  if (demo) { renderSummary(card, designPreviewSummary(), true); return; }
  if (!config) return;
  card.dataset.state = 'loading';
  card.querySelector('[data-visitor-status]').textContent = 'Loading visitor statistics…';
  const pageController = new AbortController();
  let observer;
  let loaded = false;
  const load = async () => {
    if (loaded || pageController.signal.aborted) return;
    loaded = true;
    observer?.disconnect();
    try {
      // Read after this page's collection attempt so a first visit does not
      // briefly become a permanent empty-state snapshot. Failed collection
      // still allows the public totals to load.
      await recording.catch(() => {});
      if (pageController.signal.aborted) return;
      const summary = await requestWithTimeout(config.endpoint, { headers: { Accept: 'application/json' } }, 6500, pageController.signal, async response => {
        if (!response.ok) throw new Error('Visitor summary unavailable');
        return validateVisitorSummary(await response.json());
      });
      if (!summary) throw new Error('Invalid visitor summary');
      if (!pageController.signal.aborted) renderSummary(card, summary, false);
    } catch {
      if (!pageController.signal.aborted) {
        card.dataset.state = 'error';
        card.querySelector('[data-visitor-status]').textContent = 'Visitor statistics are temporarily unavailable.';
      }
    }
  };
  const stop = () => { observer?.disconnect(); pageController.abort(); };
  window.addEventListener('pagehide', stop, { once: true });
  // A page restored from the back/forward cache can resume an aborted lazy load.
  const resume = event => {
    if (!event.persisted) return;
    window.removeEventListener('pageshow', resume);
    if (card.dataset.state === 'loading') initializeVisitorCard(card, config, false);
  };
  window.addEventListener('pageshow', resume);
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void load(); }, { rootMargin: '250px' });
    observer.observe(card);
  } else { void load(); }
}

export function initializeVisitors() {
  let config = null;
  try { config = normalizeVisitorConfig(JSON.parse(document.getElementById('visitor-config')?.textContent || '{}')); }
  catch { /* An unconfigured site intentionally shows no invented statistics. */ }
  const demo = LOCAL_HOSTS.has(location.hostname) && new URLSearchParams(location.search).get('visitor-demo') === '1';
  const card = document.querySelector('[data-visitor-card]');
  let recording = Promise.resolve();
  if (!demo && canRecordVisit(config, location, {
    globalPrivacyControl: navigator.globalPrivacyControl,
    doNotTrack: navigator.doNotTrack || window.doNotTrack,
  })) {
    if (document.visibilityState === 'visible') recording = recordVisit(config);
    else {
      recording = new Promise(resolve => {
        const onVisible = () => {
          if (document.visibilityState !== 'visible') return;
          document.removeEventListener('visibilitychange', onVisible);
          recordVisit(config).then(resolve, resolve);
        };
        document.addEventListener('visibilitychange', onVisible);
      });
    }
  }
  if (card) initializeVisitorCard(card, config, demo, recording);
}

if (typeof document !== 'undefined') initializeVisitors();
