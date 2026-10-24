import { teamnoteClient } from './teamnoteCloud';

const community = 'h-village';
const bucket = 'tn-files';

export async function uploadTeamnoteFile(file: File, folder: 'archives' | 'reports'): Promise<{ path: string; size: number }> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const safe = file.name.replace(/[^\w.\-一-龥ぁ-んァ-ン]/gu, '_').slice(0, 80) || 'file';
  const path = `${community}/${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await teamnoteClient.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  return { path, size: file.size };
}

export async function signedTeamnoteUrl(path: string, expiresSec = 3600): Promise<string | null> {
  if (!teamnoteClient || !path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('demo/')) return null;
  const { data, error } = await teamnoteClient.storage.from(bucket).createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
