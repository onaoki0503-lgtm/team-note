import { community } from './community';
export const checkIdeaSentenceValidity = (text: string): { valid: boolean; reason?: string } => {
  const chars = Array.from(text.trim());
  if (chars.length < 4) return { valid: false, reason: '4文字以上で入力してください' };
  if (chars.length > community.ideas.maxLength) return { valid: false, reason: '140文字以内で書いてください' };
  if (/^(.)\1+$/u.test(text.trim())) return { valid: false, reason: '同じ文字の繰り返しは投稿できません' };
  return { valid: true };
};
