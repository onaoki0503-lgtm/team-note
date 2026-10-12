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
  // 互換性フィールド
  objective: string;
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

const callGeminiApiWithModel = async (prompt: string, apiKey: string, modelName: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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
        temperature: 0.2,
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

const callGeminiApi = async (prompt: string, apiKey: string): Promise<string> => {
  try {
    return await callGeminiApiWithModel(prompt, apiKey, 'gemini-2.0-flash');
  } catch (err) {
    console.warn('Gemini 2.0 Flash failed, retrying with Gemini 1.5 Flash', err);
    return await callGeminiApiWithModel(prompt, apiKey, 'gemini-1.5-flash');
  }
};

const stripForbiddenBrackets = (str: string): string => {
  return str.replace(new RegExp('[\\uFF08\\uFF09\\u300C\\u300D\\(\\)]', 'g'), '');
};

const cleanSentence = (str: string): string => {
  return str.replace(/^[・\-\d\s.:#【】*]+/g, '').trim();
};

// 議事録テキストからトピックを分解する関数
export const analyzeMeetingNoteWithGemini = async (
  meetingText: string
): Promise<ExtractedTopic[]> => {
  const trimmed = meetingText.trim();
  if (!trimmed) return [];

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const prompt = `あなたは組織や寮の運営企画を支援するプロの企画コンサルタントAIです。
以下の文章や議事録を読み取り、重要な企画トピックを1個から最大3個に分解してください。
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
      // フォールバックへ
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  const rawLines = trimmed.split('\n').map(cleanSentence).filter(Boolean);
  const firstLine = rawLines[0] || '新規運営企画提案';
  const isEvent = /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス/i.test(trimmed);

  return [
    {
      id: 'topic-local-1',
      title: firstLine.slice(0, 32),
      projectType: isEvent ? 'event' : 'operation',
      summary: rawLines[1] || `${firstLine}に関する課題解決と環境改善を図るための提案です。`,
      keyPoints: rawLines.slice(1, 4).length > 0 ? rawLines.slice(1, 4) : ['現状課題の明確化と対策導入', '運用手順の整備と備品手配']
    }
  ];
};

// 本格的な企画提案書モデルをローカルエンジンで構築する関数
const buildStructuredProposalLocally = (
  rawTitle: string,
  sourceText: string,
  baseType?: 'event' | 'operation'
): ProposalDocument => {
  const trimmed = sourceText.trim();
  const lines = trimmed.split('\n').map(cleanSentence).filter(Boolean);

  const isEvent = baseType ? baseType === 'event' : /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス/i.test(rawTitle + ' ' + trimmed);

  const cleanTitle = stripForbiddenBrackets(rawTitle || '共用スペース環境改善および運用効率化');

  let submittedTo = '西松地所株式会社 様 / 寮母・管理スタッフの皆様';
  if (/学生|委員会|自治/i.test(trimmed)) {
    submittedTo = '寮生自治会 役員会 様 / ハウス長・寮生の皆様';
  }

  // 課題の抽出
  const issuesList: string[] = [];
  lines.forEach((l) => {
    if (l.includes('臭') || l.includes('汚') || l.includes('困') || l.includes('問題') || l.includes('課題') || l.includes('ない') || l.includes('放置') || l.includes('不安')) {
      if (issuesList.length < 4) issuesList.push(l);
    }
  });
  if (issuesList.length === 0) {
    if (isEvent) {
      issuesList.push('学年や棟を越えた自然な交流の場が不足している');
      issuesList.push('初対面でも気軽に参加しやすい安心できる雰囲気づくりが求められている');
      issuesList.push('事前告知や機材手配の役割分担が不明確になりやすい');
    } else {
      issuesList.push('一度使用された備品がそのまま放置され衛生的でない');
      issuesList.push('用途の区別が曖昧になりやすく使いづらさを感じている');
      issuesList.push('各自で代替品を持ち込むなど余計な負担が発生している');
    }
  }

  // 生の声
  const quoteCandidates = lines.filter((l) => l.includes('意見') || l.includes('声') || l.includes('たい') || l.includes('拭けない') || l.includes('汚い'));
  const highlightQuote = quoteCandidates[0] || `${cleanTitle}に関して改善を求める意見が多く出されている`;

  // 3つの専用ボックスや中核要素
  const conceptBoxes: ProposalConceptBox[] = isEvent ? [
    {
      number: '1',
      title: '事前参加案内と整理受付',
      description: 'LINEや掲示板で周知し希望人数を事前把握。スムーズな当日の誘導を行う。',
      tagColor: '#0284C7'
    },
    {
      number: '2',
      title: 'メイン空間設営と機材運用',
      description: '共用スペースを安全に活用しプロジェクターや音響の動作を点検して上映。',
      tagColor: '#2563EB'
    },
    {
      number: '3',
      title: '温かい軽食配布と交流促進',
      description: '防寒シートや温かいお茶を用意しリラックスして会話ができる環境を整備。',
      tagColor: '#DB2777'
    }
  ] : [
    {
      number: '1',
      title: '使用済み回収ボックス',
      description: '使用したタオルを投入。通気性のあるメッシュカゴ形状で衛生的に管理。',
      tagColor: '#475569'
    },
    {
      number: '2',
      title: '清潔な食器拭きボックス 青',
      description: '洗濯済みの清潔な青色タオルを保管。用途を一目で識別可能。',
      tagColor: '#0284C7'
    },
    {
      number: '3',
      title: '清潔な台拭きボックス ピンク',
      description: '洗濯済みの清潔なピンク色タオルを保管。油汚れ防止と清潔を両立。',
      tagColor: '#E11D48'
    }
  ];

  // 運用フロー
  const operationFlow: ProposalOperationFlowItem[] = isEvent ? [
    {
      target: '参加寮生の利用手順',
      content: '案内ポスターから受付を済ませ、防寒シートとお茶を受け取り上映エリアへ着席する。終了後は分別ゴミ箱へ各自ゴミを回収する。'
    },
    {
      target: '運営スタッフの進行手順',
      content: '開始1時間前に機材設営と動作テストを実施。上映終了後は15分で機材を撤収し原状回復を確認する。'
    }
  ] : [
    {
      target: '寮生の利用手順',
      content: '調理時や食器洗い時、ストックボックスから清潔なタオルを取り出して使用する。使用後はシンクに放置せず使用済み回収ボックスへ投入する。1回使い切り運用。'
    },
    {
      target: '回収補充手順 定期巡回時',
      content: '使用済み回収ボックスからタオルを回収袋に移す。洗濯済みの清潔なタオルをそれぞれのストックボックスに補充する。'
    }
  ];

  // 3つのステークホルダー改善効果
  const stakeholderImpacts: ProposalStakeholderImpact[] = isEvent ? [
    {
      stakeholder: '寮生側',
      title: '交流の深化と居場所づくり',
      description: '棟を越えて普段話す機会のないメンバーと自然な会話が生まれ、寮生活の安心感と満足度が大幅に向上します。'
    },
    {
      stakeholder: '役員運営側',
      title: '明確な役割分担と進行管理',
      description: '受付、機材、誘導、片付けの手順が定型化されるため、負担が一部のメンバーに偏らず円滑に運営できます。'
    },
    {
      stakeholder: '施設管理側',
      title: '安全確保とマナー向上',
      description: '共用部の使用申請と消灯・静音ルールを徹底することで、近隣への騒音トラブルやゴミ放置を防ぎます。'
    }
  ] : [
    {
      stakeholder: '寮生側',
      title: '衛生面の劇的改善',
      description: '乾いた清潔な布巾を取り出して使用するため、濡れた布巾の再使用を防ぎ衛生的に使えます。用途の混同も防止されます。'
    },
    {
      stakeholder: '寮母スタッフ側',
      title: '回収補充作業の効率化',
      description: '回収と補充が専用ボックスのみで行われるため、各フロアで布巾を探す手間がなくなり巡回作業負担が軽減されます。'
    },
    {
      stakeholder: '施設管理側',
      title: 'キッチンの整理美観維持',
      description: 'タオルの定位置が決まることでシンク周りへの放置をゼロ化。既存備品と市販ボックスを活用し最小限のコストで導入できます。'
    }
  ];

  // 見積もりテーブル
  const budgetItems: ProposalBudgetItem[] = isEvent ? [
    {
      name: '大型自立式スクリーン',
      spec: '屋外対応 折りたたみ式',
      quantity: '1台',
      cost: '既存備品活用'
    },
    {
      name: '防寒用ブランケット・シート',
      spec: '保温アルミシート 10枚組',
      quantity: '2組',
      cost: '約2,000円'
    },
    {
      name: '温かいお茶・紙コップ',
      spec: 'ティーバッグ 50包入り',
      quantity: '1箱',
      cost: '約800円'
    },
    {
      name: '分別ゴミ袋',
      spec: '45L 強化ポリ袋',
      quantity: '1袋',
      cost: '約300円'
    }
  ] : [
    {
      name: 'ストックボックス',
      spec: 'プラスチック製 メッシュバスケット 通気性のあるもの',
      quantity: '48個 3個かける16フロア',
      cost: '約5,280円 1個110円計算'
    },
    {
      name: '分別ラベル',
      spec: '防水ラミネート 青 ピンク グレー 日英併記',
      quantity: '16組',
      cost: '約1,000円'
    },
    {
      name: '利用案内ポスター',
      spec: 'A4ラミネート キッチン壁面掲示用 日英併記',
      quantity: '16枚',
      cost: '約500円 寮生側で作成可'
    },
    {
      name: '布巾 補充用',
      spec: '既存備品の活用 不足分のみ補充',
      quantity: '必要数',
      cost: '既存備品で対応可能'
    }
  ];

  const totalCostEstimate = isEvent ? '約3,100円' : '約7,000円から10,000円';

  // 導入手順
  const actionSteps = isEvent ? [
    'ステップ1 事前確認: 西松地所様および管理スタッフとの共用部使用申請および日程の確認',
    'ステップ2 機材テスト: プロジェクターと音響の投写テスト、静音配慮の確認',
    'ステップ3 告知と受付: LINE連絡網での事前告知、温かいお茶の準備',
    'ステップ4 本番実施: 上映会の進行、受付案内、安全見守り',
    'ステップ5 撤収と振り返り: ゴミ拾い、機材原状回復、アンケート回収'
  ] : [
    'ステップ1 事前確認: 西松地所様および寮母様との設置場所とボックス仕様の確認',
    'ステップ2 試験導入: 1から2フロアで試験運用を実施し使用量や回収状況を確認',
    'ステップ3 全フロア導入: ボックスおよび利用案内ポスターを設置し全館運用を開始'
  ];

  const summaryText = `本提案は、寮生から出ている衛生面や環境に関する課題を解消し、あわせて回収・管理手順を整理・効率化することを目的としています。まずは一部エリアでの試験導入を含め、ご検討いただけますようお願いいたします。`;

  return {
    docType: '企画提案書',
    title: cleanTitle,
    subTitle: isEvent ? '寮生親睦と安心のコミュニティ形成に向けた企画提案' : '3ボックス方式 導入のご提案',
    projectType: isEvent ? 'event' : 'operation',
    submittedTo,
    submittedDate: '2026年10月',
    location: isEvent ? '中庭広場' : '共用キッチン各フロア',
    targetAudience: '寮生全員および管理スタッフの皆様',
    background: `${cleanTitle}に関して、現状の運用では不便さや衛生上の課題が生じており、前回のミーティングでも多くの意見が出されました。そこで具体的な改善策を導入し、寮生が快適に過ごせる環境整備と運用負担の軽減を図る改善をご提案いたします。`,
    highlightQuote,
    issues: issuesList,
    proposalOverview: isEvent ? '参加しやすい温かい空間設計と安全で持続可能な運営体制を構築します。' : '各フロアに専用ボックスを分別設置し、清潔な状態を維持する運用体制を構築します。',
    proposalConcept: isEvent ? '参加しやすい温かい空間設計と安全で持続可能な運営体制を構築します。' : '各フロアに専用ボックスを分別設置し、清潔な状態を維持する運用体制を構築します。',
    conceptBoxes,
    operationFlow,
    stakeholderImpacts,
    budgetItems,
    totalCostEstimate,
    actionSteps,
    summaryText,
    objective: cleanTitle,
    requirements: budgetItems.map((b) => `${b.name} ${b.quantity}`),
    expectedImpact: '寮生の安心と満足度の向上および管理作業の効率化'
  };
};

// Gemini APIを用いてPDFと同等の超高品質な企画提案書JSONを生成する
export const generateProposalDirectFromTextWithGemini = async (
  sourceText: string
): Promise<ProposalDocument> => {
  const trimmed = sourceText.trim();
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `あなたはプロの業務改善コンサルタントおよびイベント企画プロデューサーです。
以下の文章や議事録を読み取り、提供された文章の趣旨を最高レベルで論理的に発展させ、印刷してそのまま提出できる完全な企画提案書を作成してください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。

出力フォーマットJSON:
{
  "docType": "企画提案書",
  "title": "Hヴィレッジ 共用キッチンにおける衛生改善および回収作業効率化に向けた",
  "subTitle": "布巾・台拭き 3ボックス方式 導入のご提案",
  "projectType": "eventまたはoperation",
  "submittedTo": "西松地所株式会社 様 / 寮母・管理スタッフの皆様",
  "submittedDate": "2026年10月",
  "location": "対象場所",
  "targetAudience": "対象者",
  "background": "1. 企画の趣旨・背景の文章。現状の運用と課題提起、だから何を提案するかの段落構成で記述",
  "highlightQuote": "前回の会議で最も多く出された意見の抜粋",
  "issues": [
    "生じている課題1",
    "生じている課題2",
    "生じている課題3",
    "生じている課題4"
  ],
  "proposalConcept": "提案内容の概要説明",
  "conceptBoxes": [
    {
      "number": "1",
      "title": "要素1の名称",
      "description": "仕様や役割の説明",
      "tagColor": "#475569"
    },
    {
      "number": "2",
      "title": "要素2の名称",
      "description": "仕様や役割の説明",
      "tagColor": "#0284C7"
    },
    {
      "number": "3",
      "title": "要素3の名称",
      "description": "仕様や役割の説明",
      "tagColor": "#E11D48"
    }
  ],
  "operationFlow": [
    {
      "target": "利用者の手順",
      "content": "具体的な利用ステップ"
    },
    {
      "target": "管理巡回の手順",
      "content": "具体的な回収補充ステップ"
    }
  ],
  "stakeholderImpacts": [
    {
      "stakeholder": "寮生側",
      "title": "改善点タイトル",
      "description": "具体的なメリット"
    },
    {
      "stakeholder": "寮母スタッフ側",
      "title": "改善点タイトル",
      "description": "具体的なメリット"
    },
    {
      "stakeholder": "施設管理側",
      "title": "改善点タイトル",
      "description": "具体的なメリット"
    }
  ],
  "budgetItems": [
    {
      "name": "品名1",
      "spec": "仕様",
      "quantity": "数量",
      "cost": "概算費用"
    },
    {
      "name": "品名2",
      "spec": "仕様",
      "quantity": "数量",
      "cost": "概算費用"
    },
    {
      "name": "品名3",
      "spec": "仕様",
      "quantity": "数量",
      "cost": "概算費用"
    }
  ],
  "totalCostEstimate": "約7000円から10000円",
  "actionSteps": [
    "ステップ1 事前確認 西松地所様および寮母様との設置場所と仕様の確認",
    "ステップ2 試験導入 特定フロアでの試験運用と効果検証",
    "ステップ3 全フロア導入 案内ポスター設置と全館運用開始"
  ],
  "summaryText": "本提案は課題を解消し効率化することを目的としています。まずは試験導入を含めご検討いただけますようお願いいたします。"
}

入力文章:
${trimmed}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = JSON.parse(resText);
      if (parsed && parsed.title) {
        return {
          docType: '企画提案書',
          title: stripForbiddenBrackets(String(parsed.title)),
          subTitle: stripForbiddenBrackets(String(parsed.subTitle || '改善導入のご提案')),
          projectType: parsed.projectType === 'operation' ? 'operation' : 'event',
          submittedTo: stripForbiddenBrackets(String(parsed.submittedTo || '西松地所株式会社 様 / 管理スタッフの皆様')),
          submittedDate: stripForbiddenBrackets(String(parsed.submittedDate || '2026年10月')),
          location: stripForbiddenBrackets(String(parsed.location || '共用スペース')),
          targetAudience: stripForbiddenBrackets(String(parsed.targetAudience || '寮生全員')),
          background: stripForbiddenBrackets(String(parsed.background || '')),
          highlightQuote: stripForbiddenBrackets(String(parsed.highlightQuote || '')),
          issues: Array.isArray(parsed.issues) ? parsed.issues.map((i: unknown) => stripForbiddenBrackets(String(i))) : [],
          proposalOverview: stripForbiddenBrackets(String(parsed.proposalConcept || parsed.proposalOverview || '')),
          proposalConcept: stripForbiddenBrackets(String(parsed.proposalConcept || parsed.proposalOverview || '')),
          conceptBoxes: Array.isArray(parsed.conceptBoxes) ? parsed.conceptBoxes.map((b: any) => ({
            number: String(b.number || '1'),
            title: stripForbiddenBrackets(String(b.title || '')),
            description: stripForbiddenBrackets(String(b.description || '')),
            tagColor: b.tagColor || '#0284C7'
          })) : [],
          operationFlow: Array.isArray(parsed.operationFlow) ? parsed.operationFlow.map((f: any) => ({
            target: stripForbiddenBrackets(String(f.target || '')),
            content: stripForbiddenBrackets(String(f.content || ''))
          })) : [],
          stakeholderImpacts: Array.isArray(parsed.stakeholderImpacts) ? parsed.stakeholderImpacts.map((s: any) => ({
            stakeholder: stripForbiddenBrackets(String(s.stakeholder || '')),
            title: stripForbiddenBrackets(String(s.title || '')),
            description: stripForbiddenBrackets(String(s.description || ''))
          })) : [],
          budgetItems: Array.isArray(parsed.budgetItems) ? parsed.budgetItems.map((bi: any) => ({
            name: stripForbiddenBrackets(String(bi.name || '')),
            spec: stripForbiddenBrackets(String(bi.spec || '')),
            quantity: stripForbiddenBrackets(String(bi.quantity || '')),
            cost: stripForbiddenBrackets(String(bi.cost || ''))
          })) : [],
          totalCostEstimate: stripForbiddenBrackets(String(parsed.totalCostEstimate || '約5,000円')),
          actionSteps: Array.isArray(parsed.actionSteps) ? parsed.actionSteps.map((a: unknown) => stripForbiddenBrackets(String(a))) : [],
          summaryText: stripForbiddenBrackets(String(parsed.summaryText || '')),
          objective: stripForbiddenBrackets(String(parsed.title)),
          requirements: Array.isArray(parsed.budgetItems) ? parsed.budgetItems.map((bi: any) => `${bi.name} ${bi.quantity}`) : [],
          expectedImpact: '業務効率化および衛生環境の向上'
        };
      }
    } catch {
      // フォールバックへ
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  const rawLines = trimmed.split('\n').map(cleanSentence).filter(Boolean);
  const firstLine = rawLines[0] || '共用スペース衛生改善および作業効率化';
  return buildStructuredProposalLocally(firstLine, trimmed);
};

export const generateProposalFromTopicWithGemini = async (
  topic: ExtractedTopic,
  sourceText: string
): Promise<ProposalDocument> => {
  return generateProposalDirectFromTextWithGemini(`${topic.title}\n${topic.summary}\n${topic.keyPoints.join('\n')}\n${sourceText}`);
};
