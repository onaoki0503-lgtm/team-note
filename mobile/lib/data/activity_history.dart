import '../models/models.dart';

/// Read-only activity row — mirrors web `getActivityHistory` in `src/lib/activityHistory.ts`.
class ActivityHistoryItem {
  const ActivityHistoryItem({
    required this.id,
    required this.projectTitle,
    required this.role,
    required this.period,
    required this.status,
    required this.sortDate,
    this.groupName,
  });

  final String id;
  final String projectTitle;
  final String role;
  final String? groupName;
  final String period;
  final String status;
  final String sortDate;
}

/// Staff join/leave projection from project membership — never from a manual profile field.
List<ActivityHistoryItem> getActivityHistory(
  List<ProjectItem> projects,
  String residentId,
) {
  if (residentId.isEmpty) return const [];

  String sliceDate(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return '';
    return t.length >= 10 ? t.substring(0, 10) : t;
  }

  final items = <ActivityHistoryItem>[];
  for (final project in projects) {
    final active = project.members
        .where((m) => m.residentId == residentId)
        .map((m) => ProjectMember(
              residentId: m.residentId,
              name: m.name,
              avatar: m.avatar,
              role: m.role,
              building: m.building,
              joinedAt: m.joinedAt,
              leftAt: '',
              eventRole: m.eventRole,
              groupName: m.groupName,
            ));
    final past = project.pastMembers.where((m) => m.residentId == residentId);
    for (final member in [...active, ...past]) {
      final joined = sliceDate(member.joinedAt);
      final left = sliceDate(member.leftAt);
      final role = (member.eventRole != null && member.eventRole!.isNotEmpty)
          ? member.eventRole!
          : 'スタッフ';
      items.add(
        ActivityHistoryItem(
          id: '${project.id}:$residentId:${member.joinedAt}:${member.leftAt}',
          projectTitle: project.title,
          role: role,
          groupName: member.groupName,
          period: '${joined.isEmpty ? '加入日未記録' : joined} 〜 ${left.isEmpty ? '' : left}',
          status: left.isNotEmpty
              ? '参加終了'
              : (project.status == '完了' ? '完了' : '参加中'),
          sortDate: member.joinedAt,
        ),
      );
    }
  }

  items.sort((a, b) {
    final d = b.sortDate.compareTo(a.sortDate);
    if (d != 0) return d;
    return a.id.compareTo(b.id);
  });
  return items;
}
