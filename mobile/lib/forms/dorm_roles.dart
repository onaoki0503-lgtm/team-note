// Mirrors web `DORM_ROLES_CONFIG` — do not strip.

class DormRole {
  const DormRole({
    required this.key,
    required this.title,
    required this.badgeLabel,
    required this.isLeadership,
    required this.description,
  });

  final String key;
  final String title;
  final String badgeLabel;
  final bool isLeadership;
  final String description;
}

const dormRoles = <DormRole>[
  DormRole(key: 'HL', title: 'HL ハウスリーダー', badgeLabel: 'HL', isLeadership: true, description: '棟全体の統括代表'),
  DormRole(key: 'EA', title: 'EA ハウスサブリーダー', badgeLabel: 'EA HSL', isLeadership: true, description: 'イベント・対外企画担当 HSL'),
  DormRole(key: 'IA', title: 'IA ハウスサブリーダー', badgeLabel: 'IA HSL', isLeadership: true, description: '内部運営・総務担当 HSL'),
  DormRole(key: 'OA', title: 'OA ハウスサブリーダー', badgeLabel: 'OA HSL', isLeadership: true, description: '広報・運営管理担当 HSL'),
  DormRole(key: 'FL', title: 'FL フロアリーダー', badgeLabel: 'FL', isLeadership: true, description: '各階フロアの責任者'),
  DormRole(key: '一般寮生', title: '一般寮生', badgeLabel: '', isLeadership: false, description: '一般入居寮生'),
];

({String badge, bool isLeadership}) roleBadgeInfo(String? roleStr) {
  if (roleStr == null || roleStr.trim().isEmpty) return (badge: '', isLeadership: false);
  final clean = roleStr.trim();
  for (final r in dormRoles) {
    if (clean == r.key || clean.contains(r.key) || clean == r.title) {
      return (badge: r.badgeLabel, isLeadership: r.isLeadership);
    }
  }
  if (clean.contains('ハウスリーダー')) return (badge: 'HL', isLeadership: true);
  if (clean.contains('フロアリーダー')) return (badge: 'FL', isLeadership: true);
  return (badge: '', isLeadership: false);
}
