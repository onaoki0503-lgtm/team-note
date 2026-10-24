-- Seed Team Note cloud from web demo (src/lib/db.ts + App.tsx INITIAL_BUBBLE_IDEAS).
-- Attributed to the first active h-village member. Safe to re-run (fixed UUIDs).

do $$
declare
  c text := 'h-village';
  uid uuid;
  -- projects (from INITIAL_PROJECTS)
  pj1 uuid := 'c1000001-0000-4000-8000-000000000001';
  pj2 uuid := 'c1000001-0000-4000-8000-000000000002';
  pj3 uuid := 'c1000001-0000-4000-8000-000000000003';
  pj4 uuid := 'c1000001-0000-4000-8000-000000000004';
  pj5 uuid := 'c1000001-0000-4000-8000-000000000005';
  -- ideas (from INITIAL_BUBBLE_IDEAS + extras from project titles)
  id1 uuid := 'd1000001-0000-4000-8000-000000000001';
  id2 uuid := 'd1000001-0000-4000-8000-000000000002';
  id3 uuid := 'd1000001-0000-4000-8000-000000000003';
  id4 uuid := 'd1000001-0000-4000-8000-000000000004';
  id5 uuid := 'd1000001-0000-4000-8000-000000000005';
  id6 uuid := 'd1000001-0000-4000-8000-000000000006';
begin
  select user_id into uid from public.tn_members
  where community_id = c and active order by created_at limit 1;
  if uid is null then
    raise exception 'Join h-village in the app once, then re-run this seed.';
  end if;

  -- Update your profile toward web default (岡本デモ風) without renaming if already set
  update public.tn_members set
    avatar_url = coalesce(nullif(avatar_url,''),
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'),
    bio = case when coalesce(bio,'') = '' then 'キッチン布巾改善PJ / 玄関共通化提案' else bio end
  where community_id = c and user_id = uid;

  -- Ideas board
  insert into public.tn_ideas(id, community_id, author_id, body, likes, created_at, last_reaction_at)
  values
    (id1, c, uid, '共有キッチン 布巾の衛生改善 使い捨てロール化', 4,
     timestamptz '2026-10-09 10:00+09', now() - interval '1 hour'),
    (id2, c, uid, '4棟エントランスのオートロック改善', 6,
     timestamptz '2026-10-09 11:00+09', now() - interval '2 hours'),
    (id3, c, uid, '中庭で映画上映会を開きたい', 3,
     timestamptz '2026-10-08 18:00+09', now() - interval '5 hours'),
    (id4, c, uid, 'クリスマス企画の全体予算を早めに決めたい', 2,
     now() - interval '8 hours', now() - interval '3 hours'),
    (id5, c, uid, '七夕・中庭夏祭りの音響ルールを残したい', 1,
     now() - interval '1 day', now() - interval '12 hours'),
    (id6, c, uid, '備品台帳をスマホからすぐ確認できるようにしたい', 4,
     now() - interval '2 days', now() - interval '6 hours')
  on conflict (id) do update set
    body = excluded.body,
    likes = excluded.likes,
    deleted_at = null,
    hidden_at = null,
    last_reaction_at = greatest(public.tn_ideas.last_reaction_at, excluded.last_reaction_at);

  -- Projects with PROPOSAL_JSON (web proposalDoc + bannerImage)
  insert into public.tn_projects(id, community_id, title, summary, status, owner_id, created_at, updated_at)
  values
  (pj1, c,
   '共有キッチン 布巾の衛生改善 使い捨てロール化',
   'PROPOSAL_JSON:' || jsonb_build_object(
     'projectType','operation',
     'title','共有キッチン 布巾の衛生改善 使い捨てロール化',
     'objective','共用キッチンの布巾の生乾き臭と衛生リスクを解消し、使い捨てペーパーロールディスペンサーを自治会費で試験導入する。',
     'proposalOverview','各フロアのキッチンに①使用済み回収BOX②清潔な食器拭きBOX 青 ③清潔な台拭きBOX ピンク の3つの専用ボックスを設置し、使ったら回収BOXへ入れる1回使い切り運用を徹底します。',
     'background','各ユニットの綿布巾は濡れたまま放置されがちで、衛生面での不満が多数報告されていた。',
     'recipient','西松地所株式会社 様 / 寮母・管理スタッフの皆様',
     'submissionDate','2026年10月',
     'budget','約 7,000 円 〜 10,000 円 自治会費充当',
     'schedule','2026-10-01 課題抽出 → 10-10 4棟配備',
     'nextAction','西松建設・大学窓口への修繕申請書の最終提出',
     'bannerImage','https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
     'category','衛生・備品',
     'ownerName','岡本 直樹'
   )::text,
   '進行中', uid, timestamptz '2026-10-01 09:00+09', now() - interval '1 day'),

  (pj2, c,
   '4棟エントランスのオートロック共通化 コモンズ相互利用',
   'PROPOSAL_JSON:' || jsonb_build_object(
     'projectType','operation',
     'title','4棟エントランスのオートロック共通化 コモンズ相互利用',
     'objective','各棟1Fコモンズは規約上全員利用可能なのに玄関で弾かれる既存システムの矛盾を、昼間限定の認証共通化で突破する。',
     'proposalOverview','昼間限定でカードキー権限を共通化し、コモンズ相互利用を可能にする。',
     'nextAction','セキュリティカードキーの追加登録費用の見積もり確認',
     'bannerImage','https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80',
     'category','施設・防犯',
     'budget','見積確認中',
     'ownerName','岡本 直樹'
   )::text,
   '進行中', uid, timestamptz '2026-10-03 09:00+09', now() - interval '2 days'),

  (pj3, c,
   '夜間中庭フェス企画 サイレントDJ ＆ デシベル測定実証',
   'PROPOSAL_JSON:' || jsonb_build_object(
     'projectType','event',
     'title','夜間中庭フェス企画 サイレントDJ ＆ デシベル測定実証',
     'objective','過去に騒音問題で却下された中庭イベントを、参加者全員ヘッドホン着用のサイレントフェス形式で再挑戦する。',
     'proposalOverview','外に漏れる音はゼロにするため、送信機とワイヤレスヘッドホンのみを使用。騒音計で40dB以下を実証。',
     'background','過去の中庭イベントは騒音クレームにより全面禁止となったが、交流の場を求める声は根強い。',
     'nextAction','Bluetoothヘッドホン手配と騒音シミュレーション計画書の作成',
     'bannerImage','https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
     'category','生活文化・交流',
     'budget','機材レンタル費 15,000円 参加費カンパおよび有志拠出',
     'ownerName','伊藤 雄吉'
   )::text,
   '進行中', uid, timestamptz '2026-10-05 09:00+09', now() - interval '12 hours'),

  (pj4, c,
   '2026年 H-Village クリスマス企画',
   'PROPOSAL_JSON:' || jsonb_build_object(
     'projectType','event',
     'title','2026年 H-Village クリスマス企画',
     'objective','寮全体のクリスマス交流イベント。全体予算管理・西松建設折衝。',
     'proposalOverview','夜間ステージ・ディナー班など班編成で運営する。',
     'bannerImage','https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80',
     'category','生活文化・交流',
     'schedule','2026-12',
     'ownerName','岡本 直樹'
   )::text,
   '進行中', uid, timestamptz '2026-10-01 12:00+09', now() - interval '3 days'),

  (pj5, c,
   '2026年 七夕・中庭夏祭り',
   'PROPOSAL_JSON:' || jsonb_build_object(
     'projectType','event',
     'title','2026年 七夕・中庭夏祭り',
     'objective','中庭音響・屋台ブース運営の夏祭り。',
     'proposalOverview','完了済みの実績ログとして残す。',
     'bannerImage','https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80',
     'category','生活文化・交流',
     'schedule','2026-07',
     'ownerName','岡本 直樹'
   )::text,
   '完了', uid, timestamptz '2026-07-01 09:00+09', timestamptz '2026-07-20 18:00+09')

  on conflict (id) do update set
    title = excluded.title,
    summary = excluded.summary,
    status = excluded.status,
    updated_at = now();

  insert into public.tn_project_members(community_id, project_id, user_id, role_label)
  values
    (c, pj1, uid, 'プロジェクトリーダー (PL)'),
    (c, pj2, uid, '統括リーダー (FL)'),
    (c, pj3, uid, 'スタッフ'),
    (c, pj4, uid, '統括PL'),
    (c, pj5, uid, 'PL')
  on conflict (project_id, user_id) do update set role_label = excluded.role_label;

  -- Work reports (INITIAL_WORK_REPORTS)
  insert into public.tn_work_reports(community_id, author_id, report_date, title, category, body, location_label, created_at)
  select c, uid, d.rd, d.title, d.cat, d.body, d.loc, d.created
  from (values
    ('2026-10-06'::date,
     '23:00定期見回り完了・コモンズ施錠確認',
     '役職固有業務',
     '消灯確認および窓の施錠チェック完了。特に問題なし。残留者2名に挨拶し退室確認。',
     'ローズマリー棟 1F コモンズスペース',
     timestamptz '2026-10-06 01:15+09'),
    ('2026-10-05'::date,
     '2F共用キッチン換気扇の異音報告',
     'トラブル対応',
     '換気扇強運転時にカタカタと異音あり。フィルター清掃では解消せず、業者点検の手配を推奨します。',
     'パプリカ棟 2F キッチンスペース',
     timestamptz '2026-10-05 18:30+09'),
    ((timezone('Asia/Tokyo', now()))::date,
     '中庭植栽の水やり・枯れミント撤去',
     '共通業務',
     'バジル側ハーブ区画へ散水。枯れかけのミントを撤去。',
     'バジル棟 中庭側',
     now() - interval '4 hours')
  ) as d(rd, title, cat, body, loc, created)
  where not exists (
    select 1 from public.tn_work_reports r
    where r.community_id = c and r.title = d.title and r.report_date = d.rd
  );

  -- Inventory samples (demo shelf)
  insert into public.tn_inventory_items(community_id, name, location, asset_code, quantity, unit, status, note, updated_by, updated_at)
  select c, d.name, d.loc, d.code, d.qty, d.unit, d.status, d.note, uid, now()
  from (values
    ('折りたたみテーブル','ローズマリー倉庫','BI-0001',6::numeric,'台','良好','イベント用'),
    ('延長コード 10m','パプリカ倉庫','BI-0002',4::numeric,'本','良好',''),
    ('救急箱','各棟エントランス','BI-0003',4::numeric,'箱','要確認','消毒液切れ気味'),
    ('Bluetoothスピーカー','ターメリック共有棚','BI-0004',1::numeric,'台','貸出中','サイレントフェス検討用'),
    ('マグネットディスペンサー試作','ローズマリー 3Fキッチン','BI-0005',1::numeric,'台','良好','布巾PJトライアル')
  ) as d(name, loc, code, qty, unit, status, note)
  where not exists (
    select 1 from public.tn_inventory_items x
    where x.community_id = c and x.asset_code = d.code
  );

  -- Archives (INITIAL_ARCHIVES)
  insert into public.tn_archive_docs(community_id, title, category, storage_path, size_bytes, uploaded_by, updated_at)
  select c, d.title, d.cat, d.path, d.sz, uid, d.upd
  from (values
    ('SFC Hヴィレッジ 入寮契約書 ＆ ハウス規約全文2026','規約','demo/house-rules-2026.pdf',1800000::bigint, date '2026-04-01'),
    ('備品購入 ＆ 施設修繕・改善 申請書フォーマット Word正本','申請書','demo/request-form.docx',240000::bigint, date '2026-09-15'),
    ('【惜敗分析】2025年中庭BBQ大会の騒音クレーム ＆ 却下理由の全記録','惜敗ログ','demo/bbq-lessons-2025.pdf',520000::bigint, date '2025-11-20'),
    ('【規約抜け道】キッチン換気扇フィルター清掃時の大学予算執行スキーム','規約','demo/filter-budget-scheme.pdf',310000::bigint, date '2026-05-10'),
    ('共用キッチン衛生改善_3ボックス方式導入のご提案_西松地所提出版.pdf','申請書','demo/fukin-proposal-nishimatsu.pdf',1420500::bigint, date '2026-10-04')
  ) as d(title, cat, path, sz, upd)
  where not exists (
    select 1 from public.tn_archive_docs a where a.community_id = c and a.title = d.title
  );

  update teamnote_private.communities set revision = revision + 1 where id = c;
  raise notice 'Web demo seed applied for member %', uid;
end $$;
