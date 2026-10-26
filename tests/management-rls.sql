-- Run as postgres in SQL Editor AFTER the management migration.
-- Uses one existing member only inside a transaction; ALL test changes are rolled back.
begin;
select set_config('teamnote.test_uid',(select user_id::text from public.tn_members where community_id='h-village' and active order by created_at limit 1),true);
select set_config('teamnote.test_report_id',gen_random_uuid()::text,true);
select set_config('teamnote.test_path','h-village/reports/management-rollback-test.pdf',true);
insert into public.tn_work_reports(id,community_id,author_id,report_date,title,category,body,attachments)
values(current_setting('teamnote.test_report_id')::uuid,'h-village',current_setting('teamnote.test_uid')::uuid,current_date,'管理画面の権限検証（ロールバック）','役職固有業務','検証用。保存されません。',jsonb_build_array(jsonb_build_object('path',current_setting('teamnote.test_path'),'label','test.pdf','kind','file')));
do $$ begin
  if has_function_privilege('anon','public.tn_management_context(text)','EXECUTE') then raise exception 'anon_execute_granted'; end if;
  if has_table_privilege('authenticated','teamnote_private.management_reviewers','INSERT') then raise exception 'self_assignment_possible'; end if;
  if has_table_privilege('authenticated','teamnote_private.report_reviews','UPDATE') then raise exception 'direct_review_write_possible'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('teamnote.test_uid'),true);
set local role authenticated;
do $$ begin
  begin perform public.tn_management_context('h-village'); raise exception 'ordinary_context_allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_management_reports('h-village',current_date,current_date+1); raise exception 'ordinary_reports_allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_management_set_review('h-village',current_setting('teamnote.test_report_id')::uuid,true,0); raise exception 'ordinary_review_allowed'; exception when insufficient_privilege then null; end;
  if teamnote_private.management_can_read_file(current_setting('teamnote.test_path')) then raise exception 'ordinary_file_allowed'; end if;
end $$;
reset role;
insert into teamnote_private.management_reviewers(community_id,user_id,display_name,organization)
values('h-village',current_setting('teamnote.test_uid')::uuid,'ロールバック検証','検証') on conflict(community_id,user_id) do update set active=true;
set local role authenticated;
do $$ declare ctx jsonb; rows jsonb; result jsonb;
begin
  ctx:=public.tn_management_context('h-village');
  if ctx->>'userId'<>current_setting('teamnote.test_uid') then raise exception 'wrong_context'; end if;
  rows:=public.tn_management_reports('h-village',current_date,current_date+1);
  if not exists(select 1 from jsonb_array_elements(rows) r where r->>'id'=current_setting('teamnote.test_report_id')) then raise exception 'manager_report_missing'; end if;
  begin perform public.tn_management_context('another-community'); raise exception 'cross_community_allowed'; exception when insufficient_privilege then null; end;
  begin perform public.tn_management_reports('h-village',current_date,current_date); raise exception 'invalid_period_allowed'; exception when invalid_parameter_value then null; end;
  result:=public.tn_management_set_review('h-village',current_setting('teamnote.test_report_id')::uuid,true,0);
  if (result->>'version')::int<>1 or not (result->>'reviewed')::boolean then raise exception 'review_not_saved'; end if;
  begin perform public.tn_management_set_review('h-village',current_setting('teamnote.test_report_id')::uuid,true,0); raise exception 'stale_review_overwrote'; exception when serialization_failure then null; end;
  result:=public.tn_management_set_review('h-village',current_setting('teamnote.test_report_id')::uuid,false,1);
  if (result->>'version')::int<>2 or (result->>'reviewed')::boolean then raise exception 'undo_review_failed'; end if;
  begin perform public.tn_management_set_review('h-village',gen_random_uuid(),true,0); raise exception 'unknown_report_allowed'; exception when no_data_found then null; end;
  if not teamnote_private.management_can_read_file(current_setting('teamnote.test_path')) then raise exception 'attached_file_denied'; end if;
  if teamnote_private.management_can_read_file('another-community/reports/secret.pdf') then raise exception 'cross_community_file_allowed'; end if;
  if teamnote_private.management_can_read_file('h-village/archives/secret.pdf') then raise exception 'archive_file_allowed'; end if;
  if teamnote_private.management_can_read_file('h-village/reports/unattached.pdf') then raise exception 'unattached_file_allowed'; end if;
  begin insert into teamnote_private.management_reviewers(community_id,user_id,display_name) values('h-village',(select auth.uid()),'自称管理者'); raise exception 'self_assignment_allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update teamnote_private.management_reviewers set active=false where community_id='h-village' and user_id=current_setting('teamnote.test_uid')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.tn_management_context('h-village'); raise exception 'revoked_manager_allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.tn_management_context('h-village'); raise exception 'missing_user_allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
