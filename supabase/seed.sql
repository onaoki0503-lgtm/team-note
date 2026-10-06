-- ==============================================================================
-- チームノート (Team Note) - 初期シードデータ (seed.sql)
-- SFC Hヴィレッジ 自治運営モデル
-- ==============================================================================

-- 1. 組織
INSERT INTO organisations (id, name, slug, plan, description)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '慶應義塾大学 SFC Hヴィレッジ自治会',
    'sfc-h-village',
    'STANDARD',
    '学生自律運営型国際寮（ローズマリー、バジル、ターメリック、パプリカの4棟構成）'
) ON CONFLICT (slug) DO NOTHING;

-- 2. 棟・階別ユニット住人台帳 (residents)
INSERT INTO residents (id, organisation_id, name, avatar_url, building, floor, unit, role, role_type, email, memo) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '岡本 直樹',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'rosemary',
    3,
    'Unit 301 - A室',
    '統括リーダー (FL)',
    'fl',
    'okamoto@intakingresources.com',
    'キッチン布巾改善PJ / 玄関共通化提案'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    '伊藤 雄吉',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'rosemary',
    3,
    'Unit 301 - B室',
    '有志メンバー',
    'member',
    'ito.y@intakingresources.com',
    '夜間イベント企画・サイレントフェス検討'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    '佐藤 健太',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'rosemary',
    2,
    'Unit 202 - A室',
    'サブリーダー',
    'hl',
    'sato.k@sfc.keio.ac.jp',
    '玄関美化・靴箱プロトタイプ担当'
),
(
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    '生熊 翔太',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    'paprika',
    3,
    'Unit 303 - A室',
    'パプリカFL',
    'fl',
    'ikuma.s@sfc.keio.ac.jp',
    '布巾改善の申請書連携・西松窓口'
),
(
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    '宗司 涼介',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    'paprika',
    2,
    'Unit 201 - A室',
    'ハウスリーダー (HL)',
    'hl',
    'soji.r@sfc.keio.ac.jp',
    '棟間連携・全体自治会担当'
),
(
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    '山田 大地',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    'turmeric',
    3,
    'Unit 302 - B室',
    'ターメリックFL',
    'fl',
    'yamada.d@sfc.keio.ac.jp',
    'BBQ大会企画・機材管理'
),
(
    'b0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    '渡辺 陽奈',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    'basil',
    2,
    'Unit 203 - A室',
    'バジルFL',
    'fl',
    'watanabe.h@sfc.keio.ac.jp',
    '中庭植栽・ハーブ菜園PJ'
) ON CONFLICT (id) DO NOTHING;

-- 3. 進行中プロジェクト (projects)
INSERT INTO projects (id, organisation_id, title, category, status, progress, owner_name, next_action, proposals_count, description) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '共有キッチン 布巾の衛生改善（使い捨てロール化）',
    '衛生・備品',
    '進行中',
    75,
    '岡本 直樹',
    '西松建設・大学窓口への修繕申請書の最終提出',
    3,
    '共用キッチンの布巾が不衛生になりやすいため、コスト試算と自治会費での使い捨てロールペーパー設置を推進。'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    '4棟エントランスのオートロック共通化（コモンズ相互利用）',
    '施設・防犯',
    '進行中',
    40,
    '岡本 直樹',
    'セキュリティカードキーの追加登録費用の見積もり確認',
    2,
    '各棟1階のコモンズは誰でも利用可能な規約である一方、玄関が別棟のキーで入れない矛盾をシステム改修で突破する。'
),
(
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    '夜間中庭フェス企画（サイレントDJ ＆ デシベル測定実証）',
    '生活文化・交流',
    '進行中',
    20,
    '伊藤 雄吉',
    'Bluetoothヘッドホン手配と騒音シミュレーション計画書の作成',
    1,
    '過去に騒音で却下された中庭イベントを、サイレントフェス形式（完全ヘッドホン化）で再挑戦するプロジェクト。'
) ON CONFLICT (id) DO NOTHING;

-- 4. 業務報告書 (work_reports)
INSERT INTO work_reports (id, organisation_id, report_type, title, location, content, status, reporter_name, submitted_at) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'patrol',
    '23:00定期見回り完了・コモンズ施錠確認',
    'ローズマリー棟 1F コモンズスペース',
    '消灯確認および窓の施錠チェック完了。特に問題なし。残留者2名に挨拶し退室確認。',
    '報告完了',
    '岡本 直樹',
    timezone('utc'::text, now() - INTERVAL '2 hours')
),
(
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'facility',
    '2F共用キッチン換気扇の異音報告',
    'パプリカ棟 2F キッチンスペース',
    '換気扇「強」運転時にカタカタと異音あり。フィルター清掃では解消せず、業者点検の手配を推奨します。',
    '要対応',
    '佐藤 健太',
    timezone('utc'::text, now() - INTERVAL '1 day')
) ON CONFLICT (id) DO NOTHING;

-- 5. 倉庫・公式資産 (team_assets)
INSERT INTO team_assets (id, organisation_id, visibility, category, title, description, fiscal_year, file_size, file_url) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'PUBLIC',
    '規約',
    'SFC Hヴィレッジ 入寮契約書 ＆ ハウス規約全文2026',
    '入寮時の公式契約書原本。各棟のコモンズ利用規定および鍵の利用権限条項を含む。',
    2026,
    '1.8 MB',
    'https://example.com/assets/terms_2026.pdf'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'PUBLIC',
    '申請書',
    '備品購入 ＆ 施設修繕・改善 申請書フォーマット (Word正本)',
    '西松建設および大学施設課に提出する公式申請書の最新テンプレート。',
    2026,
    '240 KB',
    'https://example.com/assets/request_form.docx'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'ADMIN_ONLY',
    '惜敗ログ',
    '【惜敗分析】2025年中庭BBQ大会の騒音クレーム ＆ 却下理由の全記録',
    '前年度に近隣住民より騒音指摘を受けた要因分析と、今後の対策案まとめ。',
    2025,
    '520 KB',
    'https://example.com/assets/past_failures_bbq.pdf'
) ON CONFLICT (id) DO NOTHING;
