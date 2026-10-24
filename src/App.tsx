import React, { useState, useEffect, useRef, lazy } from 'react';
import { dbService, type CurrentUser, type ResidentRecord, type ProjectRecord, type ProjectMemberRecord, type ResidentProfileUpdates } from './lib/db';

import { useNavigation, useScreenState } from './lib/navigation';
import { ScreenLoadingBoundary } from './components/ScreenLoading';
import { useIdeaBoardSync } from './lib/useIdeaBoardSync';
import { useSharedIdeas } from './lib/sharedIdeasContext';
import { SharedProfile } from './components/SharedProfile';
import { AppShell, type MainNavDestination } from './components/AppShell';
import { VillageScene } from './components/VillageScene';
import { StartIdeaButton } from './components/StartIdeaButton';
import { IdeaBubbleLayer, type IdeaItem } from './components/IdeaBubble';
import type { IdeaDraftData } from './components/IdeaFlowViews';
import { ProjectListView } from './components/ProjectListView';

import type { WorkReportItem } from './components/WorkStorageViews';

const IdeaFlowViews = lazy(() => import('./components/IdeaFlowViews').then(module => ({ default: module.IdeaFlowViews })));
const ProjectDetailView = lazy(() => import('./components/ProjectDetailView').then(module => ({ default: module.ProjectDetailView })));
const StepWorkflowView = lazy(() => import('./components/StepWorkflowView').then(module => ({ default: module.StepWorkflowView })));
const WorkStorageViews = lazy(() => import('./components/WorkStorageViews').then(module => ({ default: module.WorkStorageViews })));
const RosterArchiveViews = lazy(() => import('./components/RosterArchiveViews').then(module => ({ default: module.RosterArchiveViews })));
export default function App() {
  const shared = useSharedIdeas();
  const { back, canBack, route, set: setNavigation } = useNavigation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  // 4つのメインナビゲーション: 'change' (イータを変える) | 'progress' (進行中) | 'work' (はたらく) | 'warehouse' (保管する)
  const [activeTab, setActiveTab] = useScreenState<MainNavDestination>('tab', 'change');

  // アニメーション停止フラグ
  const [isScenePaused, setIsScenePaused] = useState(() => { try { return localStorage.getItem('tn_motion_paused') === 'true'; } catch { return false; } });

  // S01〜S04 アイデアフロー状態
  // 'home' | 'input' (S03) | 'proposal' (S04)
  const [ideaFlowMode, setIdeaFlowMode] = useScreenState<'home' | 'active'>('idea-flow', 'home');
  const [initialBubbleText, setInitialBubbleText] = useScreenState('idea-initial', '');

  // S05〜S12 進行中・プロジェクト詳細・ステップ
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useScreenState<string | null>('project', null);

  // S13〜S20 ステップの資料ビュー
  const [activeStepView, setActiveStepView] = useScreenState<{ stepId: string; stepTitle: string } | null>('step', null);

  // S21〜S22 業務報告
  const [reports, setReports] = useState<WorkReportItem[]>([
    {
      id: 'rep-1',
      title: 'キッチンの清掃',
      activityType: 'inherent',
      content: 'キッチンの床と作業台を清掃しました。特に問題はありません。',
      author: '寮生A',
      date: '2026/06/15 14:30'
    },
    {
      id: 'rep-2',
      title: '設備の点検',
      activityType: 'inherent',
      content: '共用部の照明と空調を点検しました。異常はありません。',
      author: '寮生A',
      date: '2026/06/12 09:20'
    }
  ]);

  // S23〜S30 保管ポータル
  // 'hub' (S23) | 'roster' (S25/S26/S27) | 'inventory' (S24) | 'archives' (S30) | 'profile' (S28) | 'switch_user' (S31)
  const [storageView, setStorageView] = useScreenState<'hub' | 'roster' | 'inventory' | 'archives' | 'profile' | 'switch_user'>('storage', 'hub');
  const [selectedResidentId, setSelectedResidentId] = useScreenState<string | null>('resident', null);
  const setSelectedResident = (resident: ResidentRecord) => setSelectedResidentId(resident.id);

  // ユーザー・名簿
  const [localResidents, setResidents] = useState<ResidentRecord[]>([]);
  const residents: ResidentRecord[] = shared.board ? shared.board.members.map(m => ({ ...m, avatar: m.avatar || '', email: '', memo: '' })) : localResidents;
  const [localUser, setCurrentUser] = useState<CurrentUser>(() => shared.profile || dbService.getCurrentUser());
  const currentUser = shared.profile || localUser;

  const initialUser = useRef(currentUser);
  // 初回データ読み込み
  useEffect(() => {
    const currentUser = initialUser.current;
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
          if (matched && !shared.enabled) {
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
              activityType: r.activityType || (r.type === 'cleaning' ? 'inherent' : r.type === 'facility' ? 'common' : 'inherent'),
              content: r.content,
              author: r.reporter,
              date: r.reportDate || r.submittedAt,
              actionResult: r.actionResult, entryUnit: r.entryUnit, entryPurpose: r.entryPurpose
            }))
          );
        }
      } catch (err) {
        console.warn('Init data notice:', err);
      } finally { setIsInitialLoading(false); }
    };
    init();
  }, [shared.enabled]);

  // 吹き出しアイデアの初期データ
  const INITIAL_BUBBLE_IDEAS: IdeaItem[] = [
    {
      id: 'idea-init-1',
      text: '共有キッチン 布巾の衛生改善 使い捨てロール化',
      color: 'coral',
      authorName: '岡本 直樹',
      authorId: 'r1',
      likes: 4,
      likedUserIds: ['r2', 'r3'],
      createdAt: '2026-10-09'
    },
    {
      id: 'idea-init-2',
      text: '4棟エントランスのオートロック改善',
      color: 'violet',
      authorName: '伊藤 雄吉',
      authorId: 'r2',
      likes: 6,
      likedUserIds: ['r1', 'r3', 'r-oa-rosemary'],
      createdAt: '2026-10-09'
    },
    {
      id: 'idea-init-3',
      text: '中庭で映画上映会を開きたい',
      color: 'yellow',
      authorName: '佐藤 健太',
      authorId: 'r3',
      likes: 3,
      likedUserIds: ['r1'],
      createdAt: '2026-10-08'
    }
  ];

  // Cloud mode: tab 1 ideas come only from tn_get_board (same DB as mobile).
  // Demo bubbles are local-only when ?demo=1 or env is unset.
  const localIdeas = useIdeaBoardSync(INITIAL_BUBBLE_IDEAS, !shared.enabled);
  const bubbleIdeas = shared.enabled ? (shared.board?.ideas ?? []) : localIdeas.ideas;
  const updateIdeas = localIdeas.update;
  const ideaSyncError = shared.enabled ? shared.error : localIdeas.error;

  // 新規アイデア投稿ハンドラー
  const handleAddNewIdea = (text: string) => {
    if (shared.enabled) return shared.post(text);
    const colors: ('coral' | 'cyan' | 'yellow' | 'violet')[] = ['coral', 'cyan', 'yellow', 'violet'];
    const newId = `idea-${crypto.randomUUID()}`;
    const postedAt = new Date().toISOString();
    const newIdea: IdeaItem = {
      id: newId,
      text,
      color: colors[Math.floor(Math.random() * colors.length)],
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorId: currentUser.id,
      likes: 0,
      likedUserIds: [],
      createdAt: postedAt,
      activityTrackedFrom: postedAt,
      isNew: true
    };

    return updateIdeas(prev => [...prev.map(idea => ({ ...idea, isNew: false })), newIdea]);


  };

  // いいね切り替えハンドラー
  const handleToggleLike = (ideaId: string) => {
    if (shared.enabled) return shared.like(ideaId, !bubbleIdeas.find(idea => idea.id === ideaId)?.likedUserIds?.includes(currentUser.id));
    return updateIdeas((prev) =>
      prev.map((item) => {
        if (item.id === ideaId && !item.hiddenAt) {
          const liked = item.likedUserIds?.includes(currentUser.id);
          const updatedLikedUsers = liked
            ? (item.likedUserIds || []).filter((uid) => uid !== currentUser.id)
            : [...(item.likedUserIds || []), currentUser.id];
          const updatedLikes = liked
            ? Math.max((item.likes || 1) - 1, 0)
            : (item.likes || 0) + 1;
          return {
            ...item,
            likes: updatedLikes,
            likedUserIds: updatedLikedUsers,
            ...(!liked ? { lastReactionAt: new Date().toISOString() } : {})
          };
        }
        return item;
      })
    );
  };

  // 企画を打ち込んだ人のみ削除可能
  const handleDeleteIdea = (ideaId: string) => {
    if (shared.enabled) return shared.remove(ideaId);
    return updateIdeas(prev => prev.filter(item => item.id !== ideaId || item.authorId !== currentUser.id));
  };

  // S04 プロジェクト作成確定ハンドラー
  const handleCreateProject = async (
    draft: IdeaDraftData,
    _nodes: { id: string; label: string; category: string }[]
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
      proposalDoc: draft.proposalDocument
        ? {
            title: draft.proposalDocument.title,
            subtitle: draft.proposalDocument.subTitle,
            recipient: draft.proposalDocument.submittedTo,
            submissionDate: draft.proposalDocument.submittedDate,
            purpose: draft.proposalDocument.objective || draft.proposalDocument.background,
            objective: draft.proposalDocument.objective,
            location: draft.proposalDocument.location,
            targetAudience: draft.proposalDocument.targetAudience,
            implementationDate: draft.proposalDocument.implementationDate,
            responsible: draft.proposalDocument.responsible,
            requirements: draft.proposalDocument.requirements,
            expectedImpact: draft.proposalDocument.expectedImpact,
            background: draft.proposalDocument.background,
            highlightQuote: draft.proposalDocument.highlightQuote,
            problems: draft.proposalDocument.issues,
            proposalOverview: draft.proposalDocument.proposalOverview,
            conceptBoxes: draft.proposalDocument.conceptBoxes,
            flowItems: draft.proposalDocument.operationFlow,
            improvements: draft.proposalDocument.stakeholderImpacts.map((imp) => ({
              audience: imp.stakeholder,
              title: imp.title,
              desc: imp.description
            })),
            budgetItems: draft.proposalDocument.budgetItems,
            totalBudget: draft.proposalDocument.totalCostEstimate,
            steps: draft.proposalDocument.actionSteps,
            summary: draft.proposalDocument.summaryText
          }
        : {
            title: `${draft.title} 企画書`,
            purpose: draft.content,
            background: draft.content,
            proposalOverview: draft.content,
            totalBudget: '自治会費より概算'
          }
    };

    const saved = await dbService.addProject(newProject as any);
    setProjects(previous => [saved, ...previous]);

    // 作成後はプロジェクト詳細へ遷移
    setIdeaFlowMode('home');
    setActiveStepView(null);
    setSelectedProjectId(saved.id);
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
  const handleSubmitReport = async (
    title: string,
    content: string,
    customDate: string,
    activityType: 'inherent' | 'cooperation' | 'common' | 'trouble' | 'unit_entry',
    actionResult?: string,
    entryUnit?: string,
    entryPurpose?: string
  ) => {
    let dateStr = '';
    if (customDate) {
      dateStr = customDate.replace(/-/g, '/');
    } else {
      const now = new Date();
      dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    }
    const newRep: WorkReportItem = {
      id: `rep-${Date.now()}`,
      title,
      activityType: activityType || 'inherent',
      actionResult: actionResult || content,
      entryUnit: entryUnit || '',
      entryPurpose: entryPurpose || '',
      content,
      author: currentUser.name,
      date: dateStr
    };
    const saved = await dbService.addWorkReport({
      type: activityType === 'trouble' ? 'noise' : activityType === 'unit_entry' ? 'facility' : 'patrol',
      title,
      location: entryUnit ? `${entryUnit}` : `${currentUser.building}棟`,
      content: content.trim(),
      reportDate: dateStr, activityType, actionResult: actionResult || content, entryUnit, entryPurpose,
      status: '報告完了',
      reporter: currentUser.name
    });
    setReports(previous => [{ ...newRep, id: saved.id }, ...previous]);
  };

  // 寮生追加
  const handleAddResident = async (data: any) => {
    if (shared.enabled) return;
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
  const handleUpdateResident = async (residentId: string, updates: ResidentProfileUpdates) => {
    if (shared.enabled) { if (residentId === currentUser.id) await shared.updateProfile({ ...currentUser, ...updates } as CurrentUser); return; }
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
          name: updates.name || currentUser.name,
          building: updates.building || currentUser.building,
          floor: updates.floor !== undefined ? updates.floor : currentUser.floor,
          unit: updates.unit || currentUser.unit,
          role: updates.role || currentUser.role,
          bio: updates.bio !== undefined ? updates.bio : currentUser.bio
        };
        setCurrentUser(updatedUser);
        dbService.setCurrentUser(updatedUser);
      }
    }
  };

  // 利用者切替
  const handleSwitchUser = (res: ResidentRecord) => {
    if (shared.enabled) return;
    const user: CurrentUser = {
      id: res.id,
      name: res.name,
      avatar: res.avatar,
      building: res.building,
      floor: res.floor,
      unit: res.unit,
      role: res.role,
      roleType: res.roleType || 'member',
      email: res.email,
      bio: res.bio
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
        memo: 'ログインユーザー',
        bio: currentUser.bio
      }
    );
  };

  const selectedResident = residents.find(resident => resident.id === selectedResidentId) ||
    (selectedResidentId === currentUser.id ? getMyResidentRecord() : null);
  const beginIdea = (text = '') => {
    setInitialBubbleText(text);
    setNavigation('idea-source', text, '', false);
    setNavigation('idea-stage', 1, 1, true);
    setActiveTab('change');
    setIdeaFlowMode('active');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // 現在のナビゲーションのアクティブ表示判定
  const effectiveActiveTab: MainNavDestination =
    activeTab === 'warehouse' && storageView === 'profile' && selectedResident?.id === currentUser.id
      ? 'profile'
      : activeTab;

  return (
    <AppShell
      activeTab={effectiveActiveTab}
      isMotionPaused={isScenePaused}
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
        if (tab === 'progress') { setSelectedProjectId(null); setActiveStepView(null); }
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
      onBack={canBack ? back : undefined}
      backTitle="戻る"
      hideNav={activeTab === 'change' && ideaFlowMode === 'active'}
    >
      <ScreenLoadingBoundary screenKey={JSON.stringify(route)} loading={isInitialLoading} variant={activeTab === 'change' && ideaFlowMode === 'home' ? 'home' : activeTab === 'change' ? 'document' : 'list'}>
      {/* ============================================================ */}
      {/* 1. アイデア (S01, S02, S03, S04) */}
      {/* ============================================================ */}
      {activeTab === 'change' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {ideaFlowMode === 'home' ? (
            <div className={`idea-home ${isScenePaused || isComposerFocused ? 'animation-paused' : ''}`}>
              {/* モノクロ背景 ＆ 4色の細い光線 */}
              <VillageScene
                type="courtyard"
                isPaused={isScenePaused}
                isInteractionPaused={isComposerFocused}
                onTogglePause={() => setIsScenePaused((p) => !p)}
              />

              <h1 className="sr-only">アイデア</h1>

              {/* 吹き出しレイヤー S01通常交代 ＆ S02直接入力展開 */}
              <IdeaBubbleLayer
                ideas={bubbleIdeas}
                syncError={ideaSyncError}
                connectionLabel={shared.enabled ? shared.connected ? '共有中' : '再接続中' : undefined}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                isPaused={isScenePaused || isComposerFocused}
                onPauseChange={setIsComposerFocused}
                centerAction={<StartIdeaButton onClick={() => beginIdea()} />}
                onOpenIdeaInputWithText={(text) => {
                  beginIdea(text);
                }}
                onSelectProject={(pId) => {
                  setSelectedProjectId(pId);
                  setActiveTab('progress');
                }}
                onAddNewIdea={handleAddNewIdea}
                onToggleLike={handleToggleLike}
                onDeleteIdea={handleDeleteIdea}
              />
            </div>
          ) : (
            /* S03/S04 アイデア入力 ＆ たたき台確認フロー */
            <IdeaFlowViews
              currentUserId={currentUser.id}
              initialText={initialBubbleText}
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
              onToggleJoin={() => handleToggleJoin(selectedProject.id)}
              onOpenStep={(stId, stTitle) => setActiveStepView({ stepId: stId, stepTitle: stTitle })}
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
                  joinedAt: new Date().toISOString()
                };
                const refreshed = await dbService.addStaffMemberToProject(selectedProject.id, newMember);
                setProjects(refreshed);
              }}
              onAddGroup={async (name, leader, goal, deadline) => {
                const newGrp = { id: `grp-${Date.now()}`, name, glName: leader, milestoneTitle: goal, milestoneDeadline: deadline };
                const updated = [...(selectedProject.groups || []), newGrp];
                await dbService.updateProject(selectedProject.id, { groups: updated });
                const refreshed = await dbService.getProjects();
                setProjects(refreshed);
              }}
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
                beginIdea();
              }}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. はたらく (S21, S22 業務報告・個人専用ツール) */}
      {/* ============================================================ */}
      {activeTab === 'work' && (
        <WorkStorageViews
          mode="work"
          currentUser={currentUser}
          reports={reports.filter(
            (r) =>
              r.author === currentUser.name ||
              (r as any).authorId === currentUser.id ||
              !r.author ||
              r.author === '寮生A' // 初期サンプルの互換
          )}
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
          ) : shared.enabled && storageView === 'profile' && selectedResident ? (
            <SharedProfile key={selectedResident.id} resident={selectedResident as CurrentUser} projects={projects} />
          ) : (
            /* S24, S25, S26, S27, S28, S30, S31 */
            <RosterArchiveViews
              viewType={storageView}
              allowAddResident={!shared.enabled}
              currentUser={currentUser}
              residents={residents}
              projects={projects}
              selectedResident={selectedResident}
              onSelectResident={(res) => {
                setSelectedResident(res);
                setStorageView('profile');
              }}
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
      </ScreenLoadingBoundary>
    </AppShell>
  );
}
