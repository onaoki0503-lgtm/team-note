-- Team Note v2: profile extensions + projects / reports / inventory / archives.
-- Additive only. Apply in SQL Editor on the shared restaurant project.
-- Does not change restaurant (non-tn_) tables.
begin;

-- ---- Members: bio + avatar ----
alter table public.tn_members
  add column if not exists bio text not null default '',
  add column if not exists avatar_url text;
alter table public.tn_members drop constraint if exists tn_members_bio_len;
alter table public.tn_members
  add constraint tn_members_bio_len check (char_length(bio) <= 500);

-- ---- Projects ----
create table if not exists public.tn_projects (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references teamnote_private.communities(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 2000),
  status text not null default '進行中' check (char_length(status) between 1 and 40),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tn_projects_by_community on public.tn_projects(community_id, updated_at desc);

create table if not exists public.tn_project_members (
  community_id text not null,
  project_id uuid not null references public.tn_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_label text not null default 'スタッフ' check (char_length(role_label) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ---- Work reports ----
create table if not exists public.tn_work_reports (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references teamnote_private.communities(id),
  author_id uuid not null references auth.users(id),
  report_date date not null default (timezone('Asia/Tokyo', now()))::date,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  category text not null default '役職固有業務' check (char_length(category) between 1 and 40),
  body text not null default '' check (char_length(body) <= 8000),
  attachments jsonb not null default '[]'::jsonb,
  location_lat double precision,
  location_lng double precision,
  location_label text,
  created_at timestamptz not null default now()
);
create index if not exists tn_reports_by_author on public.tn_work_reports(community_id, author_id, report_date desc);

-- ---- Inventory ----
create table if not exists public.tn_inventory_items (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references teamnote_private.communities(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  location text not null default '',
  asset_code text not null default '',
  quantity numeric,
  unit text not null default '',
  status text not null default '在庫',
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create index if not exists tn_inventory_by_community on public.tn_inventory_items(community_id, name);

-- ---- Archive docs ----
create table if not exists public.tn_archive_docs (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references teamnote_private.communities(id),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null default '資料' check (char_length(category) between 1 and 40),
  storage_path text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.tn_projects enable row level security;
alter table public.tn_project_members enable row level security;
alter table public.tn_work_reports enable row level security;
alter table public.tn_inventory_items enable row level security;
alter table public.tn_archive_docs enable row level security;

revoke all on public.tn_projects, public.tn_project_members, public.tn_work_reports,
  public.tn_inventory_items, public.tn_archive_docs from public, anon, authenticated;
grant select on public.tn_projects, public.tn_project_members, public.tn_work_reports,
  public.tn_inventory_items, public.tn_archive_docs to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where policyname='tn_projects_read') then
    create policy tn_projects_read on public.tn_projects for select to authenticated
      using (teamnote_private.is_member(community_id));
  end if;
  if not exists (select 1 from pg_policies where policyname='tn_project_members_read') then
    create policy tn_project_members_read on public.tn_project_members for select to authenticated
      using (teamnote_private.is_member(community_id));
  end if;
  if not exists (select 1 from pg_policies where policyname='tn_reports_read') then
    create policy tn_reports_read on public.tn_work_reports for select to authenticated
      using (teamnote_private.is_member(community_id));
  end if;
  if not exists (select 1 from pg_policies where policyname='tn_inventory_read') then
    create policy tn_inventory_read on public.tn_inventory_items for select to authenticated
      using (teamnote_private.is_member(community_id));
  end if;
  if not exists (select 1 from pg_policies where policyname='tn_archives_read') then
    create policy tn_archives_read on public.tn_archive_docs for select to authenticated
      using (teamnote_private.is_member(community_id));
  end if;
end $$;

-- Profile validation + join/update with bio/avatar
-- Name / role / unit / dorm details are optional; empty values get defaults on write.
create or replace function teamnote_private.validate_profile(p jsonb) returns void
language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(p)<>'object' then
    raise exception 'teamnote_invalid_profile' using errcode='22023';
  end if;
  if char_length(coalesce(p->>'bio','')) > 500 then
    raise exception 'teamnote_invalid_profile' using errcode='22023';
  end if;
  if coalesce(p->>'building','') <> ''
    and p->>'building' not in ('rosemary','basil','turmeric','paprika') then
    raise exception 'teamnote_invalid_profile' using errcode='22023';
  end if;
  if coalesce(p->>'floor','') <> ''
    and p->>'floor' not in ('1','2','3','4') then
    raise exception 'teamnote_invalid_profile' using errcode='22023';
  end if;
end$$;

create or replace function teamnote_private.profile_name(p jsonb) returns text
language sql immutable set search_path='' as $$
  select left(coalesce(nullif(btrim(p->>'name'),''), '寮生'), 60)
$$;
create or replace function teamnote_private.profile_role(p jsonb) returns text
language sql immutable set search_path='' as $$
  select left(coalesce(nullif(btrim(p->>'role'),''), '一般寮生'), 60)
$$;
create or replace function teamnote_private.profile_building(p jsonb) returns text
language sql immutable set search_path='' as $$
  select case when coalesce(p->>'building','') in ('rosemary','basil','turmeric','paprika')
    then p->>'building' else 'rosemary' end
$$;
create or replace function teamnote_private.profile_floor(p jsonb) returns smallint
language sql immutable set search_path='' as $$
  select case when coalesce(p->>'floor','') in ('1','2','3','4')
    then (p->>'floor')::smallint else 1::smallint end
$$;
create or replace function teamnote_private.profile_unit(p jsonb) returns text
language sql immutable set search_path='' as $$
  select left(coalesce(nullif(btrim(p->>'unit'),''), '未設定'), 60)
$$;

create or replace function teamnote_private.get_board(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform teamnote_private.maintain_board(c);
  select jsonb_build_object(
    'community', c,
    'revision', (select revision from teamnote_private.communities where id=c),
    'userId', (select auth.uid()),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.user_id,
        'name', m.display_name,
        'role', m.role_label,
        'roleType', 'member',
        'building', m.building,
        'floor', m.floor,
        'unit', m.unit,
        'bio', m.bio,
        'avatar', m.avatar_url
      ) order by m.created_at, m.user_id)
      from public.tn_members m where m.community_id=c and m.active
    ), '[]'::jsonb),
    'ideas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'text', i.body, 'color', 'coral',
        'authorId', i.author_id,
        'authorName', coalesce(m.display_name, '寮生'),
        'likes', i.likes,
        'likedUserIds', coalesce((
          select jsonb_agg(r.user_id order by r.user_id)
          from public.tn_reactions r where r.community_id=c and r.idea_id=i.id
        ), '[]'::jsonb),
        'createdAt', i.created_at,
        'lastReactionAt', i.last_reaction_at,
        'activityTrackedFrom', i.created_at,
        'hiddenAt', i.hidden_at,
        'hiddenReason', i.hidden_reason
      ) order by i.created_at, i.id)
      from public.tn_ideas i
      left join public.tn_members m on m.community_id=i.community_id and m.user_id=i.author_id
      where i.community_id=c and i.deleted_at is null
    ), '[]'::jsonb)
  ) into result;
  return result;
end$$;

create or replace function teamnote_private.join_community(p_invite text, p_profile jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c text; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  perform teamnote_private.validate_profile(p_profile);
  select id into c from teamnote_private.communities
    where enabled and invite_hash=extensions.digest(p_invite,'sha256') for update;
  if c is null then raise exception 'teamnote_invalid_invite' using errcode='42501'; end if;
  if exists(select 1 from public.tn_members where community_id=c and user_id=uid and not active) then
    raise exception 'teamnote_access_denied' using errcode='42501';
  end if;
  insert into public.tn_members(community_id,user_id,display_name,role_label,building,floor,unit,bio,avatar_url)
  values (
    c, uid,
    teamnote_private.profile_name(p_profile),
    teamnote_private.profile_role(p_profile),
    teamnote_private.profile_building(p_profile),
    teamnote_private.profile_floor(p_profile),
    teamnote_private.profile_unit(p_profile),
    coalesce(p_profile->>'bio',''), nullif(p_profile->>'avatar','')
  )
  on conflict (community_id,user_id) do nothing;
  update teamnote_private.communities set revision=revision+1 where id=c;
  return teamnote_private.get_board(c);
end$$;

create or replace function teamnote_private.update_profile(c text, p_profile jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform teamnote_private.lock_board(c);
  perform teamnote_private.validate_profile(p_profile);
  update public.tn_members set
    display_name = teamnote_private.profile_name(p_profile),
    role_label = teamnote_private.profile_role(p_profile),
    building = teamnote_private.profile_building(p_profile),
    floor = teamnote_private.profile_floor(p_profile),
    unit = teamnote_private.profile_unit(p_profile),
    bio = coalesce(p_profile->>'bio',''),
    avatar_url = case
      when p_profile ? 'avatar' then nullif(p_profile->>'avatar','')
      else avatar_url
    end
  where community_id=c and user_id=(select auth.uid()) and active;
  update teamnote_private.communities set revision=revision+1 where id=c;
  return teamnote_private.get_board(c);
end$$;

-- ---- Domain RPCs ----
create or replace function teamnote_private.list_projects(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.title, 'summary', p.summary, 'status', p.status,
      'ownerId', p.owner_id,
      'ownerName', coalesce(m.display_name,''),
      'memberCount', (select count(*) from public.tn_project_members pm where pm.project_id=p.id),
      'updatedAt', p.updated_at
    ) order by p.updated_at desc)
    from public.tn_projects p
    left join public.tn_members m on m.community_id=p.community_id and m.user_id=p.owner_id
    where p.community_id=c
  ), '[]'::jsonb);
end$$;

create or replace function teamnote_private.create_project(c text, p_title text, p_summary text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); pid uuid;
begin
  perform teamnote_private.lock_board(c);
  if char_length(btrim(coalesce(p_title,''))) not between 1 and 120 then
    raise exception 'teamnote_invalid_text' using errcode='22023';
  end if;
  insert into public.tn_projects(community_id,title,summary,owner_id)
  values (c, btrim(p_title), coalesce(p_summary,''), uid) returning id into pid;
  insert into public.tn_project_members(community_id,project_id,user_id,role_label)
  values (c, pid, uid, '発起人');
  return teamnote_private.list_projects(c);
end$$;

create or replace function teamnote_private.list_reports(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid());
begin
  if not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'title', r.title, 'category', r.category, 'body', r.body,
      'reportDate', r.report_date, 'attachments', r.attachments,
      'locationLat', r.location_lat, 'locationLng', r.location_lng,
      'locationLabel', r.location_label, 'createdAt', r.created_at
    ) order by r.report_date desc, r.created_at desc)
    from public.tn_work_reports r where r.community_id=c and r.author_id=uid
  ), '[]'::jsonb);
end$$;

create or replace function teamnote_private.save_report(
  c text, p_title text, p_category text, p_body text, p_date date,
  p_attachments jsonb default '[]'::jsonb,
  p_lat double precision default null, p_lng double precision default null,
  p_location_label text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid());
begin
  perform teamnote_private.lock_board(c);
  insert into public.tn_work_reports(
    community_id, author_id, report_date, title, category, body,
    attachments, location_lat, location_lng, location_label
  ) values (
    c, uid, coalesce(p_date, (timezone('Asia/Tokyo', now()))::date),
    btrim(p_title), coalesce(nullif(btrim(p_category),''),'役職固有業務'),
    coalesce(p_body,''), coalesce(p_attachments,'[]'::jsonb),
    p_lat, p_lng, p_location_label
  );
  return teamnote_private.list_reports(c);
end$$;

create or replace function teamnote_private.list_inventory(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id, 'name', i.name, 'location', i.location, 'assetCode', i.asset_code,
      'quantity', i.quantity, 'unit', i.unit, 'status', i.status, 'note', i.note,
      'updatedAt', i.updated_at
    ) order by i.name)
    from public.tn_inventory_items i where i.community_id=c
  ), '[]'::jsonb);
end$$;

create or replace function teamnote_private.upsert_inventory_item(
  c text, p_id uuid, p_name text, p_location text, p_asset_code text,
  p_quantity numeric, p_unit text, p_status text, p_note text
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform teamnote_private.lock_board(c);
  insert into public.tn_inventory_items(
    id, community_id, name, location, asset_code, quantity, unit, status, note, updated_by
  ) values (
    coalesce(p_id, gen_random_uuid()), c, btrim(p_name), coalesce(p_location,''),
    coalesce(p_asset_code,''), p_quantity, coalesce(p_unit,''),
    coalesce(nullif(btrim(p_status),''),'在庫'), coalesce(p_note,''), (select auth.uid())
  )
  on conflict (id) do update set
    name=excluded.name, location=excluded.location, asset_code=excluded.asset_code,
    quantity=excluded.quantity, unit=excluded.unit, status=excluded.status,
    note=excluded.note, updated_at=now(), updated_by=(select auth.uid());
  return teamnote_private.list_inventory(c);
end$$;

create or replace function teamnote_private.list_archives(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'title', d.title, 'category', d.category,
      'storagePath', d.storage_path, 'sizeBytes', d.size_bytes, 'updatedAt', d.updated_at
    ) order by d.updated_at desc)
    from public.tn_archive_docs d where d.community_id=c
  ), '[]'::jsonb);
end$$;

create or replace function teamnote_private.add_archive(
  c text, p_title text, p_category text, p_path text, p_size bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform teamnote_private.lock_board(c);
  insert into public.tn_archive_docs(community_id,title,category,storage_path,size_bytes,uploaded_by)
  values (c, btrim(p_title), coalesce(nullif(btrim(p_category),''),'資料'), p_path, p_size, (select auth.uid()));
  return teamnote_private.list_archives(c);
end$$;

-- Public wrappers
create or replace function public.tn_list_projects(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.list_projects(p_community) $$;
create or replace function public.tn_create_project(p_community text, p_title text, p_summary text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.create_project(p_community,p_title,p_summary) $$;
create or replace function public.tn_list_reports(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.list_reports(p_community) $$;
create or replace function public.tn_save_report(
  p_community text, p_title text, p_category text, p_body text, p_date date,
  p_attachments jsonb, p_lat double precision, p_lng double precision, p_location_label text
) returns jsonb language sql security invoker set search_path='' as $$
  select teamnote_private.save_report(p_community,p_title,p_category,p_body,p_date,p_attachments,p_lat,p_lng,p_location_label)
$$;
create or replace function public.tn_list_inventory(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.list_inventory(p_community) $$;
create or replace function public.tn_upsert_inventory_item(
  p_community text, p_id uuid, p_name text, p_location text, p_asset_code text,
  p_quantity numeric, p_unit text, p_status text, p_note text
) returns jsonb language sql security invoker set search_path='' as $$
  select teamnote_private.upsert_inventory_item(p_community,p_id,p_name,p_location,p_asset_code,p_quantity,p_unit,p_status,p_note)
$$;
create or replace function public.tn_list_archives(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.list_archives(p_community) $$;
create or replace function public.tn_add_archive(
  p_community text, p_title text, p_category text, p_path text, p_size bigint
) returns jsonb language sql security invoker set search_path='' as $$
  select teamnote_private.add_archive(p_community,p_title,p_category,p_path,p_size)
$$;

-- Refresh existing public wrappers that changed body
create or replace function public.tn_get_board(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.get_board(p_community) $$;
create or replace function public.tn_join_community(p_invite text, p_profile jsonb) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.join_community(p_invite,p_profile) $$;
create or replace function public.tn_update_profile(p_community text, p_profile jsonb) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.update_profile(p_community,p_profile) $$;

revoke all on function
  public.tn_list_projects(text), public.tn_create_project(text,text,text),
  public.tn_list_reports(text), public.tn_save_report(text,text,text,text,date,jsonb,double precision,double precision,text),
  public.tn_list_inventory(text),
  public.tn_upsert_inventory_item(text,uuid,text,text,text,numeric,text,text,text),
  public.tn_list_archives(text), public.tn_add_archive(text,text,text,text,bigint)
from public, anon;
grant execute on function
  public.tn_list_projects(text), public.tn_create_project(text,text,text),
  public.tn_list_reports(text), public.tn_save_report(text,text,text,text,date,jsonb,double precision,double precision,text),
  public.tn_list_inventory(text),
  public.tn_upsert_inventory_item(text,uuid,text,text,text,numeric,text,text,text),
  public.tn_list_archives(text), public.tn_add_archive(text,text,text,text,bigint)
to authenticated;

-- Storage buckets (create if missing via dashboard or this insert)
insert into storage.buckets (id, name, public)
values ('tn-avatars', 'tn-avatars', true), ('tn-files', 'tn-files', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
