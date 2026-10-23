export const REPORT_QUESTIONS = [
  { key: 'when', label: 'いつ', question: 'いつ行いましたか', example: '今日の午後6時ごろ', required: true },
  { key: 'where', label: 'どこで', question: 'どこで行いましたか', example: 'ローズマリー棟3階のキッチン', required: true },
  { key: 'action', label: '何をした', question: 'どんなことをしましたか', example: '床と作業台を掃除して、ごみを分別しました', required: true },
  { key: 'result', label: 'どうなった', question: '結果や気づいたことはありますか', example: 'きれいになりました。照明が1つ切れていました', required: true },
  { key: 'handover', label: '申し送り', question: '次の人に伝えたいことはありますか', example: '照明の交換を管理事務所へお願いしたいです', required: false }
] as const;
export type AnswerKey = typeof REPORT_QUESTIONS[number]['key'];
export type VoiceAnswers = Record<AnswerKey, string>;
export const EMPTY_VOICE_ANSWERS: VoiceAnswers = { when: '', where: '', action: '', result: '', handover: '' };

// Interpret only explicit dates. Keep unrecognised speech for the user's date confirmation.
export function spokenReportDate(text: string, today: string): string | null {
  const source = text.normalize('NFKC').trim();
  const [year, month, day] = today.split('-').map(Number);
  const relative = /一昨日|おととい/.test(source) ? -2 : /昨日|きのう/.test(source) ? -1 : /今日|きょう|本日/.test(source) ? 0 : null;
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (relative !== null) return format(new Date(year, month - 1, day + relative));
  const match = source.match(/(?:(\d{4})[年/-])?(\d{1,2})[月/-](\d{1,2})(?:日|(?=\s|$|の))/);
  if (!match) return null;
  const y = match[1] ? Number(match[1]) : year;
  const m = Number(match[2]); const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? format(date) : null;
}

export function buildVoiceReport(answers: VoiceAnswers) {
  const labels: Record<AnswerKey, string> = { when: '実施日時', where: '場所', action: '実施したこと', result: '結果・気づき', handover: '申し送り' };
  const body = REPORT_QUESTIONS.filter(question => answers[question.key].trim())
    .map(question => `${labels[question.key]}：${answers[question.key].trim()}`).join('\n');
  const first = answers.action.trim().split(/[。\n]/)[0];
  return { title: Array.from(first).slice(0, 40).join(''), body };
}
