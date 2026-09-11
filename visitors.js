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
const isActivityCursor = value => typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)
  && BigInt(value) <= 9223372036854775807n;

export function validateVisitorActivity(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.records) || value.records.length > 25
    || (value.nextCursor !== null && (!isActivityCursor(value.nextCursor) || value.records.length !== 25))) return null;
  for (const record of value.records) {
    if (!record || !isTimestamp(record.visitedAt)
      || (record.countryCode !== null && !/^[A-Z]{2}$/.test(record.countryCode))
      || (record.path !== null && !TRACKED_PATHS.has(record.path))) return null;
  }
  return value;
}

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
  const row = document.createElement('tr');
  const name = document.createElement('th');
  name.scope = 'row';
  name.textContent = country.code === null ? 'Unknown location' : countryName(country.code);
  row.append(name);
  for (const value of [country.pageviews, country.visitorDays]) {
    const count = document.createElement('td');
    count.textContent = numberFormat.format(value);
    row.append(count);
  }
  return row;
}

function renderSummary(card, summary, demo) {
  const countries = summary.countries.filter(country => country.code !== null && country.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews || a.code.localeCompare(b.code));
  const values = { ...summary.totals, countries: countries.length };
  for (const node of card.querySelectorAll('[data-visitor-value]')) node.textContent = numberFormat.format(values[node.dataset.visitorValue]);
  for (const node of card.querySelectorAll('[data-visitor-today-value]')) node.textContent = numberFormat.format(summary.today[node.dataset.visitorTodayValue]);
  card.querySelector('[data-visitor-today-date]').textContent = `${summary.today.date} UTC`;
  const viewsByCountry = new Map(countries.map(country => [country.code, country.pageviews]));
  const maximumViews = Math.max(1, ...viewsByCountry.values());
  for (const shape of card.querySelectorAll('.visitor-map [data-country]')) {
    const views = viewsByCountry.get(shape.dataset.country) || 0;
    const strength = views > 0 ? 20 + 45 * Math.log1p(views) / Math.log1p(maximumViews) : 8;
    shape.style.setProperty('--visitor-country-strength', `${strength}%`);
  }
  card.dataset.state = summary.totals.pageviews > 0 ? 'ready' : 'empty';
  card.querySelector('[data-visitor-demo]').hidden = !demo;
  const unknown = summary.countries.find(country => country.code === null);
  const allCountries = unknown?.pageviews ? [...countries, unknown] : countries;
  card.querySelector('[data-visitor-country-rows]').replaceChildren(...allCountries.map(createCountryRow));
  const countryStatus = card.querySelector('[data-visitor-countries-status]');
  countryStatus.hidden = allCountries.length > 0;
  countryStatus.textContent = 'No country or region totals recorded yet.';
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

const pageNames = { '/': 'Home', '/publication/': 'Publication', '/project/': 'Project', '/cv/': 'CV' };

function createActivityRow(record) {
  const row = document.createElement('tr');
  const dateCell = document.createElement('td');
  const time = document.createElement('time');
  time.dateTime = record.visitedAt;
  time.textContent = new Date(record.visitedAt).toISOString().slice(0, 19).replace('T', ' ');
  dateCell.append(time);
  const country = document.createElement('td');
  country.textContent = record.countryCode === null
    ? record.path === null ? 'Not recorded' : 'Unknown location'
    : countryName(record.countryCode);
  const page = document.createElement('td');
  page.textContent = record.path === null ? 'Not recorded' : pageNames[record.path];
  row.append(dateCell, country, page);
  return row;
}

function designPreviewActivity(before) {
  const offset = before === null ? 0 : 40 - Number(before);
  const records = Array.from({ length: Math.min(25, 40 - offset) }, (_, index) => {
    const position = offset + index;
    const date = new Date(Date.UTC(2026, 8, position < 15 ? 11 : 10, 11, 55 - position * 3));
    return { visitedAt: date.toISOString(), countryCode: position > 36 ? null : ['CN', 'US', 'AE', 'GB', 'SG'][position % 5],
      path: position > 36 ? null : [...TRACKED_PATHS][position % 4] };
  });
  return { version: 1, records, nextCursor: offset + records.length < 40 ? String(40 - offset - records.length) : null };
}

function initializeVisitorActivity(card, config, demo, recording) {
  const details = card.querySelector('[data-visitor-details]');
  const rows = card.querySelector('[data-visitor-activity-rows]');
  const status = card.querySelector('[data-visitor-activity-status]');
  const button = card.querySelector('[data-visitor-load-more]');
  let controller = new AbortController();
  let loading = false;
  let started = false;
  let nextCursor = null;
  let shown = 0;
  let failed = false;
  let interrupted = false;
  const load = async () => {
    if (loading || controller.signal.aborted || (started && nextCursor === null && !failed) || (!config && !demo)) return;
    const requestController = controller;
    const before = started ? nextCursor : null;
    loading = true;
    failed = false;
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'Loading…';
    status.textContent = 'Loading visit history…';
    try {
      await recording.catch(() => {});
      if (requestController.signal.aborted) return;
      let activity;
      if (demo) activity = designPreviewActivity(before);
      else {
        const url = new URL(config.endpoint);
        url.searchParams.set('view', 'activity');
        if (before !== null) url.searchParams.set('before', before);
        activity = await requestWithTimeout(url.href, { headers: { Accept: 'application/json' } }, 6500, requestController.signal, async response => {
          if (!response.ok) throw new Error('Visit history unavailable');
          return validateVisitorActivity(await response.json());
        });
      }
      if (!activity || (before !== null && activity.nextCursor !== null && BigInt(activity.nextCursor) >= BigInt(before))) {
        throw new Error('Invalid visit history');
      }
      if (requestController.signal.aborted) return;
      rows.append(...activity.records.map(createActivityRow));
      if (activity.records.some(record => record.path === null)) card.querySelector('[data-visitor-history-note]').hidden = false;
      shown += activity.records.length;
      nextCursor = activity.nextCursor;
      started = true;
      const count = numberFormat.format(shown);
      status.textContent = shown === 0 ? 'No visit records available yet.'
        : nextCursor === null ? `All ${count} available visit records shown.` : `${count} visit records shown.`;
      button.hidden = nextCursor === null;
      button.textContent = 'Load more';
    } catch {
      if (!requestController.signal.aborted) {
        failed = true;
        status.textContent = 'Visit history is temporarily unavailable. Please try again.';
        button.hidden = false;
        button.textContent = 'Retry';
      }
    } finally {
      if (requestController === controller) {
        loading = false;
        button.disabled = false;
      }
    }
  };
  if (!config && !demo) status.textContent = 'Visit history is not connected yet.';
  details.addEventListener('toggle', () => { if (details.open && (!started || failed)) void load(); });
  button.addEventListener('click', () => { void load(); });
  window.addEventListener('pagehide', () => { interrupted = loading; controller.abort(); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    controller = new AbortController();
    loading = false;
    button.disabled = false;
    button.textContent = failed ? 'Retry' : 'Load more';
    if (details.open && (!started || interrupted)) void load();
    interrupted = false;
  });
  if (details.open) void load();
}

function initializeVisitorCard(card, config, demo, recording = Promise.resolve()) {
  initializeVisitorActivity(card, config, demo, recording);
  if (demo) { renderSummary(card, designPreviewSummary(), true); return; }
  if (!config) return;
  card.dataset.state = 'loading';
  card.querySelector('[data-visitor-status]').textContent = 'Loading visitor statistics…';
  let pageController = new AbortController();
  let observer;
  let loaded = false;
  const load = async () => {
    if (loaded || pageController.signal.aborted) return;
    loaded = true;
    observer?.disconnect();
    const controller = pageController;
    try {
      // Read after this page's collection attempt so a first visit does not
      // briefly become a permanent empty-state snapshot. Failed collection
      // still allows the public totals to load.
      await recording.catch(() => {});
      if (controller.signal.aborted) return;
      const summary = await requestWithTimeout(config.endpoint, { headers: { Accept: 'application/json' } }, 6500, controller.signal, async response => {
        if (!response.ok) throw new Error('Visitor summary unavailable');
        return validateVisitorSummary(await response.json());
      });
      if (!summary) throw new Error('Invalid visitor summary');
      if (!controller.signal.aborted) renderSummary(card, summary, false);
    } catch {
      if (!controller.signal.aborted) {
        card.dataset.state = 'error';
        card.querySelector('[data-visitor-status]').textContent = 'Visitor statistics are temporarily unavailable.';
      }
    }
  };
  const stop = () => { observer?.disconnect(); pageController.abort(); };
  window.addEventListener('pagehide', stop);
  // A page restored from the back/forward cache can resume an aborted lazy load.
  const resume = event => {
    if (!event.persisted) return;
    pageController = new AbortController();
    if (card.dataset.state === 'loading') { loaded = false; observe(); }
  };
  window.addEventListener('pageshow', resume);
  const observe = () => {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void load(); }, { rootMargin: '250px' });
      observer.observe(card);
    } else { void load(); }
  };
  observe();
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
