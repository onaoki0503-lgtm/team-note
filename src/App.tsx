import React, { useState, useEffect } from 'react';
import {
  dbService,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type CurrentUser,
  type ResidentRecord,
  type ProjectRecord,
  type ProjectMemberRecord
} from './lib/db';

import { AppShell, type MainNavDestination } from './components/AppShell';
import { VillageScene } from './components/VillageScene';
import { StartIdeaButton } from './components/StartIdeaButton';
import { IdeaBubbleLayer, type IdeaItem } from './components/IdeaBubble';
import { IdeaFlowViews, type IdeaDraftData } from './components/IdeaFlowViews';
import { ProjectListView } from './components/ProjectListView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { StepWorkflowView } from './components/StepWorkflowView';
import { WorkStorageViews, type WorkReportItem } from './components/WorkStorageViews';
import { RosterArchiveViews } from './components/RosterArchiveViews';

export default function App() {
  // 4つのメインナビゲーション: 'change' (イータを変える) | 'progress' (進行中) | 'work' (はたらく) | 'warehouse' (保管する)
  const [activeTab, setActiveTab] = useState<MainNavDestination>('change');

  // アニメーション停止フラグ
  const [isScenePaused, setIsScenePaused] = useState(false);

  // S01〜S04 アイデアフロー状態
  // 'home' | 'input' (S03) | 'proposal' (S04)
  const [ideaFlowMode, setIdeaFlowMode] = useState<'home' | 'active'>('home');
  const [initialBubbleText, setInitialBubbleText] = useState('');

  // S05〜S12 進行中・プロジェクト詳細・ステップ
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // S13〜S20 ステップの資料ビュー
  const [activeStepView, setActiveStepView] = useState<{ stepId: string; stepTitle: string } | null>(null);

  // S21〜S22 業務報告
  const [reports, setReports] = useState<WorkReportItem[]>([
    {
      id: 'rep-1',
      title: 'キッチンの清掃',
      category: '清掃',
      content: 'キッチンの床と作業台を清掃しました。特に問題はありません。',
      author: '寮生A',
      date: '2026/06/15 14:30'
    },
    {
      id: 'rep-2',
      title: '設備の点検',
      category: '設備点検',
      content: '共用部の照明と空調を点検しました。異常はありません。',
      author: '寮生A',
      date: '2026/06/12 09:20'
    }
  ]);

  // S23〜S30 保管ポータル
  // 'hub' (S23) | 'roster' (S25/S26/S27) | 'inventory' (S24) | 'archives' (S30) | 'profile' (S28) | 'switch_user' (S31)
  const [storageView, setStorageView] = useState<'hub' | 'roster' | 'inventory' | 'archives' | 'profile' | 'switch_user'>('hub');
  const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null);

  // ユーザー・名簿
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => dbService.getCurrentUser());

  // 初回データ読み込み
  useEffect(() => {
    const init = async () => {
      try {
        const loadedProjects = await dbService.getProjects();
        if (loadedProjects && loadedProjects.length > 0) {
          setProjects(loadedProjects);
        }
        const loadedResidents = await dbService.getResidents();
        if (loadedResidents && loadedResidents.length > 0) {
          setResidents(loadedResidents);
          // ログインユーザー情報と名簿の最新アバター・役職を完全同期
          const matched = loadedResidents.find(
            (r) => r.id === currentUser.id || r.name === currentUser.name
          );
          if (matched) {
            const syncedUser: CurrentUser = {
              ...currentUser,
              id: matched.id,
              name: matched.name,
              avatar: matched.avatar || currentUser.avatar,
              role: matched.role || currentUser.role,
              building: matched.building || currentUser.building,
              unit: matched.unit || currentUser.unit
            };
            setCurrentUser(syncedUser);
            dbService.setCurrentUser(syncedUser);
          }
        }
        const loadedReports = await dbService.getWorkReports();
        if (loadedReports && loadedReports.length > 0) {
          setReports(
            loadedReports.map((r) => ({
              id: r.id,
              title: r.title,
              category: r.type === 'cleaning' ? '清掃' : r.type === 'facility' ? '設備点検' : '見回り',
              content: r.content,
              author: r.reporter,
              date: r.submittedAt
            }))
          );
        }
      } catch (err) {
        console.warn('Init data notice:', err);
      }
    };
    init();
  }, []);

  // 吹き出しアイデアデータ プロジェクトから生成または初期値 
  const bubbleIdeas: IdeaItem[] = projects.slice(0, 4).map((p, idx) => ({
    id: p.id,
    text: p.title,
    color: idx % 4 === 0 ? 'coral' : idx % 4 === 1 ? 'cyan' : idx % 4 === 2 ? 'yellow' : 'violet',
    projectId: p.id
  }));

  if (bubbleIdeas.length === 0) {
    bubbleIdeas.push(
      { id: 'sample-1', text: '中庭で映画を観たい', color: 'coral' },
      { id: 'sample-2', text: 'みんなで料理したい', color: 'yellow' }
    );
  }

  // S04 プロジェクト作成確定ハンドラー
  const handleCreateProject = async (
    draft: IdeaDraftData,
    nodes: { id: string; label: string; category: string }[]
  ) => {
    const isOp = draft.projectType === 'operation';
    const newProject: ProjectRecord = {
      id: `pj-${Date.now()}`,
      title: draft.title,
      category: isOp ? '施設・日常' : 'イベント',
      description: draft.content,
      projectType: draft.projectType,
      isEventWorkflow: !isOp,
      workflowSteps: isOp
        ? [
            { id: 'op-1', step: '1', title: '課題を調べる', date: '現状を知り、課題を整理する', done: false, active: true },
            { id: 'op-2', step: '2', title: '試す', date: '小さく試してみる', done: false, active: false },
            { id: 'op-3', step: '3', title: '運用を決める', date: 'みんなでルールをつくる', done: false, active: false },
            { id: 'op-4', step: '4', title: '続ける', date: '継続して運用する', done: false, active: false }
          ]
        : [
            { id: 'ev-1', step: '1', title: 'アイデア', date: 'やりたいことを考える', done: false, active: true },
            { id: 'ev-2', step: '2', title: '企画確認', date: '企画の内容を確認する', done: false, active: false },
            { id: 'ev-3', step: '3', title: '準備', date: '会場や必要なものを準備する', done: false, active: false },
            { id: 'ev-4', step: '4', title: '当日', date: 'イベントを実施する', done: false, active: false },
            { id: 'ev-5', step: '5', title: '振り返り', date: '良かったことをまとめる', done: false, active: false }
          ],
      progress: 20,
      owner: currentUser.name,
      ownerId: currentUser.id,
      status: 'planning',
      nextAction: isOp ? '課題を調べる' : '企画の内容を確認する',
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
      ],
      proposalDoc: {
        title: `${draft.title} 企画書`,
        purpose: draft.content,
        background: draft.content,
        proposalOverview: draft.content,
        totalBudget: '自治会費より概算'
      }
    };

    const updated = [newProject, ...projects];
    setProjects(updated);
    await dbService.addProject(newProject as any);

    // 作成後はプロジェクト詳細へ遷移
    setIdeaFlowMode('home');
    setSelectedProjectId(newProject.id);
    setActiveTab('progress');
  };

  // 参加トグル
  const handleToggleJoin = async (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const isJoined = target.members && target.members.some((m) => m.residentId === currentUser.id);

    if (isJoined) {
      const updated = await dbService.leaveProject(projectId, currentUser.id);
      setProjects(updated);
    } else {
      const updated = await dbService.joinProject(projectId, currentUser);
      setProjects(updated);
    }
  };

  // 業務報告提出
  const handleSubmitReport = async (title: string, category: any, content: string) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newRep: WorkReportItem = {
      id: `rep-${Date.now()}`,
      title,
      category,
      content,
      author: currentUser.name,
      date: dateStr
    };
    setReports([newRep, ...reports]);
    await dbService.addWorkReport({
      type: category === '清掃' ? 'cleaning' : category === '設備点検' ? 'facility' : 'patrol',
      title,
      location: `${currentUser.building}棟`,
      content,
      status: '報告完了',
      reporter: currentUser.name
    });
  };

  // 寮生追加
  const handleAddResident = async (data: any) => {
    await dbService.addResident({
      name: data.name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
      building: data.building,
      floor: data.floor,
      unit: data.unit,
      role: data.role,
      roleType: 'member',
      email: '',
      memo: '寮生名簿追加'
    });
    const updated = await dbService.getResidents();
    setResidents(updated);
  };

  // 寮生更新 アバターや役職変更 
  const handleUpdateResident = async (residentId: string, updates: Partial<ResidentRecord>) => {
    const updated = await dbService.updateResident(residentId, updates);
    if (updated) {
      setResidents((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedResident && selectedResident.id === updated.id) {
        setSelectedResident(updated);
      }
      if (currentUser.id === updated.id || currentUser.name === updated.name) {
        const updatedUser: CurrentUser = {
          ...currentUser,
          ...updates,
          avatar: updates.avatar || currentUser.avatar,
          role: updates.role || currentUser.role
        };
        setCurrentUser(updatedUser);
        dbService.setCurrentUser(updatedUser);
      }
    }
  };

  // 利用者切替
  const handleSwitchUser = (res: ResidentRecord) => {
    const user: CurrentUser = {
      id: res.id,
      name: res.name,
      avatar: res.avatar,
      building: res.building,
      floor: res.floor,
      unit: res.unit,
      role: res.role,
      roleType: res.roleType || 'member',
      email: res.email
    };
    setCurrentUser(user);
    dbService.setCurrentUser(user);
    setSelectedResident(res);
  };

  // 自分の寮生オブジェクトを取得
  const getMyResidentRecord = (): ResidentRecord => {
    return (
      residents.find((r) => r.id === currentUser.id || r.name === currentUser.name) || {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        building: currentUser.building,
        floor: currentUser.floor,
        unit: currentUser.unit,
        role: currentUser.role,
        roleType: currentUser.roleType,
        email: currentUser.email,
        memo: 'ログインユーザー'
      }
    );
  };

  // 戻る操作の計算
  let onBackHandler: (() => void) | undefined = undefined;
  let backTitle: string | undefined = undefined;

  if (activeTab === 'change' && ideaFlowMode === 'active') {
    onBackHandler = () => setIdeaFlowMode('home');
    backTitle = 'ホーム';
  } else if (activeTab === 'progress' && activeStepView) {
    onBackHandler = () => setActiveStepView(null);
    backTitle = 'プロジェクト詳細';
  } else if (activeTab === 'progress' && selectedProjectId) {
    onBackHandler = () => setSelectedProjectId(null);
    backTitle = '進行中';
  } else if (activeTab === 'warehouse' && storageView === 'profile') {
    onBackHandler = () => setStorageView('roster');
    backTitle = '名簿';
  } else if (activeTab === 'warehouse' && storageView !== 'hub') {
    onBackHandler = () => setStorageView('hub');
    backTitle = '保管する';
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // 現在のナビゲーションのアクティブ表示判定
  const effectiveActiveTab: MainNavDestination =
    activeTab === 'warehouse' && storageView === 'profile' && selectedResident?.id === currentUser.id
      ? 'profile'
      : activeTab;

  return (
    <AppShell
      activeTab={effectiveActiveTab}
      onTabChange={(tab) => {
        if (tab === 'profile') {
          // マイページタブ: 自分のプロフィールを開く
          const myResident = getMyResidentRecord();
          setSelectedResident(myResident);
          setActiveTab('warehouse');
          setStorageView('profile');
          return;
        }
        setActiveTab(tab);
        if (tab === 'change') {
          setIdeaFlowMode('home');
        } else if (tab === 'warehouse') {
          setStorageView('hub');
        }
      }}
      currentUser={currentUser}
      onOpenUserMenu={() => {
        // 右上アバターアイコンタップ: 自分のプロフィールを直接開く
        const myResident = getMyResidentRecord();
        setSelectedResident(myResident);
        setActiveTab('warehouse');
        setStorageView('profile');
      }}
      onBack={onBackHandler}
      backTitle={backTitle}
      hideNav={activeTab === 'change' && ideaFlowMode === 'active'}
    >
      {/* ============================================================ */}
      {/* 1. アイデア (S01, S02, S03, S04) */}
      {/* ============================================================ */}
      {activeTab === 'change' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {ideaFlowMode === 'home' ? (
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 'calc(100vh - 140px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 16px',
                overflow: 'hidden'
              }}
            >
              {/* モノクロ背景 ＆ 4色の細い光線 */}
              <VillageScene
                type="courtyard"
                isPaused={isScenePaused}
                onTogglePause={() => setIsScenePaused((p) => !p)}
              />

              {/* 上部スローガン 指定文字列: アイデアをカタチに。  */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  textAlign: 'center',
                  paddingTop: 10
                }}
              >
                <h1
                  style={{
                    fontSize: 'clamp(26px, 5vw, 42px)',
                    fontWeight: 900,
                    color: '#171A21',
                    letterSpacing: -0.6,
                    margin: 0
                  }}
                >
                  アイデアをカタチに。
                </h1>
              </div>

              {/* 中央の白い円形ボタン アイデア運営をスタート  */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 'auto 0'
                }}
              >
                <StartIdeaButton
                  onClick={() => {
                    setInitialBubbleText('');
                    setIdeaFlowMode('active');
                  }}
                />
              </div>

              {/* 吹き出しレイヤー S01通常交代 ＆ S02直接入力展開  */}
              <IdeaBubbleLayer
                ideas={bubbleIdeas}
                currentUserId={currentUser.id}
                isPaused={isScenePaused}
                onPauseChange={(p) => setIsScenePaused(p)}
                onOpenIdeaInputWithText={(text) => {
                  setInitialBubbleText(text);
                  setIdeaFlowMode('active');
                }}
                onSelectProject={(pId) => {
                  setSelectedProjectId(pId);
                  setActiveTab('progress');
                }}
              />
            </div>
          ) : (
            /* S03/S04 アイデア入力 ＆ たたき台確認フロー */
            <IdeaFlowViews
              currentUserId={currentUser.id}
              initialText={initialBubbleText}
              onCancel={() => setIdeaFlowMode('home')}
              onCreateProject={handleCreateProject}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. 進行中 (S05〜S20) */}
      {/* ============================================================ */}
      {activeTab === 'progress' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeStepView && selectedProject ? (
            /* S13〜S20 ステップの資料閲覧・作成ビュー */
            <StepWorkflowView
              project={selectedProject}
              stepId={activeStepView.stepId}
              stepTitle={activeStepView.stepTitle}
              currentUser={currentUser}
              onBack={() => setActiveStepView(null)}
              onSaveMinutes={async (note) => {
                const currentNotes = selectedProject.meetingNotes || [];
                const updatedNotes = [note, ...currentNotes];
                await dbService.updateProject(selectedProject.id, { meetingNotes: updatedNotes });
                const updatedProjects = await dbService.getProjects();
                setProjects(updatedProjects);
              }}
              onSaveEvaluation={async (ev) => {
                const currentEvals = selectedProject.evaluations || [];
                const updatedEvals = [ev, ...currentEvals];
                await dbService.updateProject(selectedProject.id, { evaluations: updatedEvals });
                const updatedProjects = await dbService.getProjects();
                setProjects(updatedProjects);
              }}
            />
          ) : selectedProject ? (
            /* S06/S07/S08/S09 プロジェクト詳細 */
            <ProjectDetailView
              project={selectedProject}
              currentUser={currentUser}
              onBack={() => setSelectedProjectId(null)}
              onToggleJoin={() => handleToggleJoin(selectedProject.id)}
              onOpenStep={(stId, stTitle) => setActiveStepView({ stepId: stId, stepTitle: stTitle })}
              onOpenProposalEdit={() => {}}
              onAddStaff={async (resId, role) => {
                const r = residents.find((res) => res.id === resId);
                if (!r) return;
                const newMember: ProjectMemberRecord = {
                  residentId: r.id,
                  name: r.name,
                  avatar: r.avatar,
                  role,
                  eventRole: 'メンバー',
                  building: r.building,
                  joinedAt: new Date().toISOString().slice(0, 10)
                };
                const updated = [...(selectedProject.members || []), newMember];
                await dbService.updateProject(selectedProject.id, { members: updated });
                const refreshed = await dbService.getProjects();
                setProjects(refreshed);
              }}
              onAddGroup={async (name, leader, goal, deadline) => {
                const newGrp = { id: `grp-${Date.now()}`, name, glName: leader, milestoneTitle: goal, milestoneDeadline: deadline };
                const updated = [...(selectedProject.groups || []), newGrp];
                await dbService.updateProject(selectedProject.id, { groups: updated });
                const refreshed = await dbService.getProjects();
                setProjects(refreshed);
              }}
              onOpenAddStep={() => {}}
              onUpdateProposal={async (doc) => {
                await dbService.updateProject(selectedProject.id, { proposalDoc: doc });
                const refreshed = await dbService.getProjects();
                setProjects(refreshed);
              }}
              onAddStepItem={async (name, dateRange) => {
                const currentSteps = selectedProject.workflowSteps || [];
                const newStep = {
                  id: `st-${Date.now()}`,
                  step: String(currentSteps.length + 1),
                  title: name,
                  date: dateRange || '実施予定',
                  done: false,
                  active: false
                };
                const updated = [...currentSteps, newStep];
                await dbService.updateProject(selectedProject.id, { workflowSteps: updated });
                const refreshed = await dbService.getProjects();
                setProjects(refreshed);
              }}
              allResidents={residents}
            />
          ) : (
            /* S05 進行中一覧 */
            <ProjectListView
              projects={projects}
              currentUser={currentUser}
              onSelectProject={(pId) => setSelectedProjectId(pId)}
              onOpenNewIdea={() => {
                setActiveTab('change');
                setIdeaFlowMode('active');
                setInitialBubbleText('');
              }}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. はたらく (S21, S22) */}
      {/* ============================================================ */}
      {activeTab === 'work' && (
        <WorkStorageViews
          mode="work"
          currentUser={currentUser}
          reports={reports}
          onSubmitReport={handleSubmitReport}
          onOpenRoster={() => {}}
          onOpenInventory={() => {}}
          onOpenArchives={() => {}}
        />
      )}

      {/* ============================================================ */}
      {/* 4. 保管する (S23〜S32) */}
      {/* ============================================================ */}
      {activeTab === 'warehouse' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {storageView === 'hub' ? (
            /* S23 保管ポータル */
            <WorkStorageViews
              mode="warehouse"
              currentUser={currentUser}
              reports={reports}
              onSubmitReport={handleSubmitReport}
              onOpenRoster={() => setStorageView('roster')}
              onOpenInventory={() => setStorageView('inventory')}
              onOpenArchives={() => setStorageView('archives')}
            />
          ) : (
            /* S24, S25, S26, S27, S28, S30, S31 */
            <RosterArchiveViews
              viewType={storageView}
              currentUser={currentUser}
              residents={residents}
              selectedResident={selectedResident}
              onSelectResident={(res) => {
                setSelectedResident(res);
                setStorageView('profile');
              }}
              onBackToPortal={() => setStorageView('hub')}
              onAddResident={handleAddResident}
              onSwitchUser={handleSwitchUser}
              onRegisterUser={(name, building, unit) => {
                handleAddResident({ name, building, floor: 1, unit, role: '一般寮生' });
              }}
              onUpdateResident={handleUpdateResident}
            />
          )}
        </div>
      )}
    </AppShell>
  );
}
