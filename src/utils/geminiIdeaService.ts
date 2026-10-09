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
  background: string;
  objective: string;
  targetAudience: string;
  actionSteps: string[];
  requirements: string[];
  expectedImpact: string;
}

// 議事録テキストからトピックを分解する関数
export const analyzeMeetingNoteWithGemini = async (
  meetingText: string
): Promise<ExtractedTopic[]> => {
  // 擬似的なAI推論ディレイ 800ms
  await new Promise((resolve) => setTimeout(resolve, 800));

  const trimmed = meetingText.trim();
  if (!trimmed) {
    return [];
  }

  // テキストの文脈を解析してトピックを抽出
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

  const topics: ExtractedTopic[] = [];

  // キーワード検出によるトピック分類
  const hasKitchen = /キッチン|自炊|料理|布巾|冷蔵庫|調理|ゴミ/i.test(trimmed);
  const hasEvent = /イベント|シネマ|映画|祭り|企画|上映|交流|BBQ|中庭/i.test(trimmed);
  const hasFacility = /オートロック|鍵|エントランス|Wi-Fi|ネット|設備|ドア|エレベーター/i.test(trimmed);
  const hasStudy = /勉強|自習|テスト|ゼミ|英語|本|図書/i.test(trimmed);

  if (hasKitchen) {
    topics.push({
      id: 'topic-kitchen',
      title: 'キッチン衛生管理と消耗品ロール化の改善',
      projectType: 'operation',
      summary: '共有キッチンの衛生状態向上と布巾の定期交換に関する改善提案',
      keyPoints: [
        '布巾の使い捨てペーパーロール導入',
        '排水口ネットの定期点検ルール化',
        '共用調味料置き場の整理整頓'
      ]
    });
  }

  if (hasEvent) {
    topics.push({
      id: 'topic-event',
      title: '中庭ナイトシネマと交流上映会の開催',
      projectType: 'event',
      summary: '寮生同士の親睦を深める中庭での屋外映画上映イベント',
      keyPoints: [
        'プロジェクターと音響機材の手配',
        '近隣フロアへの事前告知と静音配慮',
        '軽食やドリンクの持ち寄り企画'
      ]
    });
  }

  if (hasFacility) {
    topics.push({
      id: 'topic-facility',
      title: 'エントランスおよびセキュリティ設備の運用改善',
      projectType: 'operation',
      summary: '出入り口のオートロックと解錠手順のスムーズ化',
      keyPoints: [
        '予備キー取り扱いルールの周知',
        '解錠センサーの動作確認と清掃',
        '管理会社西松地所への連絡導線整理'
      ]
    });
  }

  if (hasStudy) {
    topics.push({
      id: 'topic-study',
      title: '自習ラウンジの環境整備と静音ゾーン運用',
      projectType: 'operation',
      summary: '試験期間や日常学習に集中できる共用スペースの改善',
      keyPoints: [
        '電源タップとWi-Fi接続の最適化',
        '利用時間帯のルール策定',
        '参考書シェア棚の設置'
      ]
    });
  }

  // 特定キーワードに該当しない場合または件数が少ない場合は行から柔軟に抽出
  if (topics.length === 0) {
    // 最初の行または要約からトピックを生成
    const firstLine = lines[0] || '日常活動の共有事項';
    const cleanTitle = firstLine.replace(/^[#・\-\d\s.:]+/, '').slice(0, 30);
    topics.push({
      id: 'topic-custom-1',
      title: cleanTitle || '共有事項の企画化',
      projectType: 'operation',
      summary: '議事録で議論された主要課題の解決に向けた改善プロジェクト',
      keyPoints: [
        '関係寮生へのヒアリング実施',
        '具体的な運用スケジュールの策定',
        'ハウスリーダー会議での報告'
      ]
    });

    if (lines.length > 2) {
      const secondLine = lines[Math.floor(lines.length / 2)].replace(/^[#・\-\d\s.:]+/, '').slice(0, 30);
      topics.push({
        id: 'topic-custom-2',
        title: secondLine || '継続検討テーマ',
        projectType: 'event',
        summary: '寮生有志による新しい取り組みと実施計画の推進',
        keyPoints: [
          '参加メンバーの募集',
          '準備機材の洗い出し',
          '当日の進行管理'
        ]
      });
    }
  }

  return topics;
};

// 選択されたトピックから本格的な企画書を自動生成する関数
export const generateProposalFromTopicWithGemini = async (
  topic: ExtractedTopic,
  _sourceText: string
): Promise<ProposalDocument> => {
  // 擬似的なAI推論ディレイ 900ms
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (topic.id === 'topic-kitchen') {
    return {
      title: 'キッチン衛生管理と使い捨てペーパーロール導入計画',
      projectType: 'operation',
      background: '共用キッチンの布巾の生乾き臭や衛生面での懸念が寮生から寄せられており、清潔な調理環境の維持が求められています。',
      objective: '布巾を使い捨てロールペーパーへ置き換えることで雑菌繁殖を防ぎ、全寮生が快適に利用できるキッチン環境を実現します。',
      targetAudience: '各階キッチンの日常利用者および自炊メンバー全員',
      actionSteps: [
        'ロールペーパーホルダーの設置場所を選定',
        '備品台帳から初期購入費用の申請',
        'キッチン掲示板への利用ルールポスター設置',
        '1ヶ月後の衛生状態と消費ペースの振り返り'
      ],
      requirements: [
        'マグネット式ロールペーパーホルダー 3個',
        'キッチン用ロールペーパー 6本',
        '分別用ゴミ箱の増設'
      ],
      expectedImpact: '衛生トラブルゼロの達成および清掃負担の半減を見込みます。'
    };
  }

  if (topic.id === 'topic-event') {
    return {
      title: '秋の中庭星空シネマ 寮生親睦上映会',
      projectType: 'event',
      background: '新入寮生や多学年の交流機会を増やし、寮内のコミュニティの一体感を高めるためのリラックスイベントが求められています。',
      objective: '中庭の広場を活用して映画鑑賞会を実施し、気軽に参加できる温かい交流の場を創出します。',
      targetAudience: 'Hヴィレッジ全棟の寮生および役職者メンバー',
      actionSteps: [
        '上映作品の寮生アンケート実施',
        'プロジェクターと音響機器の動作テスト',
        '管理会社西松地所への共用部使用届の提出',
        '当日の会場設営およびゴミ回収運営'
      ],
      requirements: [
        '高輝度プロジェクター 1台',
        '屋外用大型スクリーン 1台',
        'スピーカーおよび延長コード 2組',
        '防寒用ブランケット・シート'
      ],
      expectedImpact: '約30名以上の参加による棟を越えた交友関係の深化を期待します。'
    };
  }

  if (topic.id === 'topic-facility') {
    return {
      title: 'エントランス入退室セキュリティ運用見直しプロジェクト',
      projectType: 'operation',
      background: '深夜帯のオートロック誤作動や解錠カード忘れによるトラブル対応が頻発しており、役職者の負担になっています。',
      objective: '解錠ルールの再周知と予備キー管理体制を整備し、安全でスムーズな入退室運用を確立します。',
      targetAudience: '寮生全員および夜間見回り担当役職者',
      actionSteps: [
        '過去1ヶ月のトラブル発生件数の集計',
        '予備キー持ち出し記録簿の電子化',
        '管理会社と合同でのリーダーミーティング実施',
        '寮内周知メールおよび掲示の更新'
      ],
      requirements: [
        'キーロッカー暗証番号の定期更新手順書',
        '注意喚起ステッカーの作成'
      ],
      expectedImpact: '夜間トラブル対応件数の70パーセント削減を目標とします。'
    };
  }

  // 汎用トピックからの企画書生成
  return {
    title: topic.title,
    projectType: topic.projectType,
    background: `${topic.summary}に基づき、現状の課題を解決してより良い寮生活をつくるための取り組みです。`,
    objective: `${topic.title}を計画的に実行し、寮生が安心して過ごせる仕組みを整えます。`,
    targetAudience: 'Hヴィレッジの寮生および関係メンバー',
    actionSteps: topic.keyPoints.map((point, idx) => `ステップ${idx + 1}: ${point}を具体化する`),
    requirements: [
      '実施担当メンバーの決定',
      '必要備品の手配',
      '全体告知の実施'
    ],
    expectedImpact: '寮生の満足度向上とチーム運営の円滑化に貢献します。'
  };
};
