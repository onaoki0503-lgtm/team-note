import type { ProjectRecord } from './db';

// A read-only projection: never use the resident's old manually entered history.
export function getActivityHistory(projects: ProjectRecord[], residentId: string) {
  return projects.flatMap(project => [
    ...project.members.filter(member => member.residentId === residentId).map(member => ({ ...member, leftAt: '' })),
    ...(project.pastMembers || []).filter(member => member.residentId === residentId)
  ].map(member => ({
    id: `${project.id}:${residentId}:${member.joinedAt}:${member.leftAt}`,
    projectTitle: project.title,
    role: member.eventRole || 'スタッフ',
    groupName: member.groupName,
    period: `${member.joinedAt ? member.joinedAt.slice(0, 10) : '加入日未記録'} 〜 ${member.leftAt ? member.leftAt.slice(0, 10) : ''}`,
    status: member.leftAt ? '参加終了' : project.status === '完了' ? '完了' : '参加中',
    sortDate: member.joinedAt || ''
  }))).sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.id.localeCompare(b.id));
}
