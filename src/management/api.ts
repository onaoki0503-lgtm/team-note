import { teamnoteClient } from '../lib/teamnoteCloud';
import type { ManagementReport, ManagerContext, ReportReview } from './types';
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
  const range = monthRange(month);
  const { data, error } = await client().rpc('tn_management_reports', { p_community: community, p_from: range.from, p_before: range.before });
  if (error) throw error;
  if (!Array.isArray(data) || data.some(r => !r || typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.body !== 'string' || !r.author || typeof r.author.name !== 'string' || !Array.isArray(r.attachments) || !r.review || !Number.isInteger(r.review.version))) throw new Error('invalid_management_response');
  return data.map(row => ({ ...row, attachments: row.attachments.filter((file: unknown) => file && typeof file === 'object' && !Array.isArray(file)).map((file: Record<string, unknown>) => ({ kind: typeof file.kind === 'string' ? file.kind : 'file', label: typeof file.label === 'string' ? file.label : '添付ファイル', path: typeof file.path === 'string' ? file.path : undefined })) }));
}

export async function saveManagementReview(report: ManagementReport, reviewed: boolean): Promise<ReportReview> {
  const { data, error } = await client().rpc('tn_management_set_review', { p_community: community, p_report_id: report.id, p_reviewed: reviewed, p_expected_version: report.review.version });
  if (error) throw error;
  if (!data || !Number.isInteger(data.version) || typeof data.reviewed !== 'boolean') throw new Error('invalid_management_response');
  return data;
}

export async function managementAttachmentUrl(path: string) {
  if (!path.startsWith(`${community}/reports/`) || /(^|\/)\.\.(\/|$)|[\\]/.test(path) || Array.from(path).some(c => c.charCodeAt(0) < 32)) throw new Error('invalid_attachment');
  const { data, error } = await client().storage.from('tn-files').createSignedUrl(path, 60);
  if (error) throw error;
  const url = new URL(data.signedUrl);
  const expected = new URL(import.meta.env.VITE_TEAMNOTE_SUPABASE_URL);
  if (url.origin !== expected.origin || !url.pathname.startsWith('/storage/v1/object/sign/tn-files/')) throw new Error('invalid_attachment');
  return url.href;
}
