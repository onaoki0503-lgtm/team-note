-- Run as postgres in the SQL Editor. All fixture changes, including role assignments, roll back.
begin;
select set_config('teamnote.test_uid',(select user_id::text from public.tn_members where community_id='h-village' and active order by created_at limit 1),true);
do $$ begin
  assert not has_function_privilege('anon','public.tn_submit_monthly_report(text,date,text)','EXECUTE'),'anon submit';
  assert not has_function_privilege('anon','public.tn_management_monthly_reports(text,date)','EXECUTE'),'anon read';
  assert not has_table_privilege('authenticated','teamnote_private.monthly_reports','SELECT'),'direct read';
  assert not has_table_privilege('authenticated','teamnote_private.monthly_reports','INSERT'),'direct write';
  assert (select relrowsecurity from pg_class where oid='teamnote_private.monthly_reports'::regclass),'RLS disabled';
end $$;
select set_config('request.jwt.claim.sub',current_setting('teamnote.test_uid'),true);
set local role authenticated;
do $$ declare first_id text; result jsonb;
begin
  begin perform public.tn_management_monthly_reports('h-village','2000-01-01'); raise exception 'ordinary read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_submit_monthly_report('other-community','2000-01-01','test'); raise exception 'cross submission allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_submit_monthly_report('h-village','2000-01-02','test'); raise exception 'invalid month allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.tn_submit_monthly_report('h-village','2000-01-01','  '); raise exception 'empty allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.tn_submit_monthly_report('h-village','2100-12-01','test'); raise exception 'future allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.tn_submit_monthly_report('h-village','2000-01-01',repeat('x',50001)); raise exception 'oversize allowed'; exception when invalid_parameter_value then null; end;
  result:=public.tn_submit_monthly_report('h-village','2000-01-01','monthly test original');
  first_id:=result->>'id'; assert first_id is not null and result->>'month'='2000-01','submit response';
  result:=public.tn_submit_monthly_report('h-village','2000-01-01','monthly test correction');
  assert result->>'id'=first_id,'duplicate monthly document';
end $$;
reset role;
insert into teamnote_private.management_reviewers(community_id,user_id,display_name) values('h-village',current_setting('teamnote.test_uid')::uuid,'Rollback test') on conflict(community_id,user_id) do update set active=true;
set local role authenticated;
do $$ declare rows jsonb; doc jsonb;
begin
  rows:=public.tn_management_monthly_reports('h-village','2000-01-01');
  select value into doc from jsonb_array_elements(rows) where value->'author'->>'id'=current_setting('teamnote.test_uid');
  assert doc->>'body'='monthly test correction','submitted content';
  assert (select count(*) from jsonb_array_elements(rows) where value->'author'->>'id'=current_setting('teamnote.test_uid'))=1,'duplicate author/month';
  assert not(doc?'review') and not(doc?'category'),'daily metadata leaked';
  assert jsonb_array_length(public.tn_management_monthly_reports('h-village','2000-02-01'))=0,'unsubmitted daily logs included';
  begin perform public.tn_management_monthly_reports('other-community','2000-01-01'); raise exception 'cross read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.tn_members set active=false where community_id='h-village' and user_id=current_setting('teamnote.test_uid')::uuid;
update teamnote_private.management_reviewers set active=false where community_id='h-village' and user_id=current_setting('teamnote.test_uid')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.tn_submit_monthly_report('h-village','2000-01-01','test'); raise exception 'inactive member allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_management_monthly_reports('h-village','2000-01-01'); raise exception 'revoked manager allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.tn_submit_monthly_report('h-village','2000-01-01','test'); raise exception 'null user allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'monthly report security checks passed; all fixtures rolled back' as result;
