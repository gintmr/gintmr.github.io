import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/202609110001_visitor_analytics.sql', import.meta.url), 'utf8');

async function database() {
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
  return db;
}

async function track(db, { event = randomUUID(), visitor = 'a'.repeat(64), country = 'US' } = {}) {
  return (await db.query(`select public.visitor_analytics_track(
    $1::uuid, $2, (now() at time zone 'UTC')::date, $3) as recorded`, [event, visitor, country])).rows[0].recorded;
}

async function summary(db) {
  return (await db.query('select public.visitor_analytics_summary() as summary')).rows[0].summary;
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
        has_function_privilege($1, 'public.visitor_analytics_rate_limit(text,text)', 'EXECUTE') as rate`, [role])).rows[0];
      assert.deepEqual(permissions, { schema_access: false, track: false, summary: false, rate: false });
    }
    await db.exec('set role anon');
    assert.equal((await db.query('select content from public.existing_application')).rows[0].content, 'preserve me');
    await assert.rejects(db.query('select * from visitor_analytics.daily_totals'), /permission denied/);
    await assert.rejects(db.query('select public.visitor_analytics_summary()'), /permission denied/);
    await db.exec('reset role; set role service_role');
    assert.equal(await track(db), true);
    assert.equal((await summary(db)).totals.pageviews, 1);
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
