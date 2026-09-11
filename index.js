const themeButton = document.getElementById('theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = `Switch to ${dark ? 'light' : 'dark'} theme`;
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  themeColor.content = dark ? '#191919' : '#fffaff';
}
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('xinrui-academic-theme', theme); } catch (_) {}
  updateThemeButton();
});
updateThemeButton();

const menuButton = document.getElementById('menu-toggle');
const navigation = document.getElementById('site-nav');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (open) navigation.querySelector('a').focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header-shell')) closeMenu();
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
matchMedia('(min-width: 721px)').addEventListener('change', closeMenu);

// Keep native self-links as a fallback; explicitly align and focus repeat clicks.
document.querySelector('main').addEventListener('click', event => {
  const link = event.target.closest('.heading-anchor');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  const heading = link.closest('h1, h2, h3');
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});

// Keep the outline outside the centered content whenever the right gutter fits.
const outline = document.querySelector('.page-outline');
const outlineButton = document.getElementById('outline-toggle');
const outlinePanel = document.getElementById('outline-panel');
const outlineScroll = document.querySelector('.outline-scroll');
const outlineLinks = [...document.querySelectorAll('.outline-list a')];
const outlineTargets = outlineLinks.map(link => document.getElementById(link.hash.slice(1)));
const rail = document.querySelector('.outline-rail');
const segment = document.querySelector('.outline-segment');
const dot = document.querySelector('.outline-dot');
let activeIndex = -1;

function closeOutline() {
  outlinePanel.classList.remove('is-open');
  outlineButton.setAttribute('aria-expanded', 'false');
}

function revealActiveOutlineLink() {
  if (!outlinePanel.offsetHeight) return;
  const active = outlineLinks[Math.max(0, activeIndex)];
  if (active.offsetTop < outlineScroll.scrollTop) outlineScroll.scrollTop = active.offsetTop;
  else if (active.offsetTop + active.offsetHeight > outlineScroll.scrollTop + outlineScroll.clientHeight) {
    outlineScroll.scrollTop = active.offsetTop + active.offsetHeight - outlineScroll.clientHeight;
  }
}

function drawOutline() {
  if (!outlinePanel.offsetHeight) return;
  const rows = outlineLinks.map(link => ({
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
  rail.setAttribute('d', path);
  const row = rows[Math.max(0, activeIndex)];
  segment.setAttribute('d', `M${row.x} ${row.top + 5} V${row.top + row.height - 5}`);
  dot.setAttribute('cx', row.x);
  dot.setAttribute('cy', row.top + row.height / 2);
}

function updateOutline() {
  const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 8;
  let current = 0;
  outlineTargets.forEach((target, index) => {
    if (target.getBoundingClientRect().top <= offset) current = index;
  });
  // A short final section may never reach the header before the page ends.
  if (scrollY > 0 && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) current = outlineLinks.length - 1;
  if (current !== activeIndex) {
    activeIndex = current;
    outlineLinks.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('.outline-current').textContent = outlineLinks[current].textContent;
    revealActiveOutlineLink();
  }
  drawOutline();
}

function layoutOutline() {
  const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
  const contentWidth = document.querySelector('main').getBoundingClientRect().width;
  const panelWidth = parseFloat(getComputedStyle(outlinePanel).width);
  const gap = parseFloat(getComputedStyle(outline).columnGap);
  const sidebar = (document.documentElement.clientWidth - contentWidth) / 2 >= panelWidth + gap + 16;
  outline.classList.toggle('is-sidebar', sidebar);
  if (sidebar) closeOutline();
  updateOutline();
  revealActiveOutlineLink();
}

outlineButton.addEventListener('click', () => {
  const open = outlineButton.getAttribute('aria-expanded') !== 'true';
  closeMenu();
  outlineButton.setAttribute('aria-expanded', String(open));
  outlinePanel.classList.toggle('is-open', open);
  if (open) {
    revealActiveOutlineLink();
    drawOutline();
    outlineLinks[Math.max(0, activeIndex)].focus({ preventScroll: true });
  }
});
outlinePanel.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeOutline();
  // Transfer keyboard focus to the destination, preserving native anchor scrolling.
  const target = document.getElementById(link.hash.slice(1));
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});
document.addEventListener('click', event => {
  if (!event.target.closest('.page-outline')) closeOutline();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && outlineButton.getAttribute('aria-expanded') === 'true') {
    closeOutline();
    outlineButton.focus();
  }
});
let outlineFrame = 0;
addEventListener('scroll', () => {
  if (!outlineFrame) outlineFrame = requestAnimationFrame(() => {
    updateOutline();
    outlineFrame = 0;
  });
}, { passive: true });
addEventListener('resize', layoutOutline);
addEventListener('load', layoutOutline);
new ResizeObserver(layoutOutline).observe(document.querySelector('main'));
new ResizeObserver(layoutOutline).observe(document.querySelector('.site-header'));
document.fonts.ready.then(layoutOutline);
layoutOutline();

// Web fonts can change section positions after the browser's initial hash jump.
// Real input cancels this correction so it cannot pull a reader back later.
const initialTarget = document.getElementById(location.hash.slice(1));
if (initialTarget) {
  const initialHash = location.hash;
  let readerInteracted = false;
  const cancelAlignment = () => { readerInteracted = true; };
  const inputEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  inputEvents.forEach(type => addEventListener(type, cancelAlignment, { passive: true, once: true }));
  const pageLoaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => addEventListener('load', resolve, { once: true }));
  Promise.all([document.fonts.ready, pageLoaded]).then(() => requestAnimationFrame(() => {
    layoutOutline();
    if (!readerInteracted && location.hash === initialHash) initialTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
    inputEvents.forEach(type => removeEventListener(type, cancelAlignment));
  }));
}

// Preserve the full desktop interface inside each responsive project preview.
const resizePreviews = new ResizeObserver(entries => {
  for (const entry of entries) {
    entry.target.style.setProperty('--preview-scale', String(entry.contentRect.width / 1280));
  }
});
document.querySelectorAll('.preview-viewport').forEach(viewport => resizePreviews.observe(viewport));

// Keep shared links to the previous single-page publication section useful.
if (location.pathname === '/' && location.hash === '#publications') location.replace('/publication/');
