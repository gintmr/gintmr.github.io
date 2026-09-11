import { readFileSync } from 'node:fs';

const worldMap = readFileSync(new URL('./assets/maps/world-countries.svg', import.meta.url), 'utf8').trim();

export function visitorMarkup() {
  return `<section id="visitors" class="section visitor-section" aria-labelledby="visitors-heading">
  <h2 id="visitors-heading" class="section-title" tabindex="-1"><a class="heading-anchor" href="#visitors-heading">Visitors</a></h2>
  <div class="entry visitor-card" data-visitor-card data-state="unconfigured">
    <div class="visitor-summary">
      <dl class="visitor-totals">
        <div><dt>Page views</dt><dd data-visitor-value="pageviews">—</dd></div>
        <div><dt><abbr title="Daily unique visitors, summed across UTC days. Returning visitors on another day count again.">Visitor-days</abbr></dt><dd data-visitor-value="visitorDays">—</dd></div>
        <div><dt>Countries &amp; regions</dt><dd data-visitor-value="countries">—</dd></div>
      </dl>
      <span class="visitor-demo-label" data-visitor-demo hidden>Design preview · sample data</span>
    </div>
    <div class="visitor-geography">
      <figure class="visitor-map-figure">
        ${worldMap}
      </figure>
    </div>
    <div class="visitor-analysis">
      <div class="visitor-today">
        <p class="visitor-detail-label">Today <span data-visitor-today-date>UTC</span></p>
        <dl class="visitor-totals visitor-today-totals">
          <div><dt>Page views</dt><dd data-visitor-today-value="pageviews">—</dd></div>
          <div><dt>Visitors</dt><dd data-visitor-today-value="visitors">—</dd></div>
        </dl>
      </div>
      <div class="visitor-country-panel">
        <div class="visitor-table-scroll visitor-country-scroll" tabindex="0" aria-label="Visitor totals by country or region">
          <table class="visitor-table visitor-country-table" aria-label="Visitor totals by country or region">
            <thead><tr><th scope="col">Country / region</th><th scope="col">Page views</th><th scope="col"><abbr title="Daily unique visitors, summed across UTC days.">Visitor-days</abbr></th></tr></thead>
            <tbody data-visitor-country-rows></tbody>
          </table>
        </div>
        <p class="visitor-detail-note" data-visitor-countries-status>Country totals are not available yet.</p>
      </div>
    </div>
    <div class="visitor-footer">
      <p class="visitor-status" data-visitor-status role="status">Visitor statistics are not connected yet.</p>
    </div>
    <noscript><p class="visitor-status">Enable JavaScript to view visitor statistics.</p></noscript>
  </div>
</section>`;
}

export function visitorHistoryMarkup() {
  return `<section class="section visitor-section visitor-history-section" data-visitor-history aria-labelledby="visitor-activity-heading">
  <div class="page-heading visitor-history-heading">
    <h1 id="visitor-activity-heading" tabindex="-1"><a class="heading-anchor" href="#visitor-activity-heading">Visit history</a></h1>
    <button class="visitor-page-button" type="button" data-visitor-refresh disabled>Refresh</button>
  </div>
  <div class="entry visitor-history-card">
    <div class="visitor-history-meta">
      <p class="visitor-detail-note">Times shown in UTC · Locations estimated from IP addresses</p>
      <span class="visitor-demo-label" data-visitor-demo hidden>Design preview · sample data</span>
    </div>
    <p class="visitor-detail-note" data-visitor-history-note hidden>Visits recorded before the history upgrade have a timestamp only. Their location and page were not recorded.</p>
    <div class="visitor-table-scroll" tabindex="0" aria-label="Visit history by time, country or region, and page">
      <table class="visitor-table visitor-activity-table">
        <thead><tr><th scope="col">Time (UTC)</th><th scope="col">Country / region</th><th scope="col">Page</th></tr></thead>
        <tbody id="visitor-activity-rows" data-visitor-activity-rows></tbody>
      </table>
    </div>
    <div class="visitor-activity-controls">
      <p class="visitor-detail-note" data-visitor-activity-status role="status">Loading visit history…</p>
      <button class="visitor-page-button" type="button" data-visitor-retry hidden>Retry</button>
    </div>
    <nav class="visitor-pagination" aria-label="Visit history pages" data-visitor-pagination hidden>
      <div class="visitor-page-navigation">
        <button class="visitor-page-button" type="button" data-visitor-previous aria-controls="visitor-activity-rows" disabled>Previous</button>
        <span class="visitor-page-label" data-visitor-page-label>Page —</span>
        <button class="visitor-page-button" type="button" data-visitor-next aria-controls="visitor-activity-rows" disabled>Next</button>
      </div>
      <form class="visitor-page-jump" data-visitor-page-form>
        <label for="visitor-page-input">Go to page</label>
        <input id="visitor-page-input" name="page" type="number" inputmode="numeric" min="1" max="1" step="1" value="1" required data-visitor-page-input disabled />
        <button class="visitor-page-button" type="submit" data-visitor-page-go aria-controls="visitor-activity-rows" disabled>Go</button>
      </form>
    </nav>
    <noscript><p class="visitor-status">Enable JavaScript to view visit history.</p></noscript>
  </div>
</section>`;
}
