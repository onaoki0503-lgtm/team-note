import { PROPOSAL_FIELDS, newProposalForm, type ProposalForm } from './proposalForm';
export function loadProposalDraft(key: string, initial = ''): ProposalForm {
  try {
    const raw = localStorage.getItem(key); if (!raw) return newProposalForm(initial);
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.form || !['event', 'operation'].includes(data.form.projectType) || !PROPOSAL_FIELDS.every(field => typeof data.form[field.key] === 'string' && data.form[field.key].length <= field.max)) return newProposalForm(initial);
    return data.form;
  } catch { return newProposalForm(initial); }
}
