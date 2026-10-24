-- Soften profile rules: name / unit / dorm fields optional (defaults on write).
-- Apply on the Team Note restaurant project after teamnote_extend_v2.sql.

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
