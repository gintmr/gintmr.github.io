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
      <div class="visitor-country-panel" data-visitor-country-panel hidden>
        <p class="visitor-country-heading">Countries &amp; regions <span>Page views</span></p>
        <ol class="visitor-country-list" data-visitor-country-list aria-label="Page views by country or region"></ol>
        <details class="visitor-more-countries" data-visitor-more hidden><summary>All countries &amp; regions</summary><ol class="visitor-country-list" data-visitor-country-rest aria-label="More countries and regions"></ol></details>
        <p class="visitor-unknown" data-visitor-unknown hidden></p>
      </div>
    </div>
    <div class="visitor-footer">
      <p class="visitor-status" data-visitor-status role="status">Visitor statistics are not connected yet.</p>
    </div>
    <noscript><p class="visitor-status">Enable JavaScript to view visitor statistics.</p></noscript>
  </div>
</section>`;
}
