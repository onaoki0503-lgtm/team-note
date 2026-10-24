import type { WorkReportItem } from '../components/WorkStorageViews';
import { teamnoteClient } from './teamnoteCloud';

const community = 'h-village';

type CloudReport = {
  id: string;
  title?: string;
  category?: string;
  body?: string;
  reportDate?: string;
  locationLabel?: string;
  createdAt?: string;
};

const CATEGORY_TO_ACTIVITY: Record<string, WorkReportItem['activityType']> = {
  役職固有業務: 'inherent',
  役職連携業務: 'cooperation',
  役職共通業務: 'common',
  共通業務: 'common',
  トラブル対応: 'trouble',
  ユニット立ち入り: 'unit_entry',
};

const ACTIVITY_TO_CATEGORY: Record<WorkReportItem['activityType'], string> = {
  inherent: '役職固有業務',
  cooperation: '役職連携業務',
  common: '役職共通業務',
  trouble: 'トラブル対応',
  unit_entry: 'ユニット立ち入り',
};

function asRows(data: unknown): CloudReport[] {
  if (!Array.isArray(data)) throw new Error('teamnote_invalid_response');
  return data as CloudReport[];
}

function displayDate(iso: string | undefined): string {
  if (!iso) return '';
  const day = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day.replace(/-/g, '/');
  return iso;
}

export function mapCloudReport(row: CloudReport, authorName: string): WorkReportItem {
  const category = typeof row.category === 'string' ? row.category : '役職固有業務';
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    category,
    activityType: CATEGORY_TO_ACTIVITY[category] || 'inherent',
    content: typeof row.body === 'string' ? row.body : '',
    actionResult: typeof row.body === 'string' ? row.body : '',
    author: authorName,
    date: displayDate(row.reportDate) || displayDate(row.createdAt),
    entryUnit: typeof row.locationLabel === 'string' ? row.locationLabel : '',
  };
}

export async function listTeamnoteReports(authorName: string): Promise<WorkReportItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_list_reports', { p_community: community });
  if (error) throw error;
  return asRows(data).map((row) => mapCloudReport(row, authorName));
}

export async function saveTeamnoteReport(input: {
  title: string;
  activityType: WorkReportItem['activityType'];
  body: string;
  date: string;
  authorName: string;
  locationLabel?: string;
}): Promise<WorkReportItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const isoDate = input.date.includes('/')
    ? input.date.replace(/\//g, '-').slice(0, 10)
    : input.date.slice(0, 10);
  const { data, error } = await teamnoteClient.rpc('tn_save_report', {
    p_community: community,
    p_title: input.title,
    p_category: ACTIVITY_TO_CATEGORY[input.activityType],
    p_body: input.body,
    p_date: isoDate,
    p_attachments: [],
    p_lat: null,
    p_lng: null,
    p_location_label: input.locationLabel || null,
  });
  if (error) throw error;
  return asRows(data).map((row) => mapCloudReport(row, input.authorName));
}

export { ACTIVITY_TO_CATEGORY };
