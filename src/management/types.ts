export interface ManagerContext {
  communityId: string;
  communityName: string;
  userId: string;
  name: string;
  organization: string;
}

export interface ReportReview {
  reviewed: boolean;
  reviewedAt: string | null;
  reviewerName: string;
  version: number;
}

export interface ManagementReport {
  id: string;
  title: string;
  category: string;
  body: string;
  reportDate: string;
  submittedAt: string;
  author: { id: string; name: string; role: string; building: string; unit: string };
  attachments: { kind: string; label: string; path?: string }[];
  locationLabel: string;
  review: ReportReview;
}

export const categories = ['役職固有業務', '役職連携業務', '役職共通業務', 'トラブル対応', 'ユニット立ち入り'];
export const buildings: Record<string, string> = { rosemary: 'ローズマリー', basil: 'バジル', turmeric: 'ターメリック', paprika: 'パプリカ' };
export type ManagementSection = 'overview' | 'reports' | 'pending' | 'summary';
