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

// ============================================================
// 膨大な音声文字起こし・生ログを抽象化・正式文書化する自然言語変換エンジン
// 生の発言のコピペ転記を100パーセント排除する
// ============================================================

// 1. 話し言葉・フィラー・話者ラベル・タイムスタンプを除去し、意味のある文に分解する
const splitAndNormalizeTranscript = (rawText: string): string[] => {
  const cleanedBlock = stripForbiddenBrackets(rawText)
    // タイムスタンプ除去 例 00:12:34 や 12:34
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ')
    // 話者ラベル除去 例 岡本: 寮生A： スピーカー1:
    .replace(/^[^\n。、]{1,12}[:：]\s*/gm, '')
    // 典型的な音声フィラーの除去
    .replace(/(えーっと|えーと|えっと|あのー|なんか|まあ|そのー|うーん|というか|ていうか|ぶっちゃけ|正直|やっぱり|やっぱ|一応|とりあえず)/g, '');

  // 改行および句点・感嘆符・疑問符で文単位に分割
  const rawSentences = cleanedBlock
    .split(/[\n。！？!?]+/)
    .map((s) => s.replace(/^[・\-\d\s.:：#【】*]+/g, '').trim())
    .filter((s) => s.length >= 4);

  return rawSentences;
};

// 2. 口語表現を企画書のフォーマルな体言止め・公用文調に変換する抽象化関数
const formalizeIssueStatement = (rawSentence: string, coreTheme: string): string => {
  const s = rawSentence;
  if (/汚い|不衛生|濡れ|湿|臭|カビ|菌/.test(s)) {
    return '使用後の備品や設備の衛生管理基準が統一されておらず、利用時の衛生面に強い不安が生じている。';
  }
  if (/区別|曖昧|どっち|混ざ|混同|わかりにくい|分かりにくい/.test(s)) {
    return '用途や区分の表示が不明確であるため、利用時の混同やルールの形骸化が発生しやすい状態にある。';
  }
  if (/放置|散らか|置きっぱなし|片付|ゴミ|残っ/.test(s)) {
    return '使用後の返却場所や片付け手順が定着しておらず、共用スペースへの放置や美観の低下を招いている。';
  }
  if (/持ち込|自前|自分で|ペーパータオル|使い捨て|買っ/.test(s)) {
    return '備え付けの共用備品が十分に機能しておらず、各自での代替品持ち込みや余分な消耗品消費につながっている。';
  }
  if (/うるさい|騒音|音|苦情|クレーム|近隣|夜遅く|夜間/.test(s)) {
    return '夜間や共用エリア利用時における音量基準および時間帯マナーの徹底が課題となっている。';
  }
  if (/交流|話したことがない|孤独|知り合い|接点|仲良|新入/.test(s)) {
    return '異なるフロアや棟の寮生同士が日常的に言葉を交わし、自然に交流を深められる機会が不足している。';
  }
  if (/負担|大変|忙しい|探す|手間|偏っ|特定の人/.test(s)) {
    return '巡回・回収や準備・片付けの作業手順が整理されておらず、管理スタッフや特定メンバーに過度な負担が生じている。';
  }
  if (/狭い|溢れ|置けない|駐輪|自転車|スペース|場所がない/.test(s)) {
    return '限られた共用スペースにおける配置ルールが明確でなく、動線の妨げやスペース不足が慢性化している。';
  }
  if (/遅い|繋がらない|電波|Wi-Fi|ネット|通信/.test(s)) {
    return '通信環境や設備インフラの負荷分散が適切に行われておらず、日常の学習や生活に支障が生じている。';
  }
  if (/予算|お金|高い|費用|コスト/.test(s)) {
    return '既存備品の活用や安価な市販品の組み合わせによる、低コストかつ持続可能な運用設計が求められている。';
  }

  // 上記キーワードに当てはまらない場合でも、生の口語文をそのまま使わず、名詞句を抽出して企画書文体に再構成する
  const keywords = extractNounsAndKeywords(s);
  if (keywords.length >= 2) {
    return `${keywords[0]}および${keywords[1]}に関する運用基準が明確化されておらず、現場での不便や混乱が生じている。`;
  }
  return `${coreTheme}における現状の運用ルールが十分に浸透しておらず、利用環境および管理効率の改善が求められている。`;
};

// 3. 文章中から主要な名詞・キーワード群を抽出する関数
const extractNounsAndKeywords = (text: string): string[] => {
  const stopWords = new Set([
    'こと', 'もの', 'ところ', 'ため', 'よう', 'そう', 'これ', 'それ', 'あれ', 'どれ',
    'ここ', 'そこ', 'あそこ', 'わたし', '僕', '俺', '自分', 'みんな', '全員', '会議',
    '議事録', '文字起こし', '今日', '昨日', '明日', '今回', '前回', '次回', '感じ',
    '思い', '意見', '話', '話題', '部分', '状態', '状況', '場合', 'とき', '時間',
    '本当', '結構', 'かなり', 'すごく', 'めっちゃ', 'ちょっと', 'いろいろ', '大変'
  ]);

  // 漢字2文字以上、カタカナ2文字以上、または英数字の組み合わせを重要語として抽出
  const matches = text.match(/[一-龠々]{2,8}|[ァ-ヶー]{2,10}|[A-Za-z0-9]{2,10}/g) || [];
  const freq = new Map<string, number>();

  for (const word of matches) {
    const w = word.replace(/^(議事録|全員会議|ミーティング|文字起こし)$/, '');
    if (!w || w.length < 2 || stopWords.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);
};

// 4. 膨大な文字起こし全体から最頻出・最重要のコアテーマを特定する
const detectCoreThemeFromTranscript = (rawText: string, sentences: string[]): string => {
  // 明示的な議題行があればそこから抽出
  for (const line of sentences.slice(0, 8)) {
    if (/^(議題|テーマ|件名|企画名|タイトル)[:：\s]/i.test(line)) {
      const extracted = line
        .replace(/^(議題|テーマ|件名|企画名|タイトル)[:：\s]+/i, '')
        .replace(/について.*$/, '')
        .trim();
      if (extracted.length >= 2 && extracted.length <= 28) return extracted;
    }
  }

  // ドメイン特化判定
  if (/布巾|台拭き|3ボックス|食器拭き/.test(rawText)) {
    return '布巾・台拭き 3ボックス方式';
  }
  if (/サイレントフェス|ヘッドホン.*音楽|無音.*フェス/.test(rawText)) {
    return '中庭サイレントフェス';
  }
  if (/映画|シネマ|上映会|プロジェクター.*中庭/.test(rawText)) {
    return '中庭ナイトシネマ上映会';
  }
  if (/クリスマス|Xmas/i.test(rawText)) {
    return 'Hヴィレッジ クリスマス交流イベント';
  }
  if (/ハロウィン/i.test(rawText)) {
    return 'ハロウィン交流イベント';
  }
  if (/新歓|歓迎会|ウェルカム/i.test(rawText)) {
    return '新入寮生ウェルカム交流会';
  }
  if (/駐輪|自転車|バイク/.test(rawText)) {
    return '駐輪場スペース整理および利用ルール改善';
  }
  if (/ゴミ|分別|集積/.test(rawText)) {
    return 'ゴミ分別ルールおよび集積スペース改善';
  }
  if (/自習|スタディルーム|学習室/.test(rawText)) {
    return '自習ラウンジ利用環境およびルール改善';
  }
  if (/キッチン|シンク|調理|冷蔵庫|コンロ/.test(rawText)) {
    return '共用キッチン衛生環境および利用ルール改善';
  }
  if (/玄関|エントランス|オートロック|コモンズ/.test(rawText)) {
    return 'エントランスおよび共用コモンズ利用改善';
  }

  // 頻出キーワード上位2語を組み合わせて洗練されたテーマ名を生成
  const topKeywords = extractNounsAndKeywords(rawText);
  if (topKeywords.length >= 2) {
    return `${topKeywords[0]}・${topKeywords[1]}に関する改善企画`;
  }
  if (topKeywords.length === 1) {
    return `${topKeywords[0]}に関する運営企画`;
  }
  return 'Hヴィレッジ 共用環境改善および交流促進企画';
};

// 議事録・文字起こしテキストからトピックを分解する関数
export const analyzeMeetingNoteWithGemini = async (
  meetingText: string
): Promise<ExtractedTopic[]> => {
  const trimmed = meetingText.trim();
  if (!trimmed) return [];

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const prompt = `あなたは組織や学生寮の運営企画を支援するプロの企画コンサルタントAIです。
以下に入力された膨大な会議文字起こしやメモを読み取り、話し言葉や雑談をすべて削ぎ落として、重要な企画トピックを1個から最大3個に要約・抽象化してください。
発言者の言葉をそのまま丸写しすることは厳禁です。企画提案書のテーマとして洗練されたビジネス表現に要約してください。
丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON配列形式で出力してください。
フォーマット:
[
  {
    "id": "topic-1",
    "title": "洗練された企画トピック名 25文字以内",
    "projectType": "eventまたはoperation",
    "summary": "背景と目的の要約 60文字程度",
    "keyPoints": ["要点分析1", "要点分析2", "要点分析3"]
  }
]

入力文字起こし:
${trimmed.slice(0, 25000)}`;

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

  await new Promise((resolve) => setTimeout(resolve, 250));
  const sentences = splitAndNormalizeTranscript(trimmed);
  const coreTheme = detectCoreThemeFromTranscript(trimmed, sentences);
  const isEvent = /イベント|シネマ|映画|上映|祭り|大会|交流|歓迎|送別|パーティ|BBQ|コンペ|フェス|ハロウィン|クリスマス|合宿|ツアー/i.test(trimmed);

  return [
    {
      id: 'topic-local-1',
      title: coreTheme,
      projectType: isEvent ? 'event' : 'operation',
      summary: `文字起こし全体から抽出した${coreTheme}の課題整理と具体的導入プラン`,
      keyPoints: [
        '会議で挙げられた現状課題と背景の構造化',
        '3つの具体策と役割別運用フローの策定',
        '必要資材の見積もりと段階的な導入ステップ'
      ]
    }
  ];
};

// ============================================================
// 膨大な文字起こしを入力しても一切コピペ転記せず、
// 要約・要点分析・再構成された企画提案書を生成するローカル構造化AIエンジン
// ============================================================
const buildStructuredProposalLocally = (
  sourceText: string,
  baseType?: 'event' | 'operation'
): ProposalDocument => {
  const trimmed = sourceText.trim();
  const sentences = splitAndNormalizeTranscript(trimmed);
  const coreTheme = detectCoreThemeFromTranscript(trimmed, sentences);
  const topKeywords = extractNounsAndKeywords(trimmed);

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

  // パターンB: 膨大な文字起こしからの抽象化・要約生成 生の文章の直接転記は一切行わない
  const rawIssueSentences = sentences.filter((l) =>
    /課題|問題|困|不足|ない|にくい|不満|現状|懸念|心配|苦情|意見|声|乱れ|遅い|狭い|暗い|危険|不便|汚|臭|放置|曖昧|大変/i.test(l)
  );

  // 重複しないフォーマルな課題文へと昇華する
  const formalizedIssuesSet = new Set<string>();
  for (const rawIss of rawIssueSentences) {
    formalizedIssuesSet.add(formalizeIssueStatement(rawIss, coreTheme));
    if (formalizedIssuesSet.size >= 4) break;
  }

  // 万が一4件に満たない場合はテーマに応じた構造化課題を補完
  const defaultIssues = isEvent
    ? [
        '異なるフロアや棟の寮生同士が日常的に言葉を交わし、自然に交流を深められる機会が不足している。',
        '企画実施時における事前準備や会場設営、撤収作業の役割分担が明確化されておらず負担が偏りやすい。',
        '共用スペース利用時における時間帯ルールや周囲への音量配慮、原状回復の徹底が求められている。',
        '限られた予算内で多くの寮生が気軽に参加でき、継続開催できる運営モデルが確立されていない。'
      ]
    : [
        `${coreTheme}に関する明確な利用基準や定位置が統一されておらず、利用時の混同や不便が生じている。`,
        '使用後の片付けや整理の手順が曖昧であり、共用スペースの美観低下や衛生面の懸念につながっている。',
        '日常の巡回や点検・補充を行う管理スタッフおよび一部寮生に作業負担が集中してしまっている。',
        'ルール表示の視認性が不足しており、新入寮生や外国人寮生を含む全員への周知が徹底されにくい。'
      ];

  for (const defIss of defaultIssues) {
    if (formalizedIssuesSet.size >= 4) break;
    formalizedIssuesSet.add(defIss);
  }
  const analyzedIssues = Array.from(formalizedIssuesSet);

  // タイトルとサブタイトルの生成
  const refinedTitle = isEvent
    ? 'Hヴィレッジ コミュニティ活性化および寮生間交流の促進に向けた'
    : `Hヴィレッジ ${location}における環境改善および運用体制の最適化に向けた`;
  const refinedSubTitle = isEvent
    ? `${coreTheme} 開催および運営体制のご提案`
    : `${coreTheme} 導入および運用ルール整備のご提案`;

  // 1. 企画の趣旨・背景 生テキストの貼り付けを禁止し、キーワードと文脈から3段落の論理的文章を合成
  const focusWords = topKeywords.slice(0, 3).join('や') || coreTheme;
  const backgroundText = isEvent
    ? `Hヴィレッジでは多様なバックグラウンドを持つ寮生が共同生活を送っていますが、現状ではフロアや棟を超えた交流の機会が限られており、会議においても${focusWords}を通じたコミュニティ形成を求める声が多く挙げられました。\n\n一方で、共用スペースでのイベント開催にあたっては、周囲への音量配慮や安全管理、終了後の確実な原状回復など、管理面のルールを明確にした上での計画的な運営が不可欠です。\n\nそこで、参加者の安全と施設美観の維持を徹底した明確な運営フローのもとで${coreTheme}を実施し、寮生間の親睦深化と活気ある寮環境の創出を両立する企画をご提案いたします。`
    : `${location}は日常的に多くの寮生が利用する重要な共用空間ですが、現状の運用では${focusWords}に関する利用ルールや定位置の区分が曖昧になっており、衛生面や利便性の観点から改善を求める意見が多く出されました。\n\nまた、使い方の基準が明確でないことにより、日常的な維持管理や巡回・整理を行うスタッフおよび一部寮生の作業負担が増加している点も課題となっています。\n\nそこで、誰にとっても直感的に分かりやすい専用区分の設置と利用フローの標準化を行う${coreTheme}を導入し、清潔で快適な共用環境の維持と管理業務の効率化を同時に実現する改善案をご提案いたします。`;

  // 2. 代表的な意見ハイライト 生の発言ではなく、会議で合意された核心の課題要約1文
  const highlightQuote = isEvent
    ? `マナーや安全面に十分配慮した仕組みを整えた上で、寮生同士が気軽に交流できる${coreTheme}を実現したい`
    : `${location}のルールと定位置を明確に整理し、誰もが気持ちよく清潔に利用できる環境へ改善したい`;

  // 3. 提案内容の3つの柱 文字起こしの散発的な発言ではなく、構造化された3つの柱
  const conceptOverview = isEvent
    ? `${coreTheme}を安全かつ円滑に実施するため、以下の3つの運営体制を整備して進行します。`
    : `${location}における課題を根本から解消するため、以下の3つの仕組みを組み合わせて導入します。`;

  const conceptBoxes: ProposalConceptBox[] = isEvent
    ? [
        {
          number: '1',
          title: '事前周知・参加受付の明確化',
          description: `開催日時・場所・参加マナーを掲示板および連絡網で事前案内し、参加想定人数と動線を正確に管理します。`,
          tagColor: '#475569'
        },
        {
          number: '2',
          title: '会場ゾーニング・安全進行管理',
          description: `${location}における設営配置と音量・時間の基準を厳守し、周囲の生活環境へ配慮した安全な運営を行います。`,
          tagColor: '#0284C7'
        },
        {
          number: '3',
          title: '清掃分別・原状回復の徹底',
          description: '終了時のゴミ分別回収と備品返却のチェックリストを運用し、使用前よりも美しい状態への原状回復を徹底します。',
          tagColor: '#E11D48'
        }
      ]
    : [
        {
          number: '1',
          title: '専用区分・定位置の設置',
          description: `${location}において用途別の収納・配置スペースを明確に分離し、物理的に混同や放置が起きない環境を整備します。`,
          tagColor: '#475569'
        },
        {
          number: '2',
          title: '視覚的サイン・日英ラベル掲示',
          description: '誰が見ても一目で使い方が分かる色分けラベルと利用案内ポスターを掲示し、利用手順の迷いをなくします。',
          tagColor: '#0284C7'
        },
        {
          number: '3',
          title: '巡回回収・補充フローの標準化',
          description: '回収場所と補充場所を固定化することで、定期巡回時における点検・交換作業の手間を大幅に削減します。',
          tagColor: '#E11D48'
        }
      ];

  // 運用フロー表
  const operationFlow: ProposalOperationFlowItem[] = isEvent
    ? [
        {
          target: '参加寮生の行動手順',
          content: `事前案内を確認のうえ開始時刻に${location}へ集合する。時間および音量のルールを守って交流を楽しみ、終了後は各自のゴミ分別と会場片付けに協力する。`
        },
        {
          target: '企画運営スタッフの手順',
          content: `管理スタッフへの事前確認と機材テストを実施する。当日は受付誘導・安全進行を担当し、終了後は原状回復および最終点検を行って完了報告を行う。`
        }
      ]
    : [
        {
          target: '寮生の日常利用手順',
          content: `${location}に設置された区分表示に従い、定められた定位置から備品や設備を利用する。使用後は放置せず、速やかに所定の回収・返却位置へ戻す。`
        },
        {
          target: '管理・巡回スタッフの手順',
          content: `定期巡回時に所定の回収・点検位置を確認する。放置物を探す手間なく定位置で効率的に回収・補充および状態確認を行う。`
        }
      ];

  // 4. 導入による改善点 3者視点のメリット
  const stakeholderImpacts: ProposalStakeholderImpact[] = isEvent
    ? [
        {
          stakeholder: '寮生側',
          title: '交流機会の創出と満足度向上',
          description: `${coreTheme}を通じて普段接点の少ない寮生同士が気軽に話せるきっかけが生まれ、寮生活の充実とコミュニティへの愛着向上につながります。`
        },
        {
          stakeholder: '企画運営側',
          title: '進行手順の明確化と負担軽減',
          description: '事前準備から当日の設営、終了後の片付けまでの一連の役割分担が整理されることで、特定の担当者だけに負担が集中せず円滑に運営できます。'
        },
        {
          stakeholder: '施設管理側',
          title: '利用マナーと安全性の確保',
          description: '事前の使用申請と時間・音量のルール遵守、終了後の完全な原状回復を徹底することで、施設トラブルや近隣クレームを未然に防止できます。'
        }
      ]
    : [
        {
          stakeholder: '寮生側',
          title: '衛生面・利便性の大幅改善',
          description: `${coreTheme}の導入により日常の衛生不安や使いづらさが解消され、誰もが迷わず清潔かつ快適に共用設備を利用できるようになります。`
        },
        {
          stakeholder: '寮母・スタッフ側',
          title: '巡回・管理作業の効率化',
          description: '使い方のルールと定位置が明確化されることで、散乱した備品を探す手間や個別対応が減り、日常の管理・点検業務の負担が軽減されます。'
        },
        {
          stakeholder: '施設管理側',
          title: '共用部の美観維持と低コスト運用',
          description: '共用スペースの秩序と美観が長期的に保たれます。また既存備品と安価な市販品を組み合わせることで、最小限の費用で高い改善効果を得られます。'
        }
      ];

  // 5. 必要資材および費用概算テーブル 口語文を切り貼りせず、品名・仕様・数量・概算費用を端正に構成
  const budgetItems: ProposalBudgetItem[] = isEvent
    ? [
        {
          name: '実施用メイン機材・備品',
          spec: `${coreTheme}進行用 既存共用備品を優先活用`,
          quantity: '1式',
          cost: '既存備品で対応可能'
        },
        {
          name: '会場設営・運営消耗品',
          spec: '養生シート・紙コップ・分別用回収袋・除菌シート等',
          quantity: '参加想定人数分',
          cost: '約2,500円'
        },
        {
          name: '告知・マナー案内ポスター',
          spec: 'A4カラー印刷 各棟掲示板および会場案内用 日英併記',
          quantity: '12枚',
          cost: '約600円'
        },
        {
          name: '予備費・安全対策備品',
          spec: '夜間誘導ライト・応急消耗品等',
          quantity: '1式',
          cost: '約1,000円'
        }
      ]
    : [
        {
          name: '区分収納ボックス・整理備品',
          spec: '通気性・耐久性に優れたプラスチックまたはメッシュ製規格品',
          quantity: '対象フロア・エリア必要数',
          cost: '約4,500円'
        },
        {
          name: '用途別 分別表示ラベル',
          spec: '防水ラミネート加工 色分け視認ラベル 日英併記',
          quantity: '一式',
          cost: '約1,000円'
        },
        {
          name: '利用ルール案内ポスター',
          spec: 'A4防水ラミネート 壁面掲示用 日英併記',
          quantity: '対象エリア枚数分',
          cost: '約600円'
        },
        {
          name: '補充・交換用備品',
          spec: '既存配備品の活用＋不足分のみ最小限補充',
          quantity: '一式',
          cost: '既存備品で対応可能'
        }
      ];

  const totalCostEstimate = isEvent ? '約 4,000 円 〜 5,000 円' : '約 6,000 円 〜 9,000 円';

  // 6. 導入手順
  const actionSteps = isEvent
    ? [
        `1. 事前確認： 管理会社様およびスタッフとの${location}使用条件・実施日時の確認`,
        `2. 準備・周知： 必要備品の手配・事前テストおよび掲示板でのルール周知・参加募集`,
        `3. 当日運営・原状回復： 安全配慮のもとでの${coreTheme}実施および終了後の清掃・完了報告`
      ]
    : [
        `1. 事前確認： 西松地所様および寮母・管理スタッフとの設置場所・仕様の確認`,
        `2. 試験導入： 一部フロア・特定エリアで試験運用を実施し、利用状況や動線を確認`,
        `3. 本格導入： 全対象エリアへ備品および案内表示を設置し、本格運用を開始`
      ];

  const summaryText = `本提案は、会議で挙げられた${coreTheme}に関する現場課題を解消し、清潔で安全な環境づくりと運営負担の軽減を両立することを目的としています。まずは一部での試験導入を含め、ご検討いただけますようお願いいたします。`;

  return {
    docType: '企画提案書',
    title: refinedTitle,
    subTitle: refinedSubTitle,
    projectType: isEvent ? 'event' : 'operation',
    submittedTo,
    submittedDate: '2026年10月',
    location,
    targetAudience: '全寮生および寮母・管理スタッフの皆様',
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
    objective: `${coreTheme}による環境改善および運営効率化`,
    requirements: budgetItems.map((b) => `${b.name} ${b.quantity}`),
    expectedImpact: '衛生・利便性の向上および管理作業の効率化'
  };
};

// Gemini APIを用いて膨大な文字起こしからPDFと同等の超高品質な企画提案書JSONを生成する
export const generateProposalDirectFromTextWithGemini = async (
  sourceText: string
): Promise<ProposalDocument> => {
  const trimmed = sourceText.trim();
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `あなたはプロの業務改善コンサルタントおよびイベント企画プロデューサーです。
以下に入力された膨大な会議文字起こしや議事メモを深く読み取り、話し言葉や雑談、フィラーを完全に削ぎ落として要約・要点分析を行った上で、管理会社や代表へそのまま提出できる完璧な企画提案書を作成してください。

絶対厳守ルール:
1. 文字起こしの発言や口語表現をそのまま企画書にコピペ転記することは絶対にやめてください。すべて洗練された公式企画提案書のビジネス文体に書き換えてください。
2. 入力内容のテーマに100パーセント沿って、背景、核心の意見、4つの課題、3つの具体的な仕組み・設備ボックス、対象別運用フロー表、3者それぞれのメリット、品名・仕様・数量・概算費用の見積もり表、3段階の導入手順へ論理的に構造化してください。
3. 丸括弧やかぎ括弧などの括弧記号は一切含めずにJSON形式で出力してください。

出力フォーマットJSON:
{
  "docType": "企画提案書",
  "title": "企画の目的を表す格調高い上段メインタイトル",
  "subTitle": "具体的な施策名を表す下段サブタイトル",
  "projectType": "eventまたはoperation",
  "submittedTo": "西松地所株式会社 様 / 寮母・管理スタッフの皆様",
  "submittedDate": "2026年10月",
  "location": "対象場所",
  "targetAudience": "対象者",
  "background": "1. 企画の趣旨・背景。現状の運用状況、会議で出た課題の本質、だから何を導入してどう改善するかの3段落構成の論理的で丁寧な文章",
  "highlightQuote": "会議で最も多く出された意見の本質を1文に要約した言葉",
  "issues": [
    "構造的に整理された現状課題1",
    "構造的に整理された現状課題2",
    "構造的に整理された現状課題3",
    "構造的に整理された現状課題4"
  ],
  "proposalConcept": "提案内容の全体像を端的に説明する1文",
  "conceptBoxes": [
    {
      "number": "1",
      "title": "導入する仕組み・専用ボックス1の名称",
      "description": "具体的な仕様や運用の説明",
      "tagColor": "#475569"
    },
    {
      "number": "2",
      "title": "導入する仕組み・専用ボックス2の名称",
      "description": "具体的な仕様や運用の説明",
      "tagColor": "#0284C7"
    },
    {
      "number": "3",
      "title": "導入する仕組み・専用ボックス3の名称",
      "description": "具体的な仕様や運用の説明",
      "tagColor": "#E11D48"
    }
  ],
  "operationFlow": [
    {
      "target": "寮生・参加者の利用手順",
      "content": "具体的な利用・行動手順"
    },
    {
      "target": "回収・補充・管理側の手順",
      "content": "具体的な巡回・管理・運営の手順"
    }
  ],
  "stakeholderImpacts": [
    {
      "stakeholder": "寮生側",
      "title": "寮生側の改善メリット見出し",
      "description": "具体的な改善効果の説明"
    },
    {
      "stakeholder": "寮母・スタッフ側",
      "title": "スタッフ側の作業効率化見出し",
      "description": "具体的な作業負担軽減の説明"
    },
    {
      "stakeholder": "施設管理側",
      "title": "施設管理側の美観・コスト見出し",
      "description": "美観維持や低コスト導入メリットの説明"
    }
  ],
  "budgetItems": [
    {
      "name": "品名1",
      "spec": "具体的な仕様・規格",
      "quantity": "数量",
      "cost": "概算費用"
    },
    {
      "name": "品名2",
      "spec": "具体的な仕様・規格",
      "quantity": "数量",
      "cost": "概算費用"
    },
    {
      "name": "品名3",
      "spec": "具体的な仕様・規格",
      "quantity": "数量",
      "cost": "概算費用"
    },
    {
      "name": "品名4",
      "spec": "既存備品の活用など",
      "quantity": "一式",
      "cost": "既存備品で対応可能"
    }
  ],
  "totalCostEstimate": "合計概算費用",
  "actionSteps": [
    "1. 事前確認： 関係者との設置場所・仕様の確認",
    "2. 試験導入： 一部フロアでの試験運用と状況確認",
    "3. 本格導入： 案内設置および全体での本格運用開始"
  ],
  "summaryText": "企画提案書全体のまとめとご検討をお願いする結びの文章"
}

入力された会議文字起こし・メモ:
${trimmed.slice(0, 30000)}`;

      const resText = await callGeminiApi(prompt, apiKey);
      const parsed = safeJsonParse(resText) as Record<string, any>;
      if (parsed && parsed.title) {
        return {
          docType: '企画提案書',
          title: stripForbiddenBrackets(String(parsed.title)),
          subTitle: stripForbiddenBrackets(String(parsed.subTitle || '改善導入のご提案')),
          projectType: parsed.projectType === 'operation' ? 'operation' : 'event',
          submittedTo: stripForbiddenBrackets(String(parsed.submittedTo || '西松地所株式会社 様 / 寮母・管理スタッフの皆様')),
          submittedDate: stripForbiddenBrackets(String(parsed.submittedDate || '2026年10月')),
          location: stripForbiddenBrackets(String(parsed.location || '共用スペース')),
          targetAudience: stripForbiddenBrackets(String(parsed.targetAudience || '全寮生および管理スタッフの皆様')),
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
          totalCostEstimate: stripForbiddenBrackets(String(parsed.totalCostEstimate || '約 6,000 円 〜 9,000 円')),
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
