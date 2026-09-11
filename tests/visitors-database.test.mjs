import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/202609110001_visitor_analytics.sql', import.meta.url), 'utf8');
const activityMigration = await readFile(new URL('../supabase/migrations/202609110002_visitor_activity.sql', import.meta.url), 'utf8');

async function database({ activity = true } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create table public.existing_application (id integer primary key, content text);
    insert into public.existing_application values (1, 'preserve me');
    grant select on public.existing_application to anon;
  `);
  await db.exec(migration);
  if (activity) await db.exec(activityMigration);
  return db;
}

async function track(db, { event = randomUUID(), visitor = 'a'.repeat(64), country = 'US', path = '/', legacy = false } = {}) {
  const sql = legacy
    ? 'public.visitor_analytics_track($1::uuid, $2, (now() at time zone \'UTC\')::date, $3)'
    : 'public.visitor_analytics_track_v2($1::uuid, $2, (now() at time zone \'UTC\')::date, $3, $4)';
  return (await db.query(`select ${sql} as recorded`, legacy ? [event, visitor, country] : [event, visitor, country, path])).rows[0].recorded;
}

async function summary(db) {
  return (await db.query('select public.visitor_analytics_summary() as summary')).rows[0].summary;
}

async function activity(db, before = null) {
  return (await db.query('select public.visitor_analytics_activity($1) as activity', [before])).rows[0].activity;
}

test('migration isolates analytics from existing application tables and browser roles', async () => {
  const db = await database();
  try {
    assert.equal((await db.query('select content from public.existing_application')).rows[0].content, 'preserve me');
    for (const role of ['anon', 'authenticated']) {
      const permissions = (await db.query(`select
        has_schema_privilege($1, 'visitor_analytics', 'USAGE') as schema_access,
        has_function_privilege($1, 'public.visitor_analytics_track(uuid,text,date,text)', 'EXECUTE') as track,
        has_function_privilege($1, 'public.visitor_analytics_summary()', 'EXECUTE') as summary,
        has_function_privilege($1, 'public.visitor_analytics_rate_limit(text,text)', 'EXECUTE') as rate,
        has_function_privilege($1, 'public.visitor_analytics_track_v2(uuid,text,date,text,text)', 'EXECUTE') as track_v2,
        has_function_privilege($1, 'public.visitor_analytics_activity(text)', 'EXECUTE') as activity,
        has_table_privilege($1, 'visitor_analytics.visit_records', 'SELECT') as records`, [role])).rows[0];
      assert.deepEqual(permissions, { schema_access: false, track: false, summary: false, rate: false, track_v2: false, activity: false, records: false });
    }
    await db.exec('set role anon');
    assert.equal((await db.query('select content from public.existing_application')).rows[0].content, 'preserve me');
    await assert.rejects(db.query('select * from visitor_analytics.daily_totals'), /permission denied/);
    await assert.rejects(db.query('select public.visitor_analytics_summary()'), /permission denied/);
    await assert.rejects(db.query('select public.visitor_analytics_activity()'), /permission denied/);
    await assert.rejects(db.query('select * from visitor_analytics.visit_records'), /permission denied/);
    await db.exec('reset role; set role service_role');
    assert.equal(await track(db), true);
    assert.equal((await summary(db)).totals.pageviews, 1);
    assert.equal((await activity(db)).records.length, 1);
    await assert.rejects(db.query('select * from visitor_analytics.visit_records'), /permission denied/);
  } finally { await db.close(); }
});

test('retries are idempotent and visits across pages deduplicate site-wide per day', async () => {
  const db = await database();
  try {
    const empty = await summary(db);
    assert.equal(empty.since, null);
    assert.deepEqual(empty.totals, { pageviews: 0, visitorDays: 0 });
    assert.deepEqual(empty.countries, []);
    const event = randomUUID();
    assert.equal(await track(db, { event }), true);
    assert.equal(await track(db, { event }), false);
    await track(db); // Same visitor opens another page, with a new document ID.
    await track(db, { visitor: 'b'.repeat(64), country: 'CN' });
    await track(db, { visitor: 'c'.repeat(64), country: null });
    const result = await summary(db);
    assert.deepEqual(result.totals, { pageviews: 4, visitorDays: 3 });
    assert.equal(result.today.visitors, 3);
    assert.equal(result.countries.find(c => c.code === 'US').visitorDays, 1);
    assert.equal(result.countries.find(c => c.code === 'US').pageviews, 2);
    assert.equal(result.countries.find(c => c.code === null).pageviews, 1);
    assert.equal((await activity(db)).records.length, 4);
  } finally { await db.close(); }
});

test('activity migration backfills only recorded historical facts and preserves original totals', async () => {
  const db = await database({ activity: false });
  try {
    await track(db, { legacy: true, country: 'CN' });
    const before = await summary(db);
    const timestamp = (await db.query('select received_at::text as at from visitor_analytics.recent_events')).rows[0].at;
    await db.exec(activityMigration);
    const after = await summary(db);
    assert.deepEqual(after.totals, before.totals);
    assert.deepEqual(after.countries, before.countries);
    const history = await activity(db);
    assert.equal(history.records.length, 1);
    assert.equal(new Date(history.records[0].visitedAt).getTime(), new Date(timestamp).getTime());
    assert.deepEqual(history.records[0], { visitedAt: history.records[0].visitedAt, countryCode: null, path: null });
    assert.equal(history.nextCursor, null);
    // An old Edge Function can continue collecting during the rollout.
    await track(db, { legacy: true, country: 'AE' });
    assert.deepEqual((await activity(db)).records[0], {
      visitedAt: (await activity(db)).records[0].visitedAt, countryCode: 'AE', path: null,
    });
    assert.equal((await summary(db)).totals.pageviews, 2);
    await assert.rejects(db.exec(activityMigration), /already exists/);
    await db.exec('rollback');
    assert.equal((await activity(db)).records.length, 2);
  } finally { await db.close(); }
});

test('activity uses bounded keyset pages with no skipped or duplicate records when newer visits arrive', async () => {
  const db = await database();
  try {
    assert.deepEqual(await activity(db), { version: 1, records: [], nextCursor: null });
    // Identical timestamps force the unique row ID to provide stable ordering.
    const paths = ['/', '/publication/', '/project/', '/cv/'];
    await db.exec('begin');
    for (let i = 0; i < 57; i++) await track(db, { path: paths[i % paths.length], country: i % 2 ? 'CN' : 'US' });
    await db.exec('commit');
    const first = await activity(db);
    assert.equal(first.records.length, 25);
    assert.equal(first.nextCursor, '33');
    assert.equal(first.records[0].path, paths[56 % paths.length]);
    await track(db, { path: '/cv/', country: 'AE' });
    const second = await activity(db, first.nextCursor);
    const third = await activity(db, second.nextCursor);
    assert.equal(second.records.length, 25);
    assert.equal(second.nextCursor, '8');
    assert.equal(third.records.length, 7);
    assert.equal(third.nextCursor, null);
    assert.deepEqual([...first.records, ...second.records, ...third.records].map(r => [r.countryCode, r.path]),
      Array.from({ length: 57 }, (_, offset) => {
        const i = 56 - offset;
        return [i % 2 ? 'CN' : 'US', paths[i % paths.length]];
      }));
    assert.deepEqual((await activity(db, '1')).records, []);
    for (const row of first.records) assert.deepEqual(Object.keys(row).sort(), ['countryCode', 'path', 'visitedAt']);
    assert.equal((await activity(db)).records[0].countryCode, 'AE');
  } finally { await db.close(); }
});

test('activity cursors are validated as positive bigint strings and retain precision beyond JavaScript integers', async () => {
  const db = await database();
  try {
    for (const before of ['', '0', '-1', '01', '1.5', '1e3', '9223372036854775808', '9'.repeat(200), '1;select 1']) {
      await assert.rejects(activity(db, before), /Invalid activity cursor/);
    }
    await db.exec(`alter sequence visitor_analytics.visit_records_id_seq restart with 9007199254740993`);
    for (let i = 0; i < 26; i++) await track(db);
    const first = await activity(db, '9223372036854775807');
    assert.equal(first.nextCursor, '9007199254740994');
    assert.equal((await activity(db, first.nextCursor)).records.length, 1);
  } finally { await db.close(); }
});

test('new history is minimized, survives housekeeping and rejects invalid paths atomically', async () => {
  const db = await database();
  try {
    await track(db, { country: null });
    await track(db, { country: 'CN', path: '/publication/' });
    await assert.rejects(track(db, { path: '/?secret=value' }), /Invalid analytics event/);
    const result = await summary(db);
    assert.equal(result.totals.pageviews, 2);
    // A changed lookup later on the same UTC day does not create a new visitor.
    assert.deepEqual(result.countries.find(c => c.code === 'CN'), { code: 'CN', pageviews: 1, visitorDays: 0 });
    const columns = (await db.query(`select column_name from information_schema.columns
      where table_schema = 'visitor_analytics' and table_name = 'visit_records' order by ordinal_position`)).rows.map(r => r.column_name);
    assert.deepEqual(columns, ['id', 'event_id', 'visited_at', 'country_code', 'path']);
    assert.equal((await db.query(`select relrowsecurity as enabled from pg_class where oid = 'visitor_analytics.visit_records'::regclass`)).rows[0].enabled, true);
    await db.exec(`update visitor_analytics.visit_records set visited_at = now() - interval '100 days';
      update visitor_analytics.recent_events set received_at = now() - interval '8 days'`);
    await db.query(`select public.visitor_analytics_rate_limit($1, 'summary')`, ['f'.repeat(64)]);
    assert.equal((await db.query('select count(*)::int as n from visitor_analytics.recent_events')).rows[0].n, 0);
    assert.equal((await activity(db)).records.length, 2);
    assert.equal((await summary(db)).totals.pageviews, 2);
  } finally { await db.close(); }
});

test('rate limits are per-IP and housekeeping preserves historical aggregate counts', async () => {
  const db = await database();
  try {
    await db.exec(`
      insert into visitor_analytics.daily_totals values (current_date - 100, 50, 20);
      insert into visitor_analytics.country_daily_totals values (current_date - 100, 'GB', 50, 20);
      insert into visitor_analytics.daily_visitors values (current_date - 3, repeat('c',64));
      insert into visitor_analytics.recent_events values ('11111111-1111-4111-8111-111111111111', now() - interval '8 days');
    `);
    for (let i = 0; i < 22; i++) {
      const allowed = (await db.query(`select public.visitor_analytics_rate_limit($1, 'track') as allowed`, ['a'.repeat(64)])).rows[0].allowed;
      assert.equal(allowed, i < 20);
    }
    assert.equal((await db.query(`select public.visitor_analytics_rate_limit($1, 'track') as allowed`, ['b'.repeat(64)])).rows[0].allowed, true);
    assert.equal((await db.query('select count(*)::int as n from visitor_analytics.daily_visitors')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from visitor_analytics.recent_events')).rows[0].n, 0);
    assert.deepEqual((await summary(db)).totals, { pageviews: 50, visitorDays: 20 });
    assert.equal((await summary(db)).countries[0].code, 'GB');
  } finally { await db.close(); }
});

test('name collisions fail without modifying existing analytics or application data', async () => {
  const db = await database();
  try {
    await track(db);
    await assert.rejects(db.exec(migration), /already exists/);
    await db.exec('rollback');
    assert.equal((await summary(db)).totals.pageviews, 1);
    assert.equal((await db.query('select content from public.existing_application')).rows[0].content, 'preserve me');
  } finally { await db.close(); }
});
