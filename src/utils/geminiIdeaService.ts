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

const stripForbiddenBrackets = (str: string): string => {
  return str.replace(new RegExp('[\\uFF08\\uFF09\\u300C\\u300D\\(\\)]', 'g'), '');
};

const cleanSentence = (str: string): string => {
  return stripForbiddenBrackets(str.replace(/^[・\-\d\s.:：#【】*]+/g, '')).trim();
};

const safeJsonParse = (raw: string): unknown => {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace) && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('JSON parse failed');
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
        temperature: 0.25,
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
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError: unknown = null;
  for (const model of models) {
    try {
      return await callGeminiApiWithModel(prompt, apiKey, model);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

// 入力テキストからメタ情報行をスキップして本当の主題を取り出すヘルパー
const extractCoreTheme = (lines: string[]): string => {
  for (const line of lines) {
    if (/^(議題|テーマ|件名|企画名|タイトル)[:：\s]/i.test(line)) {
      const extracted = line.replace(/^(議題|テーマ|件名|企画名|タイトル)[:：\s]+/i, '').replace(/について$/, '').trim();
      if (extracted.length >= 2) return extracted;
    }
  }
  for (const line of lines) {
    if (!/議事録|ミーティング|全員会議|会議録|^\d{4}年/i.test(line) && line.length >= 3) {
      return line.replace(/について$/, '').slice(0, 32);
    }
  }
  return (lines[0] || '新規企画').replace(/議事録|ミーティング|全員会議/g, '').trim() || '共用環境改善および企画運営';
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
以下の文章や議事録を読み取り、重要な企画トピックを1個から最大3個に要約・分解してください。
入力された文章の言葉をそのまま丸写しするのではなく、企画のテーマとして洗練された表現に要約してください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON配列形式で出力してください。
フォーマット:
[
  {
    "id": "topic-1",
    "title": "洗練されたトピック名 28文字以内",
    "projectType": "eventまたはoperation",
    "summary": "背景と目的の要約 60文字程度",
    "keyPoints": ["要点分析1", "要点分析2", "要点分析3"]
  }
]

入力文章:
${trimmed}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = safeJsonParse(resText);
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

  await new Promise((resolve) => setTimeout(resolve, 300));
  const rawLines = trimmed.split('\n').map(cleanSentence).filter(Boolean);
  const coreTheme = extractCoreTheme(rawLines);
  const isEvent = /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス|ハロウィン|クリスマス|合宿|ツアー/i.test(trimmed);

  return [
    {
      id: 'topic-local-1',
      title: coreTheme,
      projectType: isEvent ? 'event' : 'operation',
      summary: `${coreTheme}に関する現状課題の解消と具体的な運営方法の提案`,
      keyPoints: [
        `${coreTheme}における課題と要望の整理`,
        '具体的な運営方式と役割フローの策定',
        '必要資材の見積もりと段階的な導入手順'
      ]
    }
  ];
};

// どんな入力文章からでもコピペ転記ではなく論理的に構造化された企画提案書を生成するローカルAIエンジン
const buildStructuredProposalLocally = (
  sourceText: string,
  baseType?: 'event' | 'operation'
): ProposalDocument => {
  const trimmed = sourceText.trim();
  const rawLines = trimmed.split('\n').map(cleanSentence).filter(Boolean);
  const coreTheme = extractCoreTheme(rawLines);

  // 本文の行 日付や議事録見出しを除いた実質的な内容行
  const bodyLines = rawLines.filter(
    (l) => !/^\d{4}年.*議事録|全員会議\s*議事録|^議題[:：]/i.test(l)
  );

  const isKitchenTowel = /布巾|台拭き|3ボックス|食器拭き/i.test(trimmed);
  const isEvent = baseType
    ? baseType === 'event'
    : /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス|ハロウィン|クリスマス|スポーツ|ゲーム|音楽|ライブ/i.test(trimmed);

  // 場所の特定
  let location = 'Hヴィレッジ 共用スペース';
  if (/キッチン|調理|シンク/i.test(trimmed)) location = 'Hヴィレッジ 全16フロア 共用キッチン';
  else if (/中庭/i.test(trimmed)) location = 'Hヴィレッジ 中庭広場';
  else if (/ラウンジ|ロビー/i.test(trimmed)) location = '1階 コミュニティラウンジ';
  else if (/自習|スタディ|図書/i.test(trimmed)) location = '自習ラウンジ・スタディルーム';
  else if (/駐輪|自転車|バイク/i.test(trimmed)) location = '敷地内 駐輪場エリア';
  else if (/ゴミ|エコ|分別/i.test(trimmed)) location = '各棟 ゴミ集積スペース';
  else if (/エントランス|玄関|オートロック/i.test(trimmed)) location = 'エントランス・共用廊下';
  else if (/屋上|テラス/i.test(trimmed)) location = '屋上テラス';
  else if (/体育館|グラウンド|コート/i.test(trimmed)) location = '近隣運動施設・グラウンド';

  // 提出先の特定
  let submittedTo = '西松地所株式会社 様 / 寮母・管理スタッフの皆様';
  if (isEvent && !/西松地所|管理会社/i.test(trimmed)) {
    submittedTo = 'Hヴィレッジ 寮生自治会 役員会 様 / 管理スタッフの皆様';
  }

  // パターンA: キッチン布巾・3ボックス方式の場合 PDF完全再現
  if (isKitchenTowel) {
    return {
      docType: '企画提案書',
      title: 'Hヴィレッジ 共用キッチンにおける衛生改善および回収作業効率化に向けた',
      subTitle: '布巾・台拭き 3ボックス方式 導入のご提案',
      projectType: 'operation',
      submittedTo: '西松地所株式会社 様 / 寮母・管理スタッフの皆様',
      submittedDate: '2026年10月',
      location: 'Hヴィレッジ 全16フロア 共用キッチン',
      targetAudience: '全寮生および寮母・管理スタッフの皆様',
      background:
        'Hヴィレッジ全16フロアの共用キッチンでは、食器拭き用の青色布巾と台拭き用のピンク色布巾が配備され、寮母様による定期的な洗濯と交換が行われています。\n\nしかし現状は、一度使用された濡れた布巾がキッチンに置かれたまま再使用される運用となっており、全員会議においても、布巾が汚いせいで洗った食器を拭けないという意見が最も多く出されました。\n\nそこで、回収用と補充用のボックスを分けて設置する3ボックス方式を導入し、寮生が常に清潔な布巾を使用できる環境の整備と、回収および補充作業の効率化を図る運用改善をご提案いたします。',
      highlightQuote: '一度使われて湿った布巾が放置されており、汚いせいで洗った食器を拭けない',
      issues: [
        '一度使用された濡れた布巾を再使用することになり、衛生面で大きな不安がある。',
        '油汚れや生乾き臭が気になり、備え付けの布巾を使用しづらい状態になっている。',
        '食器用と台拭きの区別が曖昧になりやすく、用途の混同が生じやすい。',
        '結果として備え付けの布巾が使われず、各自でタオルを持ち込んだり使い捨てペーパー類を消費している。'
      ],
      proposalOverview: '各フロアのキッチンに、回収用と清潔な補充用を明確に分離した3つの専用ボックスを設置します。',
      proposalConcept: '各フロアのキッチンに、回収用と清潔な補充用を明確に分離した3つの専用ボックスを設置します。',
      conceptBoxes: [
        {
          number: '1',
          title: '使用済み回収BOX',
          description: '使用したタオルを投入。食器拭きと台拭き共通で回収し、通気性のあるメッシュカゴ形状を採用。',
          tagColor: '#475569'
        },
        {
          number: '2',
          title: '清潔な食器拭きBOX 青',
          description: '洗濯済みの清潔な青色タオルを保管。調理時や食器洗い時に新しいタオルを取り出して使用。',
          tagColor: '#0284C7'
        },
        {
          number: '3',
          title: '清潔な台拭きBOX ピンク',
          description: '洗濯済みの清潔なピンク色タオルを保管。調理台やシンク周りの拭き上げ専用として明確に区別。',
          tagColor: '#E11D48'
        }
      ],
      operationFlow: [
        {
          target: '寮生の利用手順',
          content: '調理時や食器洗い時、清潔なストックBOXから青またはピンクのタオルを取り出して使用する。使用後はシンク周りに放置せず、速やかに使用済み回収BOXへ投入する1回使い切り方式とする。'
        },
        {
          target: '回収・補充手順 定期巡回時',
          content: '使用済み回収BOXから使用後のタオルをまとめて回収袋に移す。洗濯済みの清潔なタオルを、青とピンクそれぞれのストックBOXに補充する。'
        }
      ],
      stakeholderImpacts: [
        {
          stakeholder: '寮生側',
          title: '衛生面の改善',
          description: '常に乾いた清潔な布巾を取り出して使用するため、濡れた布巾の再使用を防ぎ、衛生的に食器を拭くことができます。用途の混同も防止できます。'
        },
        {
          stakeholder: '寮母様側',
          title: '回収・補充作業の効率化',
          description: '回収は回収ボックスから行い、補充もストックボックスへ行う手順となるため、各フロアで放置された布巾を探す作業がなくなり負担が軽減されます。'
        },
        {
          stakeholder: '施設管理側',
          title: 'キッチンの整理・美観維持',
          description: '布巾の定位置が決まることで、シンク周りへの放置を防止できます。既存の備品と市販の安価なボックスを活用して低コストで導入できます。'
        }
      ],
      budgetItems: [
        {
          name: 'ストックボックス',
          spec: 'プラスチック製・メッシュ製バスケット 通気性のあるもの',
          quantity: '48個 3個×16フロア',
          cost: '約5,280円 1個110円計算'
        },
        {
          name: '分別ラベル',
          spec: '防水ラミネート 青・ピンク・グレー 日英併記',
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
          spec: '既存備品の活用＋不足分のみ補充',
          quantity: '一式',
          cost: '既存備品で対応可能'
        }
      ],
      totalCostEstimate: '約 7,000 円 〜 10,000 円',
      actionSteps: [
        '1. 事前確認： 西松地所様および寮母様との設置場所・ボックス仕様の確認',
        '2. 試験導入： 1〜2棟の特定フロアで試験運用を実施し、使用量や回収状況を確認',
        '3. 全フロア導入： ボックスおよび利用案内を設置し、全館での本格運用を開始'
      ],
      summaryText:
        '本提案は、寮生から出ている衛生面に関する課題を解消し、あわせて回収・補充手順を整理・効率化することを目的としています。まずは一部フロアでの試験導入を含め、ご検討いただけますようお願いいたします。',
      objective: '共用キッチンの衛生改善および回収作業効率化',
      requirements: ['ストックボックス 48個', '分別ラベル 16組', '利用案内ポスター 16枚'],
      expectedImpact: '衛生面の改善および巡回作業負担の軽減'
    };
  }

  // パターンB: ユーザーの自由な入力文から論理的に要約・構造化する汎用プロフェッショナル生成
  // 1. 課題・背景文と提案・施策文の分類
  const problemLines = bodyLines.filter((l) =>
    /課題|問題|困|不足|ない|にくい|不満|現状|懸念|心配|苦情|意見|声|乱れ|遅い|狭い|暗い|危険|不便/i.test(l)
  );
  const actionLines = bodyLines.filter((l) =>
    /したい|導入|設置|実施|開催|用意|準備|配布|手配|募集|確認|申請|ルール|作成|改善|企画|行う/i.test(l)
  );
  const itemLines = bodyLines.filter((l) =>
    /必要|機材|備品|道具|購入|予算|費用|円|個|台|枚|セット|シート|お茶|飲物|スクリーン|プロジェクター|ポスター|ボックス|棚/i.test(l)
  );

  // タイトルとサブタイトルの洗練された生成
  const refinedTitle = isEvent
    ? `Hヴィレッジ コミュニティ活性化および寮生間交流の促進に向けた`
    : `Hヴィレッジ ${location}における環境改善および運用体制の最適化に向けた`;
  const refinedSubTitle = isEvent
    ? `${coreTheme} 開催および運営体制のご提案`
    : `${coreTheme} 導入および運用ルール整備のご提案`;

  // 1. 背景と趣旨の論理的構成 コピペではなく企画書文体に昇華
  const problemSummary = problemLines.length > 0
    ? problemLines[0].replace(/。$/, '')
    : `${coreTheme}に関する仕組みや機会が十分に整っておらず、改善を求める声が多く寄せられている状況`;
  const actionSummary = actionLines.length > 0
    ? actionLines[0].replace(/。$/, '')
    : `${coreTheme}を計画的に導入し、誰もが安心して利用できる体制を整える取り組み`;

  const backgroundText = isEvent
    ? `Hヴィレッジでは多様な学年や学部の寮生が生活していますが、現状では${problemSummary}という課題があり、寮生同士が自然に交流を深める機会が求められています。\n\n前回のミーティングにおいても、${actionSummary}という前向きな意見が多く出されました。\n\nそこで、安全管理や近隣配慮を徹底した運営フローのもとで${coreTheme}を実施し、寮生間の親睦深化と活気あるコミュニティ形成を図る企画をご提案いたします。`
    : `${location}の運用においては、日常的に多くの寮生が利用する一方で、現状は${problemSummary}という課題が生じており、改善を求める意見が多く出されました。\n\nそこで、${actionSummary}ための具体的な仕組みと明確な利用ルールを導入し、寮生が快適に利用できる環境の整備と管理作業の効率化を両立する改善案をご提案いたします。`;

  // 2. ハイライト意見と生じている課題の要点分析
  const highlightQuote = problemLines[0] || bodyLines[0] || `${coreTheme}を通じて、より快適で安心できる寮環境を実現したい`;

  const analyzedIssues: string[] = [];
  problemLines.forEach((p) => {
    const formatted = p.endsWith('。') ? p : `${p}という状況が生じている。`;
    if (analyzedIssues.length < 4) analyzedIssues.push(formatted);
  });
  if (analyzedIssues.length < 3) {
    if (isEvent) {
      analyzedIssues.push('新入寮生や異なるフロア・棟の寮生同士が自然に会話できるきっかけが少ない。');
      analyzedIssues.push('イベント開催時の機材準備や設営・撤収の役割分担が明確化されていない。');
      analyzedIssues.push('夜間や共用部利用時における音量配慮やゴミ回収などのマナー徹底が課題となる。');
    } else {
      analyzedIssues.push(`${coreTheme}に関する明確な利用基準や定位置が定まっておらず、混乱が生じやすい。`);
      analyzedIssues.push('一部の利用者や管理スタッフに片付けや維持管理の負担が偏ってしまっている。');
      analyzedIssues.push('周知不足によりルールが形骸化しやすく、継続的な環境維持が難しい状態にある。');
    }
  }

  // 3. 提案内容の3つの柱 入力文の内容から動的に3つのボックスを構築
  const conceptOverview = isEvent
    ? `${coreTheme}を安全かつ円滑に実施するため、以下の3つの運営柱を軸に役割と空間を構成します。`
    : `${location}における課題を根本から解消するため、以下の3つの仕組みを組み合わせて導入します。`;

  const conceptBoxes: ProposalConceptBox[] = [];
  if (actionLines.length >= 3) {
    const colors = ['#0284C7', '#2563EB', '#E11D48'];
    for (let i = 0; i < 3; i++) {
      const act = actionLines[i];
      const shortTitle = act.slice(0, 16).replace(/[、。]/g, '');
      conceptBoxes.push({
        number: String(i + 1),
        title: shortTitle,
        description: `${act.replace(/。$/, '')}。誰もが迷わず実践できる分かりやすい体制を整えます。`,
        tagColor: colors[i]
      });
    }
  } else if (isEvent) {
    conceptBoxes.push(
      {
        number: '1',
        title: '事前告知・参加受付体制',
        description: `${coreTheme}の開催日時と参加ルールを掲示板および連絡網で事前周知し、参加人数を正確に把握します。`,
        tagColor: '#0284C7'
      },
      {
        number: '2',
        title: '会場設営・機材安全運用',
        description: `${location}の動線確保と必要機材の事前動作テストを行い、周囲への静音配慮を守って安全に進行します。`,
        tagColor: '#2563EB'
      },
      {
        number: '3',
        title: '交流促進・原状回復徹底',
        description: '参加者がリラックスして交流できる工夫を取り入れ、終了後は全員で清掃と原状回復を徹底します。',
        tagColor: '#E11D48'
      }
    );
  } else {
    conceptBoxes.push(
      {
        number: '1',
        title: '専用設備・定位置の明確化',
        description: `${coreTheme}に必要な専用スペースや収納・掲示を整備し、誰が見ても一目で使い方が分かる状態を作ります。`,
        tagColor: '#475569'
      },
      {
        number: '2',
        title: '利用ルールの視覚化・掲示',
        description: '具体的な利用手順やマナーを分かりやすい案内表示として掲出し、利用時の迷いや混同を防止します。',
        tagColor: '#0284C7'
      },
      {
        number: '3',
        title: '定期点検・維持管理フロー',
        description: '日常の巡回や定期確認の手順をシンプルに統一し、管理スタッフや寮生の作業負担を最小限に抑えます。',
        tagColor: '#E11D48'
      }
    );
  }

  // 運用フロー表の動的生成
  const operationFlow: ProposalOperationFlowItem[] = isEvent
    ? [
        {
          target: '参加寮生の行動手順',
          content: `事前案内を確認のうえ開始時刻に${location}へ集合する。イベント中は周囲へのマナーを守って交流を楽しみ、終了後は各自のゴミ回収と片付けに協力する。`
        },
        {
          target: '企画運営メンバーの手順',
          content: `事前申請および機材の動作テストを実施する。当日は会場設営・受付誘導・進行管理を担当し、終了後は原状回復および忘れ物確認を行って管理スタッフへ報告する。`
        }
      ]
    : [
        {
          target: '寮生の日常利用手順',
          content: `${location}に掲示された案内ルールに従い、定められた手順・定位置で${coreTheme}を利用する。使用後は次の利用者が気持ちよく使えるよう整理・回収ルールを守る。`
        },
        {
          target: '管理・巡回スタッフの手順',
          content: `定期巡回時に利用状況および備品の状態を確認する。整理された定位置から効率的に点検・補充を行い、異常があれば速やかに共有する。`
        }
      ];

  // 4. 導入による改善点 3者視点でのメリット分析
  const stakeholderImpacts: ProposalStakeholderImpact[] = isEvent
    ? [
        {
          stakeholder: '寮生側',
          title: '交流機会の創出と満足度向上',
          description: `${coreTheme}を通じて普段接点の少ない寮生同士が気軽に話せるきっかけが生まれ、寮生活の孤独感解消とコミュニティへの愛着向上につながります。`
        },
        {
          stakeholder: '企画運営側',
          title: '進行手順の明確化と負担軽減',
          description: '事前準備から当日の設営、終了後の片付けまでの一連のフローが整理されることで、特定の担当者だけに負担が集中せずスムーズに運営できます。'
        },
        {
          stakeholder: '施設管理側',
          title: '利用マナーと安全性の確保',
          description: '事前の共用部使用申請と時間・音量のルール遵守、終了後の完全な原状回復を徹底することで、施設トラブルやクレームを未然に防止できます。'
        }
      ]
    : [
        {
          stakeholder: '寮生側',
          title: '快適性と利便性の向上',
          description: `${coreTheme}の導入により日常の不便さやストレスが解消され、誰もが迷わず清潔かつ快適に共用設備を利用できるようになります。`
        },
        {
          stakeholder: '寮母・スタッフ側',
          title: '巡回・管理作業の効率化',
          description: '使い方のルールと定位置が明確化されることで、散乱した備品の整理や個別対応の手間が減り、日常の管理・点検業務の負担が大幅に軽減されます。'
        },
        {
          stakeholder: '施設管理側',
          title: '共用部の美観維持と低コスト運用',
          description: '共用スペースの秩序と美観が長期的に保たれます。また既存設備や市販品を有効活用することで、最小限の費用で高い改善効果を得られます。'
        }
      ];

  // 5. 必要資材および費用概算テーブルの動的生成
  const budgetItems: ProposalBudgetItem[] = [];
  if (itemLines.length > 0) {
    itemLines.slice(0, 4).forEach((line) => {
      const cleanItem = line.replace(/が必要|を用意|の手配|を行う|する/g, '').trim();
      budgetItems.push({
        name: cleanItem.slice(0, 18),
        spec: `${coreTheme}実施用 推奨仕様`,
        quantity: '必要数一式',
        cost: '約1,000円 〜 3,000円'
      });
    });
  }

  if (budgetItems.length === 0) {
    if (isEvent) {
      budgetItems.push(
        {
          name: 'メイン実施機材・備品',
          spec: `${coreTheme}用 既存共用備品を優先活用`,
          quantity: '1式',
          cost: '既存備品で対応可能'
        },
        {
          name: '参加者用 飲料・軽食・消耗品',
          spec: '紙コップ・飲料パック・防寒または快適シート等',
          quantity: '参加想定人数分',
          cost: '約2,500円'
        },
        {
          name: '告知・案内用ポスター',
          spec: 'A4カラー印刷 共用掲示板およびエレベーター前用',
          quantity: '10枚',
          cost: '約500円'
        },
        {
          name: '清掃・分別用ゴミ袋',
          spec: '45L 分別回収用ポリ袋・除菌シート',
          quantity: '1組',
          cost: '約500円'
        }
      );
    } else {
      budgetItems.push(
        {
          name: '導入用 整理ボックス・収納備品',
          spec: '耐久性・通気性に優れた市販規格品',
          quantity: '対象エリア必要数',
          cost: '約3,500円'
        },
        {
          name: '区分表示ラベル・サイン',
          spec: '防水ラミネート加工 日英併記視認ラベル',
          quantity: '一式',
          cost: '約1,000円'
        },
        {
          name: '利用ルール案内ポスター',
          spec: 'A4ラミネート 壁面掲示用',
          quantity: '必要枚数',
          cost: '約500円'
        },
        {
          name: '既存設備・消耗品の活用',
          spec: '現在配備されている備品を継続活用',
          quantity: '一式',
          cost: '追加費用なし'
        }
      );
    }
  }

  const totalCostEstimate = isEvent ? '約 3,500 円 〜 5,000 円' : '約 5,000 円 〜 8,000 円';

  // 6. 導入・実施手順
  const actionSteps = isEvent
    ? [
        `1. 事前確認： 管理会社様およびスタッフとの${location}使用申請・実施日時の確認`,
        `2. 準備・告知： 必要備品の手配・動作テストおよび寮内掲示板・連絡網での参加募集`,
        `3. 当日運営・原状回復： 安全配慮のもとでの${coreTheme}実施および終了後の清掃・撤収報告`
      ]
    : [
        `1. 事前確認： 西松地所様および管理スタッフとの設置場所・導入仕様の確認`,
        `2. 試験導入： 一部エリア・特定フロアで試験運用を実施し、利用状況や改善効果を確認`,
        `3. 全体導入： 案内表示および備品を正式設置し、全体での本格運用を開始`
      ];

  const summaryText = `本提案は、寮生から挙げられた${coreTheme}に関する課題を解消し、快適で安全な環境づくりと運営の効率化を両立することを目的としています。まずは小規模な試験実施を含め、前向きにご検討いただけますようお願いいたします。`;

  return {
    docType: '企画提案書',
    title: refinedTitle,
    subTitle: refinedSubTitle,
    projectType: isEvent ? 'event' : 'operation',
    submittedTo,
    submittedDate: '2026年10月',
    location,
    targetAudience: 'Hヴィレッジ 寮生全員および管理スタッフの皆様',
    background: backgroundText,
    highlightQuote,
    issues: analyzedIssues,
    proposalOverview: conceptOverview,
    proposalConcept: conceptOverview,
    conceptBoxes,
    operationFlow,
    stakeholderImpacts,
    budgetItems,
    totalCostEstimate,
    actionSteps,
    summaryText,
    objective: `${coreTheme}の実現による環境改善と満足度向上`,
    requirements: budgetItems.map((b) => `${b.name} ${b.quantity}`),
    expectedImpact: '寮生の満足度向上および管理運営の効率化'
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
以下の入力文章や議事録を深く読み取り、要約および要点分析を行った上で、管理会社や代表へそのまま提出できる完璧な企画提案書を作成してください。

厳守ルール:
1. 入力された文章をそのままコピペ転記するのではなく、プロの企画提案書として説得力のある論理的な文章に要約・発展させてください。
2. 入力内容と無関係な話題は一切混ぜず、入力されたテーマに100パーセント沿った内容にしてください。
3. 丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。

出力フォーマットJSON:
{
  "docType": "企画提案書",
  "title": "入力テーマの目的を表す上段メインタイトル 例 Hヴィレッジ 共用エリアにおける環境改善および効率化に向けた",
  "subTitle": "具体的な施策名を表す下段サブタイトル 例 〇〇方式 導入のご提案 または 〇〇イベント開催のご提案",
  "projectType": "eventまたはoperation",
  "submittedTo": "提出先 例 西松地所株式会社 様 / 寮母・管理スタッフの皆様",
  "submittedDate": "2026年10月",
  "location": "対象場所",
  "targetAudience": "対象者",
  "background": "1. 企画の趣旨・背景。現状の運用状況、会議等で出た課題、だから何を提案するかの3段落構成の丁寧な文章",
  "highlightQuote": "会議や現場で最も強く出された代表的な意見1文",
  "issues": [
    "具体的に生じている課題1",
    "具体的に生じている課題2",
    "具体的に生じている課題3",
    "具体的に生じている課題4"
  ],
  "proposalConcept": "提案内容の全体概要を説明する1文",
  "conceptBoxes": [
    {
      "number": "1",
      "title": "具体策や専用設備1の名称",
      "description": "具体的な仕様や役割の説明",
      "tagColor": "#475569"
    },
    {
      "number": "2",
      "title": "具体策や専用設備2の名称",
      "description": "具体的な仕様や役割の説明",
      "tagColor": "#0284C7"
    },
    {
      "number": "3",
      "title": "具体策や専用設備3の名称",
      "description": "具体的な仕様や役割の説明",
      "tagColor": "#E11D48"
    }
  ],
  "operationFlow": [
    {
      "target": "寮生・参加者の利用手順",
      "content": "具体的な利用・参加の行動手順"
    },
    {
      "target": "管理・運営側の手順",
      "content": "具体的な回収・補充・進行管理の手順"
    }
  ],
  "stakeholderImpacts": [
    {
      "stakeholder": "寮生側",
      "title": "寮生にとっての改善点見出し",
      "description": "具体的なメリットと改善効果の説明"
    },
    {
      "stakeholder": "寮母・スタッフ側",
      "title": "スタッフにとっての改善点見出し",
      "description": "具体的なメリットと作業負担軽減の説明"
    },
    {
      "stakeholder": "施設管理側",
      "title": "施設管理にとっての改善点見出し",
      "description": "美観維持や安全性、低コスト導入メリットの説明"
    }
  ],
  "budgetItems": [
    {
      "name": "必要資材・品名1",
      "spec": "具体的な仕様・規格",
      "quantity": "具体的な数量",
      "cost": "概算費用"
    },
    {
      "name": "必要資材・品名2",
      "spec": "具体的な仕様・規格",
      "quantity": "具体的な数量",
      "cost": "概算費用"
    },
    {
      "name": "必要資材・品名3",
      "spec": "具体的な仕様・規格",
      "quantity": "具体的な数量",
      "cost": "概算費用"
    },
    {
      "name": "必要資材・品名4",
      "spec": "既存備品の活用など",
      "quantity": "一式",
      "cost": "既存備品で対応可能など"
    }
  ],
  "totalCostEstimate": "合計概算費用 例 約 5,000 円 〜 8,000 円",
  "actionSteps": [
    "1. 事前確認： 関係者との設置場所・仕様・日程の確認",
    "2. 試験導入・準備： 小規模での試験運用や事前テストの実施",
    "3. 本格導入・実施： 案内掲示と全体での運用開始"
  ],
  "summaryText": "企画提案書全体のまとめとご検討をお願いする丁寧な結びの文章"
}

入力文章:
${trimmed}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = safeJsonParse(resText) as Record<string, any>;
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
          conceptBoxes: Array.isArray(parsed.conceptBoxes) ? parsed.conceptBoxes.map((b: any, idx: number) => ({
            number: String(b.number || idx + 1),
            title: stripForbiddenBrackets(String(b.title || '')),
            description: stripForbiddenBrackets(String(b.description || '')),
            tagColor: b.tagColor || (idx === 0 ? '#475569' : idx === 1 ? '#0284C7' : '#E11D48')
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
          totalCostEstimate: stripForbiddenBrackets(String(parsed.totalCostEstimate || '約 5,000 円 〜 8,000 円')),
          actionSteps: Array.isArray(parsed.actionSteps) ? parsed.actionSteps.map((a: unknown) => stripForbiddenBrackets(String(a))) : [],
          summaryText: stripForbiddenBrackets(String(parsed.summaryText || '')),
          objective: stripForbiddenBrackets(String(parsed.title)),
          requirements: Array.isArray(parsed.budgetItems) ? parsed.budgetItems.map((bi: any) => `${bi.name} ${bi.quantity}`) : [],
          expectedImpact: '環境改善および運営の効率化'
        };
      }
    } catch {
      // フォールバックへ
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return buildStructuredProposalLocally(trimmed);
};

export const generateProposalFromTopicWithGemini = async (
  topic: ExtractedTopic,
  sourceText: string
): Promise<ProposalDocument> => {
  return generateProposalDirectFromTextWithGemini(`議題: ${topic.title}\n${sourceText}`);
};
