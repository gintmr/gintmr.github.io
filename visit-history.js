// Loaded only by the unlinked visit-history page. This module never records visits.
const TRACKED_PATHS = new Set(['/', '/publication/', '/project/', '/cv/']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const numberFormat = new Intl.NumberFormat('en');
const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const regionLabels = new Map([
  ['CN', 'China mainland'],
  ['HK', 'Hong Kong (China)'],
  ['MO', 'Macao (China)'],
  ['TW', 'Taiwan (China)'],
]);
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const isTimestamp = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));

export function normalizeVisitHistoryConfig(value) {
  if (!value || value.enabled !== true) return null;
  try {
    const endpoint = new URL(value.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
    return { endpoint: endpoint.href };
  } catch { return null; }
}

const isActivitySnapshot = value => typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)
  && BigInt(value) <= 9223372036854775807n;
const ACTIVITY_PAGE_SIZE = 20;
const MAX_ACTIVITY_PAGE = 1000000;

export function validateVisitorActivity(value) {
  if (!value || value.version !== 2 || value.pageSize !== ACTIVITY_PAGE_SIZE
    || !isCount(value.totalRecords) || !isCount(value.totalPages)
    || value.totalPages !== Math.ceil(value.totalRecords / ACTIVITY_PAGE_SIZE)
    || !Number.isSafeInteger(value.page) || value.page < 1 || value.page > MAX_ACTIVITY_PAGE || value.page > Math.max(1, value.totalPages)
    || !Array.isArray(value.records)
    || value.records.length !== Math.min(ACTIVITY_PAGE_SIZE, value.totalRecords - (value.page - 1) * ACTIVITY_PAGE_SIZE)
    || (value.totalRecords === 0 ? value.snapshot !== null : !isActivitySnapshot(value.snapshot))) return null;
  for (const record of value.records) {
    if (!record || !isTimestamp(record.visitedAt)
      || (record.countryCode !== null && !/^[A-Z]{2}$/.test(record.countryCode))
      || (record.path !== null && !TRACKED_PATHS.has(record.path))) return null;
  }
  return value;
}

const countryName = code => {
  if (regionLabels.has(code)) return regionLabels.get(code);
  try { return regionNames?.of(code) || code; } catch { return code; }
};

async function requestActivity(url, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parentSignal.aborted) controller.abort();
  else parentSignal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 6500);
  try {
    const response = await fetch(url, {
      method: 'GET', headers: { Accept: 'application/json' },
      signal: controller.signal, credentials: 'omit', cache: 'no-store',
    });
    if (!response.ok) throw new Error('Visit history unavailable');
    return validateVisitorActivity(await response.json());
  } finally {
    clearTimeout(timeout);
    parentSignal.removeEventListener('abort', abort);
  }
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

function designPreviewActivity(requestedPage) {
  const totalRecords = 43;
  const totalPages = Math.ceil(totalRecords / ACTIVITY_PAGE_SIZE);
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * ACTIVITY_PAGE_SIZE;
  const records = Array.from({ length: Math.min(ACTIVITY_PAGE_SIZE, totalRecords - offset) }, (_, index) => {
    const position = offset + index;
    const date = new Date(Date.UTC(2026, 8, position < 15 ? 11 : 10, 11, 55 - position * 3));
    return { visitedAt: date.toISOString(), countryCode: position > 36 ? null : ['CN', 'US', 'AE', 'GB', 'SG'][position % 5],
      path: position > 36 ? null : [...TRACKED_PATHS][position % 4] };
  });
  return { version: 2, records, page, pageSize: ACTIVITY_PAGE_SIZE, totalRecords, totalPages, snapshot: '43' };
}

function initializeHistoryCard(card, config, demo) {
  const rows = card.querySelector('[data-visitor-activity-rows]');
  const status = card.querySelector('[data-visitor-activity-status]');
  const pagination = card.querySelector('[data-visitor-pagination]');
  const pageLabel = card.querySelector('[data-visitor-page-label]');
  const previous = card.querySelector('[data-visitor-previous]');
  const next = card.querySelector('[data-visitor-next]');
  const input = card.querySelector('[data-visitor-page-input]');
  const go = card.querySelector('[data-visitor-page-go]');
  const refresh = card.querySelector('[data-visitor-refresh]');
  const retry = card.querySelector('[data-visitor-retry]');
  let controller = new AbortController();
  let loading = false;
  let activity = null;
  let activeRequest = null;
  let failedRequest = null;
  let interruptedRequest = null;
  const lastReachablePage = () => Math.min(activity?.totalPages || 1, MAX_ACTIVITY_PAGE);
  const updateControls = () => {
    const unavailable = loading || (!config && !demo);
    pagination.hidden = !activity?.totalPages;
    previous.disabled = unavailable || !activity || activity.page <= 1;
    next.disabled = unavailable || !activity || activity.page >= lastReachablePage();
    input.disabled = unavailable || !activity?.totalPages;
    go.disabled = input.disabled;
    input.max = String(lastReachablePage());
    refresh.disabled = unavailable;
    refresh.textContent = loading && activeRequest?.snapshot === null ? 'Refreshing…' : 'Refresh';
    retry.hidden = !failedRequest;
    retry.disabled = unavailable;
  };
  const load = async request => {
    if (loading || controller.signal.aborted || (!config && !demo)) return;
    const requestController = controller;
    activeRequest = request;
    failedRequest = null;
    loading = true;
    updateControls();
    status.textContent = 'Loading visit history…';
    try {
      if (requestController.signal.aborted) return;
      let result;
      if (demo) result = designPreviewActivity(request.page);
      else {
        const url = new URL(config.endpoint);
        url.searchParams.set('view', 'activity');
        url.searchParams.set('page', String(request.page));
        if (request.snapshot !== null) url.searchParams.set('snapshot', request.snapshot);
        result = await requestActivity(url.href, requestController.signal);
      }
      if (!result || result.page !== Math.min(request.page, Math.max(1, result.totalPages))
        || (request.snapshot !== null && result.snapshot !== null && result.snapshot !== request.snapshot)) {
        throw new Error('Invalid visit history');
      }
      if (requestController.signal.aborted) return;
      rows.replaceChildren(...result.records.map(createActivityRow));
      const historyNote = card.querySelector('[data-visitor-history-note]');
      if (historyNote) historyNote.hidden = !result.records.some(record => record.path === null);
      activity = result;
      input.value = String(result.page);
      input.setCustomValidity('');
      pageLabel.textContent = `Page ${numberFormat.format(result.page)} of ${numberFormat.format(result.totalPages)}`;
      const first = (result.page - 1) * ACTIVITY_PAGE_SIZE + 1;
      const last = first + result.records.length - 1;
      status.textContent = result.totalRecords === 0 ? 'No visit records available yet.'
        : `Showing ${numberFormat.format(first)}–${numberFormat.format(last)} of ${numberFormat.format(result.totalRecords)} visit records.`;
    } catch {
      if (!requestController.signal.aborted) {
        failedRequest = request;
        status.textContent = 'Visit history is temporarily unavailable. Please try again.';
      }
    } finally {
      if (requestController === controller) {
        loading = false;
        updateControls();
      }
    }
  };
  const navigate = page => {
    if (!activity || page < 1 || page > lastReachablePage() || page === activity.page) return;
    void load({ page, snapshot: activity.snapshot });
  };
  const resume = () => {
    const request = interruptedRequest || failedRequest || (!activity ? { page: 1, snapshot: null } : null);
    if (request) { interruptedRequest = null; void load(request); }
  };
  if (!config && !demo) status.textContent = 'Visit history is not connected yet.';
  previous.addEventListener('click', () => { if (activity) navigate(activity.page - 1); });
  next.addEventListener('click', () => { if (activity) navigate(activity.page + 1); });
  refresh.addEventListener('click', () => { void load({ page: 1, snapshot: null }); });
  retry.addEventListener('click', () => { if (failedRequest) void load(failedRequest); });
  input.addEventListener('input', () => { input.setCustomValidity(''); });
  card.querySelector('[data-visitor-page-form]').addEventListener('submit', event => {
    event.preventDefault();
    const page = Number(input.value);
    if (!Number.isSafeInteger(page) || page < 1 || page > lastReachablePage()) {
      input.setCustomValidity(`Enter a page between 1 and ${numberFormat.format(lastReachablePage())}.`);
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    navigate(page);
  });
  window.addEventListener('pagehide', () => { interruptedRequest = loading ? activeRequest : null; controller.abort(); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    controller = new AbortController();
    loading = false;
    updateControls();
    resume();
  });
  updateControls();
  resume();
}

export function initializeVisitHistory() {
  const card = document.querySelector('[data-visitor-history]');
  if (!card) return;
  let config = null;
  try { config = normalizeVisitHistoryConfig(JSON.parse(document.getElementById('visitor-config')?.textContent || '{}')); }
  catch { /* Configuration errors must not invent history or affect navigation. */ }
  const demo = LOCAL_HOSTS.has(location.hostname) && new URLSearchParams(location.search).get('visitor-demo') === '1';
  const demoLabel = card.querySelector('[data-visitor-demo]');
  if (demoLabel) demoLabel.hidden = !demo;
  initializeHistoryCard(card, config, demo);
}

if (typeof document !== 'undefined') initializeVisitHistory();
