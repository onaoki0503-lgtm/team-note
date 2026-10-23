export interface ExtractedTopic {
  id: string;
  title: string;
  projectType: 'event' | 'operation';
  summary: string;
  keyPoints: string[];
}

export interface ProposalConceptBox {
  number: string;
  title: string;
  description: string;
  tagColor?: string;
}

export interface ProposalOperationFlowItem {
  target: string;
  content: string;
}

export interface ProposalStakeholderImpact {
  stakeholder: string;
  title: string;
  description: string;
}

export interface ProposalBudgetItem {
  name: string;
  spec: string;
  quantity: string;
  cost: string;
}

export interface ProposalDocument {
  implementationDate?: string;
  responsible?: string;
  docType: string;
  title: string;
  subTitle: string;
  projectType: 'event' | 'operation';
  submittedTo: string;
  submittedDate: string;
  location: string;
  targetAudience: string;
  background: string;
  highlightQuote: string;
  issues: string[];
  proposalOverview: string;
  proposalConcept: string;
  conceptBoxes: ProposalConceptBox[];
  operationFlow: ProposalOperationFlowItem[];
  stakeholderImpacts: ProposalStakeholderImpact[];
  budgetItems: ProposalBudgetItem[];
  totalCostEstimate: string;
  actionSteps: string[];
  summaryText: string;
  objective: string;
  requirements: string[];
  expectedImpact: string;
}


export const MAX_AI_INPUT = 12000;
export type AiTask = 'topics' | 'proposal' | 'distribute';
const strings = (value: unknown, max = 12): value is string[] => Array.isArray(value) && value.length <= max && value.every(item => typeof item === 'string' && item.length <= 5000);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function isTopics(value: unknown): value is ExtractedTopic[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 3 && value.every(item => object(item) && typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 200 && (item.projectType === 'event' || item.projectType === 'operation') && typeof item.summary === 'string' && strings(item.keyPoints));
}
export function isProposal(value: unknown): value is ProposalDocument {
  if (!object(value) || typeof value.title !== 'string' || !value.title.trim() || (value.projectType !== 'event' && value.projectType !== 'operation')) return false;
  const fields = ['docType','title','subTitle','submittedTo','submittedDate','location','targetAudience','background','highlightQuote','proposalOverview','proposalConcept','totalCostEstimate','summaryText','objective','expectedImpact'];
  if (!fields.every(key => typeof value[key] === 'string' && (value[key] as string).length <= 8000)) return false;
  if (!['issues','actionSteps','requirements'].every(key => strings(value[key]))) return false;
  const lists: Record<string, string[]> = { conceptBoxes: ['number','title','description'], operationFlow: ['target','content'], stakeholderImpacts: ['stakeholder','title','description'], budgetItems: ['name','spec','quantity','cost'] };
  return Object.entries(lists).every(([key, fields]) => Array.isArray(value[key]) && value[key].length <= 12 && value[key].every((row: unknown) => object(row) && fields.every(field => typeof row[field] === 'string' && (row[field] as string).length <= 5000)));
}
export function emptyProposal(source = ''): ProposalDocument {
  return { docType: '企画提案書', title: source.split(/\n|。/)[0].slice(0, 60), subTitle: '', projectType: 'operation', submittedTo: '', submittedDate: '', location: '', targetAudience: '', background: source, highlightQuote: '', issues: [], proposalOverview: '', proposalConcept: '', conceptBoxes: [], operationFlow: [], stakeholderImpacts: [], budgetItems: [], totalCostEstimate: '未確認', actionSteps: [], summaryText: '', objective: '', requirements: [], expectedImpact: '' };
}
