-- Team Note only. Do not run the prototype schema.sql against the restaurant database.
-- Additive schema: existing restaurant tables, policies, functions and Auth settings are unchanged.
begin;
create schema if not exists teamnote_private;
revoke all on schema teamnote_private from public, anon;
grant usage on schema teamnote_private to authenticated;
create table if not exists teamnote_private.communities (
 id text primary key, name text not null, invite_hash bytea not null unique,
 enabled boolean not null default true, revision bigint not null default 0, created_at timestamptz not null default now()
);
alter table teamnote_private.communities add column if not exists revision bigint not null default 0;
alter table teamnote_private.communities enable row level security;
revoke all on teamnote_private.communities from public, anon, authenticated;

create table if not exists public.tn_members (
 community_id text not null references teamnote_private.communities(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 60),
 role_label text not null default '一般寮生' check(char_length(role_label) between 1 and 60),
 building text not null check(building in ('rosemary','basil','turmeric','paprika')),
 floor smallint not null check(floor between 1 and 4),
 unit text not null check(char_length(unit) between 1 and 60),
 active boolean not null default true, created_at timestamptz not null default now(),
 primary key(community_id,user_id)
);
create table if not exists public.tn_ideas (
 id uuid primary key, community_id text not null references teamnote_private.communities(id),
 author_id uuid not null references auth.users(id),
 body text not null check(char_length(btrim(body)) between 4 and 140),
 created_at timestamptz not null default clock_timestamp(), last_reaction_at timestamptz not null default clock_timestamp(),
 likes integer not null default 0 check(likes>=0),
 hidden_at timestamptz, hidden_reason text check(hidden_reason in ('inactive','capacity')),
 deleted_at timestamptz, unique(community_id,id)
);
alter table public.tn_ideas alter column created_at set default clock_timestamp(), alter column last_reaction_at set default clock_timestamp();
create table if not exists public.tn_reactions (
 community_id text not null, idea_id uuid not null, user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), primary key(community_id,idea_id,user_id),
 foreign key(community_id,idea_id) references public.tn_ideas(community_id,id)
);
create index if not exists tn_board_active on public.tn_ideas(community_id,created_at,id) where deleted_at is null and hidden_at is null;
create index if not exists tn_members_by_user on public.tn_members(user_id,community_id);

create or replace function teamnote_private.is_member(c text) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.tn_members m join teamnote_private.communities g on g.id=m.community_id where m.community_id=c and m.user_id=(select auth.uid()) and m.active and g.enabled);
$$;
alter table public.tn_members enable row level security;
alter table public.tn_ideas enable row level security;
alter table public.tn_reactions enable row level security;
revoke all on public.tn_members,public.tn_ideas,public.tn_reactions from public,anon,authenticated;
grant select on public.tn_members,public.tn_ideas,public.tn_reactions to authenticated;
do $$begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tn_members' and policyname='tn_members_read') then
  create policy tn_members_read on public.tn_members for select to authenticated using(teamnote_private.is_member(community_id));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tn_ideas' and policyname='tn_ideas_read') then
  create policy tn_ideas_read on public.tn_ideas for select to authenticated using(teamnote_private.is_member(community_id));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tn_reactions' and policyname='tn_reactions_read') then
  create policy tn_reactions_read on public.tn_reactions for select to authenticated using(teamnote_private.is_member(community_id));
 end if;
end$$;

-- All mutations lock one community row. The server decides order, time, expiry and counts.
create or replace function teamnote_private.lock_board(c text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not teamnote_private.is_member(c) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
 perform 1 from teamnote_private.communities where id=c and enabled for update;
 if not found then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
end$$;
create or replace function teamnote_private.maintain_board(c text) returns void language plpgsql security definer set search_path='' as $$
declare changed integer; total_changed integer := 0;
begin
 perform teamnote_private.lock_board(c);
 update public.tn_ideas set hidden_at=now(),hidden_reason='inactive'
 where community_id=c and hidden_at is null and deleted_at is null and last_reaction_at<=now()-interval '7 days';
 get diagnostics changed=row_count; total_changed:=changed;
 with ranked as (select id,row_number() over(order by created_at desc,id desc) as n from public.tn_ideas where community_id=c and hidden_at is null and deleted_at is null)
 update public.tn_ideas i set hidden_at=now(),hidden_reason='capacity' from ranked r where i.id=r.id and r.n>12;
 get diagnostics changed=row_count; total_changed:=total_changed+changed;
 if total_changed>0 then update teamnote_private.communities set revision=revision+1 where id=c; end if;
end$$;
create or replace function teamnote_private.get_board(c text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform teamnote_private.maintain_board(c);
 select jsonb_build_object('community',c,'revision',(select revision from teamnote_private.communities where id=c),'userId',(select auth.uid()),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name,'role',m.role_label,'roleType','member','building',m.building,'floor',m.floor,'unit',m.unit) order by m.created_at,m.user_id) from public.tn_members m where m.community_id=c and m.active),'[]'::jsonb),
 'ideas',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'text',i.body,'color','coral','authorId',i.author_id,'authorName',coalesce(m.display_name,'寮生'),'likes',i.likes,'likedUserIds',coalesce((select jsonb_agg(r.user_id order by r.user_id) from public.tn_reactions r where r.community_id=c and r.idea_id=i.id),'[]'::jsonb),'createdAt',i.created_at,'lastReactionAt',i.last_reaction_at,'activityTrackedFrom',i.created_at,'hiddenAt',i.hidden_at,'hiddenReason',i.hidden_reason) order by i.created_at,i.id) from public.tn_ideas i left join public.tn_members m on m.community_id=i.community_id and m.user_id=i.author_id where i.community_id=c and i.deleted_at is null),'[]'::jsonb)) into result;
 return result;
end$$;
create or replace function teamnote_private.validate_profile(p jsonb) returns void language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(p)<>'object' or char_length(btrim(coalesce(p->>'name',''))) not between 1 and 60
 or char_length(btrim(coalesce(p->>'role',''))) not between 1 and 60
 or coalesce(p->>'building','') not in ('rosemary','basil','turmeric','paprika')
 or coalesce(p->>'floor','') not in ('1','2','3','4')
 or char_length(btrim(coalesce(p->>'unit',''))) not between 1 and 60 then raise exception 'teamnote_invalid_profile' using errcode='22023'; end if;
end$$;
create or replace function teamnote_private.join_community(p_invite text,p_profile jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text; uid uuid := (select auth.uid());
begin
 if uid is null then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
 perform teamnote_private.validate_profile(p_profile);
 select id into c from teamnote_private.communities where enabled and invite_hash=extensions.digest(p_invite,'sha256') for update;
 if c is null then raise exception 'teamnote_invalid_invite' using errcode='42501'; end if;
 if exists(select 1 from public.tn_members where community_id=c and user_id=uid and not active) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
 insert into public.tn_members(community_id,user_id,display_name,role_label,building,floor,unit)
 values(c,uid,btrim(p_profile->>'name'),btrim(p_profile->>'role'),p_profile->>'building',(p_profile->>'floor')::smallint,btrim(p_profile->>'unit'))
 on conflict(community_id,user_id) do nothing;
 update teamnote_private.communities set revision=revision+1 where id=c;
 return teamnote_private.get_board(c);
end$$;
create or replace function teamnote_private.post_idea(c text,p_id uuid,p_text text) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.tn_ideas; uid uuid := (select auth.uid());
begin
 perform teamnote_private.maintain_board(c);
 if p_id is null or p_text is null or char_length(btrim(p_text)) not between 4 and 140 or btrim(p_text) ~ '^(.)\1+$' then raise exception 'teamnote_invalid_text' using errcode='22023'; end if;
 select * into existing from public.tn_ideas where id=p_id;
 if found then
  if existing.community_id<>c or existing.author_id<>uid or existing.body<>btrim(p_text) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
 else
  insert into public.tn_ideas(id,community_id,author_id,body) values(p_id,c,uid,btrim(p_text));
  update teamnote_private.communities set revision=revision+1 where id=c;
 end if;
 return teamnote_private.get_board(c);
end$$;
create or replace function teamnote_private.set_like(c text,p_id uuid,p_liked boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); added integer;
begin
 perform teamnote_private.maintain_board(c);
 if p_liked is null or not exists(select 1 from public.tn_ideas where community_id=c and id=p_id and hidden_at is null and deleted_at is null) then raise exception 'teamnote_unavailable' using errcode='22023'; end if;
 if p_liked then
  insert into public.tn_reactions(community_id,idea_id,user_id) values(c,p_id,uid) on conflict do nothing;
  get diagnostics added=row_count;
  if added>0 then update public.tn_ideas set last_reaction_at=now() where id=p_id; end if;
 else
  delete from public.tn_reactions where community_id=c and idea_id=p_id and user_id=uid;
 end if;
 update public.tn_ideas set likes=(select count(*) from public.tn_reactions where community_id=c and idea_id=p_id) where id=p_id;
 update teamnote_private.communities set revision=revision+1 where id=c;
 return teamnote_private.get_board(c);
end$$;
create or replace function teamnote_private.delete_idea(c text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform teamnote_private.lock_board(c);
 if not exists(select 1 from public.tn_ideas where community_id=c and id=p_id and author_id=(select auth.uid())) then raise exception 'teamnote_access_denied' using errcode='42501'; end if;
 update public.tn_ideas set deleted_at=coalesce(deleted_at,now()) where community_id=c and id=p_id;
 update teamnote_private.communities set revision=revision+1 where id=c;
 return teamnote_private.get_board(c);
end$$;
create or replace function teamnote_private.update_profile(c text,p_profile jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform teamnote_private.lock_board(c); perform teamnote_private.validate_profile(p_profile);
 update public.tn_members set display_name=btrim(p_profile->>'name'),role_label=btrim(p_profile->>'role'),building=p_profile->>'building',floor=(p_profile->>'floor')::smallint,unit=btrim(p_profile->>'unit') where community_id=c and user_id=(select auth.uid()) and active;
 update teamnote_private.communities set revision=revision+1 where id=c;
 return teamnote_private.get_board(c);
end$$;

-- Data API exposes only small invoker wrappers; privileged bodies stay in an unexposed schema.
create or replace function public.tn_get_board(p_community text) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.get_board(p_community)$$;
create or replace function public.tn_join_community(p_invite text,p_profile jsonb) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.join_community(p_invite,p_profile)$$;
create or replace function public.tn_post_idea(p_community text,p_id uuid,p_text text) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.post_idea(p_community,p_id,p_text)$$;
create or replace function public.tn_set_like(p_community text,p_id uuid,p_liked boolean) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.set_like(p_community,p_id,p_liked)$$;
create or replace function public.tn_delete_idea(p_community text,p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.delete_idea(p_community,p_id)$$;
create or replace function public.tn_update_profile(p_community text,p_profile jsonb) returns jsonb language sql security invoker set search_path='' as $$select teamnote_private.update_profile(p_community,p_profile)$$;
revoke all on all functions in schema teamnote_private from public,anon,authenticated;
grant execute on function teamnote_private.is_member(text),teamnote_private.get_board(text),teamnote_private.join_community(text,jsonb),teamnote_private.post_idea(text,uuid,text),teamnote_private.set_like(text,uuid,boolean),teamnote_private.delete_idea(text,uuid),teamnote_private.update_profile(text,jsonb) to authenticated;
revoke all on function public.tn_get_board(text),public.tn_join_community(text,jsonb),public.tn_post_idea(text,uuid,text),public.tn_set_like(text,uuid,boolean),public.tn_delete_idea(text,uuid),public.tn_update_profile(text,jsonb) from public,anon;
grant execute on function public.tn_get_board(text),public.tn_join_community(text,jsonb),public.tn_post_idea(text,uuid,text),public.tn_set_like(text,uuid,boolean),public.tn_delete_idea(text,uuid),public.tn_update_profile(text,jsonb) to authenticated;

do $$begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tn_ideas') then alter publication supabase_realtime add table public.tn_ideas; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tn_members') then alter publication supabase_realtime add table public.tn_members; end if;
end$$;
notify pgrst,'reload schema';
commit;
