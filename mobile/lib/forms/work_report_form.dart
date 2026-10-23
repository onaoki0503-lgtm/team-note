// Mirrors web work report activity types — do not strip.

class ActivityType {
  const ActivityType({
    required this.key,
    required this.label,
    required this.hint,
    required this.bodyLabel,
    required this.bodyHint,
  });

  final String key;
  final String label;
  final String hint;
  final String bodyLabel;
  final String bodyHint;
}

const activityTypes = <ActivityType>[
  ActivityType(
    key: 'inherent',
    label: '役職固有業務',
    hint: '固有: 自身の役職のメイン業務',
    bodyLabel: '起こしたアクションと結果',
    bodyHint: 'いつ・どこで・何をした・結果・申し送り',
  ),
  ActivityType(
    key: 'cooperation',
    label: '役職連携業務',
    hint: '連携: 他役職へのサポートや協力業務',
    bodyLabel: '起こしたアクションと結果',
    bodyHint: 'いつ・どこで・何をした・結果・申し送り',
  ),
  ActivityType(
    key: 'common',
    label: '役職共通業務',
    hint: '共通: 全体会議などの共通業務',
    bodyLabel: '起こしたアクションと結果',
    bodyHint: 'いつ・どこで・何をした・結果・申し送り',
  ),
  ActivityType(
    key: 'trouble',
    label: 'トラブル対応',
    hint: 'トラブル: 発生トラブルの経緯や一次対応',
    bodyLabel: '報告内容',
    bodyHint: 'トラブルの経緯・対応・結果',
  ),
  ActivityType(
    key: 'unit_entry',
    label: 'ユニット立ち入り',
    hint: '立ち入り: 予備キー使用によるユニット立ち入り記録',
    bodyLabel: '立ち入り詳細・結果',
    bodyHint: '立ち入り時の状況・対応・結果',
  ),
];

ActivityType activityByKey(String key) =>
    activityTypes.firstWhere((e) => e.key == key, orElse: () => activityTypes.first);
