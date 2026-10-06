-- ==============================================================================
-- 摂取資源株式会社 / チーム運営クラウド事業 (Team Cloud OS)
-- プロダクト: チームノート (Team Note) - 組織永続化 ＆ 自律運営データベース
-- 対象: Supabase / PostgreSQL 15+
-- ==============================================================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 組織マスタテーブル (organisations)
-- 例: SFC Hヴィレッジ自治会、日本クリケット協会、各種自治会・管理組合
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'STANDARD', -- 'FREE', 'STANDARD', 'ENTERPRISE'
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. プロファイル・ユーザーテーブル (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role_type VARCHAR(50) DEFAULT 'member', -- 'admin', 'fl', 'hl', 'member'
    building VARCHAR(50),                   -- 'rosemary', 'basil', 'turmeric', 'paprika'
    unit VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 棟・階別ユニット住人台帳 (residents)
-- 毎年・毎期入れ替わる住人迷子を解消する現場名簿
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    building VARCHAR(50) NOT NULL, -- 'rosemary', 'basil', 'turmeric', 'paprika'
    floor INTEGER NOT NULL CHECK (floor >= 1 AND floor <= 10),
    unit VARCHAR(100) NOT NULL,    -- 例: 'Unit 301 - A室'
    role VARCHAR(100) NOT NULL,    -- 例: '統括リーダー (FL)', 'サブリーダー', '一般寮生'
    role_type VARCHAR(50) NOT NULL DEFAULT 'member', -- 'fl', 'hl', 'member'
    email VARCHAR(255),
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 進行中プロジェクトテーブル (projects)
-- 「イータを変える」で発起されたアイデア・企画書が自動登録される
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- '衛生・備品', '施設・防犯', '生活文化・交流', '自治運営'
    status VARCHAR(50) NOT NULL DEFAULT '進行中', -- '進行中', '承認待ち', '完了', '保留'
    progress INTEGER NOT NULL DEFAULT 10 CHECK (progress >= 0 AND progress <= 100),
    owner_name VARCHAR(100) NOT NULL,
    next_action TEXT NOT NULL,
    proposals_count INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 思考マッピングノード (project_nodes)
-- 議事録・アイデア・写真からポコポコ展開されるノード
CREATE TABLE IF NOT EXISTS project_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL, -- 'core' (発起), 'rule' (規約), 'solution' (解決策), 'action' (行動), 'media' (写真)
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'blocked'
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 業務報告書テーブル (work_reports)
-- 「はたらく」タブから提出される見回り・点検・清掃レポート
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'patrol' (夜間見回り), 'cleaning' (キッチン・ゴミ清掃), 'facility' (設備・備品点検), 'noise' (騒音・生活環境)
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '報告完了', -- '報告完了', '要対応', '対応完了'
    reporter_name VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. 倉庫・公式資産テーブル (team_assets)
-- 過去の規約・申請書原本・惜敗ログ（Alan提出用仕様準拠）
CREATE TABLE IF NOT EXISTS team_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'ADMIN_ONLY')),
    category VARCHAR(50) NOT NULL, -- '規約', '申請書', '惜敗ログ', '議事録'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fiscal_year INTEGER DEFAULT 2026,
    file_size VARCHAR(50),
    file_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. 添付ファイルテーブル (team_asset_files)
CREATE TABLE IF NOT EXISTS team_asset_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES team_assets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ラクスル型受発注メタデータテーブル (team_order_meta)
-- 過去の発注データ・見積もりをそのまま再利用
CREATE TABLE IF NOT EXISTS team_order_meta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES team_assets(id) ON DELETE CASCADE,
    vendor_name VARCHAR(100),
    item_name VARCHAR(100),
    quantity INTEGER,
    unit_price NUMERIC(10, 2),
    total_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_residents_bldg_floor ON residents(building, floor);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_work_reports_submitted ON work_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_assets_category ON team_assets(category);
CREATE INDEX IF NOT EXISTS idx_project_nodes_proj ON project_nodes(project_id);

-- 更新日時自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの適用
CREATE TRIGGER tr_organisations_updated_at BEFORE UPDATE ON organisations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_residents_updated_at BEFORE UPDATE ON residents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_team_assets_updated_at BEFORE UPDATE ON team_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 有効化
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_asset_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_order_meta ENABLE ROW LEVEL SECURITY;

-- 開発・プロトタイプ用パブリック閲覧・書き込みポリシー (Supabase Anon Key 用)
CREATE POLICY "Public Read for Organisations" ON organisations FOR SELECT USING (true);
CREATE POLICY "Public Read for Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Read/Write for Residents" ON residents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Project Nodes" ON project_nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Work Reports" ON work_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Team Assets" ON team_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Team Asset Files" ON team_asset_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write for Team Order Meta" ON team_order_meta FOR ALL USING (true) WITH CHECK (true);
