import { teamnoteClient } from './teamnoteCloud';

const community = 'h-village';

export type ArchiveDocItem = {
  id: string;
  title: string;
  category: string;
  storagePath: string;
  sizeBytes: number;
  updatedAt: string;
  year: string;
  desc: string;
};

type CloudArchive = {
  id: string;
  title?: string;
  category?: string;
  storagePath?: string;
  sizeBytes?: number;
  updatedAt?: string;
};

function asRows(data: unknown): CloudArchive[] {
  if (!Array.isArray(data)) throw new Error('teamnote_invalid_response');
  return data as CloudArchive[];
}

function yearLabel(iso: string): string {
  const y = Number((iso || '').slice(0, 4));
  if (!Number.isFinite(y) || y < 2000) return 'その他';
  return `${y}年度`;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapCloudArchive(row: CloudArchive): ArchiveDocItem {
  const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : '';
  const sizeBytes = typeof row.sizeBytes === 'number' ? row.sizeBytes : 0;
  const category = typeof row.category === 'string' ? row.category : '資料';
  const path = typeof row.storagePath === 'string' ? row.storagePath : '';
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    category,
    storagePath: path,
    sizeBytes,
    updatedAt,
    year: yearLabel(updatedAt),
    desc: [category, formatSize(sizeBytes), path].filter(Boolean).join(' · '),
  };
}

export async function listTeamnoteArchives(): Promise<ArchiveDocItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_list_archives', { p_community: community });
  if (error) throw error;
  return asRows(data).map(mapCloudArchive);
}

export async function addTeamnoteArchive(input: {
  title: string;
  category: string;
  path: string;
  sizeBytes: number;
}): Promise<ArchiveDocItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_add_archive', {
    p_community: community,
    p_title: input.title,
    p_category: input.category,
    p_path: input.path,
    p_size: input.sizeBytes,
  });
  if (error) throw error;
  return asRows(data).map(mapCloudArchive);
}
