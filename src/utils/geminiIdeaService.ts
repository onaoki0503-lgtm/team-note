export interface ExtractedTopic {
  id: string;
  title: string;
  projectType: 'event' | 'operation';
  summary: string;
  keyPoints: string[];
}

export interface ProposalDocument {
  title: string;
  projectType: 'event' | 'operation';
  location: string;
  targetAudience: string;
  background: string;
  objective: string;
  actionSteps: string[];
  requirements: string[];
  expectedImpact: string;
}

const STORAGE_KEY_GEMINI_KEY = 'team_note_gemini_api_key';

export const getGeminiApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
  if (stored && stored.trim()) return stored.trim();
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  return envKey ? envKey.trim() : '';
};

export const setGeminiApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (!key.trim()) {
    localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_GEMINI_KEY, key.trim());
  }
};

const callGeminiApi = async (prompt: string, apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned empty text');
  }
  return text;
};

const stripForbiddenBrackets = (str: string): string => {
  return str.replace(new RegExp('[\\uFF08\\uFF09\\u300C\\u300D\\(\\)]', 'g'), '');
};

const cleanSentence = (str: string): string => {
  return str.replace(/^[・\-\d\s.:#【】*]+/g, '').trim();
};

const parseMeetingTextLocally = (text: string): ExtractedTopic[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const rawLines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  const sectionHeaders: { index: number; title: string }[] = [];
  rawLines.forEach((line, idx) => {
    if (
      line.startsWith('#') ||
      line.startsWith('【') ||
      line.startsWith('議題') ||
      line.startsWith('トピック') ||
      line.includes('について') ||
      line.includes('企画') ||
      line.includes('案') ||
      line.endsWith('件') ||
      line.endsWith(':') ||
      line.endsWith('：')
    ) {
      const clean = cleanSentence(line).replace(/について$/, '').replace(/[:：]$/, '');
      if (clean.length >= 2 && clean.length <= 40) {
        sectionHeaders.push({ index: idx, title: clean });
      }
    }
  });

  const topics: ExtractedTopic[] = [];

  if (sectionHeaders.length >= 2) {
    for (let i = 0; i < sectionHeaders.length; i++) {
      const header = sectionHeaders[i];
      const nextIndex = i + 1 < sectionHeaders.length ? sectionHeaders[i + 1].index : rawLines.length;
      const bodyLines = rawLines.slice(header.index + 1, nextIndex).map(cleanSentence).filter((l) => l.length > 0);

      const title = header.title;
      const isEvent = /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス/i.test(title + ' ' + bodyLines.join(' '));
      const summary = bodyLines[0] || `${title}に関する寮生の意見や要望を整理した企画案です。`;
      const keyPoints = bodyLines.slice(0, 4);
      if (keyPoints.length === 0) {
        keyPoints.push(`${title}の目的と実施内容の具体化`);
        keyPoints.push('必要な準備や機材の整理');
      }

      topics.push({
        id: `topic-local-${i + 1}`,
        title,
        projectType: isEvent ? 'event' : 'operation',
        summary,
        keyPoints
      });
    }
    return topics;
  }

  const bulletLines = rawLines.map(cleanSentence).filter((l) => l.length >= 3);
  const firstLine = bulletLines[0] || '新規プロジェクト企画';
  const isEvent = /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス/i.test(trimmed);

  if (bulletLines.length >= 4) {
    const mainTopicTitle = firstLine.slice(0, 32);
    const midPoint = Math.ceil(bulletLines.length / 2);
    const firstGroup = bulletLines.slice(1, midPoint);
    const secondGroup = bulletLines.slice(midPoint);

    topics.push({
      id: 'topic-local-1',
      title: mainTopicTitle,
      projectType: isEvent ? 'event' : 'operation',
      summary: firstGroup[0] || `${mainTopicTitle}の実施に向けた具体的な要件です。`,
      keyPoints: firstGroup.slice(0, 3)
    });

    if (secondGroup.length > 0) {
      const secondTitle = secondGroup[0].slice(0, 32);
      topics.push({
        id: 'topic-local-2',
        title: secondTitle,
        projectType: isEvent ? 'event' : 'operation',
        summary: secondGroup[1] || `${secondTitle}に関する連携や準備事項です。`,
        keyPoints: secondGroup.slice(0, 3)
      });
    }
    return topics;
  }

  topics.push({
    id: 'topic-local-single',
    title: firstLine.slice(0, 32),
    projectType: isEvent ? 'event' : 'operation',
    summary: bulletLines[1] || `${firstLine}について寮生が共有した重要事項です。`,
    keyPoints: bulletLines.slice(1, 4).length > 0 ? bulletLines.slice(1, 4) : ['関係者への事前共有とスケジュール確認', '実施準備の推進']
  });

  return topics;
};

const buildProposalLocally = (title: string, sourceText: string, baseType?: 'event' | 'operation'): ProposalDocument => {
  const trimmed = sourceText.trim();
  const lines = trimmed.split('\n').map((l) => cleanSentence(l)).filter(Boolean);

  const isEvent = baseType ? baseType === 'event' : /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス/i.test(title + ' ' + trimmed);

  let location = '寮内共用スペース';
  if (/中庭/i.test(trimmed)) location = '中庭広場';
  else if (/ラウンジ|ロビー/i.test(trimmed)) location = '1階コミュニティラウンジ';
  else if (/キッチン|調理/i.test(trimmed)) location = '各階共用キッチン';
  else if (/体育館|グラウンド/i.test(trimmed)) location = '運動施設スペース';
  else if (/自習|スタディ/i.test(trimmed)) location = '自習ラウンジ';
  else if (/エントランス/i.test(trimmed)) location = 'エントランスホール';
  else if (/屋上/i.test(trimmed)) location = '屋上テラス';
  else if (/オンライン|zoom/i.test(trimmed)) location = 'オンライン配信';

  let targetAudience = '寮生全員および参加希望者';
  if (/新入|新歓/i.test(trimmed)) targetAudience = '新入寮生および歓迎メンバー全員';
  else if (/役職|役員|リーダー/i.test(trimmed)) targetAudience = '寮生役職者および各棟リーダー';
  else if (/女子棟|男子棟|A棟|B棟|C棟/i.test(trimmed)) targetAudience = '対象棟の居住メンバー';
  else if (/自炊|料理/i.test(trimmed)) targetAudience = '共用キッチンを利用する寮生';

  const backgroundCandidates = lines.filter((l) =>
    l.includes('課題') || l.includes('問題') || l.includes('背景') || l.includes('現状') || l.includes('ため') || l.includes('から') || l.includes('困') || l.includes('求め')
  );
  const background = backgroundCandidates.length > 0
    ? backgroundCandidates.slice(0, 2).join(' ')
    : lines.length > 1
    ? `${lines[0]}に関して寮生から意見が挙がっており、快適な寮生活をつくるための取り組みが求められています。`
    : `${title}を実施し、寮内の環境やコミュニケーションをより良くするための取り組みです。`;

  const objectiveCandidates = lines.filter((l) =>
    l.includes('目的') || l.includes('したい') || l.includes('目指す') || l.includes('図る') || l.includes('深める') || l.includes('促進') || l.includes('実現')
  );
  const objective = objectiveCandidates.length > 0
    ? objectiveCandidates.slice(0, 2).join(' ')
    : `${title}を計画通りに実行し、参加する寮生全員が満足できる成果と安心できる環境を実現します。`;

  const actionSteps: string[] = [];
  const actionLines = lines.filter((l) =>
    l.includes('する') || l.includes('準備') || l.includes('確認') || l.includes('作成') || l.includes('配布') || l.includes('案内') || l.includes('テスト') || l.includes('連絡') || l.includes('提出') || l.includes('実施')
  );

  if (actionLines.length >= 3) {
    actionLines.slice(0, 5).forEach((act, idx) => {
      actionSteps.push(`ステップ${idx + 1} ${act}`);
    });
  } else {
    actionSteps.push(`ステップ1 企画内容の共有と参加メンバーの役割分担`);
    actionSteps.push(`ステップ2 実施に必要な資材とスケジュールの最終確認`);
    actionSteps.push(`ステップ3 寮内連絡網での事前告知と参加受付`);
    actionSteps.push(`ステップ4 当日の進行管理と安全確認`);
    actionSteps.push(`ステップ5 実施後の片付けと振り返りアンケート実施`);
  }

  const requirements: string[] = [];
  const reqLines = lines.filter((l) =>
    l.includes('台') || l.includes('個') || l.includes('本') || l.includes('枚') || l.includes('機材') || l.includes('備品') || l.includes('用意') || l.includes('必要') || l.includes('手配') || l.includes('用紙')
  );

  if (reqLines.length >= 2) {
    reqLines.slice(0, 5).forEach((r) => {
      requirements.push(r);
    });
  } else {
    if (isEvent) {
      requirements.push('会場案内用ポスター 2枚');
      requirements.push('受付用名簿および筆記用具');
      requirements.push('共有スペース使用許可の申請控え');
      requirements.push('ゴミ回収用分別袋 3組');
    } else {
      requirements.push('運用案内マニュアル掲示物');
      requirements.push('担当管理スタッフへの事前連絡メモ');
      requirements.push('記録確認用チェックシート');
    }
  }

  const impactCandidates = lines.filter((l) =>
    l.includes('効果') || l.includes('見込') || l.includes('期待') || l.includes('向上') || l.includes('改善') || l.includes('深まる')
  );
  const expectedImpact = impactCandidates.length > 0
    ? impactCandidates[0]
    : `${title}の推進により、寮生間の信頼関係の向上と円滑なコミュニティ運営の実現を見込みます。`;

  return {
    title: title.slice(0, 36),
    projectType: isEvent ? 'event' : 'operation',
    location,
    targetAudience,
    background,
    objective,
    actionSteps,
    requirements,
    expectedImpact
  };
};

export const analyzeMeetingNoteWithGemini = async (
  meetingText: string
): Promise<ExtractedTopic[]> => {
  const trimmed = meetingText.trim();
  if (!trimmed) return [];

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const prompt = `あなたは寮のチーム運営を支援する有能なAIです。以下の文章や議事録を読み取り、重要なトピックを1個から最大4個に分解してください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。
フォーマット:
[
  {
    "id": "topic-1",
    "title": "簡潔なトピック名 30文字以内",
    "projectType": "eventまたはoperation",
    "summary": "概要説明 60文字程度",
    "keyPoints": ["要点1", "要点2", "要点3"]
  }
]

入力文章:
${trimmed}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = JSON.parse(resText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: item.id || `topic-${idx + 1}`,
          title: stripForbiddenBrackets(String(item.title || `トピック${idx + 1}`)),
          projectType: item.projectType === 'event' ? 'event' : 'operation',
          summary: stripForbiddenBrackets(String(item.summary || '')),
          keyPoints: Array.isArray(item.keyPoints)
            ? item.keyPoints.map((p: unknown) => stripForbiddenBrackets(String(p)))
            : []
        }));
      }
    } catch {
      // API呼び出し失敗時はローカルエンジンへフォールバック
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  return parseMeetingTextLocally(trimmed);
};

export const generateProposalFromTopicWithGemini = async (
  topic: ExtractedTopic,
  sourceText: string
): Promise<ProposalDocument> => {
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const prompt = `あなたは寮のチーム運営やイベント企画を専門とするAIプランナーです。
以下の選択されたトピックと原文情報をもとに、実行可能な高品質企画書を作成してください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。
フォーマット:
{
  "title": "${topic.title}",
  "projectType": "${topic.projectType}",
  "location": "実施場所",
  "targetAudience": "対象参加者",
  "background": "背景や現状課題",
  "objective": "目的や達成目標",
  "actionSteps": ["ステップ1 内容", "ステップ2 内容", "ステップ3 内容", "ステップ4 内容", "ステップ5 内容"],
  "requirements": ["必要備品1", "必要備品2", "必要備品3"],
  "expectedImpact": "期待される波及効果"
}

トピック情報:
タイトル: ${topic.title}
種別: ${topic.projectType}
要約: ${topic.summary}
要点: ${topic.keyPoints.join('、')}

原文全体:
${sourceText}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = JSON.parse(resText);
      if (parsed && parsed.title) {
        return {
          title: stripForbiddenBrackets(String(parsed.title || topic.title)),
          projectType: parsed.projectType === 'event' ? 'event' : 'operation',
          location: stripForbiddenBrackets(String(parsed.location || '寮内共用スペース')),
          targetAudience: stripForbiddenBrackets(String(parsed.targetAudience || '全寮生')),
          background: stripForbiddenBrackets(String(parsed.background || topic.summary)),
          objective: stripForbiddenBrackets(String(parsed.objective || topic.title)),
          actionSteps: Array.isArray(parsed.actionSteps)
            ? parsed.actionSteps.map((s: unknown) => stripForbiddenBrackets(String(s)))
            : topic.keyPoints.map((k, idx) => `ステップ${idx + 1} ${k}`),
          requirements: Array.isArray(parsed.requirements)
            ? parsed.requirements.map((r: unknown) => stripForbiddenBrackets(String(r)))
            : ['会場案内ポスター', '受付名簿'],
          expectedImpact: stripForbiddenBrackets(String(parsed.expectedImpact || 'コミュニティ活性化'))
        };
      }
    } catch {
      // API失敗時はローカル生成へフォールバック
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return buildProposalLocally(topic.title, `${topic.summary}\n${topic.keyPoints.join('\n')}\n${sourceText}`, topic.projectType);
};

export const generateProposalDirectFromTextWithGemini = async (
  sourceText: string
): Promise<ProposalDocument> => {
  const trimmed = sourceText.trim();
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `あなたは寮のチーム運営やイベント企画を専門とするAIプランナーです。
以下の文章や議事録を精読し、忠実に反映した詳細企画書を作成してください。
入力内容と全く関係のない架空のイベント例えば中庭シネマなどを勝手に作らず、ユーザーの入力文に書かれている内容そのものを主題にしてください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。
フォーマット:
{
  "title": "入力内容に即した企画名 30文字以内",
  "projectType": "eventまたはoperation",
  "location": "入力文から読み取れる実施場所",
  "targetAudience": "入力文から読み取れる対象者",
  "background": "入力文に書かれた背景や課題",
  "objective": "入力文に書かれた目的や狙い",
  "actionSteps": ["ステップ1 内容", "ステップ2 内容", "ステップ3 内容", "ステップ4 内容", "ステップ5 内容"],
  "requirements": ["必要備品や資材1", "必要備品2", "必要備品3"],
  "expectedImpact": "期待される効果"
}

入力文章:
${trimmed}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = JSON.parse(resText);
      if (parsed && parsed.title) {
        return {
          title: stripForbiddenBrackets(String(parsed.title)),
          projectType: parsed.projectType === 'operation' ? 'operation' : 'event',
          location: stripForbiddenBrackets(String(parsed.location || '寮内共用スペース')),
          targetAudience: stripForbiddenBrackets(String(parsed.targetAudience || '寮生全員')),
          background: stripForbiddenBrackets(String(parsed.background || '現状課題の改善と活動推進')),
          objective: stripForbiddenBrackets(String(parsed.objective || '企画の円滑な実行')),
          actionSteps: Array.isArray(parsed.actionSteps)
            ? parsed.actionSteps.map((s: unknown) => stripForbiddenBrackets(String(s)))
            : ['ステップ1 企画内容の共有', 'ステップ2 準備の実施'],
          requirements: Array.isArray(parsed.requirements)
            ? parsed.requirements.map((r: unknown) => stripForbiddenBrackets(String(r)))
            : ['案内ポスター', '受付名簿'],
          expectedImpact: stripForbiddenBrackets(String(parsed.expectedImpact || '寮生間の交流深化'))
        };
      }
    } catch {
      // API失敗時はローカル生成へフォールバック
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 450));
  const rawLines = trimmed.split('\n').map(cleanSentence).filter(Boolean);
  const firstLine = rawLines[0] || '新規プロジェクト企画';
  const cleanTitle = firstLine.replace(/^[#・\-\d\s.:]+/, '').slice(0, 32);

  return buildProposalLocally(cleanTitle || '新規プロジェクト企画', trimmed);
};
