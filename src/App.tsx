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
  Warehouse,
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
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import {
  dbService,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type CurrentUser,
  type ResidentRecord,
  type ProjectMemberRecord
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
  status: 'planning' | 'testing' | 'negotiating' | 'completed';
  nextAction: string;
  createdAt?: string;
  members: ProjectMemberRecord[];
  meetingNotes?: {
    date: string;
    title: string;
    attendees: string[];
    summary: string;
    decisions: string[];
    nextTodos: string[];
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
  const [warehouseSubTab, setWarehouseSubTab] = useState<'roster' | 'documents'>('roster');

  // アイデア運営モーダルの開閉
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // モーダル入力
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaContent, setIdeaContent] = useState('');
  const [meetingNoteText, setMeetingNoteText] = useState('');
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);

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

  // 📖 詳細モーダル表示中のプロジェクトID ＆ 詳細タブ
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTab, setSelectedProjectTab] = useState<'proposal' | 'meeting' | 'members' | 'schedule'>('proposal');

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
  const [archiveDocs] = useState<ArchiveDoc[]>([
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
    const newProject: Project = {
      id: `pj-${Date.now()}`,
      title: ideaTitle || '新規改善プロジェクト',
      category: 'アイデア運営',
      description: ideaContent,
      progress: 15,
      owner: `${currentUser.name} (${currentUser.role})`,
      ownerId: currentUser.id,
      status: 'planning',
      nextAction: '思考マッピングの整理・関係者ヒアリング',
      createdAt: new Date().toISOString().slice(0, 10),
      members: [
        {
          residentId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          role: currentUser.role,
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
                        setSelectedProjectTab('proposal');
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
      {/* 📄 イベント詳細ページ（議事録・企画書・スタッフメンバー） */}
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
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px'
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                maxWidth: 720,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
                position: 'relative',
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
                <button
                  onClick={() => setSelectedProjectId(null)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
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

                {/* タブナビゲーション（企画書 / 議事録 / スタッフ / スケジュール） */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, borderBottom: '1px solid #e7e5e4', paddingBottom: 2 }}>
                  <button
                    onClick={() => setSelectedProjectTab('proposal')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'proposal' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'proposal' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FileText size={15} />
                    企画書
                  </button>
                  <button
                    onClick={() => setSelectedProjectTab('meeting')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'meeting' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'meeting' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <MessageSquare size={15} />
                    議事録 ({pj.meetingNotes?.length || 1})
                  </button>
                  <button
                    onClick={() => setSelectedProjectTab('members')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'members' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'members' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Users size={15} />
                    スタッフ ({pj.members.length})
                  </button>
                  <button
                    onClick={() => setSelectedProjectTab('schedule')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: selectedProjectTab === 'schedule' ? '3px solid #ea580c' : '3px solid transparent',
                      color: selectedProjectTab === 'schedule' ? '#ea580c' : '#78716c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Calendar size={15} />
                    進行計画
                  </button>
                </div>
              </div>

              {/* タブコンテンツ */}
              <div style={{ padding: '20px', flex: 1 }}>
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

                {/* 2. 議事録タブ */}
                {selectedProjectTab === 'meeting' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(pj.meetingNotes && pj.meetingNotes.length > 0 ? pj.meetingNotes : [
                      {
                        date: pj.createdAt || '2026-10-06',
                        title: `${pj.title} キックオフMTG`,
                        attendees: pj.members.map((m) => m.name),
                        summary: pj.description || 'プロジェクトの方向性と直近のネクストアクションを合意。',
                        decisions: ['プロジェクトの正式立ち上げ', `次回アクション: ${pj.nextAction}`],
                        nextTodos: [`${pj.owner}: 関係者への連絡と資料準備`]
                      }
                    ]).map((mn, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#fff',
                          border: '1.5px solid #fed7aa',
                          borderRadius: 14,
                          padding: 18,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>
                            📅 {mn.date}
                          </span>
                          <span style={{ fontSize: 12, color: '#78716c' }}>
                            参加者: {mn.attendees.join('、 ')}
                          </span>
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1c1917', marginBottom: 8 }}>
                          {mn.title}
                        </h4>

                        <p style={{ fontSize: 13, color: '#57534e', lineHeight: 1.6, marginBottom: 12 }}>
                          {mn.summary}
                        </p>

                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', display: 'block', marginBottom: 4 }}>
                            ✅ 決定・合意事項
                          </span>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#14532d', lineHeight: 1.6 }}>
                            {mn.decisions.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#9a3412', display: 'block', marginBottom: 4 }}>
                            📝 次のTODO
                          </span>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#7c2d12', lineHeight: 1.6 }}>
                            {mn.nextTodos.map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. スタッフメンバータブ */}
                {selectedProjectTab === 'members' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1c1917' }}>
                        参加スタッフ一覧（{pj.members.length}名）
                      </span>
                      <span style={{ fontSize: 11, color: '#78716c' }}>
                        H生なら誰でも自由に参加・協力できます
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                      {pj.members.map((m) => (
                        <div
                          key={m.residentId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            backgroundColor: '#fff',
                            border: '1px solid #e7e5e4',
                            borderRadius: 12
                          }}
                        >
                          <img
                            src={m.avatar}
                            alt={m.name}
                            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ fontSize: 14, color: '#1c1917' }}>{m.name}</strong>
                              {m.residentId === pj.ownerId && (
                                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                                  発起人
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 12, color: '#78716c', display: 'block', marginTop: 2 }}>
                              {m.role} • {m.building}棟
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. 進行計画（スケジュール）タブ */}
                {selectedProjectTab === 'schedule' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(pj.schedule && pj.schedule.length > 0 ? pj.schedule : [
                      { date: pj.createdAt || '2026-10-06', milestone: '企画立ち上げ・課題の整理', completed: true },
                      { date: '2026-10-10', milestone: pj.nextAction, completed: false },
                      { date: '2026-10-20', milestone: '寮内実証・トライアル運用', completed: false }
                    ]).map((sc, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '12px 16px',
                          backgroundColor: sc.completed ? '#f0fdf4' : '#fff',
                          border: sc.completed ? '1px solid #86efac' : '1px solid #e7e5e4',
                          borderRadius: 12
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: sc.completed ? '#15803d' : '#e7e5e4',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0
                          }}
                        >
                          {sc.completed ? '✓' : `${i + 1}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: sc.completed ? '#15803d' : '#ea580c' }}>
                            {sc.date}
                          </span>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1917', margin: '2px 0 0' }}>
                            {sc.milestone}
                          </p>
                        </div>
                      </div>
                    ))}
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
      {/* 4. 「倉庫」（過去の資料 ＆ 部屋割り当て名簿） */}
      {/* ========================================================= */}
      {activeTab === 'warehouse' && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
          {/* 上部サブタブ（名簿 vs 過去資料） */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '2px solid #fed7aa',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Warehouse size={22} color="#ea580c" />
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1c1917' }}>
                  📦 倉庫（過去の公認資料 ＆ 部屋割り当て名簿）
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setWarehouseSubTab('roster')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  backgroundColor: warehouseSubTab === 'roster' ? '#ea580c' : '#f1f5f9',
                  color: warehouseSubTab === 'roster' ? '#fff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                👥 棟・階別 部屋割り当て名簿
              </button>
              <button
                onClick={() => setWarehouseSubTab('documents')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  backgroundColor: warehouseSubTab === 'documents' ? '#ea580c' : '#f1f5f9',
                  color: warehouseSubTab === 'documents' ? '#fff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                📑 過去の資料・規約・惜敗ログ
              </button>
            </div>
          </div>

          {/* 倉庫 - 部屋割り当て名簿 */}
          {warehouseSubTab === 'roster' && (
            <div>
              {/* 4棟切り替え */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'rosemary', label: '🌿 ローズマリー' },
                  { key: 'basil', label: '🌱 バジル' },
                  { key: 'turmeric', label: '🟡 ターメリック' },
                  { key: 'paprika', label: '🌶️ パプリカ' }
                ].map((b) => {
                  const isSelected = selectedBuilding === b.key;
                  return (
                    <button
                      key={b.key}
                      onClick={() => setSelectedBuilding(b.key as any)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        backgroundColor: isSelected ? '#ea580c' : '#fff',
                        border: isSelected ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                        color: isSelected ? '#fff' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>

              {/* 階ごとの一覧 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[3, 2, 1].map((floorNum) => {
                  const floorResidents = residents.filter(
                    (r) => r.building === selectedBuilding && r.floor === floorNum
                  );

                  return (
                    <div key={floorNum} style={{ backgroundColor: '#fff', border: '1.5px solid #fed7aa', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#9a3412' }}>第{floorNum}階 ユニット</span>
                        <span style={{ fontSize: 11, color: '#78716c' }}>{floorResidents.length}名 入居</span>
                      </div>

                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {floorResidents.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                            登録なし
                          </div>
                        ) : (
                          floorResidents.map((r) => (
                            <div
                              key={r.id}
                              style={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                padding: '10px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <img src={r.avatar} alt={r.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 800 }}>{r.name}</span>
                                    <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                                      {r.role}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                                    <span>{r.unit}</span>
                                    <span>{r.email}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 700 }}>
                                {r.memo}
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
          )}

          {/* 倉庫 - 過去の公認資料 */}
          {warehouseSubTab === 'documents' && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa', fontSize: 12, color: '#9a3412' }}>
                    <th style={{ padding: '12px 18px' }}>資料名</th>
                    <th style={{ padding: '12px 14px' }}>分類</th>
                    <th style={{ padding: '12px 14px' }}>更新日</th>
                    <th style={{ padding: '12px 14px' }}>サイズ</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {archiveDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f5f5f4', fontSize: 13 }}>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1c1917' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={16} color="#ea580c" />
                          <span>{doc.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                          {doc.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px', color: '#78716c' }}>{doc.updatedAt}</td>
                      <td style={{ padding: '14px 14px', color: '#78716c' }}>{doc.size}</td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          閲覧
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  プロジェクト名 / タイトル
                </label>
                <input
                  type="text"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="例: パプリカ・ターメリックの玄関共通化 ＆ 昼間コモンズ開放"
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
            <Warehouse size={18} strokeWidth={activeTab === 'warehouse' ? 2.8 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800 }}>倉庫</span>
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
    </div>
  );
}
