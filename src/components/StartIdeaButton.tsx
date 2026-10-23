import { Plus } from 'lucide-react';
export function StartIdeaButton({ onClick }: { onClick: () => void; size?: number }) {
  return <button type="button" className="start-idea glass-surface" onClick={onClick} aria-label="企画を作成"><span className="start-idea-ring" aria-hidden="true" /><span className="start-idea-icon"><Plus size={32} strokeWidth={1.4} /></span><span>企画を作成</span></button>;
}
