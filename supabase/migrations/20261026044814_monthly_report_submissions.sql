-- Monthly submissions only. Preserve existing reports, permissions and review data.
begin;
create table if not exists teamnote_private.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references teamnote_private.communities(id),
  author_id uuid not null references auth.users(id) on delete cascade,
  report_month date not null check (extract(day from report_month)=1),
  body text not null check (char_length(btrim(body)) between 1 and 50000),
  author_snapshot jsonb not null,
  submitted_at timestamptz not null default now(),
  unique(community_id,author_id,report_month)
);
alter table teamnote_private.monthly_reports enable row level security;
revoke all on teamnote_private.monthly_reports from public,anon,authenticated;
create index if not exists tn_monthly_reports_period on teamnote_private.monthly_reports(community_id,report_month,submitted_at desc);

-- Private DEFINER is needed to access the unexposed table. Both functions validate the caller.
create or replace function teamnote_private.submit_monthly_report(c text,m date,report_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); profile jsonb; saved teamnote_private.monthly_reports%rowtype;
begin
  if actor is null then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  select jsonb_build_object('id',u.user_id,'name',u.display_name,'role',coalesce(u.role_label,''),'building',coalesce(u.building,''),'unit',coalesce(u.unit,'')) into profile
    from public.tn_members u join teamnote_private.communities g on g.id=u.community_id
    where u.community_id=c and u.user_id=actor and u.active and g.enabled;
  if profile is null then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  if m is null or extract(day from m)<>1 or m<date '2000-01-01' or m>date '2100-12-01'
    or m>date_trunc('month',now() at time zone 'Asia/Tokyo')::date
    or report_body is null or char_length(btrim(report_body)) not between 1 and 50000 then
    raise exception 'teamnote_invalid_monthly_report' using errcode='22023';
  end if;
  insert into teamnote_private.monthly_reports(community_id,author_id,report_month,body,author_snapshot)
    values(c,actor,m,btrim(report_body),profile)
    on conflict(community_id,author_id,report_month) do update
      set body=excluded.body,author_snapshot=excluded.author_snapshot,submitted_at=now()
    returning * into saved;
  return jsonb_build_object('id',saved.id,'month',to_char(saved.report_month,'YYYY-MM'),'submittedAt',saved.submitted_at);
end $$;

create or replace function teamnote_private.management_monthly_reports(c text,m date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not teamnote_private.is_management_reviewer(c) then raise exception 'teamnote_management_access_denied' using errcode='42501'; end if;
  if m is null or extract(day from m)<>1 or m<date '2000-01-01' or m>date '2100-12-01' then
    raise exception 'teamnote_invalid_month' using errcode='22023';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'month',to_char(r.report_month,'YYYY-MM'),'body',r.body,'submittedAt',r.submitted_at,'author',r.author_snapshot) order by r.submitted_at desc,r.id)
    from teamnote_private.monthly_reports r where r.community_id=c and r.report_month=m),'[]'::jsonb);
end $$;
create or replace function public.tn_submit_monthly_report(p_community text,p_month date,p_body text) returns jsonb
language sql security invoker set search_path='' as $$ select teamnote_private.submit_monthly_report(p_community,p_month,p_body) $$;
create or replace function public.tn_management_monthly_reports(p_community text,p_month date) returns jsonb
language sql security invoker set search_path='' as $$ select teamnote_private.management_monthly_reports(p_community,p_month) $$;
revoke all on function teamnote_private.submit_monthly_report(text,date,text),teamnote_private.management_monthly_reports(text,date),public.tn_submit_monthly_report(text,date,text),public.tn_management_monthly_reports(text,date) from public,anon;
grant execute on function teamnote_private.submit_monthly_report(text,date,text),teamnote_private.management_monthly_reports(text,date),public.tn_submit_monthly_report(text,date,text),public.tn_management_monthly_reports(text,date) to authenticated;
notify pgrst,'reload schema';
commit;
