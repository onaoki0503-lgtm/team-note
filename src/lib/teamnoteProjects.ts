import type { ProjectMemberRecord, ProjectProposalDoc, ProjectRecord } from './db';
import { cloudError, teamnoteClient } from './teamnoteCloud';

const community = 'h-village';
const PROPOSAL_PREFIX = 'PROPOSAL_JSON:';

type CloudMember = {
  residentId?: string;
  name?: string;
  avatar?: string;
  role?: string;
  building?: string;
  joinedAt?: string;
};

type CloudProjectRow = {
  id: string;
  title: string;
  summary?: string;
  status?: string;
  ownerId?: string;
  ownerName?: string;
  memberCount?: number;
  updatedAt?: string;
  details?: Record<string, unknown>;
  members?: CloudMember[];
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

function asMember(m: CloudMember): ProjectMemberRecord {
  return {
    residentId: str(m.residentId),
    name: str(m.name) || 'メンバー',
    avatar: str(m.avatar),
    role: str(m.role) || 'スタッフ',
    building: str(m.building),
    joinedAt: str(m.joinedAt) || new Date().toISOString().slice(0, 10),
  };
}

function mapMembers(row: CloudProjectRow, details: Record<string, unknown>): ProjectMemberRecord[] {
  const fromDb = Array.isArray(row.members) && row.members.length
    ? row.members.map(asMember)
    : [];
  const fromDetails = Array.isArray(details.staffMembers)
    ? (details.staffMembers as CloudMember[]).map(asMember)
    : [];
  const byId = new Map<string, ProjectMemberRecord>();
  for (const m of [...fromDb, ...fromDetails]) {
    if (m.residentId) byId.set(m.residentId, m);
  }
  if (byId.size) return Array.from(byId.values());
  const ownerId = str(row.ownerId);
  const ownerName = str(row.ownerName);
  const memberCount = Math.max(1, Number(row.memberCount) || 1);
  return Array.from({ length: memberCount }, (_, index) => ({
    residentId: index === 0 && ownerId ? ownerId : `member-${row.id}-${index}`,
    name: index === 0 ? ownerName || 'メンバー' : `メンバー${index + 1}`,
    avatar: '',
    role: index === 0 ? '発起人' : 'メンバー',
    building: '',
    joinedAt: str(row.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
  }));
}

/** Maps tn_list_projects rows (+ optional PROPOSAL_JSON / details) into web ProjectRecord. */
export function mapCloudProject(row: CloudProjectRow): ProjectRecord {
  const summary = str(row.summary);
  const doc = parseProposal(summary);
  const details = row.details && typeof row.details === 'object' ? row.details : {};
  const projectType =
    details.projectType === 'event' || doc?.projectType === 'event' ? 'event' : 'operation';
  const ownerName = str(row.ownerName) || str(doc?.ownerName);
  const ownerId = str(row.ownerId);

  const proposalFromDetails = details.proposalDoc as ProjectProposalDoc | undefined;
  const proposalDoc: ProjectProposalDoc | undefined = proposalFromDetails
    || (doc
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
      : undefined);

  return {
    id: String(row.id),
    title: str(row.title),
    category: str(details.category) || str(doc?.category, projectType === 'event' ? 'イベント' : '施設・日常'),
    status: str(row.status, '進行中'),
    progress: typeof details.progress === 'number' ? details.progress : str(row.status) === '完了' ? 100 : 40,
    owner: ownerName,
    ownerId: ownerId || undefined,
    nextAction: str(details.nextAction) || str(doc?.nextAction) || (summary.startsWith(PROPOSAL_PREFIX) ? '' : summary.slice(0, 80)),
    createdAt: str(row.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
    description:
      str(details.description) ||
      str(doc?.objective) ||
      str(doc?.proposalOverview) ||
      (summary.startsWith(PROPOSAL_PREFIX) ? '' : summary),
    bannerImage: str(details.bannerImage) || str(doc?.bannerImage) || undefined,
    projectType,
    isEventWorkflow: projectType === 'event',
    members: mapMembers(row, details),
    proposalDoc,
    workflowSteps: Array.isArray(details.workflowSteps) ? (details.workflowSteps as ProjectRecord['workflowSteps']) : undefined,
    meetingNotes: Array.isArray(details.meetingNotes) ? (details.meetingNotes as ProjectRecord['meetingNotes']) : undefined,
    evaluations: Array.isArray(details.evaluations) ? (details.evaluations as ProjectRecord['evaluations']) : undefined,
    groups: Array.isArray(details.groups) ? (details.groups as ProjectRecord['groups']) : undefined,
  };
}

export function projectDetailsPayload(project: ProjectRecord): Record<string, unknown> {
  return {
    projectType: project.projectType || 'operation',
    category: project.category,
    nextAction: project.nextAction,
    description: project.description || '',
    bannerImage: project.bannerImage || '',
    progress: project.progress,
    workflowSteps: project.workflowSteps || [],
    meetingNotes: project.meetingNotes || [],
    evaluations: project.evaluations || [],
    groups: project.groups || [],
    proposalDoc: project.proposalDoc || null,
    staffMembers: (project.members || []).map((m) => ({
      residentId: m.residentId,
      name: m.name,
      avatar: m.avatar,
      role: m.role,
      building: m.building,
      joinedAt: m.joinedAt,
    })),
  };
}

function asRows(data: unknown): CloudProjectRow[] {
  if (!Array.isArray(data)) throw new Error('teamnote_invalid_response');
  return data as CloudProjectRow[];
}

async function rpcProjects(name: string, args: Record<string, unknown>): Promise<ProjectRecord[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc(name, args);
  if (error) throw error;
  return asRows(data).map(mapCloudProject);
}

export async function listTeamnoteProjects(): Promise<ProjectRecord[]> {
  return rpcProjects('tn_list_projects', { p_community: community });
}

export async function createTeamnoteProject(title: string, summary: string): Promise<ProjectRecord[]> {
  return rpcProjects('tn_create_project', {
    p_community: community,
    p_title: title,
    p_summary: summary,
  });
}

export async function updateTeamnoteProjectDetails(projectId: string, details: Record<string, unknown>): Promise<ProjectRecord[]> {
  return rpcProjects('tn_update_project_details', {
    p_community: community,
    p_id: projectId,
    p_details: details,
  });
}

export async function updateTeamnoteProjectSummary(
  projectId: string,
  summary: string,
  status?: string
): Promise<ProjectRecord[]> {
  return rpcProjects('tn_update_project_summary', {
    p_community: community,
    p_id: projectId,
    p_summary: summary,
    p_status: status ?? null,
  });
}

export async function joinTeamnoteProject(projectId: string, role = 'スタッフ'): Promise<ProjectRecord[]> {
  return rpcProjects('tn_join_project', {
    p_community: community,
    p_id: projectId,
    p_role: role,
  });
}

export async function leaveTeamnoteProject(projectId: string): Promise<ProjectRecord[]> {
  return rpcProjects('tn_leave_project', {
    p_community: community,
    p_id: projectId,
  });
}

export function teamnoteProjectError(error: unknown): string {
  return cloudError(error);
}

export function buildProposalSummary(payload: Record<string, unknown>): string {
  return `${PROPOSAL_PREFIX}${JSON.stringify(payload)}`;
}
