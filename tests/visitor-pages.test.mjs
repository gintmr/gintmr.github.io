import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public pages contain no history entrypoint, activity markup, or history script', async () => {
  for (const path of ['index.html', 'publication/index.html', 'project/index.html', 'cv/index.html']) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /visit-history|data-visitor-activity|data-visitor-history/);
    assert.match(html, /src="\/visitors\.js\?v=[a-f0-9]+"/);
  }
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(home, /<details|More visitor details|Visitor-days sum/);
  assert.match(home, /data-visitor-today-value="visitors"/);
  assert.match(home, /data-visitor-country-rows/);
  assert.match(home, /class="visitor-map"/);
});

test('unlisted history page opts out of indexing and uses only its read-only entrypoint', async () => {
  const html = await readFile(new URL('../visit-history/index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive"/);
  assert.match(html, /src="\/visit-history\.js\?v=[a-f0-9]+"/);
  assert.doesNotMatch(html, /src="\/visitors\.js\?|data-visitor-card|<details/);
  assert.match(html, /data-visitor-history/);
  for (const hook of ['activity-rows', 'previous', 'next', 'page-input', 'refresh']) {
    assert.match(html, new RegExp(`data-visitor-${hook}`));
  }
  const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.doesNotMatch(nav, /visit-history/);
});
