// ==============================================================================
// チームノート (Team Note) - データベースサービス層 (db.ts)
// Supabase クラウド ＆ LocalStorage ハイブリッド永続化
// H生ログイン・スタッフ参加・プロジェクト検索・台帳管理
// ==============================================================================

import { supabase, isSupabaseConfigured, checkSupabaseConnection } from './supabase'

export { isSupabaseConfigured, checkSupabaseConnection }

export interface EventRoleCareer {
  eventId: string
  eventTitle: string
  role: 'PL' | 'GL' | 'メンバー' | 'EA'
  groupName?: string // イベント班, 装飾班, ディナー班 など
  yearMonth: string // 例: 2026-12
  isCertifiedGl?: boolean // ★GL経験者資格フラグ
}

// 人間 関係者 による手動スコア評価レコード AI採点完全排除 
export interface LeaderEvaluationRecord {
  id: string
  eventId: string
  eventTitle: string
  targetResidentId: string // 被評価者
  targetResidentName: string
  targetRole: 'PL' | 'GL' | 'メンバー'
  evaluatorId: string // 評価者
  evaluatorName: string
  evaluatorRole: 'EA' | 'PL' | 'GL' | 'メンバー'
  createdAt: string
  
  // 関係者が手動入力する定性・定量スコア ★1〜5 
  scores: {
    facilitation: number // 統率・ファシリテーション力 ★1〜5 
    communication: number // 報連相・レスポンス ★1〜5 
    safetyExternal: number // 対外折衝 西松・施設ルール ・安全意識 ★1〜5 
    scheduleBudget: number // 期日・予算管理 ★1〜5 
  }
  goodPoints: string // 👍 いい面・強み 関係者の生の声 
  badPoints: string // ⚠️ 課題・悪い面・フォロー要 関係者の生の声 
  aptitudeVerdict: 'PL適格' | 'GL適格' | '専門実務向き' | '要フォロー'
  isConfidential: boolean // 非公開リーダーカルテ 幹部・EAのみ閲覧可 
}

// 1棟ごとの役職定義 HL, EA/IA/OAのHSL, FL, 一般寮生 
export type ResidentRoleKey = 'HL' | 'EA' | 'IA' | 'OA' | 'FL' | '一般寮生'

export interface RoleConfigItem {
  key: ResidentRoleKey
  title: string
  badgeLabel: string
  isLeadership: boolean
  description: string
}

export const DORM_ROLES_CONFIG: RoleConfigItem[] = [
  { key: 'HL', title: 'HL ハウスリーダー', badgeLabel: 'HL', isLeadership: true, description: '棟全体の統括代表' },
  { key: 'EA', title: 'EA ハウスサブリーダー', badgeLabel: 'EA HSL', isLeadership: true, description: 'イベント・対外企画担当 HSL' },
  { key: 'IA', title: 'IA ハウスサブリーダー', badgeLabel: 'IA HSL', isLeadership: true, description: '内部運営・総務担当 HSL' },
  { key: 'OA', title: 'OA ハウスサブリーダー', badgeLabel: 'OA HSL', isLeadership: true, description: '広報・運営管理担当 HSL' },
  { key: 'FL', title: 'FL フロアリーダー', badgeLabel: 'FL', isLeadership: true, description: '各階フロアの責任者' },
  { key: '一般寮生', title: '一般寮生', badgeLabel: '', isLeadership: false, description: '一般入居寮生' }
]

export function getRoleBadgeInfo(roleStr?: string): { badge: string; isLeadership: boolean } {
  if (!roleStr) return { badge: '', isLeadership: false }
  const clean = roleStr.trim()
  if (clean === 'HL' || clean.includes('ハウスリーダー')) return { badge: 'HL', isLeadership: true }
  if (clean === 'EA' || clean.includes('EA')) return { badge: 'EA HSL', isLeadership: true }
  if (clean === 'IA' || clean.includes('IA')) return { badge: 'IA HSL', isLeadership: true }
  if (clean === 'OA' || clean.includes('OA')) return { badge: 'OA HSL', isLeadership: true }
  if (clean === 'FL' || clean.includes('フロアリーダー') || clean.includes('FL')) return { badge: 'FL', isLeadership: true }
  return { badge: '', isLeadership: false }
}

export interface ProjectHistoryItem {
  id: string
  projectId?: string
  projectTitle: string
  role: string // 例: 'PL', 'GL', 'メンバー', 'EA'
  period?: string // 例: '2026年10月', '2026年秋'
  status?: string // '進行中' | '完了'
  summary?: string
}

export interface ResidentRecord {
  id: string
  name: string
  avatar: string
  building: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
  floor: number
  unit: string
  roomType?: '5-person' | '1-person' // 5人部屋 or 1人部屋 1階 
  role: ResidentRoleKey | string
  roleType?: 'fl' | 'hl' | 'member' | 'hsl'
  email: string
  memo: string
  bio?: string // 自己紹介
  projectHistory?: ProjectHistoryItem[] // これまで行ったプロジェクトの履歴
  careers?: EventRoleCareer[] // 歴代イベント役職経歴
  evaluations?: LeaderEvaluationRecord[] // 人事評価・リーダーカルテ
}

export interface BuildingUnitConfig {
  unitNumber: string
  unitName: string
  floor: 1 | 2 | 3 | 4
  roomType: '5-person' | '1-person'
  capacity: number
  label: string
}

export const BUILDING_FLOORS_CONFIG: {
  floor: 1 | 2 | 3 | 4
  label: string
  units: BuildingUnitConfig[]
}[] = [
  {
    floor: 4,
    label: '第4階 4F ',
    units: [
      { unitNumber: '401', unitName: 'Unit 401', floor: 4, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '402', unitName: 'Unit 402', floor: 4, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '403', unitName: 'Unit 403', floor: 4, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '404', unitName: 'Unit 404', floor: 4, roomType: '5-person', capacity: 5, label: '5人部屋' }
    ]
  },
  {
    floor: 3,
    label: '第3階 3F ',
    units: [
      { unitNumber: '301', unitName: 'Unit 301', floor: 3, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '302', unitName: 'Unit 302', floor: 3, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '303', unitName: 'Unit 303', floor: 3, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '304', unitName: 'Unit 304', floor: 3, roomType: '5-person', capacity: 5, label: '5人部屋' }
    ]
  },
  {
    floor: 2,
    label: '第2階 2F ',
    units: [
      { unitNumber: '201', unitName: 'Unit 201', floor: 2, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '202', unitName: 'Unit 202', floor: 2, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '203', unitName: 'Unit 203', floor: 2, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '204', unitName: 'Unit 204', floor: 2, roomType: '5-person', capacity: 5, label: '5人部屋' }
    ]
  },
  {
    floor: 1,
    label: '第1階 1F ',
    units: [
      { unitNumber: '101', unitName: 'Unit 101', floor: 1, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '102', unitName: 'Unit 102', floor: 1, roomType: '5-person', capacity: 5, label: '5人部屋' },
      { unitNumber: '103', unitName: 'Unit 103', floor: 1, roomType: '1-person', capacity: 1, label: '1人部屋 個室 ' },
      { unitNumber: '104', unitName: 'Unit 104', floor: 1, roomType: '1-person', capacity: 1, label: '1人部屋 個室 ' }
    ]
  }
]

export function parseUnitNumber(unitStr: string): string {
  const m = unitStr.match(/([1-4]0[1-4])/);
  return m ? m[1] : '';
}

export function getUnitRoomType(unitStr: string): '5-person' | '1-person' {
  const num = parseUnitNumber(unitStr);
  if (num === '103' || num === '104') return '1-person';
  return '5-person';
}

export function getUnitCapacity(unitStr: string): number {
  return getUnitRoomType(unitStr) === '1-person' ? 1 : 5;
}

export interface ProjectMemberRecord {
  residentId: string
  name: string
  avatar: string
  role: string
  building: string
  joinedAt: string
  eventRole?: 'PL' | 'GL' | 'メンバー' | 'EA' | string // 役職
  groupName?: string // 所属班 イベント班、装飾班、ディナー班等 
}

export interface EventGroup {
  id: string
  name: string // イベント班、装飾班、ディナー班 など
  glResidentId?: string // 班GL リーダー 
  glName?: string
  milestoneDeadline?: string // 独自マイルストーン 例: 10/31 ディナーメニュー決定 
  milestoneTitle?: string
  milestoneCompleted?: boolean
  membersCount?: number
}

export interface EventWorkflowStep {
  id: string
  step: string
  title: string
  date: string
  active: boolean
  done: boolean
}

export interface ProjectRecord {
  id: string
  title: string
  category: string
  status: string
  progress: number
  owner: string
  ownerId?: string
  nextAction: string
  proposalsCount?: number
  createdAt: string
  description?: string
  bannerImage?: string
  
  // 企画種別 イベント企画 vs 日常運営プロジェクト 
  projectType?: 'event' | 'operation' // 'event': 班編成・GL/PL役職・振り返り有効 / 'operation': 日常運営・布巾交換等のシンプル管理
  
  // イベント運営フロー連携 スライド実務構造 
  isEventWorkflow?: boolean // イベント運営フロー適用フラグ
  workflowStage?: 'planning' | 'ea_review' | 'nishimatsu_review' | 'action_prep' | 'rehearsal_day' | 'retrospective'
  workflowSteps?: EventWorkflowStep[] // 自由に追加・カスタマイズ可能な運営ステップ
  theme?: string // 今年のテーマ 例: それぞれの層が楽しめる！ 
  groups?: EventGroup[] // 班・チーム構成 小規模時は空でも可、自由に追加 
  evaluations?: LeaderEvaluationRecord[] // 周囲の関係者がスコアリングした振り返り・評価ログ
  
  members: ProjectMemberRecord[]
  meetingNotes?: {
    id?: string
    date: string
    title: string
    attendees: string[]
    summary: string
    decisions: string[]
    nextTodos: string[]
    tags?: string[]
    rawTranscript?: string
    updatedAt?: string
  }[]
  proposalDoc?: ProjectProposalDoc
  proposalAttachments?: ProposalAttachment[]
  schedule?: {
    date: string
    milestone: string
    completed: boolean
  }[]
}

export interface ProposalAttachment {
  id: string
  name: string
  size: number
  type: 'pdf' | 'docx' | 'doc' | 'xlsx' | 'other'
  uploadedAt: string
  uploadedBy: string
  dataUrl?: string
}

export interface ProposalOperationFlowItem {
  target: string
  content: string
}

export interface ProposalImprovementItem {
  audience: string
  title: string
  desc: string
}

export interface ProposalBudgetItem {
  name: string
  spec: string
  quantity: string
  cost: string
}

export interface ProjectProposalDoc {
  title: string
  subtitle?: string
  recipient?: string
  submissionDate?: string
  purpose: string
  background: string
  problems?: string[]
  proposalOverview?: string
  flowItems?: ProposalOperationFlowItem[]
  improvements?: ProposalImprovementItem[]
  budgetItems?: ProposalBudgetItem[]
  totalBudget?: string
  hackStrategy?: string
  budget?: string
  steps?: string[]
  summary?: string
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

export interface CurrentUser {
  id: string
  name: string
  avatar: string
  building: 'rosemary' | 'basil' | 'turmeric' | 'paprika'
  floor: number
  unit: string
  role: string
  roleType: 'fl' | 'hl' | 'member' | 'hsl'
  email: string
  bio?: string
}

const STORAGE_KEYS = {
  RESIDENTS: 'tn_db_residents',
  PROJECTS: 'tn_db_projects',
  WORK_REPORTS: 'tn_db_work_reports',
  ARCHIVES: 'tn_db_archives',
  CURRENT_USER: 'tn_db_current_user'
}

// 初期デフォルト住人データ
export const INITIAL_RESIDENTS: ResidentRecord[] = [
  {
    id: 'r1',
    name: '岡本 直樹',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 3,
    unit: 'Unit 301 - A室',
    role: 'HL',
    roleType: 'hl',
    email: 'okamoto@intakingresources.com',
    memo: 'キッチン布巾改善PJ / 玄関共通化提案',
    projectHistory: [
      { id: 'ph-1', projectId: 'pj-1', projectTitle: '共有キッチン 布巾の衛生改善 使い捨てロール化 ', role: 'プロジェクトリーダー (PL)', period: '2026年10月〜', status: '進行中', summary: '壁面マグネットホルダー導入と3ボックス分別フローの策定' },
      { id: 'ph-2', projectId: 'pj-xmas', projectTitle: '🎄 2026年 H-Village クリスマス企画', role: '統括PL', period: '2026-12', status: '進行中', summary: '全体予算管理・西松建設折衝' },
      { id: 'ph-3', projectId: 'pj-summer', projectTitle: '🎋 2026年 七夕・中庭夏祭り', role: 'PL', period: '2026-07', status: '完了', summary: '中庭音響・屋台ブース運営' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'PL', yearMonth: '2026-12', isCertifiedGl: true },
      { eventId: 'pj-summer', eventTitle: '🎋 2026年 七夕・中庭夏祭り', role: 'PL', yearMonth: '2026-07', isCertifiedGl: true }
    ],
    evaluations: [
      {
        id: 'ev-1',
        eventId: 'pj-summer',
        eventTitle: '🎋 2026年 七夕・中庭夏祭り',
        targetResidentId: 'r1',
        targetResidentName: '岡本 直樹',
        targetRole: 'PL',
        evaluatorId: 'r0-ea',
        evaluatorName: '次郎さん EA ',
        evaluatorRole: 'EA',
        createdAt: '2026-07-15',
        scores: { facilitation: 5, communication: 5, safetyExternal: 5, scheduleBudget: 4 },
        goodPoints: '西松建設との事前折衝が極めて緻密で、安全基準を完全クリアした。各GLへの権限委譲とトラブル対応が迅速。',
        badPoints: '細かい備品発注の決算確認を直前まで抱え込みがち。副PLへの分担を推奨。',
        aptitudeVerdict: 'PL適格',
        isConfidential: true
      }
    ]
  },
  {
    id: 'r2',
    name: '伊藤 雄吉',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 3,
    unit: 'Unit 301 - B室',
    role: 'EA',
    roleType: 'hsl',
    email: 'ito.y@intakingresources.com',
    memo: '夜間イベント企画・サイレントフェス検討',
    projectHistory: [
      { id: 'ph-4', projectId: 'pj-xmas', projectTitle: '🎄 2026年 H-Village クリスマス企画', role: 'GL (イベント班)', period: '2026-12', status: '進行中', summary: '夜間ステージ演出・企画進行' },
      { id: 'ph-5', projectId: 'pj-summer', projectTitle: '🎋 2026年 七夕・中庭夏祭り', role: 'メンバー (音響企画)', period: '2026-07', status: '完了', summary: '音響PA設営・DJブース担当' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'GL', groupName: 'イベント班', yearMonth: '2026-12', isCertifiedGl: true },
      { eventId: 'pj-summer', eventTitle: '🎋 2026年 七夕・中庭夏祭り', role: 'メンバー', groupName: '音響企画', yearMonth: '2026-07', isCertifiedGl: false }
    ],
    evaluations: [
      {
        id: 'ev-2',
        eventId: 'pj-summer',
        eventTitle: '🎋 2026年 七夕・中庭夏祭り',
        targetResidentId: 'r2',
        targetResidentName: '伊藤 雄吉',
        targetRole: 'メンバー',
        evaluatorId: 'r1',
        evaluatorName: '岡本 直樹',
        evaluatorRole: 'PL',
        createdAt: '2026-07-15',
        scores: { facilitation: 4, communication: 5, safetyExternal: 4, scheduleBudget: 4 },
        goodPoints: '独自のアイデア力と音響機材への造詣が深く、メンバーを巻き込む熱量が高い。',
        badPoints: '熱中するとスケジュール報告が少し遅れる時があるが、リマインドで即対応可能。',
        aptitudeVerdict: 'GL適格',
        isConfidential: false
      }
    ]
  },
  {
    id: 'r3',
    name: '佐藤 健太',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 2,
    unit: 'Unit 202 - A室',
    role: 'IA',
    roleType: 'hsl',
    email: 'sato.k@sfc.keio.ac.jp',
    memo: '玄関美化・靴箱プロトタイプ担当',
    projectHistory: [
      { id: 'ph-6', projectId: 'pj-xmas', projectTitle: '🎄 2026年 H-Village クリスマス企画', role: 'GL (ディナー班)', period: '2026-12', status: '進行中', summary: 'ケータリング手配・食材予算管理' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'GL', groupName: 'ディナー班', yearMonth: '2026-12', isCertifiedGl: true }
    ],
    evaluations: []
  },
  {
    id: 'r-oa-rosemary',
    name: '高橋 涼平',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 3,
    unit: 'Unit 301 - C室',
    role: 'OA',
    roleType: 'hsl',
    email: 'takahashi.r@sfc.keio.ac.jp',
    memo: '広報・写真記録・SNS運用担当',
    projectHistory: [
      { id: 'ph-7', projectId: 'pj-pr', projectTitle: 'H-Village 公式広報・月報アーカイブ', role: '広報リーダー', period: '2026年9月〜', status: '進行中', summary: '月次ハイライトポスター制作' }
    ],
    careers: [],
    evaluations: []
  },
  {
    id: 'r-fl-4f',
    name: '佐々木 陸',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 4,
    unit: 'Unit 401',
    roomType: '5-person',
    role: 'FL',
    roleType: 'fl',
    email: 'sasaki.r@sfc.keio.ac.jp',
    memo: '4Fフロアリーダー',
    projectHistory: [
      { id: 'ph-8', projectId: 'pj-floor4', projectTitle: '4F 共用ラウンジ清掃・備品ルール改善', role: 'FL統括', period: '2026-10', status: '進行中', summary: '掃除当番カレンダー整備' }
    ]
  },
  {
    id: 'r-fl-2f',
    name: '森本 健',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 2,
    unit: 'Unit 201',
    roomType: '5-person',
    role: 'FL',
    roleType: 'fl',
    email: 'morimoto.k@sfc.keio.ac.jp',
    memo: '2Fフロアリーダー',
    projectHistory: []
  },
  {
    id: 'r-fl-1f',
    name: '田村 啓介',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    building: 'rosemary',
    floor: 1,
    unit: 'Unit 101',
    roomType: '5-person',
    role: 'FL',
    roleType: 'fl',
    email: 'tamura.k@sfc.keio.ac.jp',
    memo: '1Fフロアリーダー',
    projectHistory: []
  },
  {
    id: 'r4',
    name: '生熊 翔太',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    building: 'paprika',
    floor: 3,
    unit: 'Unit 303 - A室',
    role: 'FL',
    roleType: 'fl',
    email: 'ikuma.s@sfc.keio.ac.jp',
    memo: '布巾改善の申請書連携・西松窓口',
    projectHistory: [
      { id: 'ph-9', projectId: 'pj-1', projectTitle: '共有キッチン 布巾の衛生改善 使い捨てロール化 ', role: '推進メンバー', period: '2026-10', status: '進行中', summary: 'パプリカ棟への申請・説明ポスター掲示' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'GL', groupName: '装飾班', yearMonth: '2026-12', isCertifiedGl: true }
    ],
    evaluations: []
  },
  {
    id: 'r5',
    name: '宗司 涼介',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    building: 'paprika',
    floor: 2,
    unit: 'Unit 201 - A室',
    role: 'HL',
    roleType: 'hl',
    email: 'soji.r@sfc.keio.ac.jp',
    memo: 'パプリカ棟ハウスリーダー・全体自治会担当',
    projectHistory: [
      { id: 'ph-10', projectId: 'pj-1', projectTitle: '共有キッチン 布巾の衛生改善 使い捨てロール化 ', role: '協力メンバー', period: '2026-10', status: '進行中', summary: '棟間連携・全体自治会合意' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'メンバー', groupName: 'ディナー班', yearMonth: '2026-12', isCertifiedGl: false }
    ],
    evaluations: []
  },
  {
    id: 'r6',
    name: '山田 大地',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    building: 'turmeric',
    floor: 3,
    unit: 'Unit 302 - B室',
    role: 'FL',
    roleType: 'fl',
    email: 'yamada.d@sfc.keio.ac.jp',
    memo: 'BBQ大会企画・機材管理',
    projectHistory: [
      { id: 'ph-11', projectId: 'pj-bbq', projectTitle: '中庭BBQ大会＆新入寮生歓迎会', role: '機材統括', period: '2026-05', status: '完了', summary: '炭火台手配・消火備品準備' }
    ],
    careers: [],
    evaluations: []
  },
  {
    id: 'r7',
    name: '渡辺 陽奈',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    building: 'basil',
    floor: 2,
    unit: 'Unit 203 - A室',
    role: 'FL',
    roleType: 'fl',
    email: 'watanabe.h@sfc.keio.ac.jp',
    memo: '中庭植栽・ハーブ菜園PJ',
    projectHistory: [
      { id: 'ph-12', projectId: 'pj-herb', projectTitle: 'バジル棟テラス ハーブ菜園PJ', role: 'PL', period: '2026年春〜秋', status: '完了', summary: '水やり当番表・自動給水プランター導入' }
    ],
    careers: [
      { eventId: 'pj-xmas', eventTitle: '🎄 2026年 H-Village クリスマス企画', role: 'メンバー', groupName: '装飾班', yearMonth: '2026-12', isCertifiedGl: false }
    ],
    evaluations: []
  },
  // --- 4F ユニット住人 ---
  // Unit 401 佐々木 陸 FL に加えて4名で満室 
  { id: 'r-401-2', name: '松本 玲奈', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 401', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-401-3', name: '井上 陽介', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 401', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-401-4', name: '木村 拓也', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 401', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-401-5', name: '林 彩花', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 401', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 402: 3名入居中 空き2名 
  { id: 'r-402-1', name: '加藤 航', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 402', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-402-2', name: '清水 大輝', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 402', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-402-3', name: '池田 萌', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 402', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 403: 5名満室
  { id: 'r-403-1', name: '吉田 健', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 403', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-403-2', name: '山口 舞', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 403', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-403-3', name: '斉藤 翔', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 403', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-403-4', name: '岡田 葵', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 403', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-403-5', name: '長谷川 蓮', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 403', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 404: 4名入居中 空き1名 
  { id: 'r-404-1', name: '村上 拓真', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 404', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-404-2', name: '近藤 咲', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 404', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-404-3', name: '遠藤 隼人', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 404', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-404-4', name: '青木 結衣', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 4, unit: 'Unit 404', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // --- 3F ユニット住人 ---
  // Unit 302: 5名満室
  { id: 'r-302-1', name: '三浦 剛', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 302', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-302-2', name: '竹内 楓', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 302', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-302-3', name: '中島 裕貴', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 302', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-402-4', name: '石井 美優', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 302', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-402-5', name: '小川 雄大', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 302', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 303: 5名満室
  { id: 'r-303-1', name: '前田 龍', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 303', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-303-2', name: '藤田 詩織', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 303', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-303-3', name: '後藤 悠太', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 303', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-303-4', name: '柴田 莉奈', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 303', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-303-5', name: '坂本 拓海', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 303', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 304: 3名入居中 空き2名 
  { id: 'r-304-1', name: '原田 慎一', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 304', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-304-2', name: '工藤 真央', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 304', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-304-3', name: '小野 健治', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 3, unit: 'Unit 304', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // --- 2F ユニット住人 ---
  // Unit 201 森本 健 FL に加えて4名で満室 
  { id: 'r-201-2', name: '阿部 さくら', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 201', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-201-3', name: '福田 優希', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 201', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-201-4', name: '西田 涼', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 201', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-201-5', name: '内田 結菜', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 201', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 202 佐藤健太 IA に加えて残り4名で満室 
  { id: 'r-202-2', name: '菊地 翔', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 202', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-202-3', name: '野村 遥', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 202', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-202-4', name: '菅原 大地', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 202', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-202-5', name: '安藤 美咲', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 202', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 203: 3名入居中 空き2名 
  { id: 'r-203-1', name: '丸山 浩', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 203', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-203-2', name: '大野 芽衣', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 203', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-203-3', name: '杉山 拓', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 203', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 204: 4名入居中 空き1名 
  { id: 'r-204-1', name: '千葉 竜也', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 204', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-204-2', name: '荒木 陽菜', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 204', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-204-3', name: '水野 駿', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 204', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-204-4', name: '堀内 誠', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 2, unit: 'Unit 204', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // --- 1F ユニット住人 5人部屋 ＆ 1人部屋個室  ---
  // Unit 101 田村 啓介 FL に加えて4名で満室 
  { id: 'r-101-2', name: '上田 七海', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 101', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-101-3', name: '馬場 光', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 101', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-101-4', name: '望月 隼', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 101', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-101-5', name: '金子 栞', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 101', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 102: 3名入居中 空き2名 
  { id: 'r-102-1', name: '辻 康平', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 102', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-102-2', name: '白石 琴音', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 102', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },
  { id: 'r-102-3', name: '矢野 大輝', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 102', roomType: '5-person', role: '一般寮生', roleType: 'member', email: '', memo: '' },

  // Unit 103: 1人部屋 個室 / 1名入居中 満室 
  { id: 'r-103-1', name: '中村 遥', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', building: 'rosemary', floor: 1, unit: 'Unit 103', roomType: '1-person', role: '一般寮生', roleType: 'member', email: 'nakamura.h@sfc.keio.ac.jp', memo: '1人部屋利用' }
  // ※ Unit 104 は 1人部屋 個室 で現在 0名 空室 
]

// 初期プロジェクトデータ スタッフ参加リスト付き 
export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: 'pj-1',
    title: '共有キッチン 布巾の衛生改善 使い捨てロール化 ',
    category: '衛生・備品',
    status: '進行中',
    progress: 75,
    owner: '岡本 直樹',
    ownerId: 'r1',
    nextAction: '西松建設・大学窓口への修繕申請書の最終提出',
    proposalsCount: 3,
    createdAt: '2026-10-01',
    description: '共用キッチンの布巾の生乾き臭と衛生リスクを解消し、使い捨てペーパーロールディスペンサーを自治会費で試験導入する。',
    bannerImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    projectType: 'operation',
    workflowSteps: [
      { id: 'op-1', step: '1', title: '課題特定・実地調査', date: '10/1〜10/3', active: true, done: true },
      { id: 'op-2', step: '2', title: '試作機設置・検証', date: '10/4〜10/7', active: true, done: true },
      { id: 'op-3', step: '3', title: '運用ルール・備品確定', date: '10/8〜10/10', active: true, done: false },
      { id: 'op-4', step: '4', title: '4棟配備・常時運用', date: '10/15〜', active: false, done: false }
    ],
    members: [
      {
        residentId: 'r1',
        name: '岡本 直樹',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        role: '統括リーダー (FL)',
        building: 'rosemary',
        joinedAt: '2026-10-01'
      },
      {
        residentId: 'r4',
        name: '生熊 翔太',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        role: 'パプリカFL',
        building: 'paprika',
        joinedAt: '2026-10-02'
      },
      {
        residentId: 'r5',
        name: '宗司 涼介',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
        role: 'ハウスリーダー (HL)',
        building: 'paprika',
        joinedAt: '2026-10-03'
      }
    ],
    meetingNotes: [
      {
        date: '2026-10-02',
        title: 'ローズ3Fキッチン現状調査 ＆ 衛生改善キックオフ',
        attendees: ['岡本 直樹', '生熊 翔太', '宗司 涼介'],
        summary: '布巾の煮沸消毒当番制は形骸化しており、悪臭の原因となっていることを全会一致で確認。使い捨てロール式への完全移行を決定。',
        decisions: [
          '従来の綿布巾を全面撤去し、吸水ペーパータオルホルダーを壁面にマグネット設置',
          '初期費用 ディスペンサー＋ロール3ヶ月分 は自治会雑費から拠出 約4,800円 ',
          'ローズ3Fで1週間の先行トライアルを実施し寮生アンケートを集計'
        ],
        nextTodos: [
          '岡本: Amazonでマグネットディスペンサーの発注手配',
          '生熊: パプリカ棟への説明用掲示ポスター作成',
          '宗司: ハウスリーダー会議での周知'
        ]
      },
      {
        date: '2026-10-04',
        title: '先行トライアル中間レビュー ＆ 西松建設への申請確認',
        attendees: ['岡本 直樹', '生熊 翔太'],
        summary: '3F利用者からシンク周りが劇的に清潔になったと高評価。西松建設への壁面器具設置に関する相談事項を整理。',
        decisions: [
          '両面テープ等による壁面破損を回避するため、冷蔵庫側面のマグネット吸着方式を標準仕様とする',
          '他棟 バジル・ターメリック への横展開スケジュールを策定'
        ],
        nextTodos: [
          '岡本: 施設修繕・改善申請書の大学窓口提出',
          '生熊: 消耗品ロールの補充運用マニュアル作成'
        ]
      }
    ],
    proposalDoc: {
      title: 'Hヴィレッジ 共用キッチンにおける衛生改善および回収作業効率化に向けた',
      subtitle: '布巾・台拭き 3ボックス方式導入のご提案',
      recipient: '西松地所株式会社 様 / 寮母・管理スタッフの皆様',
      submissionDate: '2026年10月',
      purpose: 'Hヴィレッジ 全16フロア の共用キッチンでは、食器拭き 青色 と台拭き ピンク色 の布巾が配備され、寮母様による3日に1回の洗濯・交換が行われています。しかし現状は、一度使用された濡れた布巾がキッチンに置かれたまま再使用される運用となっており、前回のローズマリーハウス全員会議においても、布巾が汚いせいで洗った食器を拭けないという意見が最も多く出されました。そこで、回収用と補充用のボックスを分けて設置する3ボックス方式を導入し、寮生が清潔な布巾を使用できる環境の整備と、回収・補充作業の効率化を図る運用改善をご提案いたします。',
      background: '各ユニットの綿布巾は濡れたまま放置されがちで、衛生面での不満が多数報告されていた。洗濯・漂白のルール化は持続性に欠けるため、物理的に使い捨て方式へ切り替える。',
      problems: [
        '一度使用された濡れた布巾を再使用することになり、衛生的でない。',
        '油汚れや生乾き臭が気になり、備え付けの布巾を使用しづらい。',
        '食器用 青 と台拭き ピンク の区別が曖昧になりやすい。',
        '結果として備え付けの布巾が使われず、各自でタオルを持ち込んだり、使い捨てペーパー類を消費している。'
      ],
      proposalOverview: '各フロアのキッチンに①使用済み回収BOX②清潔な食器拭きBOX 青 ③清潔な台拭きBOX ピンク の3つの専用ボックスを設置し、使ったら回収BOXへ入れる1回使い切り運用を徹底します。',
      flowItems: [
        {
          target: '寮生の利用手順',
          content: '・調理時や食器洗い時、ストックBOX 青またはピンク からタオルを取り出して使用する。\n・使用後は、シンクに置かず使用済み回収BOXへ投入する 1回使い切り 。'
        },
        {
          target: '回収・補充手順 定期巡回時 ',
          content: '・使用済み回収BOXからタオルを回収袋に移す。\n・洗濯済みのタオルを、それぞれのストックBOXに補充する。'
        }
      ],
      improvements: [
        {
          audience: '寮生側',
          title: '衛生面の改善',
          desc: '乾いた布巾を取り出して使用するため、濡れた布巾の再使用を防ぎ、衛生的に食器を拭くことができます。また用途の混同を防止できます。'
        },
        {
          audience: '寮母様側',
          title: '回収・補充作業の効率化',
          desc: '回収はボックスから行い、補充もボックスへ行う手順となるため、各フロアで布巾を探す作業がなくなり、作業負担が軽減されます。'
        },
        {
          audience: '施設管理側',
          title: 'キッチンの整理・美観維持',
          desc: '布巾の定位置が決まることで、シンク周りへの放置を防止できます。既存の備品と市販ボックスを活用して導入できます。'
        }
      ],
      budgetItems: [
        { name: 'ストックボックス', spec: 'プラスチック製/メッシュ製バスケット 通気性のあるもの ', quantity: '48個 3個 × 16フロア ', cost: '約5,280円 1個110円計算 ' },
        { name: '分別ラベル', spec: '防水ラミネート 青・ピンク・グレー／日英併記 ', quantity: '16組', cost: '約1,000円' },
        { name: '利用案内ポスター', spec: 'A4ラミネート キッチン壁面掲示用、日英併記 ', quantity: '16枚', cost: '約500円 寮生側で作成可 ' },
        { name: '布巾 補充用 ', spec: '既存備品の活用＋不足分のみ補充', quantity: '-', cost: '既存備品で対応可能' }
      ],
      totalBudget: '約 7,000 円 〜 10,000 円',
      hackStrategy: '共用部への固定器具工事申請 学事・西松 を回避するため、既存の金属面 冷蔵庫・レンジフード への強力マグネット固定を採用し、現状復旧不要な備品運用として即時実装する。',
      budget: '約 7,000 円 〜 10,000 円 自治会費充当 ',
      steps: [
        '1. 事前確認：西松地所様および寮母様との設置場所・ボックス仕様の確認',
        '2. 試験導入：1〜2棟 特定フロア で試験運用を実施し、使用量や回収状況を確認',
        '3. 全フロア導入：ボックスおよび案内を設置し、運用を開始'
      ],
      summary: '本提案は、寮生から出ている衛生面に関する課題を解消し、あわせて回収・補充手順を整理・効率化することを目的としています。まずは一部フロアでの試験導入を含め、ご検討いただけますようお願いいたします。'
    },
    proposalAttachments: [
      {
        id: 'att-1',
        name: '共用キッチン衛生改善_3ボックス方式導入のご提案_西松地所提出版.pdf',
        size: 1420500,
        type: 'pdf',
        uploadedAt: '2026-10-04 14:20',
        uploadedBy: '岡本 直樹'
      }
    ],
    schedule: [
      { date: '2026-10-01', milestone: '課題抽出 ＆ プロジェクト立ち上げ', completed: true },
      { date: '2026-10-03', milestone: 'ディスペンサー試作機設置 ローズ3F ', completed: true },
      { date: '2026-10-07', milestone: '寮生アンケート集計 ＆ 改善要望反映', completed: false },
      { date: '2026-10-10', milestone: '4棟全フロアへのロール配備完了', completed: false }
    ]
  },
  {
    id: 'pj-2',
    title: '4棟エントランスのオートロック共通化 コモンズ相互利用 ',
    category: '施設・防犯',
    status: '進行中',
    progress: 40,
    owner: '岡本 直樹',
    ownerId: 'r1',
    nextAction: 'セキュリティカードキーの追加登録費用の見積もり確認',
    proposalsCount: 2,
    createdAt: '2026-10-03',
    description: '各棟1Fコモンズは規約上全員利用可能なのに玄関で弾かれる既存システムの矛盾を、昼間限定の認証共通化で突破する。',
    bannerImage: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80',
    projectType: 'operation',
    workflowSteps: [
      { id: 'op2-1', step: '1', title: '規約矛盾の調査・整理', date: '10/3〜10/5', active: true, done: true },
      { id: 'op2-2', step: '2', title: '学事システム相談', date: '10/6〜10/10', active: true, done: false },
      { id: 'op2-3', step: '3', title: 'カードキー一括登録', date: '10/15〜', active: false, done: false }
    ],
    members: [
      {
        residentId: 'r1',
        name: '岡本 直樹',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        role: '統括リーダー (FL)',
        building: 'rosemary',
        joinedAt: '2026-10-03'
      },
      {
        residentId: 'r3',
        name: '佐藤 健太',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        role: 'サブリーダー',
        building: 'rosemary',
        joinedAt: '2026-10-04'
      }
    ],
    meetingNotes: [
      {
        date: '2026-10-03',
        title: 'エントランス施錠規約の矛盾点洗い出し会議',
        attendees: ['岡本 直樹', '佐藤 健太'],
        summary: '規約上コモンズは4棟の全寮生が自由利用可と明記されているにもかかわらず、カードキーが自棟しか開かないためインターホン呼び出しが必要な問題を議論。',
        decisions: [
          '物理カードリーダーの改修は莫大な費用がかかるため、西松建設に頼らず学事のカード登録DBで全棟カードIDを相互付与する方針を策定',
          '防犯懸念に対応するため、居住階 2〜3F への侵入は各階段ドアの別施錠で防ぐ案を提示'
        ],
        nextTodos: [
          '岡本: 学事・西松建設の担当者へのヒアリング日程調整',
          '佐藤: 各棟居住者へのヒアリングと懸念事項の整理'
        ]
      }
    ],
    proposalDoc: {
      title: 'Hヴィレッジ 4棟コモンズ相互利用・エントランス認証共通化企画書',
      purpose: 'コモンズスペースの相互開放を実現し、棟間の交流活性化と勉強・作業環境の選択肢を拡大する。',
      background: '4棟それぞれに個性あるコモンズスペース 学習室、キッチンスペース、ラウンジ が整備されているが、自棟以外の出入りが物理的に制限されているため、有効活用されていない。',
      hackStrategy: '機器交換などの高額工事を行わず、現行のFelicaカードキー管理システムにおいて、全寮生のカードIDに4棟の玄関リーダアクセス権を一括追加登録するシステム運用のみで突破する。',
      budget: '初期工事費 0円 / カード登録管理事務費 0円 学事システム内作業 ',
      steps: [
        'コモンズ相互利用規約案の作成',
        '防犯カメラ配置と居住階セキュリティ担保策の確認',
        'ハウスリーダー会議および大学学事への公式提案書の提出',
        '秋学期中のトライアル運用開始'
      ]
    },
    schedule: [
      { date: '2026-10-03', milestone: '規約矛盾の整理 ＆ 企画骨子作成', completed: true },
      { date: '2026-10-06', milestone: '学事担当者への事前相談', completed: false },
      { date: '2026-10-15', milestone: 'カードキー一括登録トライアル開始', completed: false }
    ]
  },
  {
    id: 'pj-xmas',
    title: '🎄 2026年 H-Village クリスマス大感謝祭 12/17開催 ',
    category: 'イベント・交流',
    status: '進行中',
    progress: 35,
    owner: '岡本 直樹',
    ownerId: 'r1',
    nextAction: '10/13第2回全体会議 班の決定 ＆ 各班GL選定・ディナーメニュー策定',
    proposalsCount: 3,
    createdAt: '2026-10-06',
    description: 'それぞれの層が楽しめる！をテーマに、イベント班・装飾班・ディナー班の3班体制で企画。EA・西松建設の2段階承認とリハを経て当日成功を目指す公式イベント。',
    bannerImage: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=800&q=80',
    projectType: 'event',
    isEventWorkflow: true,
    workflowStage: 'planning',
    theme: '今年のテーマは、それぞれの層が楽しめる！',
    workflowSteps: [
      { id: 'st-1', step: '1', title: 'アイデア・班決定', date: '10/6〜10/13', active: true, done: true },
      { id: 'st-2', step: '2', title: '先行締切・要件確定', date: '〜10/31', active: true, done: false },
      { id: 'st-3', step: '3', title: 'EA企画書提出', date: '11/10', active: false, done: false },
      { id: 'st-4', step: '4', title: '西松建設 承認申請', date: '11/17', active: false, done: false },
      { id: 'st-5', step: '5', title: '決算書・注文/実働', date: '11月下旬〜', active: false, done: false },
      { id: 'st-6', step: '6', title: '全体リハ ＆ 当日', date: '12/16・17', active: false, done: false },
      { id: 'st-7', step: '7', title: '振り返り・次回への教訓', date: '12/18〜', active: false, done: false }
    ],
    groups: [
      {
        id: 'grp-event',
        name: 'イベント班',
        glResidentId: 'r2',
        glName: '伊藤 雄吉',
        milestoneDeadline: '2026-10-25',
        milestoneTitle: 'ステージ企画・音響タイムテーブル確定',
        milestoneCompleted: false,
        membersCount: 3
      },
      {
        id: 'grp-decor',
        name: '装飾班',
        glResidentId: 'r4',
        glName: '生熊 翔太',
        milestoneDeadline: '2026-11-05',
        milestoneTitle: 'ツリー・LED電飾・会場レイアウト図面完成',
        milestoneCompleted: false,
        membersCount: 2
      },
      {
        id: 'grp-dinner',
        name: 'ディナー班',
        glResidentId: 'r3',
        glName: '佐藤 健太',
        milestoneDeadline: '2026-10-31',
        milestoneTitle: 'ディナー班メニュー決定 先行締切 ',
        milestoneCompleted: false,
        membersCount: 4
      }
    ],
    evaluations: [
      {
        id: 'ev-xmas-1',
        eventId: 'pj-xmas',
        eventTitle: '🎄 2026年 H-Village クリスマス大感謝祭',
        targetResidentId: 'r2',
        targetResidentName: '伊藤 雄吉',
        targetRole: 'GL',
        evaluatorId: 'r1',
        evaluatorName: '岡本 直樹',
        evaluatorRole: 'PL',
        createdAt: '2026-10-06',
        scores: { facilitation: 5, communication: 4, safetyExternal: 4, scheduleBudget: 5 },
        goodPoints: 'サイレント音響ノウハウを活かした独自コンテンツ立案が秀逸。',
        badPoints: '西松への事前安全申請書のドラフト作成を早めに完了させること。',
        aptitudeVerdict: 'GL適格',
        isConfidential: false
      }
    ],
    members: [
      {
        residentId: 'r1',
        name: '岡本 直樹',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        role: '統括リーダー (FL)',
        building: 'rosemary',
        joinedAt: '2026-10-06',
        eventRole: 'PL',
        groupName: '全体統括'
      },
      {
        residentId: 'r2',
        name: '伊藤 雄吉',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        role: '有志メンバー',
        building: 'rosemary',
        joinedAt: '2026-10-06',
        eventRole: 'GL',
        groupName: 'イベント班'
      },
      {
        residentId: 'r3',
        name: '佐藤 健太',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        role: 'サブリーダー',
        building: 'rosemary',
        joinedAt: '2026-10-06',
        eventRole: 'GL',
        groupName: 'ディナー班'
      },
      {
        residentId: 'r4',
        name: '生熊 翔太',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        role: 'パプリカFL',
        building: 'paprika',
        joinedAt: '2026-10-06',
        eventRole: 'GL',
        groupName: '装飾班'
      },
      {
        residentId: 'r5',
        name: '宗司 涼介',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
        role: 'ハウスリーダー (HL)',
        building: 'paprika',
        joinedAt: '2026-10-06',
        eventRole: 'メンバー',
        groupName: 'ディナー班'
      },
      {
        residentId: 'r7',
        name: '渡辺 陽奈',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        role: 'バジルFL',
        building: 'basil',
        joinedAt: '2026-10-06',
        eventRole: 'メンバー',
        groupName: '装飾班'
      }
    ],
    meetingNotes: [
      {
        date: '2026-10-06',
        title: '第1回 クリスマス企画 全体キックオフ会議',
        attendees: ['岡本 直樹 PL ', '伊藤 雄吉 GL ', '佐藤 健太 GL ', '生熊 翔太 GL ', '宗司 涼介', '渡辺 陽奈'],
        summary: '初回全体会議を実施。今年のテーマそれぞれの層が楽しめる！を採択。10/13第2回全体会議までにイベント・装飾・ディナーの3班編成を固めることを決定。',
        decisions: [
          'PL: 岡本直樹 全体監督・西松連絡担当 ',
          'GL選任: イベント班 伊藤 、装飾班 生熊 、ディナー班 佐藤 ',
          'GL参加ルール確認: GL経験者が班にいない場合、初参加者はGL不可を厳守',
          'ディナー班の先行締切: 食材衛生と発注のため10/31までにメニュー確定'
        ],
        nextTodos: [
          '10/13: 第2回全体会議 各班メンバー確定・アイデア具体化 ',
          '10/31: ディナー班メニュー最終決定',
          '11/10: EA 次郎さん への企画書提出',
          '11/17: 西松建設への企画書・施設利用申請書提出'
        ]
      }
    ],
    proposalDoc: {
      title: 'Hヴィレッジ 2026年度 クリスマス大感謝祭 企画書',
      purpose: '学期末における全4棟の寮生交流と、新入生・留学生・上級生それぞれの層が安心して楽しめる祝祭空間の創出。',
      background: '年末の帰省前に寮生全員の絆を深める伝統行事。今年は単一の騒がしいパーティーではなく、ディナー・静かな装飾空間・体験型イベントの3班で多様な居場所を設計する。',
      hackStrategy: '西松建設への申請にあたり、火気厳禁を徹底するためIH調理および保温ジャー配備方式を採用。中庭装飾は21時消灯・自棟電源確保で共用部負荷をゼロにする論理で一発承認を狙う。',
      budget: '総予算 48,000円 自治会費補助 30,000円 ＋ 参加費カンパ 18,000円 ',
      steps: [
        '【企画フェーズ 1ヶ月 】: 10/6アイデア ➔ 10/13班決定 ➔ 10/31メニュー決定 ➔ 11/10 EA提出 ➔ 11/17 西松提出',
        '【承認後】: 決算書作成 ＆ 購入品の正式注文開始',
        '【実働フェーズ 2週間 】: 制作・広報・会場準備・各班当日の動き確認 ➔ 12/16全体リハ ➔ 12/17当日実施 ➔ 12/18片付け',
        '【振り返りフェーズ 1週間 】: 目的達成度・良かった点・改善点 惜敗ログ の整理 ＆ 関係者スコア人事評価蓄積'
      ]
    },
    schedule: [
      { date: '2026-10-06', milestone: '初回全体会議 アイデア出し ', completed: true },
      { date: '2026-10-13', milestone: '第2回全体会議 班の決定 ', completed: false },
      { date: '2026-10-31', milestone: 'ディナー班メニュー決定 先行締切 ', completed: false },
      { date: '2026-11-10', milestone: '企画書提出 EAチェック ', completed: false },
      { date: '2026-11-17', milestone: '企画書提出 西松建設 承認申請 ', completed: false },
      { date: '2026-11-25', milestone: '承認後：決算書作成・購入品の注文開始', completed: false },
      { date: '2026-12-05', milestone: '実働フェーズ開始 制作・広報・会場準備 ', completed: false },
      { date: '2026-12-16', milestone: '全体リハーサル 第1回・第2回 ', completed: false },
      { date: '2026-12-17', milestone: '★ イベント当日！', completed: false },
      { date: '2026-12-18', milestone: 'お片付け ＆ 原状復帰', completed: false },
      { date: '2026-12-25', milestone: '振り返りフェーズ 惜敗ログ・関係者スコア人事評価 ', completed: false }
    ]
  },
  {
    id: 'pj-3',
    title: '夜間中庭フェス企画 サイレントDJ ＆ デシベル測定実証 ',
    category: '生活文化・交流',
    status: '進行中',
    progress: 20,
    owner: '伊藤 雄吉',
    ownerId: 'r2',
    nextAction: 'Bluetoothヘッドホン手配と騒音シミュレーション計画書の作成',
    proposalsCount: 1,
    createdAt: '2026-10-05',
    description: '過去に騒音問題で却下された中庭イベントを、参加者全員ヘッドホン着用のサイレントフェス形式で再挑戦する。',
    bannerImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    members: [
      {
        residentId: 'r2',
        name: '伊藤 雄吉',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        role: '有志メンバー',
        building: 'rosemary',
        joinedAt: '2026-10-05'
      },
      {
        residentId: 'r7',
        name: '渡辺 陽奈',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        role: 'バジルFL',
        building: 'basil',
        joinedAt: '2026-10-05'
      }
    ],
    meetingNotes: [
      {
        date: '2026-10-05',
        title: 'サイレントフェス構想 ＆ 過去惜敗ログの検証',
        attendees: ['伊藤 雄吉', '渡辺 陽奈'],
        summary: '過去に中庭DJイベントが近隣住民・寮生への騒音苦情により即日中止となったログを倉庫から発掘。外部スピーカーを完全ゼロにするサイレントディスコ方式を構想。',
        decisions: [
          '外に漏れる音はゼロにするため、送信機とワイヤレスヘッドホンのみを使用',
          '客観的な安全証明のため、騒音計 デシベル測定器 で環境音と同等 40dB以下 を実証'
        ],
        nextTodos: [
          '伊藤: 機材レンタル見積もり 30台セット の調査',
          '渡辺: バジル棟住民への事前ヒアリング'
        ]
      }
    ],
    proposalDoc: {
      title: 'Hヴィレッジ 中庭サイレントフェス企画書',
      purpose: '騒音ゼロで近隣に迷惑をかけず、寮生同士が音と夜風を楽しむ新しいコミュニティイベントの創出。',
      background: '過去の中庭イベントは騒音クレームにより全面禁止となったが、交流の場を求める声は根強い。最新のサイレントフェス技術を活用することで課題を根底からクリアする。',
      hackStrategy: '屋外での音響機器使用禁止という規約に対し、スピーカーを使用せず、各自の個人用受信用ヘッドホンで聴取するため、騒音規制の対象外であるという論理構成で許可申請を行う。',
      budget: '機材レンタル費 15,000円 参加費カンパおよび有志拠出 ',
      steps: [
        'デシベル測定器による夜間基準値の計測テスト',
        '企画書および実証テスト計画の学事窓口への提出',
        '20名限定のパイロットテスト開催'
      ]
    },
    schedule: [
      { date: '2026-10-05', milestone: '惜敗ログ分析 ＆ サイレント方式採択', completed: true },
      { date: '2026-10-12', milestone: '機材テスト ＆ 騒音測定検証', completed: false },
      { date: '2026-10-25', milestone: '中庭サイレントフェス開催', completed: false }
    ]
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
    content: '換気扇強運転時にカタカタと異音あり。フィルター清掃では解消せず、業者点検の手配を推奨します。',
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
    title: '備品購入 ＆ 施設修繕・改善 申請書フォーマット Word正本',
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
  // --- ログインユーザー管理 ---
  getCurrentUser(): CurrentUser {
    const local = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // ignore
      }
    }
    // デフォルト: 岡本直樹 (FL)
    const defaultUser: CurrentUser = {
      id: 'r1',
      name: '岡本 直樹',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      building: 'rosemary',
      floor: 3,
      unit: 'Unit 301 - A室',
      role: '統括リーダー (FL)',
      roleType: 'fl',
      email: 'okamoto@intakingresources.com'
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser))
    return defaultUser
  },

  setCurrentUser(user: CurrentUser): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
  },

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
        const parsed: ResidentRecord[] = JSON.parse(local)
        // 既存の住人データに INITIAL_RESIDENTS の初期データが不足している場合は補完
        const existingIds = new Set(parsed.map((r) => r.id))
        const missing = INITIAL_RESIDENTS.filter((r) => !existingIds.has(r.id))
        const combined = missing.length > 0 ? [...parsed, ...missing] : parsed

        // 旧役職 統括メンバー等 の正規化とプロジェクト履歴の同期
        const normalized = combined.map((r) => {
          let role = r.role || '一般寮生'
          if (role.includes('統括リーダー') || role === 'HL') role = 'HL'
          else if (role.includes('有志メンバー') || role.includes('統括メンバー')) role = '一般寮生'
          else if (role.includes('サブリーダー') || role === 'IA') role = 'IA'
          else if (role.includes('FL')) role = 'FL'

          const initMatch = INITIAL_RESIDENTS.find((ir) => ir.id === r.id)
          const projectHistory = r.projectHistory && r.projectHistory.length > 0
            ? r.projectHistory
            : (initMatch?.projectHistory || [])

          return {
            ...r,
            role,
            projectHistory
          }
        })
        localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(normalized))
        return normalized
      } catch {
        // ignore
      }
    }
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(INITIAL_RESIDENTS))
    return INITIAL_RESIDENTS
  },

  async addResident(resident: Omit<ResidentRecord, 'id'>): Promise<ResidentRecord> {
    const newResident: ResidentRecord = {
      ...resident,
      roomType: resident.roomType || getUnitRoomType(resident.unit),
      projectHistory: resident.projectHistory || [],
      id: `r-${Date.now()}`
    }
    const current = await this.getResidents()
    const updated = [...current, newResident]
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updated))
    return newResident
  },

  async updateResident(id: string, updates: Partial<ResidentRecord>): Promise<ResidentRecord | null> {
    const current = await this.getResidents()
    const index = current.findIndex((r) => r.id === id)
    if (index === -1) return null
    const updatedRecord: ResidentRecord = {
      ...current[index],
      ...updates,
      roomType: updates.unit ? getUnitRoomType(updates.unit) : current[index].roomType
    }
    current[index] = updatedRecord
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(current))

    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('residents').update({
          name: updatedRecord.name,
          role: updatedRecord.role,
          avatar_url: updatedRecord.avatar,
          unit: updatedRecord.unit,
          memo: updatedRecord.memo
        }).eq('id', id)
      } catch (e) {
        console.warn('Supabase updateResident error:', e)
      }
    }
    return updatedRecord
  },

  async addProjectHistoryToResident(
    residentId: string,
    historyItem: Omit<ProjectHistoryItem, 'id'>
  ): Promise<ResidentRecord | null> {
    const current = await this.getResidents()
    const resident = current.find((r) => r.id === residentId)
    if (!resident) return null

    const newItem: ProjectHistoryItem = {
      ...historyItem,
      id: `ph-${Date.now()}`
    }
    const currentHistory = resident.projectHistory || []
    const updatedHistory = [newItem, ...currentHistory]
    return this.updateResident(residentId, { projectHistory: updatedHistory })
  },

  async updateProjectHistoryOfResident(
    residentId: string,
    historyId: string,
    updates: Partial<ProjectHistoryItem>
  ): Promise<ResidentRecord | null> {
    const current = await this.getResidents()
    const resident = current.find((r) => r.id === residentId)
    if (!resident) return null

    const currentHistory = resident.projectHistory || []
    const updatedHistory = currentHistory.map((item) =>
      item.id === historyId ? { ...item, ...updates } : item
    )
    return this.updateResident(residentId, { projectHistory: updatedHistory })
  },

  async deleteProjectHistoryFromResident(
    residentId: string,
    historyId: string
  ): Promise<ResidentRecord | null> {
    const current = await this.getResidents()
    const resident = current.find((r) => r.id === residentId)
    if (!resident) return null

    const currentHistory = resident.projectHistory || []
    const updatedHistory = currentHistory.filter((item) => item.id !== historyId)
    return this.updateResident(residentId, { projectHistory: updatedHistory })
  },

  async deleteResident(id: string): Promise<ResidentRecord[]> {
    const current = await this.getResidents()
    const updated = current.filter((r) => r.id !== id)
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updated))
    return updated
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
            ownerId: p.owner_id || undefined,
            nextAction: p.next_action,
            proposalsCount: p.proposals_count,
            createdAt: p.created_at ? p.created_at.slice(0, 10) : '2026-10-06',
            description: p.description || '',
            bannerImage: p.banner_image || undefined,
            members: p.members || [],
            meetingNotes: p.meeting_notes || undefined,
            proposalDoc: p.proposal_doc || undefined,
            schedule: p.schedule || undefined
          }))
        }
      } catch (e) {
        console.warn('Supabase getProjects fallback to local:', e)
      }
    }
    const local = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    if (local) {
      try {
        const parsed = JSON.parse(local)
        // 初期データに画像や議事録が追加された場合にマージして反映
        return parsed.map((p: ProjectRecord) => {
          const init = INITIAL_PROJECTS.find((ip) => ip.id === p.id)
          if (init) {
            return {
              ...init,
              ...p,
              bannerImage: p.bannerImage || init.bannerImage,
              meetingNotes: p.meetingNotes || init.meetingNotes,
              proposalDoc: p.proposalDoc || init.proposalDoc,
              schedule: p.schedule || init.schedule
            }
          }
          return p
        })
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

  async updateProject(id: string, updates: Partial<ProjectRecord>): Promise<ProjectRecord | null> {
    const current = await this.getProjects()
    let updatedProject: ProjectRecord | null = null
    const updated = current.map((p) => {
      if (p.id === id) {
        updatedProject = { ...p, ...updates }
        return updatedProject
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updatedProject
  },

  // --- スタッフのプロジェクト参加 ＆ 離脱 ---
  async joinProject(projectId: string, user: CurrentUser): Promise<ProjectRecord[]> {
    const current = await this.getProjects()
    const updated = current.map((p) => {
      if (p.id === projectId) {
        const alreadyMember = p.members.some((m) => m.residentId === user.id)
        if (alreadyMember) return p
        const newMember: ProjectMemberRecord = {
          residentId: user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          building: user.building,
          joinedAt: new Date().toISOString().slice(0, 10)
        }
        return {
          ...p,
          members: [...p.members, newMember]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))

    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('project_members').insert({
          project_id: projectId,
          resident_id: user.id,
          role: user.role
        })
      } catch (e) {
        console.warn('Supabase joinProject error:', e)
      }
    }
    return updated
  },

  async leaveProject(projectId: string, userId: string): Promise<ProjectRecord[]> {
    const current = await this.getProjects()
    const updated = current.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          members: p.members.filter((m) => m.residentId !== userId)
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))

    if (isSupabaseConfigured) {
      try {
        await (supabase as any).from('project_members').delete().match({
          project_id: projectId,
          resident_id: userId
        })
      } catch (e) {
        console.warn('Supabase leaveProject error:', e)
      }
    }
    return updated
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
  },

  // --- 人間 関係者 による直接スコアリング人事評価の保存 ＆ 名簿連携 ---
  async addEvaluation(evaluation: Omit<LeaderEvaluationRecord, 'id' | 'createdAt'>): Promise<LeaderEvaluationRecord> {
    const newEval: LeaderEvaluationRecord = {
      ...evaluation,
      id: `ev-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    }

    // 1. プロジェクト側に評価を蓄積
    const projects = await this.getProjects()
    const updatedProjects = projects.map((p) => {
      if (p.id === newEval.eventId) {
        return {
          ...p,
          evaluations: [...(p.evaluations || []), newEval]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

    // 2. 被評価者の名簿 ResidentRecord に人事カルテを蓄積
    const residents = await this.getResidents()
    const updatedResidents = residents.map((r) => {
      if (r.id === newEval.targetResidentId) {
        return {
          ...r,
          evaluations: [...(r.evaluations || []), newEval]
        }
      }
      return r
    })
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updatedResidents))

    return newEval
  },

  // --- イベント運営フェーズ ワークフローステージ の更新 ---
  async updateEventWorkflowStage(
    projectId: string,
    stage: 'planning' | 'ea_review' | 'nishimatsu_review' | 'action_prep' | 'rehearsal_day' | 'retrospective',
    progress: number
  ): Promise<void> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          workflowStage: stage,
          progress
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- 役職任命 ＆ 個人の名簿 経歴バッジ への自動記録 ---
  async assignEventRole(
    projectId: string,
    residentId: string,
    eventRole: 'PL' | 'GL' | 'メンバー' | 'EA',
    groupName?: string
  ): Promise<void> {
    const projects = await this.getProjects()
    const targetProject = projects.find((p) => p.id === projectId)
    if (!targetProject) return

    // 1. プロジェクト内メンバーの役職を更新
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          members: p.members.map((m) =>
            m.residentId === residentId ? { ...m, eventRole, groupName } : m
          )
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

    // 2. 名簿 ResidentRecord に経歴 EventRoleCareer を自動追記
    const residents = await this.getResidents()
    const updatedResidents = residents.map((r) => {
      if (r.id === residentId) {
        const existingCareers = r.careers || []
        const alreadyLogged = existingCareers.some((c) => c.eventId === projectId && c.role === eventRole)
        if (alreadyLogged) return r

        const newCareer: EventRoleCareer = {
          eventId: projectId,
          eventTitle: targetProject.title,
          role: eventRole,
          groupName,
          yearMonth: targetProject.createdAt.slice(0, 7),
          isCertifiedGl: eventRole === 'PL' || eventRole === 'GL'
        }
        return {
          ...r,
          careers: [...existingCareers, newCareer]
        }
      }
      return r
    })
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updatedResidents))
  },

  // --- 班・チームの追加・削除 企画規模に応じて柔軟に変更可能  ---
  async addGroupToProject(
    projectId: string,
    group: Omit<EventGroup, 'id'>
  ): Promise<EventGroup> {
    const newGroup: EventGroup = {
      ...group,
      id: `grp-${Date.now()}`
    }
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          groups: [...(p.groups || []), newGroup]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return newGroup
  },

  async removeGroupFromProject(projectId: string, groupId: string): Promise<void> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          groups: (p.groups || []).filter((g) => g.id !== groupId)
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- 業務フローステップの追加・更新・白紙作成 企画ごとの進行ステップにカスタマイズ  ---
  async createWorkflowFromScratch(
    projectId: string,
    initialSteps?: Omit<EventWorkflowStep, 'id'>[],
    type?: 'event' | 'operation'
  ): Promise<EventWorkflowStep[]> {
    const isOp = type === 'operation'
    const defaultInitial: EventWorkflowStep[] = (initialSteps || (isOp ? [
      { step: '1', title: '課題特定・実地調査', date: '初期調査', active: true, done: false },
      { step: '2', title: '試作機設置・検証', date: '検証フェーズ', active: false, done: false },
      { step: '3', title: '運用ルール・備品確定', date: '運用策定', active: false, done: false },
      { step: '4', title: '4棟配備・常時運用', date: '本番運用', active: false, done: false }
    ] : [
      { step: '1', title: 'アイデア・班決定', date: '初期フェーズ', active: true, done: false },
      { step: '2', title: '企画書・要件チェック', date: '企画フェーズ', active: false, done: false },
      { step: '3', title: '実働準備・リハ', date: '準備フェーズ', active: false, done: false },
      { step: '4', title: 'イベント当日', date: '本番', active: false, done: false },
      { step: '5', title: 'みんなの振り返り', date: '完了フェーズ', active: false, done: false }
    ])).map((s, idx) => ({
      ...s,
      id: `step-${Date.now()}-${idx}`
    }))

    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          projectType: type || p.projectType || 'event',
          isEventWorkflow: !isOp,
          workflowSteps: defaultInitial
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return defaultInitial
  },

  async addWorkflowStepToProject(
    projectId: string,
    step: Omit<EventWorkflowStep, 'id'>
  ): Promise<EventWorkflowStep> {
    const newStep: EventWorkflowStep = {
      ...step,
      id: `step-${Date.now()}`
    }
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const currentSteps = p.workflowSteps || []
        return {
          ...p,
          isEventWorkflow: true,
          workflowSteps: [...currentSteps, newStep]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return newStep
  },

  async removeWorkflowStep(projectId: string, stepId: string): Promise<void> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId && p.workflowSteps) {
        return {
          ...p,
          workflowSteps: p.workflowSteps.filter((s) => s.id !== stepId)
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  async updateWorkflowStep(
    projectId: string,
    stepId: string,
    updates: Partial<EventWorkflowStep>
  ): Promise<void> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId && p.workflowSteps) {
        return {
          ...p,
          workflowSteps: p.workflowSteps.map((st) => (st.id === stepId ? { ...st, ...updates } : st))
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- 議事録の追加 各フェーズ・会議ステップから直接格納可能  ---
  async addMeetingNote(
    projectId: string,
    note: {
      id?: string
      title: string
      date: string
      attendees: string[]
      summary: string
      decisions: string[]
      nextTodos: string[]
      tags?: string[]
      rawTranscript?: string
      updatedAt?: string
    }
  ): Promise<void> {
    const projects = await this.getProjects()
    const noteWithId = {
      ...note,
      id: note.id || `mn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: note.updatedAt || new Date().toISOString()
    }
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          meetingNotes: [noteWithId, ...(p.meetingNotes || [])]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- 議事録の編集・更新 ---
  async updateMeetingNote(
    projectId: string,
    noteIndexOrId: number | string,
    updatedNote: {
      id?: string
      title: string
      date: string
      attendees: string[]
      summary: string
      decisions: string[]
      nextTodos: string[]
      tags?: string[]
      rawTranscript?: string
      updatedAt?: string
    }
  ): Promise<void> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const notes = [...(p.meetingNotes || [])]
        if (typeof noteIndexOrId === 'number') {
          if (notes[noteIndexOrId]) {
            notes[noteIndexOrId] = {
              ...notes[noteIndexOrId],
              ...updatedNote,
              updatedAt: new Date().toISOString()
            }
          }
        } else {
          const idx = notes.findIndex((n) => n.id === noteIndexOrId)
          if (idx !== -1) {
            notes[idx] = {
              ...notes[idx],
              ...updatedNote,
              updatedAt: new Date().toISOString()
            }
          }
        }
        return {
          ...p,
          meetingNotes: notes
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
  },

  // --- スタッフの直接追加 ---
  async addStaffMemberToProject(
    projectId: string,
    member: ProjectMemberRecord
  ): Promise<ProjectRecord[]> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const exists = p.members.some((m) => m.residentId === member.residentId || m.name === member.name)
        if (exists) return p
        return {
          ...p,
          members: [...p.members, member]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updated
  },

  // --- スタッフの削除 ---
  async removeStaffMemberFromProject(
    projectId: string,
    residentId: string
  ): Promise<ProjectRecord[]> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          members: p.members.filter((m) => m.residentId !== residentId)
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updated
  },

  // --- 企画書添付ファイルの追加 PDF/Word等  ---
  async uploadProposalAttachment(
    projectId: string,
    attachment: ProposalAttachment
  ): Promise<ProjectRecord[]> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const existing = p.proposalAttachments || []
        return {
          ...p,
          proposalAttachments: [attachment, ...existing]
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updated
  },

  // --- 企画書添付ファイルの削除 ---
  async deleteProposalAttachment(
    projectId: string,
    attachmentId: string
  ): Promise<ProjectRecord[]> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const existing = p.proposalAttachments || []
        return {
          ...p,
          proposalAttachments: existing.filter((a) => a.id !== attachmentId)
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updated
  },

  // --- アプリ内企画書 ProjectProposalDoc の更新 ---
  async updateProposalDoc(
    projectId: string,
    proposalDoc: ProjectProposalDoc
  ): Promise<ProjectRecord[]> {
    const projects = await this.getProjects()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          proposalDoc: {
            ...(p.proposalDoc || {}),
            ...proposalDoc
          }
        }
      }
      return p
    })
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated))
    return updated
  }
}


