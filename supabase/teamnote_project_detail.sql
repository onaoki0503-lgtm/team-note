-- Team Note: persist project detail (members, details jsonb) + storage for archives/report files.
-- Apply in SQL Editor on the shared Team Note (restaurant) project AFTER teamnote_extend_v2.sql.
begin;

-- Allow long PROPOSAL_JSON summaries (mobile/web full 企画書).
alter table public.tn_projects drop constraint if exists tn_projects_summary_check;
alter table public.tn_projects
  add constraint tn_projects_summary_check check (char_length(summary) <= 100000);

alter table public.tn_projects
  add column if not exists details jsonb not null default '{}'::jsonb;

-- ---- list with members + details ----
create or replace function teamnote_private.list_projects(c text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'summary', p.summary,
      'status', p.status,
      'ownerId', p.owner_id,
      'ownerName', coalesce(m.display_name,''),
      'memberCount', (select count(*) from public.tn_project_members pm where pm.project_id=p.id),
      'updatedAt', p.updated_at,
      'details', coalesce(p.details, '{}'::jsonb),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'residentId', pm.user_id,
          'name', coalesce(mm.display_name, ''),
          'avatar', coalesce(mm.avatar_url, ''),
          'role', pm.role_label,
          'building', coalesce(mm.building, ''),
          'joinedAt', to_char(pm.joined_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD')
        ) order by pm.joined_at)
        from public.tn_project_members pm
        left join public.tn_members mm
          on mm.community_id = pm.community_id and mm.user_id = pm.user_id
        where pm.project_id = p.id
      ), '[]'::jsonb)
    ) order by p.updated_at desc)
    from public.tn_projects p
    left join public.tn_members m on m.community_id=p.community_id and m.user_id=p.owner_id
    where p.community_id=c
  ), '[]'::jsonb);
end$$;

create or replace function teamnote_private.update_project_details(
  c text, p_id uuid, p_details jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform teamnote_private.lock_board(c);
  if not exists (
    select 1 from public.tn_project_members
    where community_id=c and project_id=p_id and user_id=(select auth.uid())
  ) and not exists (
    select 1 from public.tn_projects
    where community_id=c and id=p_id and owner_id=(select auth.uid())
  ) then
    raise exception 'teamnote_access_denied' using errcode='42501';
  end if;
  update public.tn_projects
  set details = coalesce(p_details, '{}'::jsonb), updated_at = now()
  where community_id=c and id=p_id;
  return teamnote_private.list_projects(c);
end$$;

create or replace function teamnote_private.update_project_summary(
  c text, p_id uuid, p_summary text, p_status text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform teamnote_private.lock_board(c);
  if not exists (
    select 1 from public.tn_projects
    where community_id=c and id=p_id and owner_id=(select auth.uid())
  ) and not exists (
    select 1 from public.tn_project_members
    where community_id=c and project_id=p_id and user_id=(select auth.uid())
  ) then
    raise exception 'teamnote_access_denied' using errcode='42501';
  end if;
  update public.tn_projects set
    summary = coalesce(p_summary, summary),
    status = coalesce(nullif(btrim(p_status), ''), status),
    updated_at = now()
  where community_id=c and id=p_id;
  return teamnote_private.list_projects(c);
end$$;

create or replace function teamnote_private.join_project(
  c text, p_id uuid, p_role text default 'スタッフ'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid());
begin
  perform teamnote_private.lock_board(c);
  if not exists (select 1 from public.tn_projects where community_id=c and id=p_id) then
    raise exception 'teamnote_unavailable' using errcode='P0002';
  end if;
  insert into public.tn_project_members(community_id, project_id, user_id, role_label)
  values (c, p_id, uid, coalesce(nullif(btrim(p_role), ''), 'スタッフ'))
  on conflict (project_id, user_id) do update set role_label = excluded.role_label;
  return teamnote_private.list_projects(c);
end$$;

create or replace function teamnote_private.leave_project(
  c text, p_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid());
begin
  perform teamnote_private.lock_board(c);
  delete from public.tn_project_members
  where community_id=c and project_id=p_id and user_id=uid;
  return teamnote_private.list_projects(c);
end$$;

-- Public wrappers
create or replace function public.tn_list_projects(p_community text) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.list_projects(p_community) $$;
create or replace function public.tn_update_project_details(p_community text, p_id uuid, p_details jsonb) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.update_project_details(p_community, p_id, p_details) $$;
create or replace function public.tn_update_project_summary(p_community text, p_id uuid, p_summary text, p_status text default null) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.update_project_summary(p_community, p_id, p_summary, p_status) $$;
create or replace function public.tn_join_project(p_community text, p_id uuid, p_role text default 'スタッフ') returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.join_project(p_community, p_id, p_role) $$;
create or replace function public.tn_leave_project(p_community text, p_id uuid) returns jsonb
  language sql security invoker set search_path='' as $$ select teamnote_private.leave_project(p_community, p_id) $$;

revoke all on function
  public.tn_update_project_details(text, uuid, jsonb),
  public.tn_update_project_summary(text, uuid, text, text),
  public.tn_join_project(text, uuid, text),
  public.tn_leave_project(text, uuid)
from public, anon;
grant execute on function
  public.tn_update_project_details(text, uuid, jsonb),
  public.tn_update_project_summary(text, uuid, text, text),
  public.tn_join_project(text, uuid, text),
  public.tn_leave_project(text, uuid)
to authenticated;

-- Storage: member read/write under community prefix
insert into storage.buckets (id, name, public)
values ('tn-avatars', 'tn-avatars', true), ('tn-files', 'tn-files', false)
on conflict (id) do nothing;

drop policy if exists tn_files_select on storage.objects;
drop policy if exists tn_files_insert on storage.objects;
drop policy if exists tn_files_update on storage.objects;
drop policy if exists tn_files_delete on storage.objects;

create policy tn_files_select on storage.objects for select to authenticated
  using (bucket_id = 'tn-files' and teamnote_private.is_member(split_part(name, '/', 1)));
create policy tn_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tn-files' and teamnote_private.is_member(split_part(name, '/', 1)));
create policy tn_files_update on storage.objects for update to authenticated
  using (bucket_id = 'tn-files' and teamnote_private.is_member(split_part(name, '/', 1)));
create policy tn_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tn-files' and teamnote_private.is_member(split_part(name, '/', 1)));

notify pgrst, 'reload schema';
commit;
