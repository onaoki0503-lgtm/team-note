import type { InventoryItem } from './inventoryImport';
import { teamnoteClient } from './teamnoteCloud';

const community = 'h-village';
const CLOUD_SOURCE = { file: 'cloud', sheet: '', row: 0 };

type CloudInventory = {
  id: string;
  name?: string;
  location?: string;
  assetCode?: string;
  quantity?: number | null;
  unit?: string;
  status?: string;
  note?: string;
  updatedAt?: string;
};

function asRows(data: unknown): CloudInventory[] {
  if (!Array.isArray(data)) throw new Error('teamnote_invalid_response');
  return data as CloudInventory[];
}

export function mapCloudInventoryItem(row: CloudInventory): InventoryItem {
  const qty = row.quantity;
  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : '',
    location: typeof row.location === 'string' ? row.location : '',
    assetCode: typeof row.assetCode === 'string' ? row.assetCode : '',
    quantity: typeof qty === 'number' && Number.isFinite(qty) ? qty : null,
    unit: typeof row.unit === 'string' ? row.unit : '',
    status: typeof row.status === 'string' ? row.status : '在庫',
    note: typeof row.note === 'string' ? row.note : '',
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
    source: CLOUD_SOURCE,
  };
}

export async function listTeamnoteInventory(): Promise<InventoryItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_list_inventory', { p_community: community });
  if (error) throw error;
  return asRows(data).map(mapCloudInventoryItem);
}

export async function upsertTeamnoteInventoryItem(item: InventoryItem): Promise<InventoryItem[]> {
  if (!teamnoteClient) throw new Error('teamnote_not_configured');
  const { data, error } = await teamnoteClient.rpc('tn_upsert_inventory_item', {
    p_community: community,
    p_id: item.id || null,
    p_name: item.name,
    p_location: item.location || '',
    p_asset_code: item.assetCode || '',
    p_quantity: item.quantity,
    p_unit: item.unit || '',
    p_status: item.status || '在庫',
    p_note: item.note || '',
  });
  if (error) throw error;
  return asRows(data).map(mapCloudInventoryItem);
}

/** Upsert changed rows then return the full cloud list. */
export async function syncTeamnoteInventory(items: InventoryItem[]): Promise<InventoryItem[]> {
  let last: InventoryItem[] = [];
  for (const item of items) {
    last = await upsertTeamnoteInventoryItem(item);
  }
  return last.length ? last : listTeamnoteInventory();
}
