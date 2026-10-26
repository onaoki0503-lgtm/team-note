-- Additive Team Note management. Existing resident APIs, Auth and restaurant data are unchanged.
-- Reviewer assignments are server-managed; no account is granted access by this migration.
begin;

create table if not exists teamnote_private.management_reviewers (
  community_id text not null references teamnote_private.communities(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  organization text not null default '' check (char_length(organization) <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
create table if not exists teamnote_private.report_reviews (
  report_id uuid primary key references public.tn_work_reports(id) on delete cascade,
  community_id text not null references teamnote_private.communities(id),
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  updated_by uuid not null references auth.users(id),
  version integer not null check (version > 0)
);
alter table teamnote_private.management_reviewers enable row level security;
alter table teamnote_private.report_reviews enable row level security;
revoke all on teamnote_private.management_reviewers,teamnote_private.report_reviews from public,anon,authenticated;
create index if not exists tn_reports_for_management on public.tn_work_reports(community_id,report_date desc,created_at desc);

create or replace function teamnote_private.is_management_reviewer(c text) returns boolean
language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from teamnote_private.management_reviewers m
    join teamnote_private.communities g on g.id=m.community_id
    where m.community_id=c and m.user_id=(select auth.uid()) and m.active and g.enabled
  )
$$;

create or replace function teamnote_private.management_context(c text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not teamnote_private.is_management_reviewer(c) then
    raise exception 'teamnote_management_access_denied' using errcode='42501';
  end if;
  return (select jsonb_build_object('communityId',c,'communityName',g.name,'userId',m.user_id,'name',m.display_name,'organization',m.organization)
    from teamnote_private.management_reviewers m join teamnote_private.communities g on g.id=m.community_id
    where m.community_id=c and m.user_id=(select auth.uid()));
end $$;

create or replace function teamnote_private.management_reports(c text,d_from date,d_before date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not teamnote_private.is_management_reviewer(c) then
    raise exception 'teamnote_management_access_denied' using errcode='42501';
  end if;
  if d_from is null or d_before is null or d_before<=d_from or d_before-d_from>366 then
    raise exception 'teamnote_invalid_period' using errcode='22023';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',r.id,'title',r.title,'category',case when r.category='共通業務' then '役職共通業務' else r.category end,'body',r.body,'reportDate',r.report_date,
    'submittedAt',r.created_at,'locationLabel',coalesce(r.location_label,''),'attachments',r.attachments,
    'author',jsonb_build_object('id',r.author_id,'name',coalesce(m.display_name,'退寮済みの寮生'),'role',coalesce(m.role_label,''),'building',coalesce(m.building,''),'unit',coalesce(m.unit,'')),
    'review',jsonb_build_object('reviewed',coalesce(v.reviewed,false),'reviewedAt',v.reviewed_at,'reviewerName',coalesce(rv.display_name,''),'version',coalesce(v.version,0))
  ) order by r.report_date desc,r.created_at desc,r.id)
  from public.tn_work_reports r
  left join public.tn_members m on m.community_id=r.community_id and m.user_id=r.author_id
  left join teamnote_private.report_reviews v on v.report_id=r.id and v.community_id=r.community_id
  left join teamnote_private.management_reviewers rv on rv.community_id=v.community_id and rv.user_id=v.updated_by
  where r.community_id=c and r.report_date>=d_from and r.report_date<d_before),'[]'::jsonb);
end $$;

create or replace function teamnote_private.management_set_review(c text,r_id uuid,want_reviewed boolean,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing_version integer; next_row teamnote_private.report_reviews%rowtype; actor_name text;
begin
  if not teamnote_private.is_management_reviewer(c) then
    raise exception 'teamnote_management_access_denied' using errcode='42501';
  end if;
  if want_reviewed is null or expected_version is null or expected_version<0 then
    raise exception 'teamnote_invalid_review' using errcode='22023';
  end if;
  -- Serialize two reviewers, including the first review (where no review row exists yet).
  perform 1 from public.tn_work_reports where id=r_id and community_id=c for update;
  if not found then raise exception 'teamnote_report_not_found' using errcode='P0002'; end if;
  select version into existing_version from teamnote_private.report_reviews where report_id=r_id and community_id=c;
  if coalesce(existing_version,0)<>expected_version then
    raise exception 'teamnote_review_conflict' using errcode='40001';
  end if;
  insert into teamnote_private.report_reviews(report_id,community_id,reviewed,reviewed_at,updated_by,version)
    values(r_id,c,want_reviewed,case when want_reviewed then now() else null end,(select auth.uid()),expected_version+1)
    on conflict(report_id) do update set reviewed=excluded.reviewed,reviewed_at=excluded.reviewed_at,updated_by=excluded.updated_by,version=excluded.version
    returning * into next_row;
  select display_name into actor_name from teamnote_private.management_reviewers where community_id=c and user_id=(select auth.uid());
  return jsonb_build_object('reviewed',next_row.reviewed,'reviewedAt',next_row.reviewed_at,'reviewerName',case when next_row.reviewed then actor_name else '' end,'version',next_row.version);
end $$;

-- A manager may obtain signed URLs only for files attached to this community's reports.
create or replace function teamnote_private.management_can_read_file(p text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.tn_work_reports r
    where teamnote_private.is_management_reviewer(r.community_id)
      and left(p,char_length(r.community_id)+9)=r.community_id||'/reports/'
      and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(r.attachments)='array' then r.attachments else '[]'::jsonb end) a where a->>'path'=p)
  )
$$;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tn_management_report_files_read') then
    create policy tn_management_report_files_read on storage.objects for select to authenticated
      using(bucket_id='tn-files' and teamnote_private.management_can_read_file(name));
  end if;
end $$;

create or replace function public.tn_management_context(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.management_context(p_community) $$;
create or replace function public.tn_management_reports(p_community text,p_from date,p_before date) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.management_reports(p_community,p_from,p_before) $$;
create or replace function public.tn_management_set_review(p_community text,p_report_id uuid,p_reviewed boolean,p_expected_version integer) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.management_set_review(p_community,p_report_id,p_reviewed,p_expected_version) $$;

revoke all on function teamnote_private.is_management_reviewer(text),teamnote_private.management_context(text),teamnote_private.management_reports(text,date,date),teamnote_private.management_set_review(text,uuid,boolean,integer),teamnote_private.management_can_read_file(text) from public,anon;
grant execute on function teamnote_private.is_management_reviewer(text),teamnote_private.management_context(text),teamnote_private.management_reports(text,date,date),teamnote_private.management_set_review(text,uuid,boolean,integer),teamnote_private.management_can_read_file(text) to authenticated;
revoke all on function public.tn_management_context(text),public.tn_management_reports(text,date,date),public.tn_management_set_review(text,uuid,boolean,integer) from public,anon;
grant execute on function public.tn_management_context(text),public.tn_management_reports(text,date,date),public.tn_management_set_review(text,uuid,boolean,integer) to authenticated;
notify pgrst,'reload schema';
commit;
