/* 学术站的访客接入
   只做两件事：记录本次访问、向上取数。
   渲染（总计 / 地图 / 今日 / 地区方块图 / 提示）全部交给组件库的访客卡：
     src/components/visitor-card.js
   库那边读 window.gintmrUIVisitors.load()，数据契约也定义在那个文件里。
   注意加载顺序：本文件必须排在 /ui/gintmr-ui.js 之前，否则库启动时取数函数还没定义。 */

const TRACKED_PATHS = new Set(['/', '/publication/', '/project/', '/cv/']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** 站点把自己的接口配置放在 <script id="visitor-config"> 里 */
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
  // 每个文档一个事件 id，只用于同一次提交的瞬时重试；不作为身份持久化
  const body = JSON.stringify({ eventId: crypto.randomUUID(), path: location.pathname });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await requestWithTimeout(config.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
      }, 4000);
      if (response.ok || response.status < 500) return;
    } catch { /* 统计失败绝不影响学术页本身 */ }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 800));
  }
}

export function initializeVisitors() {
  let config = null;
  try { config = normalizeVisitorConfig(JSON.parse(document.getElementById('visitor-config')?.textContent || '{}')); }
  catch { /* 未配置的站点就不显示任何编造的统计 */ }
  const demo = LOCAL_HOSTS.has(location.hostname) && new URLSearchParams(location.search).get('visitor-demo') === '1';

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

  // 交给组件库渲染：这里只负责把接口响应原样交出去（接口本来就是契约形状）
  window.gintmrUIVisitors = {
    ...(window.gintmrUIVisitors || {}),
    load: async ({ signal } = {}) => {
      if (!config) throw new Error('Visitor statistics are not configured');
      // 先等本次记录提交完再读，免得首次访问被读成一个永久的空状态
      await recording.catch(() => {});
      return requestWithTimeout(config.endpoint, { headers: { Accept: 'application/json' } }, 6500, signal, async response => {
        if (!response.ok) throw new Error('Visitor summary unavailable');
        return response.json();
      });
    },
  };
}

if (typeof document !== 'undefined') initializeVisitors();
