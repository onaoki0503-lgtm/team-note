// ==============================================================================
// チームノート (Team Note) - データベースサービス層 (db.ts)
// Supabase クラウド ＆ LocalStorage ハイブリッド永続化
// ==============================================================================

import { supabase, isSupabaseConfigured, checkSupabaseConnection } from './supabase'

export { isSupabaseConfigured, checkSupabaseConnection }

export interface ResidentRecord {
  id: string
  name: string
  avatar: string
  building: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
  floor: number
  unit: string
  role: string
  roleType: 'fl' | 'hl' | 'member'
  email: string
  memo: string
}

export interface ProjectRecord {
  id: string
  title: string
  category: string
  status: string
  progress: number
  owner: string
  nextAction: string
  proposalsCount: number
  createdAt: string
  description?: string
}

export interface WorkReportRecord {
  id: string
  type: 'patrol' | 'cleaning' | 'facility' | 'noise'
  title: string
  location: string
  content: string
  status: '報告完了' | '要対応' | '対応完了'
  reporter: string
  submittedAt: string
}

export interface ArchiveDocRecord {
  id: string
  title: string
  category: '規約' | '申請書' | '惜敗ログ' | '議事録'
  updatedAt: string
  size: string
  url?: string
}

const STORAGE_KEYS = {
  RESIDENTS: 'tn_db_residents',
  PROJECTS: 'tn_db_projects',
  WORK_REPORTS: 'tn_db_work_reports',
  ARCHIVES: 'tn_db_archives'
}

// 初期デフォルトデータ
export const INITIAL_RESIDENTS: ResidentRecord[] = [
  {
    id: 'r1',
    name: '岡本 直樹',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 3,
    unit: 'Unit 301 - A室',
    role: '統括リーダー (FL)',
    roleType: 'fl',
    email: 'okamoto@intakingresources.com',
    memo: 'キッチン布巾改善PJ / 玄関共通化提案'
  },
  {
    id: 'r2',
    name: '伊藤 雄吉',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 3,
    unit: 'Unit 301 - B室',
    role: '有志メンバー',
    roleType: 'member',
    email: 'ito.y@intakingresources.com',
    memo: '夜間イベント企画・サイレントフェス検討'
  },
  {
    id: 'r3',
    name: '佐藤 健太',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 2,
    unit: 'Unit 202 - A室',
    role: 'サブリーダー',
    roleType: 'hl',
    email: 'sato.k@sfc.keio.ac.jp',
    memo: '玄関美化・靴箱プロトタイプ担当'
  },
  {
    id: 'r4',
    name: '生熊 翔太',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    building: 'paprika',
    floor: 3,
    unit: 'Unit 303 - A室',
    role: 'パプリカFL',
    roleType: 'fl',
    email: 'ikuma.s@sfc.keio.ac.jp',
    memo: '布巾改善の申請書連携・西松窓口'
  },
  {
    id: 'r5',
    name: '宗司 涼介',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    building: 'paprika',
    floor: 2,
    unit: 'Unit 201 - A室',
    role: 'ハウスリーダー (HL)',
    roleType: 'hl',
    email: 'soji.r@sfc.keio.ac.jp',
    memo: '棟間連携・全体自治会担当'
  },
  {
    id: 'r6',
    name: '山田 大地',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    building: 'turmeric',
    floor: 3,
    unit: 'Unit 302 - B室',
    role: 'ターメリックFL',
    roleType: 'fl',
    email: 'yamada.d@sfc.keio.ac.jp',
    memo: 'BBQ大会企画・機材管理'
  },
  {
    id: 'r7',
    name: '渡辺 陽奈',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    building: 'basil',
    floor: 2,
    unit: 'Unit 203 - A室',
    role: 'バジルFL',
    roleType: 'fl',
    email: 'watanabe.h@sfc.keio.ac.jp',
    memo: '中庭植栽・ハーブ菜園PJ'
  }
]

export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: 'pj-1',
    title: '共有キッチン 布巾の衛生改善（使い捨てロール化）',
    category: '衛生・備品',
    status: '進行中',
    progress: 75,
    owner: '岡本 直樹',
    nextAction: '西松建設・大学窓口への修繕申請書の最終提出',
    proposalsCount: 3,
    createdAt: '2026-10-01'
  },
  {
    id: 'pj-2',
    title: '4棟エントランスのオートロック共通化（コモンズ相互利用）',
    category: '施設・防犯',
    status: '進行中',
    progress: 40,
    owner: '岡本 直樹',
    nextAction: 'セキュリティカードキーの追加登録費用の見積もり確認',
    proposalsCount: 2,
    createdAt: '2026-10-03'
  },
  {
    id: 'pj-3',
    title: '夜間中庭フェス企画（サイレントDJ ＆ デシベル測定実証）',
    category: '生活文化・交流',
    status: '進行中',
    progress: 20,
    owner: '伊藤 雄吉',
    nextAction: 'Bluetoothヘッドホン手配と騒音シミュレーション計画書の作成',
    proposalsCount: 1,
    createdAt: '2026-10-05'
  }
]

export const INITIAL_WORK_REPORTS: WorkReportRecord[] = [
  {
    id: 'wr-1',
    type: 'patrol',
    title: '23:00定期見回り完了・コモンズ施錠確認',
    location: 'ローズマリー棟 1F コモンズスペース',
    content: '消灯確認および窓の施錠チェック完了。特に問題なし。残留者2名に挨拶し退室確認。',
    status: '報告完了',
    reporter: '岡本 直樹',
    submittedAt: '2026-10-06 01:15'
  },
  {
    id: 'wr-2',
    type: 'facility',
    title: '2F共用キッチン換気扇の異音報告',
    location: 'パプリカ棟 2F キッチンスペース',
    content: '換気扇「強」運転時にカタカタと異音あり。フィルター清掃では解消せず、業者点検の手配を推奨します。',
    status: '要対応',
    reporter: '佐藤 健太',
    submittedAt: '2026-10-05 18:30'
  }
]

export const INITIAL_ARCHIVES: ArchiveDocRecord[] = [
  {
    id: 'a1',
    title: 'SFC Hヴィレッジ 入寮契約書 ＆ ハウス規約全文2026',
    category: '規約',
    updatedAt: '2026-04-01',
    size: '1.8 MB'
  },
  {
    id: 'a2',
    title: '備品購入 ＆ 施設修繕・改善 申請書フォーマット (Word正本)',
    category: '申請書',
    updatedAt: '2026-09-15',
    size: '240 KB'
  },
  {
    id: 'a3',
    title: '【惜敗分析】2025年中庭BBQ大会の騒音クレーム ＆ 却下理由の全記録',
    category: '惜敗ログ',
    updatedAt: '2025-11-20',
    size: '520 KB'
  },
  {
    id: 'a4',
    title: '【規約抜け道】キッチン換気扇フィルター清掃時の大学予算執行スキーム',
    category: '規約',
    updatedAt: '2026-05-10',
    size: '310 KB'
  }
]

// データベースサービスクラス
export const dbService = {
  // --- 住人名簿 ---
  async getResidents(): Promise<ResidentRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase as any).from('residents').select('*').order('building')
        if (!error && data && data.length > 0) {
          return data.map((r: any) => ({
            id: r.id,
            name: r.name,
            avatar: r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            building: r.building,
            floor: r.floor,
            unit: r.unit,
            role: r.role,
            roleType: r.role_type,
            email: r.email || '',
            memo: r.memo || ''
          }))
        }
      } catch (e) {
        console.warn('Supabase getResidents fallback to local:', e)
      }
    }
    const local = localStorage.getItem(STORAGE_KEYS.RESIDENTS)
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // ignore
      }
    }
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(INITIAL_RESIDENTS))
    return INITIAL_RESIDENTS
  },

  // --- プロジェクト ---
  async getProjects(): Promise<ProjectRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase as any).from('projects').select('*').order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            status: p.status,
            progress: p.progress,
            owner: p.owner_name,
            nextAction: p.next_action,
            proposalsCount: p.proposals_count,
            createdAt: p.created_at ? p.created_at.slice(0, 10) : '2026-10-06',
            description: p.description || ''
          }))
        }
      } catch (e) {
        console.warn('Supabase getProjects fallback to local:', e)
      }
    }
    const local = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // ignore
      }
    }
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS))
    return INITIAL_PROJECTS
  },

  async addProject(project: Omit<ProjectRecord, 'id' | 'createdAt'>): Promise<ProjectRecord> {
    const newProject: ProjectRecord = {
      ...project,
      id: `pj-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    }

    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('projects').insert({
          title: newProject.title,
          category: newProject.category,
          status: newProject.status,
          progress: newProject.progress,
          owner_name: newProject.owner,
          next_action: newProject.nextAction,
          proposals_count: newProject.proposalsCount,
          description: newProject.description
        })
      } catch (e) {
        console.warn('Supabase addProject failed, saved locally:', e)
      }
    }

    const current = await this.getProjects()
    const updated = [newProject, ...current]
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return newProject
  },

  async updateProjectProgress(id: string, progress: number): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('projects').update({ progress }).eq('id', id)
      } catch (e) {
        console.warn('Supabase update failed:', e)
      }
    }
    const current = await this.getProjects()
    const updated = current.map((p) => (p.id === id ? { ...p, progress } : p))
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- 業務報告書 ---
  async getWorkReports(): Promise<WorkReportRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase as any).from('work_reports').select('*').order('submitted_at', { ascending: false })
        if (!error && data && data.length > 0) {
          return data.map((w: any) => ({
            id: w.id,
            type: w.report_type,
            title: w.title,
            location: w.location,
            content: w.content,
            status: w.status as '報告完了' | '要対応' | '対応完了',
            reporter: w.reporter_name,
            submittedAt: w.submitted_at.replace('T', ' ').slice(0, 16)
          }))
        }
      } catch (e) {
        console.warn('Supabase getWorkReports fallback to local:', e)
      }
    }
    const local = localStorage.getItem(STORAGE_KEYS.WORK_REPORTS)
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // ignore
      }
    }
    localStorage.setItem(STORAGE_KEYS.WORK_REPORTS, JSON.stringify(INITIAL_WORK_REPORTS))
    return INITIAL_WORK_REPORTS
  },

  async addWorkReport(report: Omit<WorkReportRecord, 'id' | 'submittedAt'>): Promise<WorkReportRecord> {
    const now = new Date()
    const submittedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const newReport: WorkReportRecord = {
      ...report,
      id: `wr-${Date.now()}`,
      submittedAt
    }

    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('work_reports').insert({
          report_type: newReport.type,
          title: newReport.title,
          location: newReport.location,
          content: newReport.content,
          status: newReport.status,
          reporter_name: newReport.reporter
        })
      } catch (e) {
        console.warn('Supabase addWorkReport failed, saved locally:', e)
      }
    }

    const current = await this.getWorkReports()
    const updated = [newReport, ...current]
    localStorage.setItem(STORAGE_KEYS.WORK_REPORTS, JSON.stringify(updated))
    return newReport
  },

  // --- 倉庫資料 ---
  async getArchiveDocs(): Promise<ArchiveDocRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await (supabase as any).from('team_assets').select('*').order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          return data.map((a: any) => ({
            id: a.id,
            title: a.title,
            category: a.category as '規約' | '申請書' | '惜敗ログ' | '議事録',
            updatedAt: a.updated_at ? a.updated_at.slice(0, 10) : '2026-10-06',
            size: a.file_size || '1.0 MB',
            url: a.file_url || undefined
          }))
        }
      } catch (e) {
        console.warn('Supabase getArchiveDocs fallback to local:', e)
      }
    }
    const local = localStorage.getItem(STORAGE_KEYS.ARCHIVES)
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // ignore
      }
    }
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(INITIAL_ARCHIVES))
    return INITIAL_ARCHIVES
  }
}
