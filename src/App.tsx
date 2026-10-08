import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Camera,
  FileSpreadsheet,
  X,
  Zap,
  Lightbulb,
  PlayCircle,
  ClipboardCheck,
  Send,
  Trash2,
  ChevronRight,
  FileText,
  Database,
  Search,
  Users,
  UserPlus,
  CheckCircle2,
  Calendar,
  Home,
  ShieldAlert,
  ArrowLeft,
  Package,
  Archive,
  Building2,
  FolderOpen,
  Star,
  Award,
  ShieldCheck,
  UserCheck,
  Plus,
  Mic,
  MicOff,
  Tag,
  ChevronDown,
  Edit3,
  Check,
  Copy
} from 'lucide-react';
import {
  dbService,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type CurrentUser,
  type ResidentRecord,
  type ProjectMemberRecord,
  type LeaderEvaluationRecord,
  type EventGroup,
  type EventWorkflowStep
} from './lib/db';

interface MapNode {
  id: string;
  label: string;
  category: 'core' | 'idea' | 'detail' | 'obstacle';
}

interface Project {
  id: string;
  title: string;
  category: string;
  description?: string;
  bannerImage?: string;
  progress: number;
  owner: string;
  ownerId?: string;
  status: any;
  nextAction: string;
  createdAt?: string;
  projectType?: 'event' | 'operation';
  isEventWorkflow?: boolean;
  workflowStage?: string;
  workflowSteps?: EventWorkflowStep[];
  theme?: string;
  groups?: EventGroup[];
  evaluations?: LeaderEvaluationRecord[];
  members: ProjectMemberRecord[];
  meetingNotes?: {
    id?: string;
    date: string;
    title: string;
    attendees: string[];
    summary: string;
    decisions: string[];
    nextTodos: string[];
    tags?: string[];
    rawTranscript?: string;
    updatedAt?: string;
  }[];
  proposalDoc?: {
    title: string;
    purpose: string;
    background: string;
    hackStrategy: string;
    budget: string;
    steps: string[];
  };
  schedule?: {
    date: string;
    milestone: string;
    completed: boolean;
  }[];
}

interface Report {
  id: string;
  title: string;
  date: string;
  author: string;
  category: '見回り' | '清掃' | '設備点検' | 'イベント運営';
  content: string;
  status: 'submitted' | 'approved';
}

type Resident = ResidentRecord;

interface ArchiveDoc {
  id: string;
  title: string;
  category: '規約' | '申請書' | '過去の惜敗ログ' | '議事録';
  updatedAt: string;
  size: string;
}

export default function App() {
  // 4つのボトムナビゲーション項目
  const [activeTab, setActiveTab] = useState<'change' | 'progress' | 'work' | 'warehouse'>('change');
  const [selectedBuilding, setSelectedBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');

  // アイデア運営モーダルの開閉
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // モーダル入力
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaContent, setIdeaContent] = useState('');
  const [ideaProjectType, setIdeaProjectType] = useState<'event' | 'operation'>('event');
  const [meetingNoteText, setMeetingNoteText] = useState('');
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);

  // 📂 フロー項目クリック時の「全画面ファイル管理・閲覧ビュー」ステート
  // stepIdが指定された場合、全画面で左カラム（書類・ステップ一覧）と中央（ファイル閲覧・入力）を表示
  const [activeWorkflowStepView, setActiveWorkflowStepView] = useState<{ stepId: string; stepTitle: string } | null>(null);
  const [activeExplorerDoc, setActiveExplorerDoc] = useState<'proposal' | 'meeting' | 'evaluation' | 'rules'>('proposal');
  const [selectedEvaluationResidentId, setSelectedEvaluationResidentId] = useState<string | null>(null);

  // マッピングノード
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [newNodeLabel, setNewNodeLabel] = useState('');

  // 業務報告書作成用ステート
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportCategory, setReportCategory] = useState<'見回り' | '清掃' | '設備点検' | 'イベント運営'>('見回り');

  // 👤 ログイン中H生アカウント
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => dbService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 🔍 プロジェクト検索 ＆ 絞り込みフィルター
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [projectFilterMode, setProjectFilterMode] = useState<'all' | 'joined' | 'owned'>('all');

  // 新規寮生登録ステート
  const [newResidentName, setNewResidentName] = useState('');
  const [newResidentBuilding, setNewResidentBuilding] = useState<'rosemary' | 'basil' | 'turmeric' | 'paprika'>('rosemary');
  const [newResidentUnit, setNewResidentUnit] = useState('Unit 301 - A室');
  const [newResidentRole, setNewResidentRole] = useState('一般寮生');

  // 📖 全画面表示中のプロジェクトID ＆ 詳細タブ（ホーム / 企画書 / スタッフ）
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTab, setSelectedProjectTab] = useState<'home' | 'proposal' | 'members'>('home');

  // 📝 振り返り（関係者手動スコアリング）入力モーダル
  const [evalTargetResident, setEvalTargetResident] = useState<{ id: string; name: string; role: 'PL' | 'GL' | 'メンバー' } | null>(null);
  const [evalScores, setEvalScores] = useState({ facilitation: 5, communication: 5, safetyExternal: 5, scheduleBudget: 5 });
  const [evalGoodPoints, setEvalGoodPoints] = useState('');
  const [evalBadPoints, setEvalBadPoints] = useState('');
  const [evalVerdict, setEvalVerdict] = useState<'PL適格' | 'GL適格' | '専門実務向き' | '要フォロー'>('GL適格');

  // 🚩 班・チーム追加モーダルステート
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGlName, setNewGroupGlName] = useState('');
  const [newGroupMilestoneTitle, setNewGroupMilestoneTitle] = useState('');
  const [newGroupMilestoneDeadline, setNewGroupMilestoneDeadline] = useState('');

  // 🎯 業務フローステップ追加モーダルステート
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  // 📋 議事録追加モーダルステート（音声文字起こし・メモ入力 ＆ Google Meetクオリティ自動構造化）
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);
  const [newMeetingRawInput, setNewMeetingRawInput] = useState('');
  const [newMeetingAttendees, setNewMeetingAttendees] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [isGeneratingAiMeeting, setIsGeneratingAiMeeting] = useState(false);

  // 📖 議事録詳細表示・編集ステート（Googleドライブ風リストから開く）
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState<number | null>(null);
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [editMeetingTitle, setEditMeetingTitle] = useState('');
  const [editMeetingDate, setEditMeetingDate] = useState('');
  const [editMeetingAttendees, setEditMeetingAttendees] = useState('');
  const [editMeetingSummary, setEditMeetingSummary] = useState('');
  const [editMeetingDecisions, setEditMeetingDecisions] = useState('');
  const [editMeetingTodos, setEditMeetingTodos] = useState('');
  const [editMeetingTags, setEditMeetingTags] = useState('');
  const [meetingFilterTag, setMeetingFilterTag] = useState<string>('all');
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  // 👤 名簿詳細・活動振り返りカルテ閲覧モーダル
  const [selectedRosterResident, setSelectedRosterResident] = useState<ResidentRecord | null>(null);

  // 🏛️ 倉庫内の全画面表示セクション
  const [warehouseActiveView, setWarehouseActiveView] = useState<'hub' | 'roster' | 'inventory' | 'archives'>('hub');
  const [archiveFilterYear, setArchiveFilterYear] = useState<string>('all');

  // 備品在庫データ
  const [inventoryList] = useState([
    { id: 'inv1', name: '吸水ペーパータオルロール（予備）', category: 'キッチン衛生', quantity: 24, unit: '巻', status: '十分', location: 'ローズ1F 倉庫棚A-1', updated: '2026-10-06' },
    { id: 'inv2', name: 'マグネット式ロールディスペンサー', category: 'キッチン衛生', quantity: 6, unit: '個', status: '配備完了', location: 'ローズ・パプリカ各階', updated: '2026-10-05' },
    { id: 'inv3', name: 'Bluetooth サイレントヘッドホン', category: 'イベント機材', quantity: 30, unit: '台', status: '整備中', location: 'バジル1F 談話室ロッカー', updated: '2026-10-05' },
    { id: 'inv4', name: 'デジタル騒音測定器（デシベル計）', category: '実証計測器', quantity: 2, unit: '台', status: '良好', location: 'ローズ3F 事務局保管庫', updated: '2026-10-04' },
    { id: 'inv5', name: '玄関足型誘導ステッカー（予備）', category: '生活美化', quantity: 45, unit: '枚', status: '十分', location: 'パプリカ1F 棚B-3', updated: '2026-10-03' },
    { id: 'inv6', name: 'アウトドア大型BBQグリル', category: '共用備品', quantity: 2, unit: '台', status: '清掃済み', location: '中庭用 防火器具庫', updated: '2026-09-28' },
    { id: 'inv7', name: '折りたたみパイプ椅子', category: 'イベント用', quantity: 50, unit: '脚', status: '良好', location: 'ターメリック1F 倉庫', updated: '2026-09-20' },
  ]);

  // 年度別イベント資料・惜敗ログ
  const [yearlyArchives] = useState([
    {
      id: 'ya-1',
      year: '2026年度',
      title: '共有キッチン使い捨てロール化 導入申請書 ＆ 実証データ一式',
      category: '衛生・備品',
      format: 'PDF / Word',
      date: '2026-10-03',
      description: '初期費用4,800円の自治会費執行記録、西松建設提出用の器具仕様書、寮生満足度90%アンケート原本。',
      status: '公認採択'
    },
    {
      id: 'ya-2',
      year: '2026年度',
      title: '4棟エントランス認証共通化 学事・西松事前折衝議事録 ＆ 提案書案',
      category: '施設・防犯',
      format: 'Markdown / PDF',
      date: '2026-10-05',
      description: 'FelicaカードID一括登録によるコモンズ相互利用スキーム案と、防犯面での階段別施錠検証記録。',
      status: '交渉中'
    },
    {
      id: 'ya-3',
      year: '2025年度',
      title: '【惜敗ログ】中庭夜間DJイベント 騒音苦情による中止報告書 ＆ 顛末録',
      category: '過去の惜敗ログ',
      format: 'PDF / スライド',
      date: '2025-11-20',
      description: '音響スピーカー使用による周辺苦情発生の時系列分析と、「スピーカーを完全ゼロにするサイレント化」への教訓まとめ。',
      status: '惜敗分析済'
    },
    {
      id: 'ya-4',
      year: '2025年度',
      title: '【惜敗ログ】玄関オートロック物理リーダー増設 見積もり頓挫記録',
      category: '過去の惜敗ログ',
      format: 'PDF原本',
      date: '2025-07-15',
      description: '物理工事見積もり280万円により断念した記録。物理工事ではなく「ソフトウェア・カードID登録での突破」へ舵を切る契機となった重要資料。',
      status: '惜敗分析済'
    },
    {
      id: 'ya-5',
      year: '2024年度',
      title: 'SFC Hヴィレッジ 自治会創設総会議事録 ＆ 初代ハウス規約正本',
      category: '公式規約',
      format: 'PDF公認原本',
      date: '2024-04-10',
      description: '4棟共通の自治会運営方針、コモンズ利用規約、役員（FL/HL）選出規定のマスターファイル。',
      status: '永久保存'
    }
  ]);

  // 1. 進行中プロジェクト一覧（自分のアカウントで管理）
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'p1',
      title: '🏡 ローズ・パプリカ・ターメリック 玄関共通化 ＆ コモンズ相互開放',
      category: '施設・防犯',
      description: '全寮生利用可能規約の矛盾を解消し、物理工事なしで昼間限定スマホワンタイム認証運用を提案中。',
      progress: 65,
      owner: '岡本 直樹 (FL)',
      ownerId: 'r1',
      status: 'negotiating',
      nextAction: '西松建設・学事への提案書（代替案）提出',
      createdAt: '2026-10-03',
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
      ]
    },
    {
      id: 'p2',
      title: '🧻 キッチン布巾のペーパータオル化（フードコート方式）',
      category: '衛生・備品',
      description: '濡れた布巾を廃止し、衛生的なペーパータオルディスペンサーを試験導入。',
      progress: 85,
      owner: '岡本 直樹 ＆ 宗司 (HL)',
      ownerId: 'r1',
      status: 'testing',
      nextAction: 'ローズ3Fでの1週間試用アンケート回収',
      createdAt: '2026-10-01',
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
      ]
    },
    {
      id: 'p3',
      title: '🎧 夜間キャンパス企画（サイレントフェス方式）',
      category: '生活文化・交流',
      description: '騒音問題をクリアするため、Bluetoothヘッドホンを用いた屋外音楽イベントの思考実験。',
      progress: 30,
      owner: '伊藤 雄吉 ＆ 有志',
      ownerId: 'r2',
      status: 'planning',
      nextAction: 'ヘッドホン調達見積もり・次郎さんへの壁打ち',
      createdAt: '2026-10-05',
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
      ]
    }
  ]);

  // 2. 業務報告書一覧（はたらく）
  const [reports, setReports] = useState<Report[]>([
    {
      id: 'rep1',
      title: 'ローズ3F キッチン清掃 ＆ ゴミ分別状況の定期見回り',
      date: '2026-10-06 11:30',
      author: '岡本 直樹 (FL)',
      category: '見回り',
      content: '三角コーナーのゴミ回収完了。布巾の生乾き臭が依然として発生しているため、ペーパータオルの仮設置を推奨。',
      status: 'submitted'
    },
    {
      id: 'rep2',
      title: 'パプリカ1F エントランス靴箱 足型シール試作の経過観察',
      date: '2026-10-05 19:40',
      author: '佐藤 健太 (サブリーダー)',
      category: '設備点検',
      content: '床面に設置した足型シールの効果で、散らかりが約40%減少。今週いっぱい様子を見て他フロアへの展開を検討。',
      status: 'approved'
    }
  ]);

  // 3. 倉庫：寮生名簿データ
  const [residents, setResidents] = useState<Resident[]>([
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
  ]);

  // 4. 倉庫：過去の公認資料
  const [/* archiveDocs */] = useState<ArchiveDoc[]>([
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
      title: '【惜敗ログ】玄関カードリーダー共通化 頓挫の理由（西松・学事回答録）',
      category: '過去の惜敗ログ',
      updatedAt: '2025-11-20',
      size: '420 KB'
    },
    {
      id: 'a4',
      title: '2026-10-04 次郎さんMTG議事録（運営哲学 ＆ チームノート設計）',
      category: '議事録',
      updatedAt: '2026-10-04',
      size: '310 KB'
    }
  ]);

  // DB状態管理
  const [dbStatus, setDbStatus] = useState<string>('ローカル永続化');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // 初回マウント時にDBからデータ読み込み
  useEffect(() => {
    const initDb = async () => {
      try {
        const conn = await checkSupabaseConnection();
        if (isSupabaseConfigured && conn.success) {
          setDbStatus('Supabase接続');
          setIsDbConnected(true);
        } else {
          setDbStatus('ローカルDB永続化');
          setIsDbConnected(true);
        }

        const loadedProjects = await dbService.getProjects();
        if (loadedProjects && loadedProjects.length > 0) {
          setProjects(
            loadedProjects.map((p) => ({
              id: p.id,
              title: p.title,
              category: p.category || '企画',
              description: p.description || '',
              bannerImage: p.bannerImage,
              progress: p.progress,
              owner: p.owner,
              ownerId: p.ownerId,
              status: (p.status === '進行中' ? 'planning' : 'testing') as any,
              nextAction: p.nextAction,
              createdAt: p.createdAt,
              members: p.members || [],
              isEventWorkflow: p.isEventWorkflow,
              workflowStage: p.workflowStage,
              workflowSteps: p.workflowSteps,
              theme: p.theme,
              groups: p.groups,
              evaluations: p.evaluations,
              meetingNotes: p.meetingNotes,
              proposalDoc: p.proposalDoc,
              schedule: p.schedule
            }))
          );
        }

        const loadedReports = await dbService.getWorkReports();
        if (loadedReports && loadedReports.length > 0) {
          setReports(
            loadedReports.map((r) => ({
              id: r.id,
              title: r.title,
              date: r.submittedAt,
              author: r.reporter,
              category: (r.type === 'patrol' ? '見回り' : r.type === 'cleaning' ? '清掃' : '設備点検') as any,
              content: r.content,
              status: r.status === '報告完了' ? 'submitted' : 'approved'
            }))
          );
        }

        const loadedResidents = await dbService.getResidents();
        if (loadedResidents && loadedResidents.length > 0) {
          setResidents(loadedResidents);
        }
      } catch (err) {
        console.warn('DB initialization notice:', err);
      }
    };
    initDb();
  }, []);

  // 企画書出力ハンドラー
  const handleGenerateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim() && !ideaContent.trim()) return;

    const generatedNodes: MapNode[] = [
      { id: 'core', label: `🎯 ${ideaTitle || '新規アイデア'}`, category: 'core' },
      { id: 'n1', label: '現行ルールの隙間・抜け道スキャン', category: 'obstacle' },
      { id: 'n2', label: '現場での写真撮影・プロトタイプ検証', category: 'idea' },
      { id: 'n3', label: '次郎さん・管理会社との交渉ルート策定', category: 'detail' },
      { id: 'n4', label: '有志寮生への賛同集め・周知', category: 'detail' }
    ];

    setNodes(generatedNodes);
    setIsGenerated(true);
    setIsModalOpen(false);

    // 進行中プロジェクトにも自動登録 & DB保存
    const isOp = ideaProjectType === 'operation';
    const newProject: Project = {
      id: `pj-${Date.now()}`,
      title: ideaTitle || (isOp ? '新規日常改善プロジェクト' : '新規イベント企画'),
      category: isOp ? '衛生・備品' : 'イベント・交流',
      description: ideaContent,
      projectType: ideaProjectType,
      isEventWorkflow: !isOp,
      workflowSteps: isOp ? [
        { id: 'op-1', step: '1', title: '課題特定・実地調査', date: '初期調査', active: true, done: false },
        { id: 'op-2', step: '2', title: '試作機設置・検証', date: '検証フェーズ', active: false, done: false },
        { id: 'op-3', step: '3', title: '運用ルール・備品確定', date: '運用策定', active: false, done: false },
        { id: 'op-4', step: '4', title: '4棟配備・常時運用', date: '本番運用', active: false, done: false }
      ] : [
        { id: 'ev-1', step: '1', title: 'アイデア・班決定', date: '初期フェーズ', active: true, done: false },
        { id: 'ev-2', step: '2', title: '企画書・要件チェック', date: '企画フェーズ', active: false, done: false },
        { id: 'ev-3', step: '3', title: '実働準備・リハ', date: '準備フェーズ', active: false, done: false },
        { id: 'ev-4', step: '4', title: 'イベント当日', date: '本番', active: false, done: false },
        { id: 'ev-5', step: '5', title: 'みんなの振り返り', date: '完了フェーズ', active: false, done: false }
      ],
      progress: 15,
      owner: `${currentUser.name} (${currentUser.role})`,
      ownerId: currentUser.id,
      status: 'planning',
      nextAction: isOp ? '現場写真の撮影と運用課題ヒアリング' : 'キックオフMTG・班編成の検討',
      createdAt: new Date().toISOString().slice(0, 10),
      members: [
        {
          residentId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          role: currentUser.role,
          eventRole: isOp ? 'メンバー' : 'PL',
          building: currentUser.building,
          joinedAt: new Date().toISOString().slice(0, 10)
        }
      ]
    };
    setProjects([newProject, ...projects]);
    dbService.addProject({
      title: newProject.title,
      category: newProject.category,
      status: '進行中',
      progress: 15,
      owner: newProject.owner,
      ownerId: newProject.ownerId,
      nextAction: newProject.nextAction,
      proposalsCount: 1,
      description: newProject.description,
      projectType: newProject.projectType,
      isEventWorkflow: newProject.isEventWorkflow,
      workflowSteps: newProject.workflowSteps,
      members: newProject.members
    });
  };

  // 業務報告書の提出
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim() || !reportContent.trim()) return;

    const newReport: Report = {
      id: Date.now().toString(),
      title: reportTitle,
      date: 'たった今',
      author: `${currentUser.name} (${currentUser.role})`,
      category: reportCategory,
      content: reportContent,
      status: 'submitted'
    };

    setReports([newReport, ...reports]);
    dbService.addWorkReport({
      type: reportCategory === '見回り' ? 'patrol' : reportCategory === '清掃' ? 'cleaning' : 'facility',
      title: newReport.title,
      location: `${currentUser.building}棟`,
      content: newReport.content,
      status: '報告完了',
      reporter: newReport.author
    });
    setReportTitle('');
    setReportContent('');
    alert('業務報告書を提出しました！（データベースに保存完了）');
  };

  // スタッフ参加 / 離脱トグル
  const handleToggleJoin = async (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const isJoined = target.members.some((m) => m.residentId === currentUser.id);

    if (isJoined) {
      const updated = await dbService.leaveProject(projectId, currentUser.id);
      setProjects(
        updated.map((p) => ({
          ...p,
          status: (p.status === '進行中' ? 'planning' : 'testing') as any,
          members: p.members || []
        }))
      );
    } else {
      const updated = await dbService.joinProject(projectId, currentUser);
      setProjects(
        updated.map((p) => ({
          ...p,
          status: (p.status === '進行中' ? 'planning' : 'testing') as any,
          members: p.members || []
        }))
      );
    }
  };

  // H生アカウント切り替え
  const handleSwitchUser = (resident: ResidentRecord) => {
    const user: CurrentUser = {
      id: resident.id,
      name: resident.name,
      avatar: resident.avatar,
      building: resident.building,
      floor: resident.floor,
      unit: resident.unit,
      role: resident.role,
      roleType: resident.roleType,
      email: resident.email
    };
    setCurrentUser(user);
    dbService.setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // 新規H生登録
  const handleCreateNewResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResidentName.trim()) return;

    const newRes = await dbService.addResident({
      name: newResidentName.trim(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      building: newResidentBuilding,
      floor: 2,
      unit: newResidentUnit || 'Unit 201 - A室',
      role: newResidentRole || '一般寮生',
      roleType: 'member',
      email: `${newResidentName.toLowerCase().replace(/\s+/g, '')}@sfc.keio.ac.jp`,
      memo: '新規登録寮生'
    });

    setResidents([...residents, newRes]);
    handleSwitchUser(newRes);
    setNewResidentName('');
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;
    setNodes([...nodes, { id: Date.now().toString(), label: newNodeLabel, category: 'idea' }]);
    setNewNodeLabel('');
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', color: '#1c1917', paddingBottom: 95 }}>
      {/* 🍊 スマホ最適化オレンジヘッダー */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ea580c',
          color: '#fff',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              backgroundColor: '#fff',
              color: '#ea580c',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Flame size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>チームノート</h1>
              <span
                style={{
                  backgroundColor: '#ffedd5',
                  color: '#9a3412',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 999
                }}
              >
                H-Village
              </span>
            </div>
            <p style={{ fontSize: 11, opacity: 0.9 }}>組織のアイデアを爆速で形にするOS</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 💾 DB稼働インジケーター */}
          <div
            title={`データベース状態: ${dbStatus}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 8px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isDbConnected ? '#22c55e' : '#f59e0b',
                boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)'
              }}
            />
            <Database size={12} />
            <span style={{ fontSize: 10 }}>{dbStatus}</span>
          </div>

          {/* 👤 H生ログイン・切替ボタン */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#fff',
              color: '#ea580c',
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
            />
            <span>{currentUser.name} ({currentUser.roleType.toUpperCase()})</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>切替▼</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. 「イータを変える」（アイデアを出すホワイトボード） */}
      {/* ========================================================= */}
      {activeTab === 'change' && (
        <div
          className="whiteboard-grid"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 'calc(100vh - 165px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px 16px 40px',
            overflow: 'hidden'
          }}
        >
          {!isGenerated ? (
            <>
              {/* 上部・中央：まっさらなホワイトボード ＆ 「アイデア運営をスタート」丸ボタン */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  zIndex: 20
                }}
              >
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #fed7aa',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#ea580c',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)'
                  }}
                >
                  <Sparkles size={14} />
                  <span>イータ（H-Village）を変えるアイデア広場</span>
                </div>

                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1c1917', marginBottom: 8, letterSpacing: -0.5 }}>
                  まっさらなキャンバスから、イータを変えよう。
                </h2>
                <p style={{ fontSize: 13, color: '#78716c', maxWidth: 440, margin: '0 auto 30px', lineHeight: 1.6 }}>
                  ボタンを押して違和感ややりたいことをぶち込むと、写真や議事録と連携して企画書が自動出力されます。
                </p>

                {/* 🟠 中央の丸いボタン「アイデア運営をスタート」 */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="animate-pulse-btn"
                  style={{
                    width: 175,
                    height: 175,
                    borderRadius: '50%',
                    backgroundColor: '#ea580c',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: '0 12px 30px rgba(234, 88, 12, 0.45)',
                    border: '4px solid #fff'
                  }}
                >
                  <Zap size={36} />
                  <span style={{ fontSize: 16, fontWeight: 900, textAlign: 'center', lineHeight: 1.25 }}>
                    アイデア運営を<br />スタート
                  </span>
                </button>
              </div>

              {/* 💬 下部：イラスト風の吹き出しがポコポコ湧き上がる演出 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 160,
                  marginTop: 20,
                  pointerEvents: 'none'
                }}
              >
                {/* 吹き出し1 */}
                <div
                  className="anim-bubble-1"
                  style={{
                    position: 'absolute',
                    bottom: 20,
                    left: '5%',
                    backgroundColor: '#fff',
                    border: '2px solid #fdba74',
                    borderRadius: '16px 16px 16px 2px',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#9a3412',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>💭</span>
                  <span>「他棟の玄関オートロック、昼間だけ解錠できない？」</span>
                </div>

                {/* 吹き出し2 */}
                <div
                  className="anim-bubble-2"
                  style={{
                    position: 'absolute',
                    bottom: 60,
                    right: '8%',
                    backgroundColor: '#fff',
                    border: '2px solid #fdba74',
                    borderRadius: '16px 16px 2px 16px',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#9a3412',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>💭</span>
                  <span>「キッチンの布巾、いつも濡れてて不衛生じゃない？」</span>
                </div>

                {/* 吹き出し3 */}
                <div
                  className="anim-bubble-3"
                  style={{
                    position: 'absolute',
                    bottom: 95,
                    left: '25%',
                    backgroundColor: '#fff',
                    border: '2px solid #fdba74',
                    borderRadius: '16px 16px 16px 2px',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#9a3412',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>💡</span>
                  <span>「中庭で夜間にサイレントフェスやりたい！」</span>
                </div>

                {/* 吹き出し4 */}
                <div
                  className="anim-bubble-4"
                  style={{
                    position: 'absolute',
                    bottom: 15,
                    right: '32%',
                    backgroundColor: '#fff',
                    border: '2px solid #fdba74',
                    borderRadius: '16px 16px 2px 16px',
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#9a3412',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>💭</span>
                  <span>「玄関の靴、足型マーク貼ったら綺麗に揃ったよ！」</span>
                </div>
              </div>
            </>
          ) : (
            /* 企画書出力後のポコポコ広がるマッピング画面 */
            <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '2px solid #fed7aa',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                      🎉 企画書 ＆ マッピング出力完了
                    </span>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                      {ideaTitle || 'イータ改善プロジェクト企画書'}
                    </h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {ideaContent || '提出された文章と写真・議事録から自動マッピングと計画を構築しました。'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setActiveTab('progress')}
                      style={{
                        backgroundColor: '#ea580c',
                        color: '#fff',
                        padding: '10px 16px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <PlayCircle size={16} />
                      <span>進行中プロジェクトで管理</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsGenerated(false);
                        setNodes([]);
                      }}
                      style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}
                    >
                      リセット
                    </button>
                  </div>
                </div>
              </div>

              {/* マッピングキャンバス */}
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '2px dashed #fdba74',
                  borderRadius: 20,
                  padding: 24,
                  minHeight: 320,
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>🗺️ 自動生成された思考マッピング（ポコポコ展開）</h3>
                  <span style={{ fontSize: 12, color: '#78716c' }}>自由に増やしたり消したりできます</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', padding: '16px 0' }}>
                  {nodes.map((node) => {
                    const isCore = node.category === 'core';
                    const isObstacle = node.category === 'obstacle';
                    return (
                      <div
                        key={node.id}
                        style={{
                          backgroundColor: isCore ? '#ea580c' : isObstacle ? '#fee2e2' : '#ffedd5',
                          color: isCore ? '#fff' : isObstacle ? '#991b1b' : '#9a3412',
                          border: isCore ? '2px solid #c2410c' : isObstacle ? '1.5px solid #f87171' : '1.5px solid #fb923c',
                          borderRadius: 999,
                          padding: isCore ? '14px 24px' : '10px 18px',
                          fontSize: isCore ? 15 : 13,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                        }}
                      >
                        <span>{node.label}</span>
                        {!isCore && (
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            style={{ background: 'transparent', color: isObstacle ? '#ef4444' : '#a8a29e', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 手動追加 */}
                <form onSubmit={handleAddNode} style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <input
                    type="text"
                    value={newNodeLabel}
                    onChange={(e) => setNewNodeLabel(e.target.value)}
                    placeholder="＋ ノードを追加..."
                    style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: '#ea580c', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}
                  >
                    追加
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. 「進行中」（プロジェクト検索 ＆ スタッフ参加） */}
      {/* ========================================================= */}
      {activeTab === 'progress' && (() => {
        const filteredProjects = projects.filter((pj) => {
          // 検索語フィルター
          const q = projectSearch.toLowerCase().trim();
          const matchQuery =
            !q ||
            pj.title.toLowerCase().includes(q) ||
            (pj.description ? pj.description.toLowerCase().includes(q) : false) ||
            pj.owner.toLowerCase().includes(q) ||
            (pj.category && pj.category.toLowerCase().includes(q)) ||
            pj.members.some((m) => m.name.toLowerCase().includes(q));

          // カテゴリフィルター
          const matchCategory = selectedCategory === 'all' || pj.category === selectedCategory;

          // 参加モードフィルター
          let matchMode = true;
          if (projectFilterMode === 'joined') {
            matchMode = pj.members.some((m) => m.residentId === currentUser.id);
          } else if (projectFilterMode === 'owned') {
            matchMode = pj.ownerId === currentUser.id || pj.owner.includes(currentUser.name);
          }

          return matchQuery && matchCategory && matchMode;
        });

        const myJoinedCount = projects.filter((p) => p.members.some((m) => m.residentId === currentUser.id)).length;
        const myOwnedCount = projects.filter((p) => p.ownerId === currentUser.id || p.owner.includes(currentUser.name)).length;

        return (
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
            {/* ヘッダー部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1c1917' }}>
                  🚀 プロジェクト検索 ＆ スタッフ参加
                </h2>
                <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
                  H生が立ち上げたプロジェクトを検索し、スタッフとして自由に参加（ジョイン）できます。
                </p>
              </div>
              <button
                onClick={() => setActiveTab('change')}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
                }}
              >
                <Lightbulb size={16} />
                ＋ 新しいアイデアを出す
              </button>
            </div>

            {/* 🔍 リアルタイム検索バー */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#fff',
                  border: '1.5px solid #fed7aa',
                  borderRadius: 12,
                  padding: '10px 14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <Search size={18} color="#ea580c" />
                <input
                  type="text"
                  placeholder="プロジェクト名、発起人、参加スタッフ、キーワードで検索..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: 'transparent'
                  }}
                />
                {projectSearch && (
                  <button
                    onClick={() => setProjectSearch('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a8a29e' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* 🏷️ 絞り込みフィルター（参加状態 ＆ カテゴリ） */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {/* 所属・参加状態タブ */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                <button
                  onClick={() => setProjectFilterMode('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: projectFilterMode === 'all' ? '#1c1917' : '#fff',
                    color: projectFilterMode === 'all' ? '#fff' : '#57534e',
                    borderColor: projectFilterMode === 'all' ? '#1c1917' : '#e7e5e4',
                    whiteSpace: 'nowrap'
                  }}
                >
                  すべてのプロジェクト ({projects.length})
                </button>
                <button
                  onClick={() => setProjectFilterMode('joined')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: projectFilterMode === 'joined' ? '#ea580c' : '#fff',
                    color: projectFilterMode === 'joined' ? '#fff' : '#57534e',
                    borderColor: projectFilterMode === 'joined' ? '#ea580c' : '#e7e5e4',
                    whiteSpace: 'nowrap'
                  }}
                >
                  👥 自分が参加中 ({myJoinedCount})
                </button>
                <button
                  onClick={() => setProjectFilterMode('owned')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: projectFilterMode === 'owned' ? '#f97316' : '#fff',
                    color: projectFilterMode === 'owned' ? '#fff' : '#57534e',
                    borderColor: projectFilterMode === 'owned' ? '#f97316' : '#e7e5e4',
                    whiteSpace: 'nowrap'
                  }}
                >
                  👑 自分が発起 ({myOwnedCount})
                </button>
              </div>

              {/* カテゴリ別タグ */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {['all', '衛生・備品', '施設・防犯', '生活文化・交流', '自治運営', 'アイデア運営'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: selectedCategory === cat ? '#ffedd5' : '#f5f5f4',
                      color: selectedCategory === cat ? '#9a3412' : '#78716c',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat === 'all' ? '全カテゴリ' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* プロジェクト一覧 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredProjects.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px dashed #d6d3d1',
                    borderRadius: 16,
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: '#78716c'
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>一致するプロジェクトが見つかりませんでした</p>
                  <p style={{ fontSize: 12, color: '#a8a29e', marginBottom: 14 }}>検索条件を変えるか、新しいアイデアを発起してみましょう。</p>
                  <button
                    onClick={() => { setProjectSearch(''); setSelectedCategory('all'); setProjectFilterMode('all'); }}
                    style={{
                      backgroundColor: '#f5f5f4',
                      border: '1px solid #d6d3d1',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    検索フィルターをリセット
                  </button>
                </div>
              ) : (
                filteredProjects.map((pj) => {
                  const isJoined = pj.members.some((m) => m.residentId === currentUser.id);
                  // isOwner check

                  return (
                    <div
                      key={pj.id}
                      onClick={() => {
                        setSelectedProjectId(pj.id);
                        setSelectedProjectTab('home');
                      }}
                      style={{
                        backgroundColor: '#fff',
                        border: isJoined ? '2px solid #ea580c' : '1.5px solid #fed7aa',
                        borderRadius: 18,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: isJoined ? '0 6px 18px rgba(234, 88, 12, 0.16)' : '0 4px 14px rgba(0,0,0,0.04)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 22px rgba(234, 88, 12, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isJoined ? '0 6px 18px rgba(234, 88, 12, 0.16)' : '0 4px 14px rgba(0,0,0,0.04)';
                      }}
                    >
                      {/* 🎨 イベントイラスト（バナー） */}
                      <div style={{ position: 'relative', width: '100%', height: 160, backgroundColor: '#fed7aa', overflow: 'hidden' }}>
                        <img
                          src={
                            pj.bannerImage ||
                            (pj.category === '衛生・備品'
                              ? 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
                              : pj.category === '施設・防犯'
                              ? 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80'
                              : 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80')
                          }
                          alt={pj.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        {/* オーバーレイバッジ */}
                        <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 6 }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              color: '#ea580c',
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            {pj.category || 'イベント'}
                          </span>
                          {isJoined && (
                            <span
                              style={{
                                backgroundColor: '#15803d',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6
                              }}
                            >
                              ✅ 参加中
                            </span>
                          )}
                        </div>
                        <div style={{ position: 'absolute', bottom: 10, right: 12 }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Users size={12} />
                            スタッフ {pj.members.length}名
                          </span>
                        </div>
                      </div>

                      {/* 🏷️ イベントタイトル ＆ タップ導線 */}
                      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', lineHeight: 1.35 }}>
                            {pj.title}
                          </h3>
                          <span style={{ fontSize: 11, color: '#78716c', marginTop: 3, display: 'block' }}>
                            タップして企画書・議事録・スタッフ詳細を開く ➔
                          </span>
                        </div>
                        <ChevronRight size={18} color="#ea580c" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 📄 イベント詳細 全画面ページ（議事録・企画書・スタッフメンバー・進行計画） */}
      {/* ========================================================= */}
      {selectedProjectId && (() => {
        const pj = projects.find((p) => p.id === selectedProjectId);
        if (!pj) return null;
        const isJoined = pj.members.some((m) => m.residentId === currentUser.id);

        const banner =
          pj.bannerImage ||
          (pj.category === '衛生・備品'
            ? 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
            : pj.category === '施設・防犯'
            ? 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80'
            : 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80');

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#fafaf9',
              zIndex: 90,
              overflowY: 'auto',
              paddingBottom: 80,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 全画面トップナビゲーションバー */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 40,
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)'
              }}
            >
              <button
                onClick={() => setSelectedProjectId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.35)',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} />
                <span>一覧に戻る</span>
              </button>
              <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.95 }}>
                {pj.category} • イベント詳細
              </span>
              <button
                onClick={() => setSelectedProjectId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                maxWidth: 880,
                width: '100%',
                margin: '0 auto',
                backgroundColor: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                minHeight: 'calc(100vh - 54px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* トップバナー画像 */}
              <div style={{ position: 'relative', width: '100%', height: 200, backgroundColor: '#fed7aa', flexShrink: 0 }}>
                <img
                  src={banner}
                  alt={pj.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
                  <span
                    style={{
                      backgroundColor: '#ea580c',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 8
                    }}
                  >
                    {pj.category}
                  </span>
                </div>
              </div>

              {/* タイトル ＆ 参加ボタンヘッダー */}
              <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #f5f5f4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1c1917', lineHeight: 1.35, marginBottom: 6 }}>
                      {pj.title}
                    </h2>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#78716c', flexWrap: 'wrap' }}>
                      <span>発起人: <strong>{pj.owner}</strong></span>
                      <span>作成: {pj.createdAt || '2026-10-06'}</span>
                      <span style={{ color: '#ea580c', fontWeight: 800 }}>進捗: {pj.progress}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleJoin(pj.id)}
                    style={{
                      backgroundColor: isJoined ? '#f0fdf4' : '#ea580c',
                      color: isJoined ? '#15803d' : '#fff',
                      border: isJoined ? '1.5px solid #86efac' : 'none',
                      padding: '9px 18px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: isJoined ? 'none' : '0 2px 8px rgba(234, 88, 12, 0.25)'
                    }}
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 size={16} />
                        参加中（離脱する）
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        スタッフとして参加する
                      </>
                    )}
                  </button>
                </div>

                {/* タブナビゲーション（ホーム / 企画書 / スタッフ）※3項目にシンプル化 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid #e7e5e4', paddingBottom: 2, overflowX: 'auto' }}>
                  <button
                    onClick={() => setSelectedProjectTab('home')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'home' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'home' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Home size={15} />
                    ホーム
                  </button>
                  <button
                    onClick={() => setSelectedProjectTab('proposal')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'proposal' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'proposal' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <FileText size={15} />
                    企画書
                  </button>
                  <button
                    onClick={() => setSelectedProjectTab('members')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'members' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'members' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Users size={15} />
                    スタッフ ({pj.members.length})
                  </button>
                </div>
              </div>

              {/* タブコンテンツ */}
              <div style={{ padding: '20px', flex: 1 }}>
                {/* 0. ホームタブ（運営フロー・タイムライン・班編成） */}
                {selectedProjectTab === 'home' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* テーマバナー */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '16px 20px',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)'
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 0.5 }}>
                        EVENT SLOGAN & THEME
                      </span>
                      <h3 style={{ fontSize: 18, fontWeight: 900, margin: '4px 0 6px' }}>
                        {pj.theme || '今年のテーマは、それぞれの層が楽しめる！'}
                      </h3>
                      <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>
                        PL（監督）統括のもと、イベント班・装飾班・ディナー班が連携し、EA・西松承認を経て安全に成功を目指す運営フロー
                      </p>
                    </div>

                    {/* ⏱️ 運営タイムライン（白紙からの作成 ＆ 各ステップボタンからのダイレクト連動） */}
                    <div
                      style={{
                        backgroundColor: '#fff',
                        border: '1.5px solid #fed7aa',
                        borderRadius: 16,
                        padding: '18px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 900, color: '#1c1917' }}>
                              🎯 運営タイムライン（フェーズ ＆ 承認パイプライン）
                            </span>
                            <span style={{ fontSize: 10, color: '#ea580c', backgroundColor: '#fff7ed', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                              クリックして資料閲覧・入力
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginTop: 2 }}>
                            ※各ステップをクリックすると、該当フェーズの議事録・企画書・振り返り・タスクが直接開きます
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: 6 }}>
                            進行中
                          </span>
                          <button
                            onClick={() => {
                              setNewStepTitle('');
                              setNewStepDate('');
                              setIsAddStepModalOpen(true);
                            }}
                            style={{
                              backgroundColor: '#fff',
                              border: '1px solid #fed7aa',
                              color: '#ea580c',
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Plus size={12} />
                            ステップを追加
                          </button>
                        </div>
                      </div>

                      {/* 白紙状態：運営フローが未作成の場合 */}
                      {(!pj.workflowSteps || pj.workflowSteps.length === 0) ? (
                        <div
                          style={{
                            backgroundColor: '#fafaf9',
                            border: '2px dashed #fed7aa',
                            borderRadius: 14,
                            padding: '28px 20px',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                          <strong style={{ fontSize: 15, color: '#1c1917', display: 'block', marginBottom: 4 }}>
                            運営フローがまだ作成されていません
                          </strong>
                          <p style={{ fontSize: 12, color: '#78716c', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.6 }}>
                            白紙の状態から企画の運営フローを作成しましょう。{pj.projectType === 'operation' ? '日常改善向けのシンプル4フェーズ' : '標準の5大フェーズ'}が自動セットされ、自由に追加・変更できます。
                          </p>
                          <button
                            onClick={async () => {
                              await dbService.createWorkflowFromScratch(pj.id, undefined, pj.projectType);
                              const updated = await dbService.getProjects();
                              setProjects(updated);
                            }}
                            style={{
                              backgroundColor: '#ea580c',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 22px',
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)'
                            }}
                          >
                            <Plus size={16} />
                            ＋ 運営フローを作成する
                          </button>
                        </div>
                      ) : (
                        /* ステップバー：各ステップをクリックして全画面ファイル管理を開く */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 }}>
                          {pj.workflowSteps.map((st) => {
                            const isMeetingStep = st.title.includes('会議') || st.title.includes('アイデア') || st.title.includes('MTG');
                            const isProposalStep = st.title.includes('企画書') || st.title.includes('EA') || st.title.includes('西松') || st.title.includes('要件');
                            const isEvalStep = st.title.includes('振り返り') || st.title.includes('教訓') || st.title.includes('評価');

                            return (
                              <div
                                key={st.id || st.step}
                                onClick={() => {
                                  // フロー項目をタップしたときは全画面ファイル管理を開く
                                  setActiveWorkflowStepView({ stepId: st.id, stepTitle: st.title });
                                  if (isMeetingStep) setActiveExplorerDoc('meeting');
                                  else if (isEvalStep) setActiveExplorerDoc('evaluation');
                                  else if (st.title.includes('ルール') || st.title.includes('備品')) setActiveExplorerDoc('rules');
                                  else setActiveExplorerDoc('proposal');
                                }}
                                title="クリックしてこのステップの全画面ファイル管理・閲覧を開く"
                                style={{
                                  padding: '12px 10px',
                                  borderRadius: 12,
                                  backgroundColor: st.done ? '#f0fdf4' : st.active ? '#fff7ed' : '#ffffff',
                                  border: st.done ? '2px solid #86efac' : st.active ? '2px solid #fed7aa' : '1.5px solid #e2e8f0',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                  transition: 'all 0.15s ease',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(234, 88, 12, 0.15)';
                                  e.currentTarget.style.borderColor = '#ea580c';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                                  e.currentTarget.style.borderColor = st.done ? '#86efac' : st.active ? '#fed7aa' : '#e2e8f0';
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: 22,
                                      height: 22,
                                      borderRadius: '50%',
                                      backgroundColor: st.done ? '#16a34a' : st.active ? '#ea580c' : '#94a3b8',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      lineHeight: '22px'
                                    }}
                                  >
                                    {st.done ? '✓' : st.step}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 900, color: '#1c1917', lineHeight: 1.3 }}>
                                  {st.title}
                                </div>
                                <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginTop: 4 }}>
                                  {st.date}
                                </span>

                                {/* 押したときの誘導バッジ */}
                                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      color: isMeetingStep ? '#0284c7' : isProposalStep ? '#ea580c' : isEvalStep ? '#16a34a' : '#78716c',
                                      backgroundColor: isMeetingStep ? '#e0f2fe' : isProposalStep ? '#ffedd5' : isEvalStep ? '#dcfce7' : '#f1f5f9',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      display: 'inline-block'
                                    }}
                                  >
                                    📂 ファイルを開く ➔
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* イベント企画のみ承認パイプライン案内 */}
                      {pj.projectType !== 'operation' && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            backgroundColor: '#f8fafc',
                            borderRadius: 10,
                            border: '1px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ShieldCheck size={16} color="#0284c7" />
                            <span><strong>承認パイプライン:</strong> ① EA（次郎さん等）安全・予算チェック ➔ ② 西松建設 施設許可</span>
                          </div>
                          <span style={{ color: '#b45309', fontWeight: 800, backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
                            🔒 承認取得後に「決算書・注文」がアンロックされます
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1. 企画書タブ */}
                {selectedProjectTab === 'proposal' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: 14, borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Sparkles size={16} color="#ea580c" />
                        <h4 style={{ fontSize: 14, fontWeight: 900, color: '#9a3412' }}>企画の目的・目指す状態</h4>
                      </div>
                      <p style={{ fontSize: 13, color: '#431407', lineHeight: 1.6 }}>
                        {pj.proposalDoc?.purpose || pj.description || '寮生同士の快適な生活と新しい体験を創出する。'}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', padding: 14, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1c1917', marginBottom: 6 }}>
                        📋 現状の課題と背景
                      </h4>
                      <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.6 }}>
                        {pj.proposalDoc?.background || pj.description || '既存の仕組みやルールでは解決できなかった課題を整理。'}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <ShieldAlert size={16} color="#dc2626" />
                        <h4 style={{ fontSize: 13, fontWeight: 900, color: '#991b1b' }}>規約の抜け道・突破戦略（HACK）</h4>
                      </div>
                      <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
                        {pj.proposalDoc?.hackStrategy || '工事や高額予算を発生させず、運用ルールや既存設備の代替利用で解決する。'}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: 12, borderRadius: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>必要予算</span>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {pj.proposalDoc?.budget || '自己資金・有志カンパまたは自治会費'}
                        </p>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: 12, borderRadius: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>次やること</span>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
                          {pj.nextAction}
                        </p>
                      </div>
                    </div>

                    {pj.proposalDoc?.steps && (
                      <div style={{ backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', padding: 14, borderRadius: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1c1917', marginBottom: 8 }}>
                          📌 具体的な実行ステップ
                        </h4>
                        <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#44403c', lineHeight: 1.8 }}>
                          {pj.proposalDoc.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. スタッフタブ（班・チーム構成 ＆ 参加スタッフ一覧を集約） */}
                {selectedProjectTab === 'members' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* イベント企画のみ：班・チーム構成 ＆ 役職リーダー（GL / PL） */}
                    {pj.projectType !== 'operation' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <h4 style={{ fontSize: 15, fontWeight: 900, color: '#1c1917', margin: 0 }}>
                              🚩 班・チーム構成 ＆ 役職リーダー（GL / PL）
                            </h4>
                            <span style={{ fontSize: 11, color: '#78716c' }}>
                              ※小規模企画はチームを作らず全体進行可能。必要に応じて「班・チームを追加」できます。
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                              {(!pj.groups || pj.groups.length === 0) ? 'チームなし（単一進行）' : `全${pj.groups.length}班編成`}
                            </span>
                            <button
                              onClick={() => {
                                setNewGroupName('');
                                setNewGroupGlName('');
                                setNewGroupMilestoneTitle('');
                                setNewGroupMilestoneDeadline('');
                                setIsAddGroupModalOpen(true);
                              }}
                              style={{
                                backgroundColor: '#ea580c',
                                color: '#fff',
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '5px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Plus size={13} />
                              チーム・班を追加
                            </button>
                          </div>
                        </div>

                        {(!pj.groups || pj.groups.length === 0) ? (
                          <div
                            style={{
                              backgroundColor: '#fafaf9',
                              border: '1.5px dashed #cbd5e1',
                              borderRadius: 14,
                              padding: '20px',
                              textAlign: 'center'
                            }}
                          >
                            <strong style={{ fontSize: 13, color: '#1c1917', display: 'block', marginBottom: 2 }}>
                              この企画はチーム分けなしで全体で進めています
                            </strong>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px' }}>
                              少人数の有志企画やスモールプロジェクトではチーム編成不要です。
                            </p>
                            <button
                              onClick={() => {
                                setNewGroupName('');
                                setNewGroupGlName('');
                                setNewGroupMilestoneTitle('');
                                setNewGroupMilestoneDeadline('');
                                setIsAddGroupModalOpen(true);
                              }}
                              style={{
                                backgroundColor: '#fff',
                                border: '1.5px solid #ea580c',
                                color: '#ea580c',
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Plus size={12} />
                              分科会・班を作成する
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                            {pj.groups.map((grp) => {
                              const glMember = residents.find((r) => r.name === grp.glName);
                              const isCertifiedGl = glMember?.careers?.some((c) => c.isCertifiedGl) ?? false;

                              return (
                                <div
                                  key={grp.id}
                                  style={{
                                    backgroundColor: '#fff',
                                    border: '1.5px solid #fed7aa',
                                    borderRadius: 14,
                                    padding: '14px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <span style={{ fontSize: 14, fontWeight: 900, color: '#1c1917' }}>
                                        {grp.name}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                                          {grp.membersCount || 1}名
                                        </span>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`班「${grp.name}」を削除しますか？`)) {
                                              if (selectedProjectId) {
                                                await dbService.removeGroupFromProject(selectedProjectId, grp.id);
                                                const updated = await dbService.getProjects();
                                                setProjects(updated);
                                              }
                                            }
                                          }}
                                          title="班を削除"
                                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* GL情報 */}
                                    <div
                                      style={{
                                        backgroundColor: '#fff7ed',
                                        border: '1px solid #fed7aa',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        marginBottom: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                      }}
                                    >
                                      <div>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ea580c', display: 'block' }}>
                                          班のまとめ役（GL）
                                        </span>
                                        <strong style={{ fontSize: 13, color: '#1c1917' }}>
                                          {grp.glName || '未任命'}
                                        </strong>
                                      </div>
                                      {isCertifiedGl ? (
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <UserCheck size={11} />
                                          ★GL経験者
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>
                                          初GL挑戦
                                        </span>
                                      )}
                                    </div>

                                    {/* 班独自マイルストーン */}
                                    {grp.milestoneTitle && (
                                      <div style={{ backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: 6, fontSize: 11, color: '#475569', border: '1px solid #e2e8f0' }}>
                                        <span style={{ color: '#ea580c', fontWeight: 800, display: 'block' }}>
                                          先行締切: {grp.milestoneDeadline}
                                        </span>
                                        <span>{grp.milestoneTitle}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f5f5f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                      onClick={() => {
                                        if (glMember) setSelectedRosterResident(glMember);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ea580c',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        padding: 0
                                      }}
                                    >
                                      GLカルテ ➔
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#0369a1' }}>
                        💡 <strong>日常運営・設備改善プロジェクト:</strong> 班分けや臨時の役職（GL/PL）は設置せず、メンバー全員でフラットに協力して改善を進めます。
                      </div>
                    )}

                    {/* 参加スタッフ一覧 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 900, color: '#1c1917', margin: 0 }}>
                          👥 参加スタッフ一覧（{pj.members.length}名）
                        </h4>
                        <span style={{ fontSize: 11, color: '#78716c' }}>
                          誰でも自由に参加・協力できます
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {pj.members.map((m) => (
                          <div
                            key={m.residentId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: '10px 14px',
                              backgroundColor: '#fff',
                              border: '1.5px solid #fed7aa',
                              borderRadius: 12,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img
                                src={m.avatar}
                                alt={m.name}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <strong style={{ fontSize: 13, color: '#1c1917' }}>{m.name}</strong>
                                  {m.residentId === pj.ownerId && (
                                    <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                                      発起人
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 800, display: 'block', marginTop: 1 }}>
                                  {m.eventRole || m.role} {m.groupName ? `(${m.groupName})` : ''}
                                </span>
                                <span style={{ fontSize: 11, color: '#78716c' }}>
                                  {m.building}棟
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const r = residents.find((res) => res.id === m.residentId);
                                if (r) setSelectedRosterResident(r);
                              }}
                              style={{
                                backgroundColor: '#fff7ed',
                                border: '1px solid #fed7aa',
                                color: '#ea580c',
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '4px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              カルテ ➔
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 📂 フロー項目タップ時の「全画面ファイル管理・閲覧ビュー」 */}
      {/* 2枚目写真スタイル：左サイドバーで資料切替、中央・右でファイル閲覧・入力 */}
      {/* ========================================================= */}
      {activeWorkflowStepView && selectedProjectId && (() => {
        const pj = projects.find((p) => p.id === selectedProjectId);
        if (!pj) return null;

        // 閲覧権限チェック: ログインユーザーがPL, GL, 発起人(owner), または管理者(FL/HL)なら閲覧可能
        const myMemberRecord = pj.members.find((m) => m.residentId === currentUser.id);
        const myRole = myMemberRecord?.eventRole;
        const isOwner = pj.ownerId === currentUser.id;
        const isFlOrHl = currentUser.roleType === 'fl' || currentUser.roleType === 'hl';
        const canViewConfidentialEvaluations = isOwner || isFlOrHl || myRole === 'PL' || myRole === 'GL';

        // 振り返り提出状況
        const evaluationRecords = pj.evaluations || [];
        const activeEvalResident = pj.members.find((m) => m.residentId === selectedEvaluationResidentId) || pj.members[0];
        const currentResidentEval = evaluationRecords.find((ev) => ev.targetResidentId === activeEvalResident?.residentId);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#f8fafc',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* 1. 上部トップバー（写真2枚目スタイル） */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderBottom: '1.5px solid #e2e8f0',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setActiveWorkflowStepView(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#fff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.color = '#ea580c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                >
                  <ArrowLeft size={16} />
                  <span>← 戻る</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#ffedd5', color: '#9a3412', padding: '3px 8px', borderRadius: 6 }}>
                    {pj.title}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                    / {activeWorkflowStepView.stepTitle}（資料・ドキュメント管理）
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canViewConfidentialEvaluations ? (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={13} />
                    閲覧権限: GL・PL認証済
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={13} />
                    一般寮生モード（限定公開）
                  </span>
                )}
                <button
                  onClick={() => setActiveWorkflowStepView(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 2. メイン二分割レイアウト（写真2枚目のファイル管理スタイル） */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* 左サイドバー: ドキュメント・ファイル項目一覧 */}
              <div
                style={{
                  width: 250,
                  backgroundColor: '#ffffff',
                  borderRight: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto'
                }}
              >
                <div style={{ padding: '16px 14px 8px' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    書類・ファイル種別
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 8px 16px', gap: 4 }}>
                  {/* ① 企画書・要件書 */}
                  <button
                    onClick={() => setActiveExplorerDoc('proposal')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: activeExplorerDoc === 'proposal' ? '#ffedd5' : 'transparent',
                      color: activeExplorerDoc === 'proposal' ? '#9a3412' : '#334155',
                      fontWeight: activeExplorerDoc === 'proposal' ? 900 : 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} color={activeExplorerDoc === 'proposal' ? '#ea580c' : '#64748b'} />
                      <span>企画書・要件書</span>
                    </div>
                    <span style={{ fontSize: 10, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                      1件
                    </span>
                  </button>

                  {/* ② 会議議事録 */}
                  <button
                    onClick={() => setActiveExplorerDoc('meeting')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: activeExplorerDoc === 'meeting' ? '#ffedd5' : 'transparent',
                      color: activeExplorerDoc === 'meeting' ? '#9a3412' : '#334155',
                      fontWeight: activeExplorerDoc === 'meeting' ? 900 : 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSpreadsheet size={16} color={activeExplorerDoc === 'meeting' ? '#ea580c' : '#64748b'} />
                      <span>会議議事録・決定録</span>
                    </div>
                    <span style={{ fontSize: 10, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                      {pj.meetingNotes?.length || 0}件
                    </span>
                  </button>

                  {/* ③ イベント企画の場合: 振り返りカルテ */}
                  {pj.projectType !== 'operation' && (
                    <button
                      onClick={() => setActiveExplorerDoc('evaluation')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: activeExplorerDoc === 'evaluation' ? '#ffedd5' : 'transparent',
                        color: activeExplorerDoc === 'evaluation' ? '#9a3412' : '#334155',
                        fontWeight: activeExplorerDoc === 'evaluation' ? 900 : 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Star size={16} color={activeExplorerDoc === 'evaluation' ? '#ea580c' : '#64748b'} />
                        <span>スタッフ振り返り</span>
                      </div>
                      <span style={{ fontSize: 10, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                        {pj.members.length}名
                      </span>
                    </button>
                  )}

                  {/* ④ 日常運営の場合: 運用ルール・備品指示書 */}
                  {pj.projectType === 'operation' && (
                    <button
                      onClick={() => setActiveExplorerDoc('rules')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: activeExplorerDoc === 'rules' ? '#ffedd5' : 'transparent',
                        color: activeExplorerDoc === 'rules' ? '#9a3412' : '#334155',
                        fontWeight: activeExplorerDoc === 'rules' ? 900 : 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={16} color={activeExplorerDoc === 'rules' ? '#ea580c' : '#64748b'} />
                        <span>運用ルール・備品書</span>
                      </div>
                      <span style={{ fontSize: 10, backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4 }}>
                        確定
                      </span>
                    </button>
                  )}
                </div>

                {/* タイムライン全ステップ切り替えリスト */}
                <div style={{ padding: '14px 14px 8px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    全運営ステップ
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 8px 16px', gap: 2 }}>
                  {(pj.workflowSteps || []).map((step) => {
                    const isCurrent = step.id === activeWorkflowStepView.stepId;
                    return (
                      <button
                        key={step.id}
                        onClick={() => {
                          setActiveWorkflowStepView({ stepId: step.id, stepTitle: step.title });
                          if (step.title.includes('会議') || step.title.includes('MTG')) setActiveExplorerDoc('meeting');
                          else if (step.title.includes('振り返り')) setActiveExplorerDoc('evaluation');
                          else if (step.title.includes('ルール') || step.title.includes('備品')) setActiveExplorerDoc('rules');
                          else setActiveExplorerDoc('proposal');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: isCurrent ? '#f1f5f9' : 'transparent',
                          color: isCurrent ? '#ea580c' : '#64748b',
                          fontSize: 12,
                          fontWeight: isCurrent ? 800 : 600,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: step.done ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {step.done ? '✓' : step.step}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 中央・右エリア: 選択されたドキュメントの閲覧・操作画面 */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  overflowY: 'auto',
                  padding: '24px 32px'
                }}
              >
                {/* 1. 企画書・要件書ドキュメントビュー */}
                {activeExplorerDoc === 'proposal' && (
                  <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ea580c', paddingBottom: 12 }}>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1c1917', margin: '0 0 4px' }}>
                          📄 {pj.proposalDoc?.title || `${pj.title} 企画書・要件仕様書`}
                        </h2>
                        <span style={{ fontSize: 12, color: '#78716c' }}>
                          作成日: {pj.createdAt || '2026-10-06'} • 発起人: {pj.owner} • カテゴリ: {pj.category}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: 8, border: '1px solid #fed7aa' }}>
                        進捗: {pj.progress}%
                      </span>
                    </div>

                    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: 16, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 900, color: '#9a3412', margin: '0 0 6px' }}>
                        🎯 企画の目的・目指す状態
                      </h4>
                      <p style={{ fontSize: 13, color: '#431407', lineHeight: 1.7, margin: 0 }}>
                        {pj.proposalDoc?.purpose || pj.description || '寮生同士の快適な生活と新しい体験を創出する。'}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1c1917', margin: '0 0 6px' }}>
                        📋 現状の課題と背景
                      </h4>
                      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                        {pj.proposalDoc?.background || pj.description || '既存の仕組みやルールでは解決できなかった課題を整理。'}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: 16, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 900, color: '#991b1b', margin: '0 0 6px' }}>
                        🛡️ 規約の抜け道・突破戦略（HACK）
                      </h4>
                      <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.7, margin: 0 }}>
                        {pj.proposalDoc?.hackStrategy || '工事や高額予算を発生させず、運用ルールや既存設備の代替利用で解決する。'}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>必要予算</span>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {pj.proposalDoc?.budget || '自己資金・有志カンパまたは自治会費'}
                        </p>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: 14, borderRadius: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>次やること</span>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
                          {pj.nextAction}
                        </p>
                      </div>
                    </div>

                    {pj.proposalDoc?.steps && (
                      <div style={{ backgroundColor: '#fafaf9', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1c1917', margin: '0 0 8px' }}>
                          📌 具体的な実行ステップ
                        </h4>
                        <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#44403c', lineHeight: 1.8 }}>
                          {pj.proposalDoc.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. 会議議事録ドキュメントビュー（Googleドライブ風リスト ＆ 新しいものが一番上 ＆ タグ・出席者・展開編集） */}
                {activeExplorerDoc === 'meeting' && (
                  <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ea580c', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1c1917', margin: 0 }}>
                            📝 会議議事録ドライブ
                          </h2>
                          <span style={{ fontSize: 11, backgroundColor: '#ffedd5', color: '#9a3412', fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                            {pj.meetingNotes?.length || 0} 件
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#78716c', marginTop: 2, display: 'block' }}>
                          タイトル・日付・タグでスマート整理。タップでドキュメントを開いて閲覧・編集可能
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setNewMeetingRawInput('');
                          setNewMeetingAttendees('');
                          setIsAddMeetingModalOpen(true);
                        }}
                        style={{
                          backgroundColor: '#ea580c',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
                        }}
                      >
                        <Plus size={15} />
                        新規議事録を追加
                      </button>
                    </div>

                    {/* タグフィルターバー */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag size={13} />
                        タグ絞り込み:
                      </span>
                      {['all', '意思決定', '予算・備品', '対外折衝・承認', 'スケジュール', '企画検討'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setMeetingFilterTag(t)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: meetingFilterTag === t ? '#ea580c' : '#fff',
                            color: meetingFilterTag === t ? '#fff' : '#475569',
                            boxShadow: meetingFilterTag === t ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          {t === 'all' ? 'すべて' : `#${t}`}
                        </button>
                      ))}
                    </div>

                    {(!pj.meetingNotes || pj.meetingNotes.length === 0) ? (
                      <div style={{ backgroundColor: '#f8fafc', padding: 40, textAlign: 'center', borderRadius: 12, border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
                        <FileText size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                          まだ議事録が登録されていません
                        </div>
                        <p style={{ fontSize: 12, margin: 0 }}>
                          右上の「新規議事録を追加」ボタンから、メモや文字起こしを入力してGoogle Meetクオリティの議事録を自動生成してください。
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* 🌟 新しい議事録が必ず一番上に表示されるようにソート ＆ タグフィルター */}
                        {(() => {
                          const indexedNotes = (pj.meetingNotes || []).map((note, originalIdx) => ({
                            note,
                            originalIdx
                          }));
                          // 日付降順ソート（最新が上）
                          const sortedNotes = [...indexedNotes].sort((a, b) => (b.note.date || '').localeCompare(a.note.date || ''));
                          const filteredNotes = meetingFilterTag === 'all'
                            ? sortedNotes
                            : sortedNotes.filter((item) => item.note.tags?.includes(meetingFilterTag));

                          return filteredNotes.map(({ note: mn, originalIdx }) => {
                            const isExpanded = selectedMeetingIndex === originalIdx;

                            return (
                              <div
                                key={mn.id || originalIdx}
                                style={{
                                  backgroundColor: '#fff',
                                  border: isExpanded ? '2px solid #ea580c' : '1px solid #e2e8f0',
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isExpanded ? '0 6px 16px rgba(234, 88, 12, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)'
                                }}
                              >
                                {/* 📁 Googleドライブ風 1行サマリー行（クリックで開閉） */}
                                <div
                                  onClick={() => {
                                    if (isExpanded) {
                                      setSelectedMeetingIndex(null);
                                      setIsEditingMeeting(false);
                                    } else {
                                      setSelectedMeetingIndex(originalIdx);
                                      setIsEditingMeeting(false);
                                      // 編集フォーム初期化
                                      setEditMeetingTitle(mn.title);
                                      setEditMeetingDate(mn.date);
                                      setEditMeetingAttendees(mn.attendees.join(', '));
                                      setEditMeetingSummary(mn.summary);
                                      setEditMeetingDecisions(mn.decisions.join('\n'));
                                      setEditMeetingTodos(mn.nextTodos?.join('\n') || '');
                                      setEditMeetingTags(mn.tags?.join(', ') || '');
                                    }
                                  }}
                                  style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? '#fff7ed' : '#fff',
                                    borderBottom: isExpanded ? '1px solid #fed7aa' : 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        backgroundColor: isExpanded ? '#ea580c' : '#f1f5f9',
                                        color: isExpanded ? '#fff' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}
                                    >
                                      <FileSpreadsheet size={18} />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: 14, color: '#1c1917', fontWeight: 800 }}>
                                          {mn.title}
                                        </strong>
                                        {/* タグバッジ */}
                                        {(mn.tags || ['意思決定']).map((t, ti) => (
                                          <span
                                            key={ti}
                                            style={{
                                              fontSize: 10,
                                              backgroundColor: '#f1f5f9',
                                              color: '#475569',
                                              padding: '1px 6px',
                                              borderRadius: 4,
                                              fontWeight: 700
                                            }}
                                          >
                                            #{t}
                                          </span>
                                        ))}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#78716c', marginTop: 2 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <Calendar size={11} />
                                          {mn.date}
                                        </span>
                                        <span>•</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          <Users size={11} />
                                          {mn.attendees.length}名（{mn.attendees.slice(0, 3).join('、 ')}{mn.attendees.length > 3 ? '…' : ''}）
                                        </span>
                                        <span>•</span>
                                        <span style={{ color: '#166534', fontWeight: 700 }}>
                                          合意 {mn.decisions.length}件
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                                    <span style={{ fontSize: 11, color: isExpanded ? '#ea580c' : '#94a3b8', fontWeight: 800 }}>
                                      {isExpanded ? '閉じる' : '開く'}
                                    </span>
                                    <ChevronDown
                                      size={18}
                                      color={isExpanded ? '#ea580c' : '#94a3b8'}
                                      style={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s ease'
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* 📄 展開されたGoogleドキュメント風の議事録詳細 ＆ 直接編集 */}
                                {isExpanded && (
                                  <div style={{ padding: '20px', backgroundColor: '#fff' }}>
                                    {!isEditingMeeting ? (
                                      /* 閲覧モード */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* ヘッダー操作バー */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>出席者:</span>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                              {mn.attendees.map((att, ai) => (
                                                <span key={ai} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#334155', fontWeight: 600 }}>
                                                  👤 {att}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', gap: 8 }}>
                                            {/* ドキュメント形式コピー */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const textToCopy = `【議事録】${mn.title}\n開催日: ${mn.date}\n出席者: ${mn.attendees.join(', ')}\n\n■ 要約\n${mn.summary}\n\n■ 決定・合意事項\n${mn.decisions.map((d) => `・${d}`).join('\n')}\n\n■ 次のTODO\n${mn.nextTodos?.map((t) => `・${t}`).join('\n') || 'なし'}`;
                                                navigator.clipboard.writeText(textToCopy);
                                                setCopiedMeetingId(mn.id || String(originalIdx));
                                                setTimeout(() => setCopiedMeetingId(null), 2000);
                                              }}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #cbd5e1',
                                                backgroundColor: '#fff',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: '#334155',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              {copiedMeetingId === (mn.id || String(originalIdx)) ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                                              <span>{copiedMeetingId === (mn.id || String(originalIdx)) ? 'コピー完了' : 'テキストコピー'}</span>
                                            </button>

                                            {/* 直接編集ボタン */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditingMeeting(true);
                                              }}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '5px 12px',
                                                borderRadius: 6,
                                                border: '1px solid #ea580c',
                                                backgroundColor: '#fff7ed',
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: '#ea580c',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <Edit3 size={13} />
                                              <span>編集する</span>
                                            </button>
                                          </div>
                                        </div>

                                        {/* 1. エグゼクティブサマリー */}
                                        <div style={{ backgroundColor: '#fafaf9', padding: '14px 16px', borderRadius: 10, borderLeft: '4px solid #ea580c' }}>
                                          <span style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                                            📌 会議の全体要約（Executive Summary）
                                          </span>
                                          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>
                                            {mn.summary}
                                          </p>
                                        </div>

                                        {/* 2. 決定事項 */}
                                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px' }}>
                                          <span style={{ fontSize: 12, fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <CheckCircle2 size={16} color="#16a34a" />
                                            ✅ 決定・合意事項
                                          </span>
                                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#14532d', lineHeight: 1.8 }}>
                                            {mn.decisions.map((d, di) => (
                                              <li key={di} style={{ fontWeight: 600 }}>{d}</li>
                                            ))}
                                          </ul>
                                        </div>

                                        {/* 3. 次のTODO・アクションアイテム */}
                                        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 16px' }}>
                                          <span style={{ fontSize: 12, fontWeight: 900, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <Zap size={16} color="#ea580c" />
                                            🎯 次のアクションアイテム（TODO）
                                          </span>
                                          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#7c2d12', lineHeight: 1.8 }}>
                                            {(mn.nextTodos || []).map((t, ti) => (
                                              <li key={ti}>{t}</li>
                                            ))}
                                          </ul>
                                        </div>

                                        {/* 4. 原文（文字起こし・メモ）アコーディオン */}
                                        {mn.rawTranscript && (
                                          <details style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                                            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#475569' }}>
                                              📜 入力された音声文字起こし・メモ原文を表示
                                            </summary>
                                            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: '8px 12px', backgroundColor: '#fff', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                              {mn.rawTranscript}
                                            </div>
                                          </details>
                                        )}
                                      </div>
                                    ) : (
                                      /* 編集モードフォーム */
                                      <form
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          await dbService.updateMeetingNote(pj.id, originalIdx, {
                                            title: editMeetingTitle.trim(),
                                            date: editMeetingDate.trim(),
                                            attendees: editMeetingAttendees.split(/[,、\s]+/).map((s) => s.trim()).filter(Boolean),
                                            summary: editMeetingSummary.trim(),
                                            decisions: editMeetingDecisions.split('\n').map((s) => s.trim()).filter(Boolean),
                                            nextTodos: editMeetingTodos.split('\n').map((s) => s.trim()).filter(Boolean),
                                            tags: editMeetingTags.split(/[,、\s]+/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean),
                                            rawTranscript: mn.rawTranscript
                                          });
                                          const updated = await dbService.getProjects();
                                          setProjects(updated);
                                          setIsEditingMeeting(false);
                                        }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                                      >
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                                          <div>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                              議題・タイトル
                                            </label>
                                            <input
                                              type="text"
                                              value={editMeetingTitle}
                                              onChange={(e) => setEditMeetingTitle(e.target.value)}
                                              required
                                              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                            />
                                          </div>
                                          <div>
                                            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                              開催日
                                            </label>
                                            <input
                                              type="date"
                                              value={editMeetingDate}
                                              onChange={(e) => setEditMeetingDate(e.target.value)}
                                              required
                                              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                            />
                                          </div>
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                            出席者（カンマ区切り）
                                          </label>
                                          <input
                                            type="text"
                                            value={editMeetingAttendees}
                                            onChange={(e) => setEditMeetingAttendees(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                            タグ（カンマ区切り、例: 意思決定, 予算・備品）
                                          </label>
                                          <input
                                            type="text"
                                            value={editMeetingTags}
                                            onChange={(e) => setEditMeetingTags(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                            全体要約
                                          </label>
                                          <textarea
                                            value={editMeetingSummary}
                                            onChange={(e) => setEditMeetingSummary(e.target.value)}
                                            rows={2}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                            決定事項（改行で複数行）
                                          </label>
                                          <textarea
                                            value={editMeetingDecisions}
                                            onChange={(e) => setEditMeetingDecisions(e.target.value)}
                                            rows={3}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div>
                                          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 3 }}>
                                            次のTODO・アクションアイテム（改行で複数行）
                                          </label>
                                          <textarea
                                            value={editMeetingTodos}
                                            onChange={(e) => setEditMeetingTodos(e.target.value)}
                                            rows={3}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                          <button
                                            type="button"
                                            onClick={() => setIsEditingMeeting(false)}
                                            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                                          >
                                            キャンセル
                                          </button>
                                          <button
                                            type="submit"
                                            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#ea580c', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 800 }}
                                          >
                                            変更を保存する
                                          </button>
                                        </div>
                                      </form>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 振り返りドキュメントビュー（個人スタッフ一覧 ＆ 提出済/未提出 ＆ 権限制御） */}
                {activeExplorerDoc === 'evaluation' && (
                  <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ea580c', paddingBottom: 12 }}>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1c1917', margin: '0 0 4px' }}>
                          ⭐ スタッフ活動振り返り ＆ 人事カルテ管理
                        </h2>
                        <span style={{ fontSize: 12, color: '#78716c' }}>
                          人間（関係者）による直接スコアリング • AI自動採点完全排除
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: 8, border: '1px solid #fed7aa' }}>
                        提出済: {evaluationRecords.length} / {pj.members.length}名
                      </span>
                    </div>

                    {/* 🔒 閲覧権限チェック: 一般寮生の場合は非表示ガード */}
                    {!canViewConfidentialEvaluations ? (
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '2px dashed #fecaca',
                          borderRadius: 16,
                          padding: '36px 24px',
                          textAlign: 'center',
                          marginTop: 20
                        }}
                      >
                        <ShieldAlert size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#991b1b', margin: '0 0 6px' }}>
                          🔒 振り返りカルテはGL・PL限定で管理されています
                        </h3>
                        <p style={{ fontSize: 13, color: '#7f1d1d', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                          人事評価や課題の生々しい記録を保護するため、振り返り詳細の閲覧は監督（PL）および各班リーダー（GL）、または管理部のみに制限されています。
                        </p>
                      </div>
                    ) : (
                      /* GL・PL向け: 個人スタッフ一覧 ＆ 提出済・未提出ステータス ＆ 振り返り詳細 */
                      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>
                        {/* 左リスト: スタッフ一覧 ＆ 未提出バッジ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>
                            👥 対象スタッフ（選択して閲覧・入力）
                          </span>

                          {pj.members.map((m) => {
                            const isSubmitted = evaluationRecords.some((ev) => ev.targetResidentId === m.residentId);
                            const isSelected = (activeEvalResident?.residentId === m.residentId);

                            return (
                              <div
                                key={m.residentId}
                                onClick={() => setSelectedEvaluationResidentId(m.residentId)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                                  border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 2px 8px rgba(234, 88, 12, 0.15)' : 'none',
                                  transition: 'all 0.1s ease'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img src={m.avatar} alt={m.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                  <div>
                                    <strong style={{ fontSize: 13, color: '#1c1917', display: 'block' }}>{m.name}</strong>
                                    <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 800 }}>
                                      {m.eventRole || 'メンバー'} {m.groupName ? `(${m.groupName})` : ''}
                                    </span>
                                  </div>
                                </div>

                                {isSubmitted ? (
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                                    提出済
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>
                                    未提出
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 右エリア: 選択されたスタッフの振り返りカルテ詳細 ＆ 入力 */}
                        <div style={{ backgroundColor: '#fafaf9', border: '1.5px solid #fed7aa', borderRadius: 14, padding: 18 }}>
                          {activeEvalResident && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <img src={activeEvalResident.avatar} alt={activeEvalResident.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: '#1c1917' }}>
                                        {activeEvalResident.name}
                                      </h3>
                                      <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                                        {activeEvalResident.eventRole || 'メンバー'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#78716c' }}>
                                      所属: {activeEvalResident.groupName || '全体'} • {activeEvalResident.building}棟
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setEvalTargetResident({
                                      id: activeEvalResident.residentId,
                                      name: activeEvalResident.name,
                                      role: (activeEvalResident.eventRole as any) || 'メンバー'
                                    });
                                  }}
                                  style={{
                                    backgroundColor: '#ea580c',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Star size={13} />
                                  {currentResidentEval ? '振り返りを再編集' : '振り返りを記録・提出'}
                                </button>
                              </div>

                              {/* 記録された評価ログの表示 */}
                              {currentResidentEval ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                      評価者: <strong>{currentResidentEval.evaluatorName}</strong> ({currentResidentEval.evaluatorRole})
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                                      適性判定: {currentResidentEval.aptitudeVerdict}
                                    </span>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                                    {[
                                      { label: '統率・ファシリ', score: currentResidentEval.scores.facilitation },
                                      { label: '報連相・レスポンス', score: currentResidentEval.scores.communication },
                                      { label: '対外折衝・安全意識', score: currentResidentEval.scores.safetyExternal },
                                      { label: '期日・予算管理', score: currentResidentEval.scores.scheduleBudget }
                                    ].map((item, idx) => (
                                      <div key={idx} style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#64748b', display: 'block', fontWeight: 700 }}>
                                          {item.label}
                                        </span>
                                        <div style={{ color: '#ea580c', fontSize: 13, fontWeight: 900, marginTop: 2 }}>
                                          {'★'.repeat(item.score)}{'☆'.repeat(5 - item.score)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', display: 'block', marginBottom: 2 }}>
                                      👍 いい面・強み（生の声）
                                    </span>
                                    <p style={{ margin: 0, fontSize: 12, color: '#14532d', lineHeight: 1.5 }}>
                                      {currentResidentEval.goodPoints}
                                    </p>
                                  </div>

                                  {currentResidentEval.badPoints && (
                                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', display: 'block', marginBottom: 2 }}>
                                        ⚠️ 課題・フォロー要（非公開リーダーカルテ）
                                      </span>
                                      <p style={{ margin: 0, fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
                                        {currentResidentEval.badPoints}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                                  まだ {activeEvalResident.name} さんの振り返りは入力されていません。<br />
                                  右上の「振り返りを記録・提出」ボタンから関係者の手動スコアリングを入力できます。
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. 日常運営向け：運用ルール・備品指示書 */}
                {activeExplorerDoc === 'rules' && (
                  <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', paddingBottom: 12 }}>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
                          📦 運用ルール ＆ 備品・消耗品管理指示書
                        </h2>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          日常改善における定期補充・点検ルールと備品保管場所
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', backgroundColor: '#f0f9ff', padding: '4px 10px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                        常時運用中
                      </span>
                    </div>

                    <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: 16, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 900, color: '#0369a1', margin: '0 0 6px' }}>
                        📌 標準運用ルール（日常管理）
                      </h4>
                      <p style={{ fontSize: 13, color: '#082f49', lineHeight: 1.7, margin: 0 }}>
                        {pj.title} における現場ルールです。交代制当番や複雑な承認手続きを排除し、自主管理と定期巡回点検で清潔・安全を維持します。
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1c1917', margin: '0 0 8px' }}>
                        🔧 消耗品・予備パーツの保管先
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block' }}>保管場所</span>
                          <strong style={{ color: '#0f172a' }}>ローズ1F 倉庫棚 A-1 / 各棟談話室</strong>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', display: 'block' }}>発注基準</span>
                          <strong style={{ color: '#ea580c' }}>残量残り3ロール以下で自動追加購入</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 3. 「はたらく」（業務報告書を提出する） */}
      {/* ========================================================= */}
      {activeTab === 'work' && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
          {/* 業務報告書の提出フォーム */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '2px solid #fed7aa',
              borderRadius: 16,
              padding: 22,
              marginBottom: 24,
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ClipboardCheck size={22} color="#ea580c" />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1c1917' }}>
                📝 業務報告書を提出する
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#78716c', marginBottom: 16 }}>
              見回り、清掃、設備改善などのリアルな行動を報告書として記録・提出します。
            </p>

            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                  業務名 / タイトル
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="例: ローズ棟2F キッチン見回り ＆ 排水溝チェック"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                    分類
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="見回り">見回り</option>
                    <option value="清掃">清掃</option>
                    <option value="設備点検">設備点検</option>
                    <option value="イベント運営">イベント運営</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                  報告内容（行動事実・気づき・写真メモ）
                </label>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="例: キッチン排水溝のぬめり清掃完了。三角コーナーのゴミ袋が残り1枚なので補充が必要。"
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)'
                }}
              >
                <Send size={15} />
                <span>報告書を提出</span>
              </button>
            </form>
          </div>

          {/* 過去の提出済み報告書一覧 */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1c1917', marginBottom: 12 }}>
              📋 提出済み業務報告書一覧 ({reports.length}件)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e7e5e4',
                    borderRadius: 12,
                    padding: '14px 16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                        {rep.category}
                      </span>
                      <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1c1917' }}>{rep.title}</h4>
                    </div>
                    <span style={{ fontSize: 11, color: '#78716c' }}>{rep.date}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#44403c', lineHeight: 1.5 }}>{rep.content}</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#ea580c', fontWeight: 700 }}>
                    報告者: {rep.author} ｜ 状態: 提出完了
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 4. 「倉庫」（標識 ＆ 竪穴式倉庫イラスト ＆ 名簿・備品在庫・年度別資料の保管庫） */}
      {/* ========================================================= */}
      {activeTab === 'warehouse' && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
          {/* 🌐 デジタルHヴィレッジ 仮想保管空間（OZメタバースハブ ＆ 3大保管庫へのクリック遷移） */}
          {warehouseActiveView === 'hub' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* クリーンな仮想空間ヘッダー（茶色い標識バーを撤廃し、サマーウォーズの世界観に刷新） */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)'
                    }}
                  >
                    <Archive size={24} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#ea580c',
                          backgroundColor: '#fff7ed',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #fed7aa',
                          letterSpacing: 0.5
                        }}
                      >
                        DIGITAL H-VILLAGE METAVERSE
                      </span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '4px 0 2px', letterSpacing: -0.3 }}>
                      保管する
                    </h2>
                    <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
                      ここはHヴィレッジに関する様々なデータを保管します
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    padding: '8px 14px',
                    borderRadius: 30,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span>仮想寮データ同期中（4棟常時接続）</span>
                </div>
              </div>

              {/* 🌐 デジタル寮仮想空間（サマーウォーズ・OZ風メタバースビジュアル ＆ インタラクティブホットスポット） */}
              <div
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 24,
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)'
                }}
              >
                {/* 仮想空間画像 ＆ ホットスポットオーバーレイ */}
                <div style={{ position: 'relative', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                  <img
                    src="./digital_dorm_metaverse.jpg"
                    alt="H-Village デジタル寮 仮想空間（OZメタバースデータコア）"
                    style={{
                      width: '100%',
                      maxHeight: 480,
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />

                  {/* 1. 左側ホットスポット：名簿・ユニット台帳 */}
                  <div
                    onClick={() => setWarehouseActiveView('roster')}
                    style={{
                      position: 'absolute',
                      top: '16%',
                      left: '6%',
                      width: '27%',
                      height: '52%',
                      cursor: 'pointer',
                      borderRadius: 18,
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10,
                      textAlign: 'center',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="hover-scale-box"
                  >
                    <div style={{ backgroundColor: '#ea580c', color: '#fff', padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(234, 88, 12, 0.35)' }}>
                      <Users size={13} />
                      <span>寮生名簿台帳</span>
                    </div>
                    <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                      どのユニットに<br />誰がいるか
                    </span>
                    <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, marginTop: 8 }}>
                      全画面で開く ➔
                    </span>
                  </div>

                  {/* 2. 中央/上部ホットスポット：備品在庫ラック */}
                  <div
                    onClick={() => setWarehouseActiveView('inventory')}
                    style={{
                      position: 'absolute',
                      top: '10%',
                      left: '37%',
                      width: '26%',
                      height: '52%',
                      cursor: 'pointer',
                      borderRadius: 18,
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10,
                      textAlign: 'center',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="hover-scale-box"
                  >
                    <div style={{ backgroundColor: '#0284c7', color: '#fff', padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)' }}>
                      <Package size={13} />
                      <span>備品在庫ラック</span>
                    </div>
                    <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                      ペーパー・ヘッドホン<br />音響＆BBQ機材
                    </span>
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, marginTop: 8 }}>
                      全画面で開く ➔
                    </span>
                  </div>

                  {/* 3. 右側ホットスポット：年度別資料・惜敗ログ金庫 */}
                  <div
                    onClick={() => setWarehouseActiveView('archives')}
                    style={{
                      position: 'absolute',
                      top: '16%',
                      right: '6%',
                      width: '27%',
                      height: '52%',
                      cursor: 'pointer',
                      borderRadius: 18,
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 10,
                      textAlign: 'center',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="hover-scale-box"
                  >
                    <div style={{ backgroundColor: '#7c3aed', color: '#fff', padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)' }}>
                      <FolderOpen size={13} />
                      <span>年度別資料金庫</span>
                    </div>
                    <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 900, lineHeight: 1.3 }}>
                      過去企画・議事録<br />惜敗ログアーカイブ
                    </span>
                    <span style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, marginTop: 8 }}>
                      全画面で開く ➔
                    </span>
                  </div>

                  {/* 仮想空間タグ */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 14,
                      right: 16,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: '#0f172a',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '6px 14px',
                      fontSize: 11,
                      fontWeight: 800,
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>🌐</span>
                    <span>デジタル上のもうひとつの寮の世界（OZ空間）</span>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <p style={{ fontSize: 13, color: '#334155', margin: 0, fontWeight: 700 }}>
                    ✨ 仮想空間内の各保管コア、または下のカードをクリックすると、全画面で詳細データが開きます。
                  </p>
                  <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 800 }}>
                    名簿 ＆ 部屋割り当て / 備品在庫 / 年度別資料・惜敗ログ
                  </span>
                </div>
              </div>

              {/* 📦 倉庫に本当に保管されている3大セクションの選択カード */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* 1. 名簿（どのユニットに誰がいるか） */}
                <div
                  onClick={() => setWarehouseActiveView('roster')}
                  style={{
                    backgroundColor: '#fff',
                    border: '2px solid #fed7aa',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#ea580c';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#fed7aa';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: 10, borderRadius: 12 }}>
                        <Users size={24} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                        4棟・全3階
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1c1917', marginBottom: 6 }}>
                      👥 寮生名簿 ＆ 部屋割り当て台帳
                    </h3>
                    <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 16 }}>
                      どの棟のどのユニット・フロアに誰が住んでいるか、役職（FL/HL）や連絡先メモを一目で確認・検索できます。
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f5f5f4', color: '#ea580c', fontWeight: 800, fontSize: 13 }}>
                    <span>全画面で名簿を開く</span>
                    <ChevronRight size={16} />
                  </div>
                </div>

                {/* 2. 備品在庫 */}
                <div
                  onClick={() => setWarehouseActiveView('inventory')}
                  style={{
                    backgroundColor: '#fff',
                    border: '2px solid #fed7aa',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#ea580c';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#fed7aa';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: 10, borderRadius: 12 }}>
                        <Package size={24} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                        {inventoryList.length}品目
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1c1917', marginBottom: 6 }}>
                      📦 備品在庫 ＆ 機材管理台帳
                    </h3>
                    <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 16 }}>
                      ペーパータオル、ディスペンサー、サイレントヘッドホン、騒音測定器、BBQ機材などの在庫数・保管棚を管理。
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f5f5f4', color: '#ea580c', fontWeight: 800, fontSize: 13 }}>
                    <span>全画面で備品在庫を開く</span>
                    <ChevronRight size={16} />
                  </div>
                </div>

                {/* 3. 年度ごとに行ったイベントの資料 */}
                <div
                  onClick={() => setWarehouseActiveView('archives')}
                  style={{
                    backgroundColor: '#fff',
                    border: '2px solid #fed7aa',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#ea580c';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#fed7aa';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: 10, borderRadius: 12 }}>
                        <Archive size={24} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                        2024〜2026年度
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1c1917', marginBottom: 6 }}>
                      📑 年度別イベント資料 ＆ 惜敗ログ金庫
                    </h3>
                    <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 16 }}>
                      過去に実施されたイベント企画書原本、承認申請書、そして却下理由と突破法を記録した「惜敗ログ」の保管金庫です。
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f5f5f4', color: '#ea580c', fontWeight: 800, fontSize: 13 }}>
                    <span>全画面で年度別資料を開く</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 👥 全画面：どのユニットに誰がいるか（部屋割り当て名簿） */}
          {/* ========================================================= */}
          {warehouseActiveView === 'roster' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#fafaf9',
                zIndex: 90,
                overflowY: 'auto',
                paddingBottom: 80,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* 全画面ヘッダー */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 40,
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)'
                }}
              >
                <button
                  onClick={() => setWarehouseActiveView('hub')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>保管ポータルに戻る</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900 }}>
                  <Building2 size={18} />
                  <span>4棟・階別 部屋割り当て名簿（全画面）</span>
                </div>
                <div style={{ width: 40 }} />
              </div>

              <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
                {/* 4棟切り替えタブ */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                  {[
                    { key: 'rosemary', label: '🌿 ローズマリー棟' },
                    { key: 'basil', label: '🌱 バジル棟' },
                    { key: 'turmeric', label: '🟡 ターメリック棟' },
                    { key: 'paprika', label: '🌶️ パプリカ棟' }
                  ].map((b) => {
                    const isSelected = selectedBuilding === b.key;
                    return (
                      <button
                        key={b.key}
                        onClick={() => setSelectedBuilding(b.key as any)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 800,
                          backgroundColor: isSelected ? '#ea580c' : '#fff',
                          border: isSelected ? '2px solid #ea580c' : '1px solid #d6d3d1',
                          color: isSelected ? '#fff' : '#44403c',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 4px 12px rgba(234, 88, 12, 0.25)' : 'none'
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                {/* 階ごとの一覧 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[3, 2, 1].map((floorNum) => {
                    const floorResidents = residents.filter(
                      (r) => r.building === selectedBuilding && r.floor === floorNum
                    );

                    return (
                      <div key={floorNum} style={{ backgroundColor: '#fff', border: '1.5px solid #fed7aa', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#9a3412' }}>
                            第 {floorNum} 階 ユニット一覧
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#78716c' }}>
                            {floorResidents.length}名 入居中
                          </span>
                        </div>

                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {floorResidents.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                              この階の登録寮生はいません
                            </div>
                          ) : (
                            floorResidents.map((r) => (
                                <div
                                  key={r.id}
                                  onClick={() => setSelectedRosterResident(r)}
                                  style={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e7e5e4',
                                    borderRadius: 14,
                                    padding: '14px 18px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#ea580c';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e7e5e4';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <img src={r.avatar} alt={r.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 15, fontWeight: 900, color: '#1c1917' }}>{r.name}</span>
                                        <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                                          {r.role}
                                        </span>
                                        {/* ★GL経験者資格バッジ */}
                                        {r.careers?.some((c) => c.isCertifiedGl) && (
                                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <UserCheck size={11} />
                                            ★GL経験者
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#57534e', display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                        <span>🏠 <strong>{r.unit}</strong></span>
                                        <span>✉️ {r.email}</span>
                                      </div>

                                      {/* 歴代イベント役職バッジ一覧 */}
                                      {r.careers && r.careers.length > 0 && (
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                          {r.careers.map((c, ci) => (
                                            <span
                                              key={ci}
                                              style={{
                                                backgroundColor: '#f1f5f9',
                                                color: '#334155',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                border: '1px solid #e2e8f0'
                                              }}
                                            >
                                              🏅 {c.yearMonth}: {c.role} {c.groupName ? `(${c.groupName})` : ''}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ backgroundColor: '#fafaf9', padding: '6px 12px', borderRadius: 8, fontSize: 12, color: '#ea580c', fontWeight: 800, border: '1px solid #f5f5f4' }}>
                                      担当: {r.memo}
                                    </div>
                                    <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 800 }}>
                                      カルテ ➔
                                    </span>
                                  </div>
                                </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 📦 全画面：備品在庫（何がどこに何個あるか） */}
          {/* ========================================================= */}
          {warehouseActiveView === 'inventory' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#fafaf9',
                zIndex: 90,
                overflowY: 'auto',
                paddingBottom: 80,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* 全画面ヘッダー */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 40,
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)'
                }}
              >
                <button
                  onClick={() => setWarehouseActiveView('hub')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>保管ポータルに戻る</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900 }}>
                  <Package size={18} />
                  <span>備品在庫 ＆ 機材管理台帳（全画面）</span>
                </div>
                <div style={{ width: 40 }} />
              </div>

              <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
                <div style={{ backgroundColor: '#fff', border: '1.5px solid #fed7aa', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ padding: '16px 20px', backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: '#9a3412', margin: 0 }}>
                        リアルタイム備品・保管棚台帳
                      </h3>
                      <p style={{ fontSize: 12, color: '#78716c', margin: '2px 0 0' }}>
                        業務報告書（はたらくタブ）の提出に合わせて在庫数・補充状況が更新されます
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, backgroundColor: '#ea580c', color: '#fff', padding: '4px 10px', borderRadius: 20 }}>
                      合計 {inventoryList.length} 品目
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fafaf9', borderBottom: '1px solid #e7e5e4', fontSize: 12, color: '#57534e' }}>
                          <th style={{ padding: '12px 18px' }}>備品・機材名</th>
                          <th style={{ padding: '12px 14px' }}>分類</th>
                          <th style={{ padding: '12px 14px' }}>現在在庫数</th>
                          <th style={{ padding: '12px 14px' }}>保管場所 / 棚番</th>
                          <th style={{ padding: '12px 14px' }}>状態</th>
                          <th style={{ padding: '12px 18px', textAlign: 'right' }}>最終更新</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryList.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f4', fontSize: 13 }}>
                            <td style={{ padding: '14px 18px', fontWeight: 800, color: '#1c1917' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Package size={16} color="#ea580c" />
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 14px' }}>
                              <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                                {item.category}
                              </span>
                            </td>
                            <td style={{ padding: '14px 14px', fontWeight: 900, color: '#ea580c', fontSize: 14 }}>
                              {item.quantity} <span style={{ fontSize: 12, fontWeight: 600, color: '#78716c' }}>{item.unit}</span>
                            </td>
                            <td style={{ padding: '14px 14px', color: '#44403c', fontSize: 12, fontWeight: 600 }}>
                              📍 {item.location}
                            </td>
                            <td style={{ padding: '14px 14px' }}>
                              <span style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right', color: '#78716c', fontSize: 12 }}>
                              {item.updated}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 📑 全画面：年度別イベント資料 ＆ 惜敗ログ金庫 */}
          {/* ========================================================= */}
          {warehouseActiveView === 'archives' && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#fafaf9',
                zIndex: 90,
                overflowY: 'auto',
                paddingBottom: 80,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* 全画面ヘッダー */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 40,
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)'
                }}
              >
                <button
                  onClick={() => setWarehouseActiveView('hub')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>保管ポータルに戻る</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900 }}>
                  <Archive size={18} />
                  <span>年度別イベント資料 ＆ 惜敗ログ金庫（全画面）</span>
                </div>
                <div style={{ width: 40 }} />
              </div>

              <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
                {/* 年度フィルター */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 4 }}>
                  {['all', '2026年度', '2025年度', '2024年度'].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setArchiveFilterYear(yr)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 800,
                        backgroundColor: archiveFilterYear === yr ? '#ea580c' : '#fff',
                        border: archiveFilterYear === yr ? '1.5px solid #ea580c' : '1px solid #d6d3d1',
                        color: archiveFilterYear === yr ? '#fff' : '#57534e',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {yr === 'all' ? '全年度の資料' : yr}
                    </button>
                  ))}
                </div>

                {/* 資料リスト */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {yearlyArchives
                    .filter((doc) => archiveFilterYear === 'all' || doc.year === archiveFilterYear)
                    .map((doc) => {
                      const isLost = doc.category === '過去の惜敗ログ';
                      return (
                        <div
                          key={doc.id}
                          style={{
                            backgroundColor: '#fff',
                            border: isLost ? '1.5px solid #fca5a5' : '1.5px solid #fed7aa',
                            borderRadius: 16,
                            padding: '18px 20px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  backgroundColor: isLost ? '#fef2f2' : '#ffedd5',
                                  color: isLost ? '#b91c1c' : '#9a3412',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 6
                                }}
                              >
                                {doc.category}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
                                {doc.year} ({doc.date})
                              </span>
                            </div>

                            <span
                              style={{
                                backgroundColor: isLost ? '#fee2e2' : '#ecfdf5',
                                color: isLost ? '#dc2626' : '#15803d',
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6
                              }}
                            >
                              {doc.status}
                            </span>
                          </div>

                          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1c1917', marginBottom: 6 }}>
                            {doc.title}
                          </h3>

                          <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.6, marginBottom: 14 }}>
                            {doc.description}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f5f5f4' }}>
                            <span style={{ fontSize: 12, color: '#78716c' }}>形式: {doc.format}</span>
                            <button
                              onClick={() => alert()}
                              style={{
                                backgroundColor: '#fff',
                                border: '1px solid #ea580c',
                                color: '#ea580c',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <FolderOpen size={14} />
                              閲覧・展開
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ========================================================= */}
      {/* 🌟 ぽんっとバウンドして出現するアイデア運営入力モーダル */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            className="animate-pop"
            style={{
              backgroundColor: '#fff',
              width: '100%',
              maxWidth: 580,
              borderRadius: 24,
              border: '2px solid #fed7aa',
              boxShadow: '0 25px 50px -12px rgba(234, 88, 12, 0.35)',
              overflow: 'hidden'
            }}
          >
            {/* モーダルヘッダー */}
            <div
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} />
                <h3 style={{ fontSize: 17, fontWeight: 900 }}>💡 イータを変えるアイデア入力（企画書出力）</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* モーダルフォーム */}
            <form onSubmit={handleGenerateProposal} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  企画の種別 <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIdeaProjectType('event')}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: ideaProjectType === 'event' ? '2px solid #ea580c' : '1.5px solid #cbd5e1',
                      backgroundColor: ideaProjectType === 'event' ? '#fff7ed' : '#fff',
                      color: ideaProjectType === 'event' ? '#ea580c' : '#475569',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🎪</span>
                    <span>イベント企画</span>
                    <span style={{ fontSize: 10, color: '#78716c', fontWeight: 600 }}>班編成・GL任命・振り返り</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIdeaProjectType('operation')}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: ideaProjectType === 'operation' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                      backgroundColor: ideaProjectType === 'operation' ? '#f0f9ff' : '#fff',
                      color: ideaProjectType === 'operation' ? '#0284c7' : '#475569',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🧹</span>
                    <span>施設・日常運営</span>
                    <span style={{ fontSize: 10, color: '#78716c', fontWeight: 600 }}>布巾交換等のシンプル改善</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  プロジェクト名 / タイトル
                </label>
                <input
                  type="text"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder={ideaProjectType === 'event' ? "例: クリスマス大感謝祭、ハロウィン交流会" : "例: パプリカ・キッチン布巾使い捨て化、玄関オートロック共通化"}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  何を変えたいか・やりたいこと（文章）
                </label>
                <textarea
                  value={ideaContent}
                  onChange={(e) => setIdeaContent(e.target.value)}
                  placeholder="例: コモンズは全員使えるのに玄関オートロックで他棟の人が入れない矛盾を解消したい。スマホ認証のワンタイムパス運用を大学に提案したい。"
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* 写真挿入 ＆ 議事録挿入ボタン */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label
                  style={{
                    border: '1.5px dashed #ea580c',
                    backgroundColor: '#fff7ed',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <Camera size={20} color="#ea580c" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#9a3412' }}>
                    {attachedImageName ? `📷 ${attachedImageName}` : '📷 写真・参考資料を挿入'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedImageName(e.target.files[0].name);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMeetingNoteText('2026-10-04 次郎さんMTG（玄関問題・布巾申請ルートの合意事項）');
                  }}
                  style={{
                    border: '1.5px dashed #0284c7',
                    backgroundColor: '#f0f9ff',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <FileSpreadsheet size={20} color="#0284c7" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0369a1' }}>
                    {meetingNoteText ? '📑 議事録を読み込み済' : '📑 議事録を挿入'}
                  </span>
                </button>
              </div>

              {meetingNoteText && (
                <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#166534' }}>
                  ✅ 読み込み完了: {meetingNoteText}
                </div>
              )}

              <button
                type="submit"
                style={{
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(234, 88, 12, 0.35)',
                  marginTop: 4
                }}
              >
                <Sparkles size={18} />
                <span>企画書を出力 ＆ マッピング展開</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📱 すりガラス調フローティング・ボトムナビゲーション（4大項目） */}
      {/* ========================================================= */}
      <nav
        style={{
          position: 'fixed',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: 480,
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(254, 215, 170, 0.85)',
          borderRadius: 999,
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 15px rgba(234, 88, 12, 0.1)',
          zIndex: 50
        }}
      >
        {/* 1. イータを変える */}
        <button
          onClick={() => setActiveTab('change')}
          style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'change' ? '#ea580c' : '#64748b',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <div
            style={{
              backgroundColor: activeTab === 'change' ? '#ffedd5' : 'transparent',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Lightbulb size={18} strokeWidth={activeTab === 'change' ? 2.8 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800 }}>イータを変える</span>
        </button>

        {/* 2. 進行中 */}
        <button
          onClick={() => setActiveTab('progress')}
          style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'progress' ? '#ea580c' : '#64748b',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <div
            style={{
              backgroundColor: activeTab === 'progress' ? '#ffedd5' : 'transparent',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PlayCircle size={18} strokeWidth={activeTab === 'progress' ? 2.8 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800 }}>進行中</span>
        </button>

        {/* 3. はたらく */}
        <button
          onClick={() => setActiveTab('work')}
          style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'work' ? '#ea580c' : '#64748b',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <div
            style={{
              backgroundColor: activeTab === 'work' ? '#ffedd5' : 'transparent',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ClipboardCheck size={18} strokeWidth={activeTab === 'work' ? 2.8 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800 }}>はたらく</span>
        </button>

        {/* 4. 倉庫 */}
        {/* 4. 保管する */}
        <button
          onClick={() => setActiveTab('warehouse')}
          style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'warehouse' ? '#ea580c' : '#64748b',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          <div
            style={{
              backgroundColor: activeTab === 'warehouse' ? '#ffedd5' : 'transparent',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Archive size={18} strokeWidth={activeTab === 'warehouse' ? 2.8 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800 }}>保管する</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* 👤 H生ログイン ＆ アカウント切替モーダル */}
      {/* ========================================================= */}
      {isAuthModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              maxWidth: 500,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            {/* モーダルヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: 6, borderRadius: 8 }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1c1917' }}>H生ログイン ＆ 切替</h3>
                  <p style={{ fontSize: 11, color: '#78716c' }}>Hヴィレッジ寮生としてログインし、プロジェクトに参加・発起します</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78716c' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 現在ログイン中のユーザー */}
            <div
              style={{
                backgroundColor: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20
              }}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ea580c' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#1c1917' }}>{currentUser.name}</span>
                  <span style={{ backgroundColor: '#ea580c', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                    ログイン中
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>
                  {currentUser.building.toUpperCase()}棟 ｜ {currentUser.unit} ｜ {currentUser.role}
                </div>
              </div>
            </div>

            {/* 寮生を選択してワンクリックログイン */}
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#44403c', marginBottom: 10 }}>
              🏡 登録済みH生からワンタップ切替:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {residents.map((r) => {
                const isCurrent = r.id === currentUser.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSwitchUser(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isCurrent ? '2px solid #ea580c' : '1px solid #e7e5e4',
                      backgroundColor: isCurrent ? '#fff7ed' : '#fafaf9',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={r.avatar}
                        alt={r.name}
                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1c1917' }}>
                          {r.name}
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#78716c', marginLeft: 6 }}>
                            ({r.role})
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#a8a29e' }}>
                          {r.building}棟 {r.unit}
                        </div>
                      </div>
                    </div>

                    <button
                      style={{
                        backgroundColor: isCurrent ? '#ea580c' : '#fff',
                        color: isCurrent ? '#fff' : '#ea580c',
                        border: isCurrent ? 'none' : '1px solid #fed7aa',
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {isCurrent ? '選択中' : 'ログイン'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ＋ 新規H生として参加・登録 */}
            <div style={{ borderTop: '1px solid #e7e5e4', paddingTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#44403c', marginBottom: 10 }}>
                ＋ 新しいH生として登録・ログイン:
              </h4>
              <form onSubmit={handleCreateNewResident} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <input
                    type="text"
                    placeholder="氏名（例: 中村 蓮）"
                    value={newResidentName}
                    onChange={(e) => setNewResidentName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #d6d3d1',
                      fontSize: 13
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select
                    value={newResidentBuilding}
                    onChange={(e) => setNewResidentBuilding(e.target.value as any)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d6d3d1',
                      fontSize: 12,
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="rosemary">ローズマリー棟</option>
                    <option value="basil">バジル棟</option>
                    <option value="turmeric">ターメリック棟</option>
                    <option value="paprika">パプリカ棟</option>
                  </select>
                  <input
                    type="text"
                    placeholder="部屋番号（例: Unit 202 - B室）"
                    value={newResidentUnit}
                    onChange={(e) => setNewResidentUnit(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d6d3d1',
                      fontSize: 12
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="役職（例: 一般寮生 / 広報担当）"
                    value={newResidentRole}
                    onChange={(e) => setNewResidentRole(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d6d3d1',
                      fontSize: 12
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#ea580c',
                      color: '#fff',
                      padding: '9px 14px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    登録＆ログイン
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ⭐ 人間（関係者）による手動スコアリング評価モーダル */}
      {/* ========================================================= */}
      {evalTargetResident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.9 }}>
                  REFLECTION & REVIEW (AI自動採点完全排除・関係者手動入力)
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 900, margin: '2px 0 0' }}>
                  ⭐ {evalTargetResident.name} さんへの振り返りを記録
                </h3>
              </div>
              <button
                onClick={() => setEvalTargetResident(null)}
                style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedProjectId) return;
                const pj = projects.find((p) => p.id === selectedProjectId);
                await dbService.addEvaluation({
                  eventId: selectedProjectId,
                  eventTitle: pj?.title || 'イベント',
                  targetResidentId: evalTargetResident.id,
                  targetResidentName: evalTargetResident.name,
                  targetRole: evalTargetResident.role,
                  evaluatorId: currentUser.id,
                  evaluatorName: currentUser.name,
                  evaluatorRole: (currentUser.roleType === 'fl' ? 'PL' : 'GL') as any,
                  scores: evalScores,
                  goodPoints: evalGoodPoints || 'メンバーと円滑に連携し責任を持って担当業務を遂行した。',
                  badPoints: evalBadPoints,
                  aptitudeVerdict: evalVerdict,
                  isConfidential: true
                });
                const updatedProjects = await dbService.getProjects();
                const updatedResidents = await dbService.getResidents();
                setProjects(updatedProjects);
                setResidents(updatedResidents);
                setEvalTargetResident(null);
                setEvalGoodPoints('');
                setEvalBadPoints('');
                alert(`${evalTargetResident.name}さんへの振り返りを保存し、活動カルテへ統合しました！`);
              }}
              style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ backgroundColor: '#fff7ed', padding: '10px 14px', borderRadius: 10, border: '1px solid #fed7aa', fontSize: 12, color: '#9a3412' }}>
                💡 <strong>振り返り記録者:</strong> あなた（{currentUser.name} / {currentUser.role}）として記録されます。現場の生の声と星を直接入力してください。
              </div>

              {/* 4指標手動スライダー/セレクター */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'facilitation', label: '1. 統率力・会議ファシリテーション', desc: '班の議論を前に進める力、求心力' },
                  { key: 'communication', label: '2. 報連相・レスポンス速度', desc: '週1〜2回の会議対応、PL/EAへの迅速な共有' },
                  { key: 'safetyExternal', label: '3. 対外折衝・安全意識', desc: '西松建設への申請、施設規約・火気ルールの遵守' },
                  { key: 'scheduleBudget', label: '4. 期日・予算管理', desc: '先行締切（メニュー決定等）や企画書提出の厳守' }
                ].map((item) => (
                  <div key={item.key} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{item.label}</strong>
                        <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{item.desc}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((val) => {
                          const isSelected = (evalScores as any)[item.key] === val;
                          return (
                            <button
                              type="button"
                              key={val}
                              onClick={() => setEvalScores((prev) => ({ ...prev, [item.key]: val }))}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: isSelected ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#ea580c' : '#fff',
                                color: isSelected ? '#fff' : '#475569',
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 総合適性判定 */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  総合適性判定（次期イベント推薦）
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(['PL適格', 'GL適格', '専門実務向き', '要フォロー'] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setEvalVerdict(v)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        border: evalVerdict === v ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                        backgroundColor: evalVerdict === v ? '#ffedd5' : '#fff',
                        color: evalVerdict === v ? '#ea580c' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* 定性コメント */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  👍 いい面・強み（関係者の生の声）
                </label>
                <textarea
                  value={evalGoodPoints}
                  onChange={(e) => setEvalGoodPoints(e.target.value)}
                  placeholder="例: トラブル時のメンバーへの声かけが手厚く、現場の空気が明るかった。"
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>
                  ⚠️ 課題・悪い面・フォロー要（非公開リーダーカルテ）
                </label>
                <textarea
                  value={evalBadPoints}
                  onChange={(e) => setEvalBadPoints(e.target.value)}
                  placeholder="例: 締め切り直前まで一人で抱え込みがち。早めのSOS発信や副GL配置を推奨。"
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setEvalTargetResident(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}
                >
                  振り返りを活動カルテへ登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 👤 名簿詳細・歴代役職ポートフォリオ ＆ 活動振り返りカルテ モーダル */}
      {/* ========================================================= */}
      {selectedRosterResident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              maxWidth: 580,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Award size={22} />
                <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>
                  👤 寮生ポートフォリオ ＆ 活動振り返りカルテ
                </h3>
              </div>
              <button
                onClick={() => setSelectedRosterResident(null)}
                style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* プロフィールヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={selectedRosterResident.avatar}
                  alt={selectedRosterResident.name}
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ea580c' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {selectedRosterResident.name}
                    </h2>
                    <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                      {selectedRosterResident.role}
                    </span>
                    {selectedRosterResident.careers?.some((c) => c.isCertifiedGl) && (
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <UserCheck size={12} />
                        ★GL経験者公認
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    🏠 {selectedRosterResident.unit} • ✉️ {selectedRosterResident.email}
                  </div>
                  <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 800, marginTop: 2 }}>
                    担当メモ: {selectedRosterResident.memo}
                  </div>
                </div>
              </div>

              {/* 🏅 歴代イベント役職経歴（ポートフォリオ） */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                  🏅 歴代イベント運営経歴（活動ポートフォリオ）
                </span>
                {(!selectedRosterResident.careers || selectedRosterResident.careers.length === 0) ? (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>まだイベント役職経歴はありません</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedRosterResident.careers.map((c, ci) => (
                      <div
                        key={ci}
                        style={{
                          backgroundColor: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: '#1c1917' }}>{c.eventTitle}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                            {c.yearMonth} • {c.groupName || '全体'}
                          </span>
                        </div>
                        <span
                          style={{
                            backgroundColor: c.role === 'PL' ? '#ea580c' : c.role === 'GL' ? '#0284c7' : '#f1f5f9',
                            color: c.role === 'PL' || c.role === 'GL' ? '#fff' : '#334155',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6
                          }}
                        >
                          役職: {c.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 📊 活動・リーダーシップ振り返りカルテ（周囲の関係者によるスコアログ） */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                  📊 活動・リーダーシップ振り返りカルテ（関係者直接スコアログ）
                </span>
                {(!selectedRosterResident.evaluations || selectedRosterResident.evaluations.length === 0) ? (
                  <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, border: '1px dashed #cbd5e1', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    蓄積された振り返りカルテはまだありません
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedRosterResident.evaluations.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          backgroundColor: '#fff',
                          border: '1.5px solid #fed7aa',
                          borderRadius: 12,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1c1917' }}>
                            {ev.eventTitle}（{ev.targetRole}時）
                          </span>
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                            判定: {ev.aptitudeVerdict}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          振り返り記録者: {ev.evaluatorName} ({ev.evaluatorRole}) • 記録日: {ev.createdAt}
                        </div>

                        {/* スコア */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8, fontSize: 11, textAlign: 'center' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: 4, borderRadius: 6 }}>統率 {'★' + ev.scores.facilitation}</div>
                          <div style={{ backgroundColor: '#f8fafc', padding: 4, borderRadius: 6 }}>報連相 {'★' + ev.scores.communication}</div>
                          <div style={{ backgroundColor: '#f8fafc', padding: 4, borderRadius: 6 }}>折衝 {'★' + ev.scores.safetyExternal}</div>
                          <div style={{ backgroundColor: '#f8fafc', padding: 4, borderRadius: 6 }}>期日 {'★' + ev.scores.scheduleBudget}</div>
                        </div>

                        {/* 定性コメント */}
                        <div style={{ backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#14532d', marginBottom: 4 }}>
                          👍 <strong>強み:</strong> {ev.goodPoints}
                        </div>
                        {ev.badPoints && (
                          <div style={{ backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#7f1d1d' }}>
                            ⚠️ <strong>課題メモ:</strong> {ev.badPoints}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedRosterResident(null)}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: 6
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🚩 新しいチーム・班を追加するモーダル */}
      {/* ========================================================= */}
      {isAddGroupModalOpen && selectedProjectId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}
          >
            <div
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  新しいチーム・班を追加
                </h3>
              </div>
              <button
                onClick={() => setIsAddGroupModalOpen(false)}
                style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newGroupName.trim()) {
                  alert('チーム・班の名前を入力してください');
                  return;
                }
                const selectedGlResident = residents.find((r) => r.name === newGroupGlName);
                await dbService.addGroupToProject(selectedProjectId, {
                  name: newGroupName.trim(),
                  glName: newGroupGlName.trim() || undefined,
                  glResidentId: selectedGlResident?.id,
                  milestoneTitle: newGroupMilestoneTitle.trim() || undefined,
                  milestoneDeadline: newGroupMilestoneDeadline.trim() || undefined,
                  milestoneCompleted: false,
                  membersCount: newGroupGlName.trim() ? 1 : 0
                });
                const updated = await dbService.getProjects();
                setProjects(updated);
                setIsAddGroupModalOpen(false);
                setNewGroupName('');
                setNewGroupGlName('');
                setNewGroupMilestoneTitle('');
                setNewGroupMilestoneDeadline('');
              }}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: '#9a3412', border: '1px solid #fed7aa' }}>
                💡 小規模企画から大規模企画まで、必要になったタイミングでチーム（買い出し班、広報班、音響班など）を追加できます。
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                  チーム・班の名前 <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="例: 買い出し班、広報・デザイン班、音響班"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                  班のまとめ役（GL / リーダー）
                </label>
                <select
                  value={newGroupGlName}
                  onChange={(e) => setNewGroupGlName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option value="">未任命（後で決める）</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}（{r.role} / {r.building}棟）
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                    班の先行目標・マイルストーン
                  </label>
                  <input
                    type="text"
                    value={newGroupMilestoneTitle}
                    onChange={(e) => setNewGroupMilestoneTitle(e.target.value)}
                    placeholder="例: 会場レイアウト図完成"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                    先行締切日
                  </label>
                  <input
                    type="text"
                    value={newGroupMilestoneDeadline}
                    onChange={(e) => setNewGroupMilestoneDeadline(e.target.value)}
                    placeholder="例: 11/05"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddGroupModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}
                >
                  チームを追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎯 業務フローステップを追加するモーダル */}
      {/* ========================================================= */}
      {isAddStepModalOpen && selectedProjectId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              maxWidth: 440,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}
          >
            <div
              style={{
                backgroundColor: '#ea580c',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  運営ステップを追加
                </h3>
              </div>
              <button
                onClick={() => setIsAddStepModalOpen(false)}
                style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newStepTitle.trim()) {
                  alert('ステップ名を入力してください');
                  return;
                }
                const pj = projects.find((p) => p.id === selectedProjectId);
                const currentCount = (pj?.workflowSteps?.length || 7) + 1;
                await dbService.addWorkflowStepToProject(selectedProjectId, {
                  step: String(currentCount),
                  title: newStepTitle.trim(),
                  date: newStepDate.trim() || '随時',
                  active: true,
                  done: false
                });
                const updated = await dbService.getProjects();
                setProjects(updated);
                setIsAddStepModalOpen(false);
                setNewStepTitle('');
                setNewStepDate('');
              }}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ backgroundColor: '#fff7ed', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: '#9a3412', border: '1px solid #fed7aa' }}>
                💡 企画独自のマイルストーン（例: チラシ配り、材料買い出し、試作会など）をタイムラインに追加できます。
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                  ステップ名 <span style={{ color: '#ea580c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="例: 試作会・味見チェック、フライヤー配布"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                  実施予定日・期間
                </label>
                <input
                  type="text"
                  value={newStepDate}
                  onChange={(e) => setNewStepDate(e.target.value)}
                  placeholder="例: 11/20〜11/25、12/10"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAddStepModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 800 }}
                >
                  ステップを追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📝 会議・アイデア議事録の閲覧 ＆ 新規作成モーダル */}
      {/* ========================================================= */}
      {isAddMeetingModalOpen && selectedProjectId && (() => {
        const pj = projects.find((p) => p.id === selectedProjectId);
        if (!pj) return null;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                maxWidth: 620,
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  backgroundColor: '#ea580c',
                  color: '#fff',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} />
                  <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                    議事録を追加
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddMeetingModalOpen(false)}
                  style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px', overflowY: 'auto' }}>
                {/* 新規議事録作成フォーム（文字起こし/メモ入力欄 ＋ 出席者 ＋ 議事録にする） */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newMeetingRawInput.trim()) {
                      alert('会議の文章・音声文字起こし、またはメモを入力してください');
                      return;
                    }
                    setIsGeneratingAiMeeting(true);

                    // 🤖 Google Meet議事録クオリティの構造化解析エンジン
                    const text = newMeetingRawInput.trim();
                    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

                    // 1. 出席者の抽出（入力欄優先、なければテキスト内から推定）
                    let attendees: string[] = [];
                    if (newMeetingAttendees.trim()) {
                      attendees = newMeetingAttendees.split(/[,、\s]+/).map((s) => s.trim()).filter(Boolean);
                    } else {
                      const foundAttendees = pj.members
                        .map((m) => m.name)
                        .filter((name) => text.includes(name) || text.includes(name.split(' ')[0]));
                      attendees = foundAttendees.length > 0 ? foundAttendees : [pj.owner || '岡本 直樹'];
                    }

                    // 2. タイトルの自動抽出・生成
                    let title = '';
                    const firstLine = lines[0] || '';
                    if (firstLine.includes('会議') || firstLine.includes('MTG') || firstLine.includes('打ち合わせ') || firstLine.includes('検討') || firstLine.includes('キックオフ')) {
                      title = firstLine.replace(/^[#・\-\s]+/, '').slice(0, 35);
                    } else if (text.includes('布巾') || text.includes('衛生') || text.includes('キッチン')) {
                      title = 'キッチン衛生・備品運用改善ミーティング';
                    } else if (text.includes('クリスマス') || text.includes('ツリー') || text.includes('装飾')) {
                      title = 'クリスマスイベント企画・準備全体会議';
                    } else if (text.includes('予算') || text.includes('発注') || text.includes('購入')) {
                      title = '備品調達・予算承認および購入相談会';
                    } else {
                      title = `${pj.title} 定例ミーティング`;
                    }

                    // 3. 決定事項の自動抽出
                    const decisions: string[] = [];
                    const decisionKeywords = ['決定', '決まった', '合意', '確定', '採用', 'することに', '方針', '結論', '仕様'];
                    lines.forEach((l) => {
                      if (decisionKeywords.some((k) => l.includes(k))) {
                        decisions.push(l.replace(/^[#・\-\s*✅]+/, '').replace(/^決定事項[:：]?\s*/, ''));
                      }
                    });
                    if (decisions.length === 0) {
                      decisions.push(`${pj.title}の現行方針を継続し、次回までに各担当が準備を進めることで合意`);
                    }

                    // 4. アクションアイテム（TODO）の自動抽出
                    const todos: string[] = [];
                    const todoKeywords = ['TODO', 'todo', '宿題', '担当', 'までに', '確認する', '作成', '発注', '提出', '手配', '共有'];
                    lines.forEach((l) => {
                      if (todoKeywords.some((k) => l.includes(k))) {
                        todos.push(l.replace(/^[#・\-\s*📝]+/, '').replace(/^TODO[:：]?\s*/, ''));
                      }
                    });
                    if (todos.length === 0) {
                      todos.push(`${attendees[0] || '発起人'}: 決定事項の共有と次回日程の調整`);
                    }

                    // 5. エグゼクティブサマリーの自動抽出
                    const summary = lines.slice(0, 3).join(' ') || `${pj.title}に関する現状の課題と今後の進行方針について議論・確認を行いました。`;

                    // 6. タグの自動分類
                    const tags: string[] = [];
                    if (text.includes('決定') || text.includes('合意') || text.includes('確定')) tags.push('意思決定');
                    if (text.includes('予算') || text.includes('購入') || text.includes('費用') || text.includes('Amazon') || text.includes('円')) tags.push('予算・備品');
                    if (text.includes('西松') || text.includes('学事') || text.includes('申請') || text.includes('次郎')) tags.push('対外折衝・承認');
                    if (text.includes('スケジュール') || text.includes('締切') || text.includes('日程') || text.includes('月')) tags.push('スケジュール');
                    if (text.includes('アイデア') || text.includes('ブレスト') || text.includes('企画')) tags.push('企画検討');
                    if (tags.length === 0) tags.push('定例会議');

                    const currentDate = new Date().toISOString().slice(0, 10);

                    await dbService.addMeetingNote(pj.id, {
                      title,
                      date: currentDate,
                      attendees,
                      summary,
                      decisions: decisions.slice(0, 5),
                      nextTodos: todos.slice(0, 5),
                      tags,
                      rawTranscript: text
                    });

                    const updated = await dbService.getProjects();
                    setProjects(updated);
                    setIsGeneratingAiMeeting(false);
                    setIsAddMeetingModalOpen(false);
                    setNewMeetingRawInput('');
                    setNewMeetingAttendees('');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >
                  {/* 出席者入力欄 */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#1c1917', marginBottom: 4 }}>
                      <Users size={13} color="#ea580c" />
                      出席者（カンマやスペース区切り）
                    </label>
                    <input
                      type="text"
                      value={newMeetingAttendees}
                      onChange={(e) => setNewMeetingAttendees(e.target.value)}
                      placeholder="例: 岡本直樹, 生熊翔太, 宗司涼介（空欄時は自動推定）"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        boxSizing: 'border-box',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>

                  {/* 文章・音声文字起こし入力欄 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#1c1917' }}>
                        <FileText size={13} color="#ea580c" />
                        会議の文章 または 音声文字起こしテキスト <span style={{ color: '#ea580c' }}>*</span>
                      </label>

                      {/* 🎙️ Web Speech API による音声文字起こしボタン */}
                      {'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isListeningVoice) {
                              setIsListeningVoice(false);
                              return;
                            }
                            try {
                              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                              const recognition = new SpeechRecognition();
                              recognition.lang = 'ja-JP';
                              recognition.continuous = true;
                              recognition.interimResults = true;

                              recognition.onstart = () => {
                                setIsListeningVoice(true);
                              };

                              recognition.onresult = (event: any) => {
                                let transcript = '';
                                for (let i = event.resultIndex; i < event.results.length; ++i) {
                                  if (event.results[i].isFinal) {
                                    transcript += event.results[i][0].transcript + '\n';
                                  }
                                }
                                if (transcript) {
                                  setNewMeetingRawInput((prev) => prev ? `${prev}\n${transcript.trim()}` : transcript.trim());
                                }
                              };

                              recognition.onerror = () => {
                                setIsListeningVoice(false);
                              };

                              recognition.onend = () => {
                                setIsListeningVoice(false);
                              };

                              recognition.start();
                            } catch (err) {
                              console.warn('Speech recognition not available:', err);
                              alert('マイク入力が利用できませんでした。ブラウザの設定をご確認ください。');
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: isListeningVoice ? '1px solid #ef4444' : '1px solid #cbd5e1',
                            backgroundColor: isListeningVoice ? '#fef2f2' : '#fff',
                            color: isListeningVoice ? '#dc2626' : '#475569',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isListeningVoice ? <MicOff size={13} /> : <Mic size={13} />}
                          <span>{isListeningVoice ? '音声認識停止' : '🎙️ 音声入力'}</span>
                        </button>
                      ) : null}
                    </div>

                    <textarea
                      value={newMeetingRawInput}
                      onChange={(e) => setNewMeetingRawInput(e.target.value)}
                      placeholder="ここに会議中のメモ、SlackやLINEの会話、Google Meetの文字起こしテキストなどをそのまま貼り付けてください。&#10;&#10;例:&#10;ローズ3Fのキッチン布巾の臭いがひどいので使い捨てロール式に移行したいと提案。岡本と生熊と宗司で合意。マグネットディスペンサーをAmazonで岡本が発注することになった。初期費用約4,800円は自治会費から拠出決定。生熊はポスターを作成し、宗司はハウスリーダー会議で周知する。"
                      rows={6}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 12,
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setIsAddMeetingModalOpen(false)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isGeneratingAiMeeting}
                      style={{
                        padding: '9px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: '#fff',
                        fontSize: 13,
                        cursor: isGeneratingAiMeeting ? 'wait' : 'pointer',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
                      }}
                    >
                      <Sparkles size={16} />
                      {isGeneratingAiMeeting ? '議事録を構造化中...' : '議事録にする'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
