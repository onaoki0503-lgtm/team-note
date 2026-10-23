import { useScreenState } from '../lib/navigation';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProjectRecord, CurrentUser } from '../lib/db';

interface StepWorkflowViewProps {
  project: ProjectRecord;
  stepId: string;
  stepTitle: string;
  currentUser: CurrentUser;
  onSaveMinutes: (minutes: any) => void;
  onSaveEvaluation: (evaluation: any) => void;
}

export const StepWorkflowView: React.FC<StepWorkflowViewProps> = ({
  project,
  stepId,
  stepTitle,
  currentUser,
  onSaveMinutes,
  onSaveEvaluation
}) => {
  // S13 選択中の書類カテゴリー: 'proposal' (企画書) | 'minutes' (議事録) | 'review' (振り返り) | 'rules' (運用ルール)
  const [selectedDocCategory, setSelectedDocCategory] = useScreenState<'proposal' | 'minutes' | 'review' | 'rules'>(`step:${project.id}:${stepId}:category`, 'proposal');

  // S15/S16/S17 議事録ステート
  const [isAddingMinutes, setIsAddingMinutes] = useScreenState('minutes-modal', false);
  const [newMinutesTitle, setNewMinutesTitle] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:newMinutesTitle`, '', false);
  const [newMinutesDate, setNewMinutesDate] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:newMinutesDate`, '2026/10/08 木', false);
  const [newMinutesAttendees, setNewMinutesAttendees] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:newMinutesAttendees`, '寮生A 寮生B', false);
  const [newMinutesContent, setNewMinutesContent] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:newMinutesContent`, '', false);
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useScreenState<number | null>('minutes-detail', null);

  // S18/S19 振り返りステート
  const [isAddingEval, setIsAddingEval] = useScreenState('review-modal', false);
  const [scoreFacilitation, setScoreFacilitation] = useState<number | 'none'>(4);
  const [scoreCommunication, setScoreCommunication] = useState<number | 'none'>(3);
  const [scoreSafety, setScoreSafety] = useState<number | 'none'>(5);
  const [scoreBudget, setScoreBudget] = useState<number | 'none'>(4);
  const [evalGood, setEvalGood] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:evalGood`, '', false);
  const [evalBad, setEvalBad] = useScreenState(`step:${project.id}:${stepId}:${currentUser.id}:evalBad`, '', false);
  const [evalVerdict, setEvalVerdict] = useState<'未評価' | 'PL適格' | 'GL適格' | '専門実務向き' | '要フォロー'>('未評価');

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '12px 10px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 上部ヘッダー S13 運営ステップ  */}
      <div className="glass-panel"
        style={{
          backgroundColor: "var(--glass-panel)",
          borderRadius: 12,
          border: "1px solid var(--glass-border)",
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-ink)" }}>
            ステップ: {stepTitle}
          </span>
          <span style={{ backgroundColor: "var(--glass-inset)", color: "var(--glass-muted)", fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
            進行中
          </span>
        </div>
      </div>

      {/* 書類カテゴリー切り替えタブ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { key: 'proposal', label: '企画書' },
          { key: 'minutes', label: '議事録' },
          { key: 'review', label: '振り返り' },
          { key: 'rules', label: '運用ルール' }
        ].map((item) => {
          const active = selectedDocCategory === item.key;
          return (
            <button className="glass-button"
              key={item.key}
              type="button"
              onClick={() => setSelectedDocCategory(item.key as any)}
              style={{
                backgroundColor: active ? "var(--glass-primary)" : "var(--glass-panel)",
                color: active ? '#FFFFFF' : "var(--glass-ink)",
                border: active ? '1px solid #171A21' : "1px solid var(--glass-border)",
                borderRadius: 8,
                padding: '10px 8px',
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* A. 企画書タブ */}
      {/* ============================================================ */}
      {selectedDocCategory === 'proposal' && (
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div style={{ borderBottom: "1.5px solid var(--glass-border)", paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span
                style={{
                  backgroundColor: "var(--glass-inset)",
                  color: "var(--glass-accent)",
                  border: '1px solid #BAE6FD',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 4
                }}
              >
                企画提案書
              </span>
              <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>
                {project.proposalDoc?.submissionDate || '2026年10月'}
              </span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 4px 0', lineHeight: 1.4 }}>
              {project.proposalDoc?.title || `${project.title} 企画書`}
            </h3>
            {project.proposalDoc?.subtitle && (
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--glass-ink)" }}>
                {project.proposalDoc.subtitle}
              </div>
            )}
          </div>

          <div>
            <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 8, fontSize: 13.5, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
              1. 企画の趣旨・背景
            </h4>
            <p style={{ fontSize: 13.5, color: "var(--glass-ink)", lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
              {project.proposalDoc?.background || project.proposalDoc?.purpose || project.description || '日常の中で気軽に交流できる場をつくり、寮生同士のつながりを深めたい。'}
            </p>
          </div>

          {project.proposalDoc?.problems && project.proposalDoc.problems.length > 0 && (
            <div>
              <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 8, fontSize: 13.5, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
                2. 生じている課題
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {project.proposalDoc.problems.map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: "var(--glass-ink)", display: 'flex', gap: 6 }}>
                    <span style={{ color: "var(--glass-accent)", fontWeight: 700 }}>・</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 14 }}>
            <h4 style={{ borderLeft: '4px solid #0284C7', paddingLeft: 8, fontSize: 13.5, fontWeight: 700, color: "var(--glass-ink)", marginBottom: 6 }}>
              3. 提案内容の概要
            </h4>
            <p style={{ fontSize: 13.5, color: "var(--glass-ink)", lineHeight: 1.7, margin: 0 }}>
              {project.proposalDoc?.proposalOverview || '具体的な運用ルールおよび専用設備を導入します。'}
            </p>
          </div>

          {project.proposalDoc?.totalBudget && (
            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-ink)" }}>合計概算費用</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-accent)" }}>{project.proposalDoc.totalBudget}</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* B. 議事録タブ (S15, S16, S17) */}
      {/* ============================================================ */}
      {selectedDocCategory === 'minutes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isAddingMinutes ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: "var(--glass-muted)" }}>会議の決定事項と次の行動</span>
                <button className="glass-button"
                  type="button"
                  onClick={() => setIsAddingMinutes(true)}
                  style={{
                    backgroundColor: "var(--glass-primary)",
                    color: '#FFFFFF',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Plus size={15} />
                  <span>議事録を追加</span>
                </button>
              </div>

              {/* 議事録カード一覧 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(project.meetingNotes && project.meetingNotes.length > 0
                  ? project.meetingNotes
                  : [
                      {
                        title: '会場の打ち合わせ',
                        date: '2026/09/28 木',
                        attendees: '寮生A 寮生B',
                        summary: '中庭での上映に向けた下見を行い、設営場所と必要な機材について確認しました。',
                        decisions: ['上映場所は中庭の中央エリアに決定', '当日は17時から設営を開始する'],
                        nextTodos: ['レンタル機材の見積もりを依頼 10/02', '設営レイアウト図を作成 10/05']
                      }
                    ]
                ).map((note: any, idx: number) => (
                  <div className="glass-panel"
                    key={idx}
                    onClick={() => setSelectedMeetingIndex(selectedMeetingIndex === idx ? null : idx)}
                    style={{
                      backgroundColor: "var(--glass-panel)",
                      borderRadius: 12,
                      border: "1px solid var(--glass-border)",
                      padding: '16px 18px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: 15, color: "var(--glass-ink)" }}>{note.title}</strong>
                      <span style={{ fontSize: 12, color: "var(--glass-muted)" }}>{note.date}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--glass-muted)", margin: '0 0 10px', lineHeight: 1.5 }}>
                      {note.summary}
                    </p>

                    {/* 展開表示 (S16 議事録詳細) */}
                    {selectedMeetingIndex === idx && (
                      <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-ink)" }}>出席者:</span>
                          <span style={{ fontSize: 13, color: "var(--glass-muted)", marginLeft: 8 }}>{note.attendees}</span>
                        </div>
                        {note.decisions && (
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-ink)", display: 'block', marginBottom: 4 }}>
                              決定事項
                            </span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--glass-ink)", lineHeight: 1.6 }}>
                              {note.decisions.map((d: string, dIdx: number) => (
                                <li key={dIdx}>{d}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {note.nextTodos && (
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--glass-ink)", display: 'block', marginBottom: 4 }}>
                              次のTODO
                            </span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--glass-ink)", lineHeight: 1.6 }}>
                              {note.nextTodos.map((t: string, tIdx: number) => (
                                <li key={tIdx}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* S17 議事録作成 */
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                議事録を作る
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMinutesTitle.trim() || !newMinutesContent.trim()) return;
                  onSaveMinutes({
                    title: newMinutesTitle.trim(),
                    date: newMinutesDate,
                    attendees: newMinutesAttendees,
                    summary: newMinutesContent.trim(),
                    decisions: ['合意事項を記録'],
                    nextTodos: ['次期アクションを確認']
                  });
                  setIsAddingMinutes(false);
                  setNewMinutesTitle('');
                  setNewMinutesContent('');
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    タイトル <span style={{ color: '#B92F3D' }}>必須</span>
                  </label>
                  <input
                    type="text"
                    value={newMinutesTitle}
                    onChange={(e) => setNewMinutesTitle(e.target.value)}
                    placeholder="会場の打ち合わせ"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      開催日
                    </label>
                    <input
                      type="text"
                      value={newMinutesDate}
                      onChange={(e) => setNewMinutesDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      出席者
                    </label>
                    <input
                      type="text"
                      value={newMinutesAttendees}
                      onChange={(e) => setNewMinutesAttendees(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    メモ・文字起こし <span style={{ color: '#B92F3D' }}>必須</span>
                  </label>
                  <textarea
                    value={newMinutesContent}
                    onChange={(e) => setNewMinutesContent(e.target.value)}
                    placeholder="会議の内容や決定事項を入力してください"
                    rows={4}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)", lineHeight: 1.6 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button className="glass-button"
                    type="button"
                    onClick={() => setIsAddingMinutes(false)}
                    style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                  >
                    キャンセル
                  </button>
                  <button className="glass-button"
                    type="submit"
                    style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                  >
                    保存する
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* C. 振り返りタブ (S18, S19) */}
      {/* ============================================================ */}
      {selectedDocCategory === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isAddingEval ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: "var(--glass-muted)" }}>関係者のみ閲覧可能</span>
                <button className="glass-button"
                  type="button"
                  onClick={() => setIsAddingEval(true)}
                  style={{
                    backgroundColor: "var(--glass-primary)",
                    color: '#FFFFFF',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  振り返りを記録
                </button>
              </div>

              {/* メンバーの提出状況 */}
              <div className="glass-panel"
                style={{
                  backgroundColor: "var(--glass-panel)",
                  borderRadius: 12,
                  border: "1px solid var(--glass-border)",
                  padding: '16px 20px'
                }}
              >
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-muted)", marginBottom: 12 }}>
                  メンバーの提出状況
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(project.members || [
                    { residentId: 'r1', name: '寮生A', role: 'PL' },
                    { residentId: 'r2', name: '寮生B', role: 'GL' }
                  ]).map((m) => (
                    <div
                      key={m.residentId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid #F7F8FA'
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--glass-ink)" }}>
                        {m.name}
                      </span>
                      <span style={{ backgroundColor: "var(--glass-inset)", color: "var(--glass-muted)", fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        提出済
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* S19 振り返り入力フォーム */
            <div className="glass-panel"
              style={{
                backgroundColor: "var(--glass-panel)",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                振り返りを記録
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveEvaluation({
                    targetName: '寮生A',
                    scores: {
                      facilitation: scoreFacilitation,
                      communication: scoreCommunication,
                      safety: scoreSafety,
                      budget: scoreBudget
                    },
                    verdict: evalVerdict,
                    good: evalGood,
                    bad: evalBad
                  });
                  setIsAddingEval(false);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {/* 4つの評価項目 */}
                {[
                  { label: '統率', val: scoreFacilitation, set: setScoreFacilitation },
                  { label: '連絡', val: scoreCommunication, set: setScoreCommunication },
                  { label: '安全・折衝', val: scoreSafety, set: setScoreSafety },
                  { label: '期日・予算', val: scoreBudget, set: setScoreBudget }
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-ink)" }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button className="glass-button"
                          key={num}
                          type="button"
                          onClick={() => item.set(num)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: item.val === num ? "var(--glass-primary)" : "var(--glass-inset)",
                            color: item.val === num ? '#FFFFFF' : "var(--glass-ink)",
                            border: "1px solid var(--glass-border)",
                            fontSize: 12,
                            fontWeight: 700,
                            minHeight: 'auto'
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    強み
                  </label>
                  <textarea
                    value={evalGood}
                    onChange={(e) => setEvalGood(e.target.value)}
                    placeholder="落ち着いて状況を整理し、丁寧に対応できるところ。"
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    フォローが必要な点
                  </label>
                  <textarea
                    value={evalBad}
                    onChange={(e) => setEvalBad(e.target.value)}
                    placeholder="作業が集中すると抱え込みやすいため、早めに相談してほしい。"
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    総合適性
                  </label>
                  <select
                    value={evalVerdict}
                    onChange={(e) => setEvalVerdict(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  >
                    <option value="未評価">未評価</option>
                    <option value="PL適格">PL適格</option>
                    <option value="GL適格">GL適格</option>
                    <option value="専門実務向き">専門実務向き</option>
                    <option value="要フォロー">要フォロー</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button className="glass-button"
                    type="button"
                    onClick={() => setIsAddingEval(false)}
                    style={{ backgroundColor: "var(--glass-inset)", border: "1px solid var(--glass-border)", padding: '10px 16px', borderRadius: 8 }}
                  >
                    キャンセル
                  </button>
                  <button className="glass-button"
                    type="submit"
                    style={{ backgroundColor: "var(--glass-primary)", color: '#FFFFFF', padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
                  >
                    保存する
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* D. 運用ルールタブ (S20) */}
      {/* ============================================================ */}
      {selectedDocCategory === 'rules' && (
        <div className="glass-panel"
          style={{
            backgroundColor: "var(--glass-panel)",
            borderRadius: 12,
            border: "1px solid var(--glass-border)",
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--glass-ink)", margin: '0 0 4px' }}>
              日常の手順
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--glass-ink)", lineHeight: 1.8 }}>
              <li>使い終わったら、シンクと作業台を清掃する。</li>
              <li>消耗品の残量を確認し、必要に応じて補充する。</li>
              <li>異常があれば、すぐにチームに共有する。</li>
            </ol>
          </div>

          <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-muted)", marginBottom: 4 }}>
              保管場所
            </h4>
            <p style={{ fontSize: 14, color: "var(--glass-ink)", margin: 0 }}>
              倉庫A
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--glass-muted)", marginBottom: 4 }}>
              補充の目安
            </h4>
            <p style={{ fontSize: 14, color: "var(--glass-ink)", margin: 0 }}>
              残り3ロール以下になった時点で補充
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
