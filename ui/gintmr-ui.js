/*! gintmr-ui v0.1.0 | 生成物，请改 src/ 后重新构建 */
(function () {
'use strict';

/* ── primitives/theme.js ── */
/* ============================================================================
   gintmr-ui · 主题原语
   主题状态写在 <html data-gintmr_ui-theme="light|dark"> 上，CSS 只读这个属性。
   防闪烁由一段内联脚本负责（见 src/primitives/theme-preload.js），
   本文件只处理切换、持久化与系统主题跟随。
   ========================================================================= */

const THEME_STORAGE_KEY = 'gintmr_ui-theme';

/** 系统主题监听是否已绑定（客户端路由换页不该重复绑定） */
let themeBound = false;

const readStored = () => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (_) {
    return null;
  }
};

const writeStored = theme => {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (_) {}
};

const systemTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** theme-color 跟随实际算出的画布色，而不是写死的十六进制 */
function syncThemeColor(root = document.documentElement) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const canvas = getComputedStyle(document.body).backgroundColor;
  if (canvas) meta.setAttribute('content', canvas);
}

function applyTheme(theme, { persist = false, root = document.documentElement } = {}) {
  root.dataset.gintmr_uiTheme = theme;
  if (persist) writeStored(theme);
  syncThemeColor(root);
  root.dispatchEvent(new CustomEvent('gintmr_ui:themechange', { detail: { theme } }));
}

/**
 * 绑定主题切换按钮。
 * 没有存过偏好时跟随系统，并且继续监听系统变化；用户手动切过之后就不再跟随。
 */
function initTheme(root = document.documentElement) {
  const buttons = [...document.querySelectorAll('.gintmr_ui-theme-toggle')];
  if (!root.dataset.gintmr_uiTheme) applyTheme(readStored() ?? systemTheme(), { root });

  const refreshLabels = () => {
    const dark = root.dataset.gintmr_uiTheme === 'dark';
    const label = `Switch to ${dark ? 'light' : 'dark'} theme`;
    buttons.forEach(button => {
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  };

  buttons.forEach(button => {
    if (button.dataset.gintmr_uiReady === 'true') return;
    button.dataset.gintmr_uiReady = 'true';
    button.addEventListener('click', () => {
      const next = root.dataset.gintmr_uiTheme === 'dark' ? 'light' : 'dark';
      applyTheme(next, { persist: true, root });
      refreshLabels();
    });
  });

  // 系统主题监听只绑一次：客户端路由换页会重建按钮，但不该重建监听
  if (!themeBound) {
    themeBound = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      if (readStored()) return;
      applyTheme(event.matches ? 'dark' : 'light', { root: document.documentElement });
      document.querySelectorAll('.gintmr_ui-theme-toggle').forEach(button => {
        const label = `Switch to ${document.documentElement.dataset.gintmr_uiTheme === 'dark' ? 'light' : 'dark'} theme`;
        button.setAttribute('aria-label', label);
        button.title = label;
      });
    });
  }

  refreshLabels();
}

/* ── primitives/nav.js ── */
/* ============================================================================
   gintmr-ui · 顶栏菜单原语
   关闭逻辑是完整的一套：按钮、Esc、点击外部、点击链接、断点变化。
   面板状态写在导航自身的 data-gintmr_ui-open 上，CSS 只读这个属性。
   ========================================================================= */

const MOBILE_QUERY = '(min-width: 721px)';

/** 是否已经绑定过全局监听。客户端路由换页时元素会重建，
 *  但 document/window 级监听不能重复绑定，所以这里只绑一次，
 *  事件到来时再按当前 DOM 解析目标。 */
let navBound = false;

function navFor(toggle) {
  const id = toggle.getAttribute('aria-controls');
  return (id && document.getElementById(id)) || toggle.closest('.gintmr_ui-header-shell')?.querySelector('.gintmr_ui-nav');
}

const stateOf = toggle => ({ toggle, nav: navFor(toggle) });

function openMenu({ toggle, nav }) {
  nav?.setAttribute('data-gintmr_ui-open', 'true');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close navigation');
  nav?.querySelector('a')?.focus();
}

function shutMenu({ toggle, nav }, { restoreFocus = false } = {}) {
  nav?.setAttribute('data-gintmr_ui-open', 'false');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  if (restoreFocus) toggle.focus();
}

function closeAllMenus() {
  document.querySelectorAll('.gintmr_ui-menu-toggle').forEach(toggle => shutMenu(stateOf(toggle)));
}

function initHeaderNav() {
  document.querySelectorAll('.gintmr_ui-menu-toggle').forEach(toggle => {
    if (toggle.dataset.gintmr_uiReady === 'true') return;
    toggle.dataset.gintmr_uiReady = 'true';
    toggle.addEventListener('click', () => {
      const state = stateOf(toggle);
      if (toggle.getAttribute('aria-expanded') === 'true') shutMenu(state);
      else openMenu(state);
    });
  });

  if (navBound) return;
  navBound = true;

  const openToggles = () => [...document.querySelectorAll('.gintmr_ui-menu-toggle')]
    .filter(toggle => toggle.getAttribute('aria-expanded') === 'true')
    .map(stateOf);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    openToggles().forEach(state => shutMenu(state, { restoreFocus: true }));
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.gintmr_ui-header-shell')) return;
    openToggles().forEach(state => shutMenu(state));
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('.gintmr_ui-nav a');
    if (!link) return;
    const state = openToggles().find(item => item.nav?.contains(link));
    if (state) shutMenu(state);
  });
  matchMedia(MOBILE_QUERY).addEventListener('change', () => closeAllMenus());
  // 其它浮层（例如目录面板）打开时，菜单自己让位
  document.addEventListener('gintmr_ui:closeoverlays', () => closeAllMenus());
}

/* ── primitives/headings.js ── */
/* ============================================================================
   gintmr-ui · 标题锚点原语
   原生 #hash 行为保留为兜底；这里只补齐两件事：
   重复点击同一锚点也滚动，以及把键盘焦点转移到标题上。
   ========================================================================= */

function initHeadingAnchors(root = document) {
  const main = root.querySelector('main') || root;
  // 标题本身要可聚焦，焦点转移才有落点；站点不必逐个手写 tabindex
  main.querySelectorAll('.gintmr_ui-heading-anchor').forEach(link => {
    const heading = link.closest('h1, h2, h3, h4, h5, h6');
    if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  });

  main.addEventListener('click', event => {
    const link = event.target.closest('.gintmr_ui-heading-anchor');
    if (!link) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    const heading = link.closest('h1, h2, h3, h4, h5, h6') || link;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  });
}

/* ── primitives/outline.js ── */
/* ============================================================================
   gintmr-ui · 目录大纲原语
   两件事：跟着滚动实时重绘 SVG 轨道，以及按可用留白在 inline / sidebar 之间切换。
   依赖的 DOM 结构见 demo/index.html：
     .gintmr_ui-outline > .gintmr_ui-outline-shell > (toggle, panel > scroll > items > (track, ol))

   为客户端路由（Astro View Transitions 这类）设计：document/window 级监听只绑一次，
   换页后重新调用 initOutline 只更新元素引用，不会累积监听器。
   ========================================================================= */

const contexts = [];
let outlineBound = false;

const active = () => contexts;
const current = () => contexts[0] || null;

/** a.hash 拿到的是 URL 编码后的片段，中文标题的 id 必须解码后才能查回元素 */
function targetIdOf(link) {
  const raw = link.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
}

const measurable = ctx => Boolean(ctx) && ctx.panel.offsetHeight > 0;

function closeOutline(ctx, { restoreFocus = false } = {}) {
  if (!ctx) return;
  ctx.panel.setAttribute('data-gintmr_ui-open', 'false');
  ctx.button?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) ctx.button?.focus();
}

/* 面板收起时 offsetHeight 为 0，此时不画轨道，避免写入一堆 0 坐标 */
function revealActiveLink(ctx) {
  if (!measurable(ctx)) return;
  const active = ctx.links[Math.max(0, ctx.activeIndex)];
  if (!active) return;
  if (active.offsetTop < ctx.scroll.scrollTop) ctx.scroll.scrollTop = active.offsetTop;
  else if (active.offsetTop + active.offsetHeight > ctx.scroll.scrollTop + ctx.scroll.clientHeight) {
    ctx.scroll.scrollTop = active.offsetTop + active.offsetHeight - ctx.scroll.clientHeight;
  }
}

/* 轨道路径：同深度直行，跨深度用一小段三次贝塞尔转弯 */
function drawOutline(ctx) {
  if (!measurable(ctx)) return;
  const rows = ctx.links.map(link => ({
    x: link.parentElement.dataset.depth === '1' ? 16 : 8,
    top: link.offsetTop,
    height: link.offsetHeight,
  }));
  let path = `M${rows[0].x} 0`;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    if (previous && previous.x !== row.x) {
      const y = row.top;
      path += ` L${previous.x} ${y - 5} C${previous.x} ${y},${row.x} ${y},${row.x} ${y + 5}`;
    }
    path += ` L${row.x} ${row.top + row.height - 5}`;
  });
  ctx.rail.setAttribute('d', path);
  const row = rows[Math.max(0, ctx.activeIndex)];
  ctx.segment.setAttribute('d', `M${row.x} ${row.top + 5} V${row.top + row.height - 5}`);
  ctx.dot.setAttribute('cx', row.x);
  ctx.dot.setAttribute('cy', row.top + row.height / 2);
}

function updateOutline(ctx) {
  if (!ctx) return;
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 8;
  let current = 0;
  ctx.targets.forEach((target, index) => {
    if (target.getBoundingClientRect().top <= offset) current = index;
  });
  // 很短的末节可能永远碰不到吸顶栏，滚到底部时强制选中最后一项
  if (scrollY > 0 && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) {
    current = ctx.links.length - 1;
  }
  if (current !== ctx.activeIndex) {
    ctx.activeIndex = current;
    ctx.links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (ctx.currentLabel) ctx.currentLabel.textContent = ctx.links[current].textContent;
    revealActiveLink(ctx);
  }
  drawOutline(ctx);
}

/* 侧栏形态的判定：内容两侧的留白是否放得下面板 + 间距 + 一点余量。
   内容列不一定就是 <main>：有的站点 main 满宽、真正的内容列是里面某个容器，
   所以允许用 data-gintmr_ui-measure 指定以哪一列为准。 */
function layoutOutline(ctx) {
  if (!ctx) return;
  const header = document.querySelector('.gintmr_ui-header');
  if (header) {
    document.documentElement.style.setProperty('--gintmr_ui-header-height', `${header.getBoundingClientRect().height}px`);
  }
  const content = document.querySelector(ctx.measureSelector);
  const contentWidth = content ? content.getBoundingClientRect().width : 0;
  // 侧栏吸附在内容列边缘，而不是假定内容列宽度等于版心上限。
  // 写在实例自己身上：同一页可以有多条（例如左侧时间轴 + 右侧目录）用不同的参照列。
  ctx.outline.style.setProperty('--gintmr_ui-outline-anchor', `${Math.round(contentWidth)}px`);
  const panelWidth = parseFloat(getComputedStyle(ctx.panel).width) || 0;
  const gap = parseFloat(getComputedStyle(ctx.outline).columnGap) || 0;
  const sidebar = contentWidth > 0 && (document.documentElement.clientWidth - contentWidth) / 2 >= panelWidth + gap + 8;
  ctx.outline.setAttribute('data-gintmr_ui-form', sidebar ? 'sidebar' : 'inline');
  if (sidebar) closeOutline(ctx);
  updateOutline(ctx);
  revealActiveLink(ctx);
}

function buildContext(outline, doc) {
  const links = [...outline.querySelectorAll('.gintmr_ui-outline-list a')];
  const targets = links.map(link => doc.getElementById(targetIdOf(link)));
  const rail = outline.querySelector('.gintmr_ui-outline-rail');
  const segment = outline.querySelector('.gintmr_ui-outline-segment');
  const dot = outline.querySelector('.gintmr_ui-outline-dot');
  if (!links.length || !targets.every(Boolean) || !rail || !segment || !dot) return null;

  const ctx = {
    outline,
    doc,
    measureSelector: outline.dataset.gintmr_uiMeasure || 'main',
    button: outline.querySelector('.gintmr_ui-outline-toggle'),
    panel: outline.querySelector('.gintmr_ui-outline-panel'),
    scroll: outline.querySelector('.gintmr_ui-outline-scroll'),
    currentLabel: outline.querySelector('.gintmr_ui-outline-current'),
    links,
    targets,
    rail,
    segment,
    dot,
    activeIndex: -1,
    frame: 0,
  };

  if (ctx.button && ctx.button.dataset.gintmr_uiReady !== 'true') {
    ctx.button.dataset.gintmr_uiReady = 'true';
    ctx.button.addEventListener('click', () => {
      const open = ctx.button.getAttribute('aria-expanded') !== 'true';
      doc.dispatchEvent(new CustomEvent('gintmr_ui:closeoverlays'));
      ctx.button.setAttribute('aria-expanded', String(open));
      ctx.panel.setAttribute('data-gintmr_ui-open', String(open));
      if (open) {
        revealActiveLink(ctx);
        drawOutline(ctx);
        ctx.links[Math.max(0, ctx.activeIndex)]?.focus({ preventScroll: true });
      }
    });
  }

  if (ctx.panel && ctx.panel.dataset.gintmr_uiReady !== 'true') {
    ctx.panel.dataset.gintmr_uiReady = 'true';
    ctx.panel.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link) return;
      closeOutline(ctx);
      // 把焦点交给目标标题；滚动仍走浏览器原生锚点行为
      const target = doc.getElementById(targetIdOf(link));
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    });
  }

  return ctx;
}

function bindGlobals() {
  if (outlineBound) return;
  outlineBound = true;

  document.addEventListener('click', event => {
    contexts.forEach(ctx => {
      if (!event.target.closest('.gintmr_ui-outline')) closeOutline(ctx);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    contexts.forEach(ctx => {
      if (ctx.button?.getAttribute('aria-expanded') === 'true') closeOutline(ctx, { restoreFocus: true });
    });
  });

  let frame = 0;
  addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      contexts.forEach(updateOutline);
    });
  }, { passive: true });

  const relayout = () => contexts.forEach(layoutOutline);
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  if (typeof ResizeObserver === 'function') new ResizeObserver(relayout).observe(document.documentElement);
}

/* 首次 hash 跳转可能落在字体加载完成之前，加载完再校正一次；
   任何真实输入都会取消校正，避免把读者又拽回去。 */
function alignInitialHash(doc, initialHash) {
  const id = (() => { try { return decodeURIComponent(initialHash); } catch (_) { return initialHash; } })();
  const target = doc.getElementById(id);
  if (target) {
    let readerInteracted = false;
    const cancel = () => { readerInteracted = true; };
    const inputEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    inputEvents.forEach(type => addEventListener(type, cancel, { passive: true, once: true }));
    const loaded = doc.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => addEventListener('load', resolve, { once: true }));
    Promise.all([doc.fonts?.ready ?? Promise.resolve(), loaded]).then(() => requestAnimationFrame(() => {
      contexts.forEach(layoutOutline);
      if (!readerInteracted && location.hash === initialHash) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      inputEvents.forEach(type => removeEventListener(type, cancel));
    }));
  }
}

function initOutline(doc = document) {
  // 客户端路由换页后旧实例会被卸下，先清掉失效的引用
  for (let i = contexts.length - 1; i >= 0; i -= 1) {
    if (!doc.contains(contexts[i].outline)) contexts.splice(i, 1);
  }

  doc.querySelectorAll('.gintmr_ui-outline').forEach(outline => {
    const existing = contexts.find(ctx => ctx.outline === outline);
    if (existing) {
      // 列表内容可能被站点重建过，重新读一遍链接与目标
      const rebuilt = buildContext(outline, doc);
      if (rebuilt) Object.assign(existing, rebuilt, { activeIndex: -1 });
      return;
    }
    const ctx = buildContext(outline, doc);
    if (ctx) contexts.push(ctx);
  });

  bindGlobals();
  doc.fonts?.ready.then(() => contexts.forEach(layoutOutline));
  contexts.forEach(layoutOutline);

  if (location.hash.length > 1) alignInitialHash(doc, location.hash.slice(1));

  return () => { contexts.length = 0; };
}

/* ── primitives/effects.js ── */
/* ============================================================================
   gintmr-ui · 特效原语
   环境星点、点击粒子、鼠标跟随辉光。
   三个都只读 <html> 上的开关属性，页面不需要在 HTML 里预留任何容器。
   ========================================================================= */

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 星点坐标：贴着版心外的留白，避免落进正文列 */
const SPARKLE_POSITIONS = [[5, 18], [94, 12], [9, 43], [97, 37], [3, 69], [92, 66], [13, 88], [96, 91]];

function ensureLayer(className, position) {
  const existing = document.querySelector(`.${className}`);
  if (existing) return existing;
  const layer = document.createElement('div');
  layer.className = className;
  layer.setAttribute('aria-hidden', 'true');
  if (position === 'start') document.body.prepend(layer);
  else document.body.append(layer);
  return layer;
}

/**
 * 环境星点：8 颗，移动端只留 4 颗（由 CSS 的 nth-child 规则裁掉）。
 * 总开关关闭时不创建任何 DOM。
 */
function initSparkles(root = document.documentElement) {
  if (root.dataset.gintmr_uiEffects !== 'on') return () => {};
  const layer = ensureLayer('gintmr_ui-ambient', 'start');
  // 换页后同一容器仍在时不要重复撒点
  if (layer.childElementCount) return () => layer.remove();
  SPARKLE_POSITIONS.forEach(([x, y], index) => {
    const sparkle = document.createElement('span');
    sparkle.className = 'gintmr_ui-sparkle';
    sparkle.style.setProperty('--gintmr_ui-sparkle-x', `${x}%`);
    sparkle.style.setProperty('--gintmr_ui-sparkle-y', `${y}%`);
    sparkle.style.setProperty('--gintmr_ui-sparkle-size', `${index % 3 === 0 ? 3 : 2}px`);
    sparkle.style.setProperty('--gintmr_ui-sparkle-duration', `${5 + (index % 4)}s`);
    sparkle.style.setProperty('--gintmr_ui-sparkle-delay', `${-index * 1.7}s`);
    layer.append(sparkle);
  });
  return () => layer.remove();
}

/**
 * 极光流带：两条斜向光带缓慢横扫。
 * 开关：<html data-gintmr_ui-aurora="on">；关闭时不创建任何 DOM。
 */
function initAurora(root = document.documentElement) {
  const existing = document.querySelector('.gintmr_ui-aurora');
  // 没开这个开关的站点不该多出空节点
  if (root.dataset.gintmr_uiAurora !== 'on') {
    existing?.remove();
    return () => {};
  }

  const layer = existing || ensureLayer('gintmr_ui-aurora', 'start');
  layer.hidden = false;
  if (layer.childElementCount < 2) {
    layer.textContent = '';
    for (let index = 0; index < 2; index += 1) layer.append(document.createElement('i'));
  }

  /* 极光只在正文两侧出现，所以要先知道内容列有多宽：
     优先复用页边导航/目录已经量好的锚点，取不到再退回 <main>。 */
  const place = () => {
    const rail = document.querySelector('.gintmr_ui-outline, .gintmr_ui-sidenav');
    const anchored = rail ? parseFloat(getComputedStyle(rail).getPropertyValue('--gintmr_ui-outline-anchor')) : 0;
    const main = document.querySelector('main');
    const width = anchored || (main ? main.getBoundingClientRect().width : 0);
    if (!width) return;
    layer.style.setProperty('--gintmr_ui-content-width', `${Math.round(width)}px`);
    // 留白太窄就没有极光的容身之处
    layer.hidden = (document.documentElement.clientWidth - width) / 2 < 90;
  };

  place();
  addEventListener('resize', place);
  root.ownerDocument?.fonts?.ready.then(place);
  return () => layer.remove();
}

/**
 * 点击粒子：仅鼠标左键、无修饰键、不在输入控件内时触发。
 * 同时限制并发动画组与 DOM 体积，连点不会堆积节点。
 */
function initClickParticles(options = {}) {
  const {
    count = 6,
    maxGroups = 4,
    spread = 18,
    distance = 24,
  } = options;

  const layer = ensureLayer('gintmr_ui-click-layer', 'end');
  const groups = new Set();
  let pageActive = true;
  let pointerType = '';

  // 点击是 document 级监听，只能绑一次
  if (layer.dataset.gintmr_uiReady === 'true') return () => {};
  layer.dataset.gintmr_uiReady = 'true';

  const clearGroup = group => {
    group.animations.forEach(animation => animation.cancel());
    group.nodes.forEach(node => node.remove());
    groups.delete(group);
  };

  const clearAll = () => groups.forEach(clearGroup);

  const enabled = () => document.documentElement.dataset.gintmr_uiEffects === 'on'
    && pageActive
    && document.visibilityState === 'visible'
    && !reducedMotion();

  document.addEventListener('pointerdown', event => { pointerType = event.pointerType; }, { passive: true });

  document.addEventListener('click', event => {
    if (!enabled() || typeof Element.prototype.animate !== 'function') return;
    if ((event.pointerType || pointerType) !== 'mouse' || event.button !== 0 || event.detail === 0) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

    while (groups.size >= maxGroups) clearGroup(groups.values().next().value);
    const group = { nodes: [], animations: [] };
    groups.add(group);

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'gintmr_ui-particle';
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      layer.append(particle);
      group.nodes.push(particle);

      const angle = index * Math.PI / count * 2 + (Math.random() - 0.5) * 0.5;
      const reach = spread + Math.random() * distance;
      const x = Math.cos(angle) * reach;
      const y = Math.sin(angle) * reach;
      group.animations.push(particle.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.6 },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.2)`, opacity: 0 },
      ], {
        duration: 450 + Math.random() * 200,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }));
    }

    Promise.all(group.animations.map(animation => animation.finished.catch(() => {})))
      .then(() => clearGroup(group));
  }, { passive: true });

  const suspend = () => { if (!enabled()) clearAll(); };
  document.addEventListener('visibilitychange', suspend);
  addEventListener('pagehide', () => { pageActive = false; clearAll(); });
  addEventListener('pageshow', () => { pageActive = true; });

  return () => { clearAll(); layer.remove(); };
}

/**
 * 鼠标跟随辉光：rAF 节流，仅 hover 设备生效。
 * 开关：<html data-gintmr_ui-cursor="on">
 */
function initCursorGlow(root = document.documentElement) {
  if (root.dataset.gintmr_uiCursor !== 'on') return () => {};
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  // 指针监听只绑一次：换页会重建辉光元素，但不该累积监听
  if (root.dataset.gintmr_uiCursorBound === 'true') return () => {};
  root.dataset.gintmr_uiCursorBound = 'true';

  const glow = document.createElement('div');
  glow.className = 'gintmr_ui-cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);

  let frame = 0;
  let x = 0;
  let y = 0;
  const paint = () => {
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    frame = 0;
  };
  const onMove = event => {
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  };

  addEventListener('pointermove', onMove, { passive: true });
  return () => {
    removeEventListener('pointermove', onMove);
    glow.remove();
  };
}

/* ── components/preview.js ── */
/* ============================================================================
   gintmr-ui · 项目实时预览
   iframe 按 1280×800 的桌面宽度 1:1 渲染，再用 transform 等比缩放到容器宽度，
   所以卡片里看到的是完整的桌面版界面，而不是被压扁的移动版。
   ========================================================================= */

function initProjectPreviews(options = {}) {
  const { selector = '.gintmr_ui-preview-viewport', baseWidth = 1280 } = options;
  const viewports = [...document.querySelectorAll(selector)];
  if (!viewports.length || typeof ResizeObserver !== 'function') return () => {};

  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      entry.target.style.setProperty('--gintmr_ui-preview-scale', String(entry.contentRect.width / baseWidth));
    });
  });
  viewports.forEach(viewport => observer.observe(viewport));
  return () => observer.disconnect();
}

/* ── components/audio.js ── */
/* ============================================================================
   gintmr-ui · 音乐卡原语
   自绘播放条替换浏览器原生 <audio controls>，并负责歌词加载与逐行同步。
   标记契约（由站点侧适配器生成，见 demo/index.html 的示例）：
     <figure class="gintmr_ui-track" data-gintmr_ui-track data-gintmr_ui-lrc="...lrc">
       .gintmr_ui-track__row > cover + meta + [data-gintmr_ui-play] + [data-gintmr_ui-time=current]
       .gintmr_ui-progress[data-gintmr_ui-progress] > __fill + __thumb
       .gintmr_ui-track__lyrics[data-gintmr_ui-lyrics]
       <audio data-gintmr_ui-source src="...">
   ========================================================================= */

const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 5.5h3.2v13H7.5zM13.3 5.5h3.2v13h-3.2z"/></svg>';

const formatTime = seconds => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** 解析 LRC：同一行可有多个时间标签，正文取去掉标签后的文本 */
function parseLrc(raw) {
  const lines = [];
  String(raw || '').split(/\r?\n/).forEach(row => {
    if (!row.includes('[')) return;
    const stamps = [...row.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) return;
    const text = row.replace(/\[[^\]]+\]/g, '').trim() || '♪';
    stamps.forEach(match => {
      const ms = Number.parseInt((match[3] || '0').padEnd(3, '0').slice(0, 3), 10);
      lines.push({ time: Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10) + ms / 1000, text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
}

function decodeDataUri(source) {
  const match = String(source || '').match(/^data:([^,]*?),(.*)$/s);
  if (!match) return null;
  const [, meta, payload] = match;
  if (!/;base64/i.test(meta)) return decodeURIComponent(payload);
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const charset = meta.match(/charset=([^;]+)/i)?.[1]?.trim() || 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch (_) {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function loadLrc(source) {
  const target = String(source || '').trim();
  if (!target) throw new Error('empty lrc source');
  if (target.startsWith('data:')) {
    const decoded = decodeDataUri(target);
    if (decoded == null) throw new Error('invalid data uri');
    return decoded;
  }
  const response = await fetch(target);
  if (!response.ok) throw new Error(`lrc ${response.status}`);
  return response.text();
}

/** 部分 CDN 会对中文路径二次编码，一次解码失败就回退到原始地址 */
function bindDecodeRetry(el, attribute) {
  if (!el || el.dataset.gintmr_uiDecodeRetry === 'true') return;
  el.dataset.gintmr_uiDecodeRetry = 'true';
  el.addEventListener('error', () => {
    const source = el.getAttribute(attribute) || '';
    if (!source.includes('%') || el.dataset.gintmr_uiDecoded === 'true') return;
    try {
      const decoded = decodeURIComponent(source);
      if (decoded && decoded !== source) {
        el.dataset.gintmr_uiDecoded = 'true';
        el.setAttribute(attribute, decoded);
      }
    } catch (_) { /* 保留原地址 */ }
  });
}

function activeIndexAt(lyrics, time) {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (time >= lyrics[index].time) return index;
  }
  return -1;
}

function setupTrack(track) {
  if (track.dataset.gintmr_uiReady === 'true') return;
  track.dataset.gintmr_uiReady = 'true';

  const audio = track.querySelector('[data-gintmr_ui-source]') || track.querySelector('audio');
  if (!audio) return;

  const playButton = track.querySelector('[data-gintmr_ui-play]');
  const progress = track.querySelector('[data-gintmr_ui-progress]');
  const fill = progress?.querySelector('.gintmr_ui-progress__fill');
  const thumb = progress?.querySelector('.gintmr_ui-progress__thumb');
  const timeLabel = track.querySelector('[data-gintmr_ui-time="current"]');
  const totalLabel = track.querySelector('[data-gintmr_ui-time="total"]');
  const lyricsBox = track.querySelector('[data-gintmr_ui-lyrics]');
  const lrcSource = track.dataset.gintmr_uiLrc || '';

  bindDecodeRetry(audio, 'src');
  bindDecodeRetry(track.querySelector('.gintmr_ui-track__cover img'), 'src');

  const paintProgress = () => {
    const ratio = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
    const percent = `${(ratio * 100).toFixed(3)}%`;
    if (fill) fill.style.width = percent;
    if (thumb) thumb.style.left = percent;
    if (timeLabel) timeLabel.textContent = formatTime(audio.currentTime);
    progress?.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  };

  const paintPlayState = () => {
    const playing = !audio.paused && !audio.ended;
    track.setAttribute('data-gintmr_ui-playing', String(playing));
    if (playButton) {
      playButton.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      playButton.setAttribute('aria-label', playing ? '暂停' : '播放');
    }
  };

  playButton?.addEventListener('click', () => {
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  });
  audio.addEventListener('play', paintPlayState);
  audio.addEventListener('pause', paintPlayState);
  audio.addEventListener('ended', () => { paintPlayState(); paintProgress(); });
  audio.addEventListener('loadedmetadata', () => {
    if (totalLabel) totalLabel.textContent = formatTime(audio.duration);
    paintProgress();
  });
  audio.addEventListener('timeupdate', paintProgress);
  if (audio.readyState >= 1) {
    if (totalLabel) totalLabel.textContent = formatTime(audio.duration);
    paintProgress();
  }
  paintPlayState();

  /* 进度条：点击与拖拽都直接改写 currentTime */
  if (progress) {
    let dragging = false;
    const seekTo = clientX => {
      const rect = progress.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = ratio * audio.duration;
        paintProgress();
      }
    };
    progress.addEventListener('pointerdown', event => {
      dragging = true;
      progress.setPointerCapture(event.pointerId);
      seekTo(event.clientX);
    });
    progress.addEventListener('pointermove', event => { if (dragging) seekTo(event.clientX); });
    const endDrag = event => {
      dragging = false;
      if (progress.hasPointerCapture?.(event.pointerId)) progress.releasePointerCapture(event.pointerId);
    };
    progress.addEventListener('pointerup', endDrag);
    progress.addEventListener('pointercancel', endDrag);
    progress.addEventListener('keydown', event => {
      const step = event.shiftKey ? 10 : 5;
      if (event.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step);
      else if (event.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - step);
      else if (event.key === 'Home') audio.currentTime = 0;
      else if (event.key === 'End' && Number.isFinite(audio.duration)) audio.currentTime = audio.duration;
      else return;
      event.preventDefault();
      paintProgress();
    });
  }

  if (!lyricsBox) {
    const hint = track.querySelector('[data-gintmr_ui-lyrics-note]');
    if (hint) hint.remove();
    return;
  }

  if (!lrcSource) {
    const note = document.createElement('p');
    note.className = 'gintmr_ui-track__note';
    note.textContent = '暂无歌词';
    lyricsBox.replaceWith(note);
    return;
  }

  loadLrc(lrcSource)
    .then(raw => {
      const lyrics = parseLrc(raw);
      if (!lyrics.length) {
        const note = document.createElement('p');
        note.className = 'gintmr_ui-track__note';
        note.textContent = '未解析到可用歌词';
        lyricsBox.replaceWith(note);
        return;
      }

      lyricsBox.textContent = '';
      const buttons = lyrics.map((line, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gintmr_ui-track__lyric';
        button.dataset.gintmr_uiLyricIndex = String(index);
        button.textContent = line.text;
        button.addEventListener('click', () => {
          audio.currentTime = Math.max(line.time, 0);
          void audio.play().catch(() => {});
        });
        lyricsBox.append(button);
        return button;
      });

      let current = -1;
      let frame = 0;
      const sync = () => {
        frame = 0;
        const next = activeIndexAt(lyrics, audio.currentTime);
        if (next === current) return;
        if (buttons[current]) buttons[current].removeAttribute('data-gintmr_ui-active');
        current = next;
        const target = buttons[current];
        if (!target) return;
        target.setAttribute('data-gintmr_ui-active', 'true');
        target.scrollIntoView({ block: 'center', behavior: audio.paused ? 'auto' : 'smooth' });
      };
      audio.addEventListener('timeupdate', () => {
        if (!frame) frame = requestAnimationFrame(sync);
      });
      sync();
    })
    .catch(() => {
      const note = document.createElement('p');
      note.className = 'gintmr_ui-track__note';
      note.textContent = '歌词加载失败';
      lyricsBox.replaceWith(note);
    });
}

function initAudioTracks(doc = document) {
  doc.querySelectorAll('[data-gintmr_ui-track]').forEach(setupTrack);
}

/* ── components/video.js ── */
/* ============================================================================
   gintmr-ui · 视频与 Live Photo 原语
   普通视频：自绘播放按钮 + 原生控件的自动隐藏，横屏铺满、竖屏限高。
   Live Photo：data-gintmr_ui-live="auto|hover" 的静默循环短片。
   ========================================================================= */

const HIDE_DELAY = 2000;

function ensureWrapper(video, className) {
  const parent = video.parentElement;
  if (parent?.classList.contains(className)) return parent;

  const wrapper = document.createElement('div');
  wrapper.className = className;
  parent.insertBefore(wrapper, video);
  wrapper.append(video);
  // Markdown 常把视频包在 <p> 里，搬走之后留下空段落会多出一段行距
  if (parent.tagName === 'P' && !parent.textContent.trim() && !parent.children.length) parent.remove();
  return wrapper;
}

function setupLive(video) {
  if (video.dataset.gintmr_uiReady === 'true') return;
  video.dataset.gintmr_uiReady = 'true';

  ensureWrapper(video, 'gintmr_ui-live');
  const mode = (video.dataset.gintmr_uiLive || 'hover').toLowerCase();
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.disablePictureInPicture = true;

  const play = () => void video.play().catch(() => {});
  const stop = () => { video.pause(); video.currentTime = 0; };

  if (mode === 'auto') {
    if (!video.hasAttribute('autoplay')) video.setAttribute('autoplay', '');
    if (video.readyState >= 2) play();
    else video.addEventListener('loadeddata', play, { once: true });
    return;
  }

  video.addEventListener('pointerenter', play);
  video.addEventListener('pointerleave', stop);
  video.addEventListener('click', () => (video.paused ? play() : stop()));
  video.addEventListener('focus', play);
  video.addEventListener('blur', stop);
}

function setupPlayer(video) {
  if (video.dataset.gintmr_uiReady === 'true') return;
  video.dataset.gintmr_uiReady = 'true';

  const wrapper = ensureWrapper(video, 'gintmr_ui-video');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gintmr_ui-video__play';
  button.setAttribute('aria-label', '播放视频');
  wrapper.append(button);

  // 横屏视频铺满正文列，竖屏视频交给 CSS 按 70vh 限高，避免占掉一整屏
  const applyShape = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    wrapper.classList.toggle('gintmr_ui-video--wide', video.videoWidth / video.videoHeight >= 1.2);
  };
  if (video.readyState >= 1) applyShape();
  video.addEventListener('loadedmetadata', applyShape, { once: true });

  let timer = 0;
  const showControls = () => { video.controls = true; };
  const hideControls = () => { video.controls = false; };
  const scheduleHide = () => {
    clearTimeout(timer);
    timer = setTimeout(hideControls, HIDE_DELAY);
  };
  const showButton = () => button.removeAttribute('data-gintmr_ui-state');
  const hideButton = () => button.setAttribute('data-gintmr_ui-state', 'hidden');

  video.removeAttribute('controls');
  button.addEventListener('click', () => void video.play().catch(() => {}));

  video.addEventListener('play', () => { hideButton(); showControls(); scheduleHide(); });
  video.addEventListener('pause', () => { clearTimeout(timer); showControls(); });
  video.addEventListener('ended', () => { clearTimeout(timer); hideControls(); showButton(); });
  video.addEventListener('pointermove', () => { if (!video.paused) scheduleHide(); });
  video.addEventListener('pointerleave', () => { clearTimeout(timer); if (!video.paused) hideControls(); });
}

function initVideos(doc = document, options = {}) {
  // 站点可以标注 data-gintmr_ui-video="off" 让某些视频自己管（例如已经用原生控件、
  // 或外层容器自己控制尺寸的播放器），库就不去套外壳、也不加自绘播放按钮。
  const { exclude = '[data-gintmr_ui-video="off"]' } = options;
  doc.querySelectorAll('video[data-gintmr_ui-live]').forEach(setupLive);
  const scope = doc.querySelector('main') || doc;
  scope.querySelectorAll('video:not([data-gintmr_ui-live])').forEach(video => {
    if (video.closest(exclude) || video.hasAttribute('data-gintmr_ui-video')) return;
    setupPlayer(video);
  });
}

/* ── components/quote.js ── */
/* ============================================================================
   gintmr-ui · 好词佳句原语
   引语池写在卡片内的 JSON 里，卡片本身只是壳：换一句、避免连续重复、
   记住本次会话看到的那一句。无 JS 时首句由站点直接渲染在 blockquote 里。
   ========================================================================= */

const STORAGE_KEY = 'gintmr_ui-quote-index';

function initQuotes(doc = document) {
  doc.querySelectorAll('[data-gintmr_ui-quote]').forEach(card => {
    if (card.dataset.gintmr_uiReady === 'true') return;
    card.dataset.gintmr_uiReady = 'true';

    const payload = card.querySelector('[data-gintmr_ui-quote-data]');
    const textEl = card.querySelector('[data-gintmr_ui-quote-text]');
    const sourceEl = card.querySelector('[data-gintmr_ui-quote-source]');
    const shuffle = card.querySelector('[data-gintmr_ui-quote-shuffle]');
    if (!payload || !textEl) return;

    let quotes = [];
    try {
      const parsed = JSON.parse(payload.textContent || '{}');
      quotes = Array.isArray(parsed) ? parsed : Array.isArray(parsed.quotes) ? parsed.quotes : [];
    } catch (_) {
      quotes = [];
    }
    if (!quotes.length) return;

    const readLast = () => {
      try {
        const value = Number.parseInt(sessionStorage.getItem(STORAGE_KEY) || '', 10);
        return Number.isInteger(value) && value >= 0 && value < quotes.length ? value : null;
      } catch (_) {
        return null;
      }
    };

    const render = index => {
      const quote = quotes[index] || {};
      const text = (quote.text || '').trim();
      const source = (quote.source || '').trim();
      textEl.textContent = text;
      if (sourceEl) {
        sourceEl.textContent = source;
        // 出处可能只写了空白，这时整行收起来，而不是留一个空破折号
        sourceEl.hidden = !source;
      }
      try { sessionStorage.setItem(STORAGE_KEY, String(index)); } catch (_) {}
    };

    const nextIndex = () => {
      if (quotes.length === 1) return 0;
      const last = readLast();
      const draw = Math.floor(Math.random() * quotes.length);
      return draw === last ? (draw + 1 + Math.floor(Math.random() * (quotes.length - 1))) % quotes.length : draw;
    };

    render(nextIndex());
    shuffle?.addEventListener('click', () => render(nextIndex()));
  });
}

/* ── primitives/sidenav.js ── */
/* ============================================================================
   gintmr-ui · 页边导航原语
   只做一件事：按内容列宽度把自己贴到左边，并在放不下时整条隐藏。
   导航项由站点直接渲染（通常不需要脚本）。
   ========================================================================= */

function initSidenav(doc = document) {
  doc.querySelectorAll('.gintmr_ui-sidenav').forEach(panel => {
    if (panel.dataset.gintmr_uiReady === 'true') return;
    panel.dataset.gintmr_uiReady = 'true';

    const place = () => {
      // 注意属性名：库内统一用 data-gintmr_ui-*（下划线），
      // 对应 dataset 的 gintmr_uiXxx。写成 dataset.gintmrUiXxx 会永远取到 undefined，
      // 于是退回 'main'、量到满宽容器，整条导航被判定为「放不下」而静默隐藏。
      const content = doc.querySelector(panel.dataset.gintmr_uiMeasure || 'main');
      const width = content ? content.getBoundingClientRect().width : 0;
      panel.style.setProperty('--gintmr_ui-outline-anchor', `${Math.round(width)}px`);
      // 与目录原语用同一套判定：留白要放得下自己 + 间距 + 一点余量，
      // 否则会出现一侧还在、另一侧已经收起来的错位
      const selfWidth = panel.getBoundingClientRect().width || parseFloat(getComputedStyle(panel).width) || 0;
      const gap = parseFloat(getComputedStyle(panel).columnGap) || 24;
      const room = (doc.documentElement.clientWidth - width) / 2;
      panel.hidden = !(width > 0 && room >= selfWidth + gap + 8);
    };

    place();
    addEventListener('resize', place);
    doc.fonts?.ready.then(place);
  });
}

/* ── components/gallery.js ── */
/* ============================================================================
   gintmr-ui · 图集原语
   把每张图的真实宽高比写到它所在格子的 --gintmr_ui-aspect 上，
   剩下的排版交给 gallery.css 的 flex 规则。
   已经加载完成的图片立刻测量；还没加载的等 load 事件，避免整组图先按正方形跳一下。
   ========================================================================= */

function applyAspect(node, width, height) {
  if (!width || !height) return;
  node.style.setProperty('--gintmr_ui-aspect', (width / height).toFixed(4));
}

function measure(node, image) {
  if (image.complete && image.naturalWidth) {
    applyAspect(node, image.naturalWidth, image.naturalHeight);
    return;
  }
  // 有 width/height 属性的先按属性排一次，避免等图片加载完才成形
  const attrWidth = Number.parseInt(image.getAttribute('width') || '', 10);
  const attrHeight = Number.parseInt(image.getAttribute('height') || '', 10);
  if (attrWidth && attrHeight) applyAspect(node, attrWidth, attrHeight);
  image.addEventListener('load', () => applyAspect(node, image.naturalWidth, image.naturalHeight), { once: true });
}

function initGalleries(doc = document) {
  doc.querySelectorAll('.gintmr_ui-gallery').forEach(gallery => {
    [...gallery.children].forEach(node => {
      const image = node.matches('img') ? node : node.querySelector('img');
      if (image) measure(node, image);
    });
  });
}

/* ── components/viewer.js ── */
/* ============================================================================
   gintmr-ui · 图片查看器
   只在需要时创建 DOM：点开才建，关掉只隐藏。
   排版按每张图自己的比例算：先取原始宽高，再按视口留白算出实际显示尺寸，
   既不放大小图，也不让横竖图各自套同一个框，浮层里的进度条与说明文字
   宽度跟着图片走，所以竖图不会出现一条悬空的宽标题栏。
   ========================================================================= */

let bound = false;
let viewer = null;

const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 5 7 7-7 7"/></svg>';

function ensureViewer() {
  if (viewer && document.body.contains(viewer)) return viewer;

  viewer = document.createElement('div');
  viewer.className = 'gintmr_ui-viewer';
  viewer.setAttribute('data-gintmr_ui-open', 'false');
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', '图片预览');
  viewer.innerHTML = `
    <button class="gintmr_ui-viewer__close" type="button" aria-label="关闭预览">${ICON_CLOSE}</button>
    <div class="gintmr_ui-viewer__stage">
      <div class="gintmr_ui-viewer__bar">
        <span class="gintmr_ui-viewer__counter"></span>
        <span class="gintmr_ui-viewer__progress"><span class="gintmr_ui-viewer__progress-value"></span></span>
      </div>
      <div class="gintmr_ui-viewer__canvas">
        <button class="gintmr_ui-viewer__nav gintmr_ui-viewer__nav--prev" type="button" aria-label="上一张">${ICON_PREV}</button>
        <img class="gintmr_ui-viewer__img" alt="" />
        <button class="gintmr_ui-viewer__nav gintmr_ui-viewer__nav--next" type="button" aria-label="下一张">${ICON_NEXT}</button>
      </div>
      <p class="gintmr_ui-viewer__caption"></p>
    </div>`;
  document.body.append(viewer);
  return viewer;
}

function initImageViewer(options = {}) {
  const {
    scope = 'main',
    // 只有正文里的图参与浏览：图集项、图文块，或站点显式标注的容器。
    // 这样音乐卡封面、媒体卡封面这类"界面图"不会被误收进来。
    selector = '.gintmr_ui-figure img, .gintmr_ui-gallery img, [data-gintmr_ui-viewer] img',
    // 太小的图（图标、表情、头像）不参与浏览
    minSize = 120,
    exclude = '.gintmr_ui-track, .gintmr_ui-media-card, .gintmr_ui-link-card, button',
  } = options;

  const collect = () => {
    const root = document.querySelector(scope) || document;
    return [...root.querySelectorAll(selector)].filter(image => {
      if (image.closest(exclude)) return false;
      if (image.closest('.gintmr_ui-viewer')) return false;
      const width = image.naturalWidth || Number.parseInt(image.getAttribute('width') || '0', 10);
      const height = image.naturalHeight || Number.parseInt(image.getAttribute('height') || '0', 10);
      if (!width || !height) return image.complete ? false : true;
      return width >= minSize && height >= minSize;
    });
  };

  const describe = image => {
    const link = image.closest('a[href]');
    const holder = image.closest('figure') || image.parentElement;
    const caption = holder?.querySelector(':scope > figcaption')?.textContent?.trim() || '';
    return {
      src: link?.getAttribute('href') || image.getAttribute('data-src') || image.currentSrc || image.src,
      alt: (image.getAttribute('alt') || '').trim(),
      caption: (image.getAttribute('title') || '').trim() || caption,
    };
  };

  const el = ensureViewer();
  const image = el.querySelector('.gintmr_ui-viewer__img');
  const stage = el.querySelector('.gintmr_ui-viewer__stage');
  const caption = el.querySelector('.gintmr_ui-viewer__caption');
  const counter = el.querySelector('.gintmr_ui-viewer__counter');
  const progress = el.querySelector('.gintmr_ui-viewer__progress-value');
  const prev = el.querySelector('.gintmr_ui-viewer__nav--prev');
  const next = el.querySelector('.gintmr_ui-viewer__nav--next');

  let slides = [];
  let index = 0;
  let open = false;

  /* 按原始比例 + 当前视口算出显示尺寸，并让整条顶栏跟着图片宽度走 */
  const fit = () => {
    const natural = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!natural || !naturalHeight) return;
    const maxWidth = window.innerWidth * 0.94;
    const maxHeight = window.innerHeight * 0.74;
    const scale = Math.min(1, maxWidth / natural, maxHeight / naturalHeight);
    const width = Math.round(natural * scale);
    const height = Math.round(naturalHeight * scale);
    stage.style.setProperty('--gintmr_ui-viewer-w', `${width}px`);
    // 形状由实际显示尺寸决定，方便站点对竖长图做额外处理
    const shape = Math.abs(width - height) <= 2 ? 'square' : width > height ? 'landscape' : 'portrait';
    el.setAttribute('data-gintmr_ui-shape', shape);
  };

  const render = next => {
    if (!slides.length) return;
    index = ((next % slides.length) + slides.length) % slides.length;
    const slide = slides[index];
    image.src = slide.src;
    image.alt = slide.alt;
    stage.style.removeProperty('--gintmr_ui-viewer-w');
    if (image.complete) fit();
    caption.textContent = slide.caption;
    caption.hidden = !slide.caption;
    counter.textContent = `${index + 1} / ${slides.length}`;
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    const single = slides.length <= 1;
    prev.disabled = single;
    next.disabled = single;
  };

  const close = () => {
    if (!open) return;
    el.setAttribute('data-gintmr_ui-open', 'false');
    document.body.style.overflow = '';
    open = false;
  };

  const show = node => {
    const eligible = collect();
    const position = eligible.indexOf(node);
    if (position < 0) return;
    slides = eligible.map(describe);
    el.setAttribute('data-gintmr_ui-open', 'true');
    document.body.style.overflow = 'hidden';
    open = true;
    render(position);
  };

  image.addEventListener('load', fit);
  prev.addEventListener('click', () => render(index - 1));
  next.addEventListener('click', () => render(index + 1));
  el.querySelector('.gintmr_ui-viewer__close').addEventListener('click', close);
  el.addEventListener('click', event => { if (event.target === el) close(); });

  if (bound) return;
  bound = true;

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.gintmr_ui-viewer')) return;
    // 必须点在图片本身：早先的"向上找容器里的 img"会把卡片封面也算进来，
    // 于是点播放按钮会弹出图片预览。
    const candidate = event.target.closest('img');
    if (!(candidate instanceof HTMLImageElement)) return;
    if (!collect().includes(candidate)) return;
    event.preventDefault();
    show(candidate);
  }, true);

  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); render(index - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); render(index + 1); }
  });

  addEventListener('resize', () => { if (open) fit(); });
}

/* ── index.js ── */
/* ============================================================================
   gintmr-ui · 脚本入口
   每个原语都是独立文件，也都只读 <html> 上的开关属性，互不依赖。
   需要精细控制时可以只 import 单个原语；这个入口只是把它们一起启动。

   两个概念分开：
     boot()    首次启动。全局级监听（document/window/媒体查询）只绑一次。
     refresh() 元素级重新初始化。客户端路由换页后调用它即可，
               每个原语都自己保证「同一元素不重复初始化」，所以可以安全地反复调用。

   注意：本文件不 import 任何第三方依赖，build.mjs 靠「按顺序拼接 +
   去掉 import/export 关键字」就能产出单文件经典脚本。
   ========================================================================= */


/** 元素级原语：换页后需要重新跑一遍 */
const elementInits = [
  initHeadingAnchors,
  initOutline,
  initSparkles,
  initAurora,
  initProjectPreviews,
  initAudioTracks,
  initVideos,
  initQuotes,
  initGalleries,
  initSidenav,
];

let booted = false;

/** 重新初始化页面内的元素级原语，供客户端路由在页面交换后调用 */
function refresh() {
  // 客户端路由换页时，浏览器会把 <html> 的属性同步成新文档（服务端渲染）的那一份，
  // 于是由脚本写上去的标记会被抹掉：data-gintmr_ui-js（顶栏工具按钮靠它显示）
  // 与 data-gintmr_ui-theme（主题）都会丢。这里每次换页都重新落一遍。
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (!root.hasAttribute('data-gintmr_ui-js')) root.setAttribute('data-gintmr_ui-js', '');
    initTheme(root);
  }
  elementInits.forEach(init => init());
}

/** 启动全部原语 */
function boot() {
  initTheme();
  initHeaderNav();
  initClickParticles();
  initCursorGlow();
  initImageViewer();
  refresh();
  booted = true;
}

if (typeof window !== 'undefined') {
  window.gintmrUI = {
    boot,
    refresh,
    get booted() { return booted; },
    initTheme,
    initHeaderNav,
    initHeadingAnchors,
    initOutline,
    initSparkles,
    initAurora,
    initClickParticles,
    initCursorGlow,
    initProjectPreviews,
    initAudioTracks,
    initVideos,
    initQuotes,
    initGalleries,
    initImageViewer,
    initSidenav,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
})();
