import { readFileSync } from 'node:fs';
import { visitorCardMarkup } from './vendor/gintmr-ui/src/components/visitor-card.js';

// 地图与卡片标记都由组件库提供，站点只负责在构建期把地图内联进页面
const worldMap = readFileSync(
  new URL('./vendor/gintmr-ui/src/components/assets/world-countries.svg', import.meta.url),
  'utf8'
).trim();

export function visitorMarkup() {
  // 观感、数据契约、渲染逻辑都在库里；这里只传地图与标题
  return visitorCardMarkup({ mapSvg: worldMap, heading: 'Visitors', id: 'visitors' });
}

export function visitorHistoryMarkup() {
  return `<section class="gintmr_ui-section visitor-section visitor-history-section" data-visitor-history aria-labelledby="visitor-activity-heading">
  <div class="gintmr_ui-page-heading visitor-history-heading">
    <h1 id="visitor-activity-heading" tabindex="-1"><a class="gintmr_ui-heading-anchor" href="#visitor-activity-heading">Visit history</a></h1>
    <button class="visitor-page-button" type="button" data-visitor-refresh disabled>Refresh</button>
  </div>
  <div class="gintmr_ui-entry visitor-history-card">
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
