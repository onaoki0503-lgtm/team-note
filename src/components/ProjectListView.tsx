import { useScreenState } from '../lib/navigation';
import React from 'react';
import { Search, Plus, Users, ChevronRight } from 'lucide-react';
import type { ProjectRecord, CurrentUser } from '../lib/db';

interface ProjectListViewProps {
  projects: ProjectRecord[];
  currentUser: CurrentUser;
  onSelectProject: (projectId: string) => void;
  onOpenNewIdea: () => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  currentUser,
  onSelectProject,
  onOpenNewIdea
}) => {
  const [searchQuery, setSearchQuery] = useScreenState('project-search', '', false);
  const [filterMode, setFilterMode] = useScreenState<'all' | 'joined' | 'owned'>('project-filter', 'all', false);
  const [selectedCategory, setSelectedCategory] = useScreenState<string>('project-category', 'all', false);

  const filtered = projects.filter((pj) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      pj.title.toLowerCase().includes(q) ||
      (pj.description ? pj.description.toLowerCase().includes(q) : false) ||
      pj.owner.toLowerCase().includes(q) ||
      (pj.members && pj.members.some((m) => m.name.toLowerCase().includes(q)));

    const matchCategory = selectedCategory === 'all' || pj.category === selectedCategory;

    let matchMode = true;
    if (filterMode === 'joined') {
      matchMode = pj.members && pj.members.some((m) => m.residentId === currentUser.id);
    } else if (filterMode === 'owned') {
      matchMode = pj.ownerId === currentUser.id || pj.owner.includes(currentUser.name);
    }

    return matchQuery && matchCategory && matchMode;
  });

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '16px 10px', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 上部ヘッダー S05 進行中  */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--glass-ink)", letterSpacing: -0.4 }}>
            進行中
          </h2>

        </div>
        <button className="glass-button"
          type="button"
          onClick={onOpenNewIdea}
          style={{
            backgroundColor: "var(--glass-primary)",
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={16} />
          <span>新しい企画をつくる</span>
        </button>
      </div>

      {/* 検索バー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: "var(--glass-panel)",
          border: "1px solid var(--glass-border)",
          borderRadius: 8,
          padding: '10px 14px'
        }}
      >
        <Search size={18} color="#596273" />
        <input
          type="text"
          placeholder="企画を検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: 'transparent'
          }}
        />
      </div>

      {/* フィルターチップ */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {(['all', 'joined', 'owned'] as const).map((mode) => {
          const labels = { all: 'すべて', joined: '参加中', owned: '自分の企画' };
          const active = filterMode === mode;
          return (
            <button className="glass-button"
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                backgroundColor: active ? "var(--glass-primary)" : "var(--glass-panel)",
                color: active ? '#FFFFFF' : "var(--glass-muted)",
                border: active ? '1px solid #171A21' : "1px solid var(--glass-border)",
                whiteSpace: 'nowrap',
                minHeight: 36
              }}
            >
              {labels[mode]}
            </button>
          );
        })}
      </div>

      {/* プロジェクトカード一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div className="glass-panel"
            style={{
              backgroundColor: "var(--glass-panel)",
              border: "1px solid var(--glass-border)",
              borderRadius: 12,
              padding: '40px 20px',
              textAlign: 'center',
              color: "var(--glass-muted)"
            }}
          >
            <p style={{ fontSize: 14, marginBottom: 12 }}>一致する企画が見つかりませんでした。</p>
            <button className="glass-button"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterMode('all');
                setSelectedCategory('all');
              }}
              style={{
                backgroundColor: "var(--glass-inset)",
                border: "1px solid var(--glass-border)",
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              条件をクリア
            </button>
          </div>
        ) : (
          filtered.map((pj) => {
            const isEvent = pj.projectType !== 'operation';
            const edgeColor = isEvent ? '#FF6B68' : '#12BDE8';
            return (
              <button type="button" className="glass-panel project-card"
                key={pj.id}
                onClick={() => onSelectProject(pj.id)}
                style={{
                  backgroundColor: "var(--glass-panel)",
                  borderRadius: 12,
                  border: "1px solid var(--glass-border)",
                  borderLeft: `5px solid ${edgeColor}`,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(23, 26, 33, 0.03)',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--glass-ink)", margin: 0 }}>
                      {pj.title}
                    </h3>
                    <span
                      style={{
                        backgroundColor: "var(--glass-inset)",
                        color: "var(--glass-muted)",
                        border: "1px solid var(--glass-border)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 7,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {pj.status === 'planning' ? '企画中' : pj.status === 'testing' ? '試行中' : (pj.status || '進行中')}
                    </span>
                  </div>
                  {pj.description && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--glass-muted)",
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {pj.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: "var(--glass-muted)" }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={13} />
                      {pj.members ? pj.members.length : 1} 人
                    </span>
                    <span>発起人 {pj.owner}</span>
                  </div>
                </div>
                <ChevronRight size={18} color="#596273" style={{ flexShrink: 0 }} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
