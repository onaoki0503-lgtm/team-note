-- Additive: publish tn_reactions for live hearts across devices.
-- Safe to re-run. Does not change restaurant tables, Auth, or RLS policies.
begin;
do $$begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tn_reactions') then
  alter publication supabase_realtime add table public.tn_reactions;
 end if;
end$$;
commit;
