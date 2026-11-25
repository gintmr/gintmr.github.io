// CV page reader: renders the CV PDF with pdf.js inside the site's own frame.
// At the default zoom each page fills the frame width exactly, on any screen.
// A small toolbar offers zoom, fit-to-width, open in a new tab and download.
// Text stays selectable and links in the PDF stay clickable. Without JavaScript
// the fallback links in the markup remain.
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38';
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const host = document.querySelector('.gintmr_ui-cv-viewer');
if (host) render(host).catch(error => {
  console.error('CV viewer failed', error);
  host.classList.add('is-failed');
});

const svg = path => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const ICONS = {
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  fit: svg('<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>'),
  open: svg('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
};

function toolbar(src, numPages) {
  const bar = document.createElement('div');
  bar.className = 'gintmr_ui-cv-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'CV viewer controls');
  bar.innerHTML = `
    <div class="gintmr_ui-cv-toolbar-group">
      <button type="button" data-action="out" aria-label="Zoom out" title="Zoom out">${ICONS.minus}</button>
      <button type="button" data-action="reset" class="gintmr_ui-cv-zoom" aria-label="Reset zoom to fit width" title="Fit to width">100%</button>
      <button type="button" data-action="in" aria-label="Zoom in" title="Zoom in">${ICONS.plus}</button>
      <button type="button" data-action="reset" aria-label="Fit to width" title="Fit to width">${ICONS.fit}</button>
    </div>
    <span class="gintmr_ui-cv-pagecount">${numPages} ${numPages === 1 ? 'page' : 'pages'}</span>
    <div class="gintmr_ui-cv-toolbar-group">
      <a href="${src}" target="_blank" rel="noopener noreferrer" aria-label="Open the PDF in a new tab" title="Open in new tab">${ICONS.open}<span>Open</span></a>
      <a href="${src}" download="Xinrui-Wu-CV.pdf" aria-label="Download the PDF" title="Download">${ICONS.download}<span>Download</span></a>
    </div>`;
  return bar;
}

async function render(host) {
  const pdfjsLib = await import(`${PDFJS}/build/pdf.min.mjs`);
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}/build/pdf.worker.min.mjs`;
  globalThis.pdfjsLib = pdfjsLib;
  const { EventBus, PDFPageView, PDFLinkService, LinkTarget } = await import(`${PDFJS}/web/pdf_viewer.mjs`);

  const src = host.dataset.src;
  const pdf = await pdfjsLib.getDocument({ url: src }).promise;
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus, externalLinkTarget: LinkTarget.BLANK, externalLinkRel: 'noopener noreferrer' });
  linkService.setDocument(pdf);
  // PDFLinkService expects a full PDFViewer; the CV only needs external links.
  linkService.setViewer({ isInPresentationMode: false, pagesRotation: 0, currentPageNumber: 1 });
  const pages = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)));

  const bar = toolbar(src, pdf.numPages);
  const scroller = document.createElement('div');
  scroller.className = 'gintmr_ui-cv-scroll';
  const pagesBox = document.createElement('div');
  pagesBox.className = 'gintmr_ui-cv-pages pdfViewer';
  scroller.append(pagesBox);
  host.replaceChildren(bar, scroller);
  host.classList.add('is-ready');

  let zoom = 1;
  const cssWidth = page => page.getViewport({ scale: pdfjsLib.PixelsPerInch.PDF_TO_CSS_UNITS }).width;
  const scaleFor = page => (scroller.clientWidth * zoom) / cssWidth(page);

  // Pages are rebuilt on every zoom or resize: the CV is short, and a fresh
  // PDFPageView avoids pdf.js's partial re-render states.
  let views = [];
  const drawPages = () => {
    views.forEach(view => view.destroy());
    pagesBox.replaceChildren();
    views = pages.map((page, i) => {
      const view = new PDFPageView({
        container: pagesBox,
        eventBus,
        id: i + 1,
        scale: scaleFor(page),
        defaultViewport: page.getViewport({ scale: 1 }),
        layerProperties: { linkService },
      });
      view.setPdfPage(page);
      view.draw().catch(error => console.error('CV page render failed', error));
      return view;
    });
  };

  const zoomLabel = bar.querySelector('.gintmr_ui-cv-zoom');
  const zoomOut = bar.querySelector('[data-action="out"]');
  const zoomIn = bar.querySelector('[data-action="in"]');
  const redraw = () => {
    pagesBox.style.width = `${Math.round(scroller.clientWidth * zoom)}px`;
    drawPages();
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    zoomOut.disabled = zoom <= ZOOMS[0];
    zoomIn.disabled = zoom >= ZOOMS.at(-1);
    host.classList.toggle('is-zoomed', zoom > 1);
  };
  pagesBox.style.width = `${scroller.clientWidth}px`;
  drawPages();

  bar.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action) return;
    if (action === 'in') zoom = ZOOMS.find(z => z > zoom + 1e-6) ?? zoom;
    if (action === 'out') zoom = [...ZOOMS].reverse().find(z => z < zoom - 1e-6) ?? zoom;
    if (action === 'reset') zoom = 1;
    redraw();
  });

  let width = scroller.clientWidth;
  let timer;
  new ResizeObserver(() => {
    if (Math.abs(scroller.clientWidth - width) < 1) return;
    width = scroller.clientWidth;
    clearTimeout(timer);
    timer = setTimeout(redraw, 120);
  }).observe(scroller);
}
