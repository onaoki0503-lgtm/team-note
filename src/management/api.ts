import { teamnoteClient } from '../lib/teamnoteCloud';
import type { ManagementReport, ManagerContext } from './types';
import { monthRange } from './data';

const community = 'h-village';
function client() {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  return teamnoteClient;
}
export async function managementContext(): Promise<ManagerContext> {
  const { data, error } = await client().rpc('tn_management_context', { p_community: community });
  if (error) throw error;
  if (!data || data.communityId !== community || typeof data.userId !== 'string' || typeof data.name !== 'string') throw new Error('invalid_management_response');
  return data;
}
export async function loadManagementReports(month: string): Promise<ManagementReport[]> {
  const { data, error } = await client().rpc('tn_management_monthly_reports', { p_community: community, p_month: monthRange(month).from });
  if (error) throw error;
  if (!Array.isArray(data) || data.some(r => !r || typeof r.id !== 'string' || r.month !== month || typeof r.body !== 'string' || typeof r.submittedAt !== 'string' || Number.isNaN(Date.parse(r.submittedAt)) || !r.author || ['id', 'name', 'role', 'building', 'unit'].some(k => typeof r.author[k] !== 'string'))) throw new Error('invalid_management_response');
  return data;
}
