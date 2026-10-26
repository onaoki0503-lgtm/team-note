export interface ManagerContext {
  communityId: string;
  communityName: string;
  userId: string;
  name: string;
  organization: string;
}

// A submitted monthly document, never an aggregation of unsubmitted daily logs.
export interface ManagementReport {
  id: string;
  month: string;
  body: string;
  submittedAt: string;
  author: { id: string; name: string; role: string; building: string; unit: string };
}
export const buildings: Record<string, string> = { rosemary: 'ローズマリー', basil: 'バジル', turmeric: 'ターメリック', paprika: 'パプリカ' };
