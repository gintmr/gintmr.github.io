-- Add today's per-country counts to the public summary (today.countries), so the
-- homepage can show today's regional breakdown next to the all-time one.
-- Read-only change: no tables, rows, counters or other functions are touched.
-- The Edge Function returns this RPC result as-is, so it needs no redeploy.
begin;

create or replace function public.visitor_analytics_summary()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'generatedAt', now(),
    'since', (select min(day) from visitor_analytics.daily_totals),
    'totals', (select jsonb_build_object(
      'pageviews', coalesce(sum(pageviews), 0),
      'visitorDays', coalesce(sum(visitors), 0)
    ) from visitor_analytics.daily_totals),
    'today', (select jsonb_build_object(
      'date', (now() at time zone 'UTC')::date,
      'pageviews', coalesce(sum(pageviews), 0),
      'visitors', coalesce(sum(visitors), 0),
      'countries', coalesce((select jsonb_agg(jsonb_build_object(
        'code', nullif(country_code, 'ZZ'), 'pageviews', pageviews, 'visitors', visitors
      ) order by pageviews desc, visitors desc, country_code)
      from visitor_analytics.country_daily_totals
      where day = (now() at time zone 'UTC')::date and pageviews > 0), '[]'::jsonb)
    ) from visitor_analytics.daily_totals where day = (now() at time zone 'UTC')::date),
    'countries', coalesce((select jsonb_agg(jsonb_build_object(
      'code', nullif(country_code, 'ZZ'), 'pageviews', pageviews, 'visitorDays', visitors
    ) order by visitors desc, pageviews desc, country_code)
    from (select country_code, sum(pageviews) as pageviews, sum(visitors) as visitors
      from visitor_analytics.country_daily_totals group by country_code) as countries), '[]'::jsonb)
  );
$$;

revoke all on function public.visitor_analytics_summary() from public, anon, authenticated;
grant execute on function public.visitor_analytics_summary() to service_role;

commit;
