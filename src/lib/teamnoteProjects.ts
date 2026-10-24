import type { ProjectRecord, ProjectProposalDoc } from './db';
import { cloudError, teamnoteClient } from './teamnoteCloud';

const community = 'h-village';
const PROPOSAL_PREFIX = 'PROPOSAL_JSON:';

type CloudProjectRow = {
  id: string;
  title: string;
  summary?: string;
  status?: string;
  ownerId?: string;
  ownerName?: string;
  memberCount?: number;
  updatedAt?: string;
};

function parseProposal(summary: string): Record<string, unknown> | null {
  if (!summary.startsWith(PROPOSAL_PREFIX)) return null;
  try {
    const parsed = JSON.parse(summary.slice(PROPOSAL_PREFIX.length));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Maps tn_list_projects rows (+ optional PROPOSAL_JSON summary) into web ProjectRecord. */
export function mapCloudProject(row: CloudProjectRow): ProjectRecord {
  const summary = str(row.summary);
  const doc = parseProposal(summary);
  const projectType = doc?.projectType === 'event' ? 'event' : 'operation';
  const ownerName = str(row.ownerName) || str(doc?.ownerName);
  const ownerId = str(row.ownerId);
  const memberCount = Math.max(1, Number(row.memberCount) || 1);
  const members = Array.from({ length: memberCount }, (_, index) => ({
    residentId: index === 0 && ownerId ? ownerId : `member-${row.id}-${index}`,
    name: index === 0 ? ownerName || 'メンバー' : `メンバー${index + 1}`,
    avatar: '',
    role: index === 0 ? '発起人' : 'メンバー',
    building: '',
    joinedAt: str(row.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
  }));

  const proposalDoc: ProjectProposalDoc | undefined = doc
    ? {
        title: str(doc.title, row.title),
        purpose: str(doc.objective) || str(doc.purpose),
        objective: str(doc.objective),
        background: str(doc.background),
        proposalOverview: str(doc.proposalOverview),
        recipient: str(doc.recipient),
        submissionDate: str(doc.submissionDate),
        totalBudget: str(doc.budget) || str(doc.totalBudget),
        summary: str(doc.summary),
      }
    : undefined;

  return {
    id: String(row.id),
    title: str(row.title),
    category: str(doc?.category, projectType === 'event' ? 'イベント' : '施設・日常'),
    status: str(row.status, '進行中'),
    progress: str(row.status) === '完了' ? 100 : 40,
    owner: ownerName,
    ownerId: ownerId || undefined,
    nextAction: str(doc?.nextAction) || (summary.startsWith(PROPOSAL_PREFIX) ? '' : summary.slice(0, 80)),
    createdAt: str(row.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
    description:
      str(doc?.objective) ||
      str(doc?.proposalOverview) ||
      (summary.startsWith(PROPOSAL_PREFIX) ? '' : summary),
    bannerImage: str(doc?.bannerImage) || undefined,
    projectType,
    isEventWorkflow: projectType === 'event',
    members,
    proposalDoc,
  };
}

function asRows(data: unknown): CloudProjectRow[] {
  if (!Array.isArray(data)) throw new Error('teamnote_invalid_response');
  return data as CloudProjectRow[];
}

export async function listTeamnoteProjects(): Promise<ProjectRecord[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_list_projects', { p_community: community });
  if (error) throw error;
  return asRows(data).map(mapCloudProject);
}

export async function createTeamnoteProject(title: string, summary: string): Promise<ProjectRecord[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_create_project', {
    p_community: community,
    p_title: title,
    p_summary: summary,
  });
  if (error) throw error;
  return asRows(data).map(mapCloudProject);
}

export function teamnoteProjectError(error: unknown): string {
  return cloudError(error);
}

export function buildProposalSummary(payload: Record<string, unknown>): string {
  return `${PROPOSAL_PREFIX}${JSON.stringify(payload)}`;
}
