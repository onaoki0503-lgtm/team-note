// Gemini 3.8 Flash Medium を活用した議事録トピック分解 ＆ 企画書自動生成サービス
// 丸括弧やかぎ括弧は使用しない

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

// 議事録テキストからトピックを分解する関数
export const analyzeMeetingNoteWithGemini = async (
  meetingText: string
): Promise<ExtractedTopic[]> => {
  // 擬似的なAI推論ディレイ 700ms
  await new Promise((resolve) => setTimeout(resolve, 700));

  const trimmed = meetingText.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const topics: ExtractedTopic[] = [];

  const hasEvent = /イベント|シネマ|映画|祭り|企画|上映|交流|BBQ|中庭|パーティ|音楽/i.test(trimmed);
  const hasKitchen = /キッチン|自炊|料理|布巾|冷蔵庫|調理|ゴミ/i.test(trimmed);
  const hasFacility = /オートロック|鍵|エントランス|Wi-Fi|ネット|設備|ドア|エレベーター/i.test(trimmed);
  const hasStudy = /勉強|自習|テスト|ゼミ|英語|本|図書/i.test(trimmed);

  if (hasEvent) {
    topics.push({
      id: 'topic-event',
      title: '秋の中庭星空シネマ 寮生親睦上映会',
      projectType: 'event',
      summary: '中庭のオープンエア空間でプロジェクター映画上映を行い寮生同士の交流を深める',
      keyPoints: [
        'プロジェクターと大型スクリーンの設置手配',
        '近隣フロアへの事前告知と静音配慮',
        '温かい飲み物や軽食の持ち寄り運営'
      ]
    });
  }

  if (hasKitchen) {
    topics.push({
      id: 'topic-kitchen',
      title: 'キッチン衛生管理と使い捨てペーパーロール導入',
      projectType: 'operation',
      summary: '共有キッチンの布巾の生乾き臭を解消し衛生的な調理環境を整える',
      keyPoints: [
        '布巾の廃止と使い捨てロールペーパーホルダーの設置',
        '備品補充サイクルと費用の明確化',
        'キッチン利用マナーポスターの掲示'
      ]
    });
  }

  if (hasFacility) {
    topics.push({
      id: 'topic-facility',
      title: '深夜エントランスオートロック解錠運用の改善',
      projectType: 'operation',
      summary: 'カードキー忘れや夜間解錠トラブルを減らすための運用体制見直し',
      keyPoints: [
        '予備キー持ち出しルールの電子化',
        '解錠センサーの動作点検と清掃',
        '管理会社西松地所との連絡フロー確認'
      ]
    });
  }

  if (hasStudy) {
    topics.push({
      id: 'topic-study',
      title: '自習ラウンジの静音ゾーン運用と設備整備',
      projectType: 'operation',
      summary: 'テスト期間や日常学習に集中できる環境をつくる',
      keyPoints: [
        '電源タップの増設とWi-Fi接続の強化',
        '静音タイムの設定とマナーポスター掲示',
        '教科書や参考書のシェア本棚設置'
      ]
    });
  }

  if (topics.length === 0) {
    const firstLine = lines[0] || '新規イベント企画';
    const cleanTitle = firstLine.replace(/^[#・\-\d\s.:]+/, '').slice(0, 30);
    topics.push({
      id: 'topic-custom-1',
      title: cleanTitle || '新規イベント企画',
      projectType: 'event',
      summary: '議事録から読み取ったアイデアをもとにした新しい寮内イベント企画',
      keyPoints: [
        '参加メンバーの募集と役割分担',
        '当日のタイムスケジュール策定',
        '必要な備品の準備と後片付け'
      ]
    });
  }

  return topics;
};

// 選択されたトピックから本格的な企画書を自動生成する関数
export const generateProposalFromTopicWithGemini = async (
  topic: ExtractedTopic,
  _sourceText: string
): Promise<ProposalDocument> => {
  // 擬似的なAI推論ディレイ 800ms
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (topic.id === 'topic-event' || topic.projectType === 'event') {
    return {
      title: topic.title || '秋の中庭星空シネマ 寮生親睦上映会',
      projectType: 'event',
      location: 'Hヴィレッジ 中庭広場',
      targetAudience: '全棟の寮生および役職者メンバー',
      background: '新入寮生や異なる棟のメンバーが集まり、自然な形で会話が生まれる温かい交流の機会が求められています。',
      objective: '中庭の広場を活用して星空の下で映画を鑑賞し、リラックスした雰囲気で新しい友人関係を築くきっかけを作ります。',
      actionSteps: [
        'ステップ1 上映作品の希望アンケートをLINEで実施',
        'ステップ2 プロジェクターと音響機材の動作テスト',
        'ステップ3 管理会社西松地所への共用部使用申請書を提出',
        'ステップ4 当日の会場設営、受付案内、温かい飲み物の配布',
        'ステップ5 上映終了後のゴミ拾いと機材撤収'
      ],
      requirements: [
        '高輝度プロジェクター 1台',
        '屋外用大型自立式スクリーン 1台',
        'スピーカーおよび延長コード 2組',
        '防寒用ブランケット・シート 10枚',
        '紙コップ・温かいお茶ティーバッグ'
      ],
      expectedImpact: '約30名以上の参加による棟を越えた交友関係の深化とコミュニティ活性化を見込みます。'
    };
  }

  if (topic.id === 'topic-kitchen') {
    return {
      title: 'キッチン衛生管理と使い捨てペーパーロール導入計画',
      projectType: 'operation',
      location: '各階共用キッチン',
      targetAudience: '日常的にキッチンを利用する自炊寮生全員',
      background: '共用キッチンの布巾の生乾き臭や衛生面での不安の声が寄せられており、清潔な調理環境の維持が課題となっています。',
      objective: '布巾を廃止して使い捨てロールペーパーホルダーを設置し、雑菌繁殖を防ぎ誰でも気持ちよく使えるキッチンを実現します。',
      actionSteps: [
        'ステップ1 各階キッチンの設置場所を選定',
        'ステップ2 備品台帳から初期購入費用の申請',
        'ステップ3 キッチン掲示板への利用ルールポスター掲示',
        'ステップ4 1ヶ月後の衛生状態と消費ペースの振り返り'
      ],
      requirements: [
        'マグネット式ロールペーパーホルダー 3個',
        'キッチン用ロールペーパー 6本',
        '分別用ゴミ箱の増設'
      ],
      expectedImpact: '衛生トラブルゼロの達成および清掃負担の半減を見込みます。'
    };
  }

  return {
    title: topic.title,
    projectType: topic.projectType,
    location: 'Hヴィレッジ 共用スペース',
    targetAudience: 'Hヴィレッジ寮生全員',
    background: `${topic.summary}に基づき、現状の課題を解決してより快適な寮生活をつくるための取り組みです。`,
    objective: `${topic.title}を計画的に実行し、寮生が安心して楽しく過ごせる環境を整えます。`,
    actionSteps: topic.keyPoints.map((point, idx) => `ステップ${idx + 1} ${point}を具体化する`),
    requirements: [
      '実施担当メンバーの決定',
      '必要備品の手配',
      '全体告知の実施'
    ],
    expectedImpact: '寮生の満足度向上とチーム運営の円滑化に貢献します。'
  };
};

// 文章や議事録からダイレクトに本格的なイベント企画書を一発生成する関数
export const generateProposalDirectFromTextWithGemini = async (
  sourceText: string
): Promise<ProposalDocument> => {
  // 擬似的なAI推論ディレイ 900ms
  await new Promise((resolve) => setTimeout(resolve, 900));

  const trimmed = sourceText.trim();
  const isCinema = /シネマ|映画|上映|中庭/i.test(trimmed);
  const isKitchen = /キッチン|自炊|布巾|ペーパー/i.test(trimmed);

  if (isCinema) {
    return {
      title: '秋の中庭星空シネマ 寮生親睦上映会',
      projectType: 'event',
      location: 'Hヴィレッジ 中庭広場',
      targetAudience: '全棟の寮生および役職者メンバー',
      background: '新入寮生や異なる棟のメンバーが集まり、自然な形で会話が生まれる温かい交流の機会が求められています。',
      objective: '中庭の広場を活用して星空の下で映画を鑑賞し、リラックスした雰囲気で新しい友人関係を築くきっかけを作ります。',
      actionSteps: [
        'ステップ1 上映作品の希望アンケートをLINEで実施',
        'ステップ2 プロジェクターと音響機材の動作テスト',
        'ステップ3 管理会社西松地所への共用部使用申請書を提出',
        'ステップ4 当日の会場設営、受付案内、温かい飲み物の配布',
        'ステップ5 上映終了後のゴミ拾いと機材撤収'
      ],
      requirements: [
        '高輝度プロジェクター 1台',
        '屋外用大型自立式スクリーン 1台',
        'スピーカーおよび延長コード 2組',
        '防寒用ブランケット・シート 10枚',
        '紙コップ・温かいお茶ティーバッグ'
      ],
      expectedImpact: '約30名以上の参加による棟を越えた交友関係の深化とコミュニティ活性化を見込みます。'
    };
  }

  if (isKitchen) {
    return {
      title: 'キッチン衛生管理と使い捨てペーパーロール導入計画',
      projectType: 'operation',
      location: '各階共用キッチン',
      targetAudience: '日常的にキッチンを利用する自炊寮生全員',
      background: '共用キッチンの布巾の生乾き臭や衛生面での不安の声が寄せられており、清潔な調理環境の維持が課題となっています。',
      objective: '布巾を廃止して使い捨てロールペーパーホルダーを設置し、雑菌繁殖を防ぎ誰でも気持ちよく使えるキッチンを実現します。',
      actionSteps: [
        'ステップ1 各階キッチンの設置場所を選定',
        'ステップ2 備品台帳から初期購入費用の申請',
        'ステップ3 キッチン掲示板への利用ルールポスター掲示',
        'ステップ4 1ヶ月後の衛生状態と消費ペースの振り返り'
      ],
      requirements: [
        'マグネット式ロールペーパーホルダー 3個',
        'キッチン用ロールペーパー 6本',
        '分別用ゴミ箱の増設'
      ],
      expectedImpact: '衛生トラブルゼロの達成および清掃負担の半減を見込みます。'
    };
  }

  // 汎用テキストからの生成
  const firstLine = trimmed.split('\n')[0] || '新規イベント企画';
  const cleanTitle = firstLine.replace(/^[#・\-\d\s.:]+/, '').slice(0, 32);

  return {
    title: cleanTitle || '新規イベント企画書',
    projectType: 'event',
    location: 'Hヴィレッジ 共用スペース',
    targetAudience: 'Hヴィレッジ寮生',
    background: `${trimmed.slice(0, 80)}...という寮生のアイデアや課題意識から生まれた取り組みです。`,
    objective: '寮生同士が協力してイベントを実現し、一体感と安心感のあるコミュニティを育てます。',
    actionSteps: [
      'ステップ1 企画内容のメンバー間共有と役割分担',
      'ステップ2 実施に必要な資材・備品のリストアップ',
      'ステップ3 寮内告知ポスターの掲示と参加募集',
      'ステップ4 当日の進行管理と安全確認',
      'ステップ5 片付けと振り返り共有'
    ],
    requirements: [
      '案内用ポスター 3枚',
      '共用部使用許可の事前確認',
      '記録用カメラ'
    ],
    expectedImpact: '寮生間の積極的な関わりが増加し、より過ごしやすい寮環境の醸成につながります。'
  };
};
