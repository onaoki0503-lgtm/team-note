import { community } from './community';
import type { InventoryItem } from './inventoryImport';
export const INVENTORY_STORAGE_KEY = `tn_inventory:${community.id}:v1`;
export interface InventoryData { version: 1; items: InventoryItem[] }
export function loadInventory(): InventoryData {
  const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
  if (!raw) return { version: 1, items: [] };
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('items' in data) || !Array.isArray(data.items) || data.items.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.location !== 'string' || typeof item.assetCode !== 'string' || !(item.quantity === null || (typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0)) || typeof item.unit !== 'string' || typeof item.status !== 'string' || typeof item.note !== 'string' || typeof item.updatedAt !== 'string' || !item.source || typeof item.source !== 'object' || typeof item.source.file !== 'string' || typeof item.source.sheet !== 'string' || !Number.isInteger(item.source.row))) throw new Error('保存済みの備品台帳を読み込めません。データを上書きせずに停止しました。');
  if (new Set(data.items.map(item => item.id)).size !== data.items.length) throw new Error('保存済みの備品台帳に重複したIDがあります。上書きせずに停止しました。');
  return data as InventoryData;
}
export function saveInventory(data: InventoryData) { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(data)); }
