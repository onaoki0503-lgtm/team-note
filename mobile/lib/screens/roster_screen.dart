import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../data/demo_roster.dart';
import '../forms/dorm_roles.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import 'profile_screen.dart';

/// Matches web `parseUnitNumber` — extracts 101–404 from unit strings.
String parseUnitNumber(String unitStr) {
  final m = RegExp(r'([1-4]0[1-4])').firstMatch(unitStr);
  return m?.group(1) ?? '';
}

int unitCapacity(String unitNumber) {
  if (unitNumber == '103' || unitNumber == '104') return 1;
  return 5;
}

/// 寮生名簿 — web RosterArchiveViews (部屋割り + 一覧).
class RosterScreen extends StatefulWidget {
  const RosterScreen({super.key});

  @override
  State<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends State<RosterScreen> {
  final _search = TextEditingController();

  /// `units` = 部屋割り, `list` = 一覧 (same as web `rosterTab`).
  String _rosterTab = 'units';
  String _building = 'rosemary';
  int _floor = 3;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<MemberProfile> _mergedList(AppDataProvider data, AuthProvider auth) {
    final byName = <String, MemberProfile>{};
    for (final r in DemoRoster.residents) {
      byName[r.name] = r;
    }
    // Cloud members win (real joiners / your account).
    for (final m in data.members) {
      byName[m.name.isEmpty ? m.id : m.name] = m;
    }
    // Ensure current user appears even if name differs from demo.
    final me = auth.profile;
    if (me != null) {
      byName[me.name.isEmpty ? me.id : me.name] = me;
    }
    final list = byName.values.toList()
      ..sort((a, b) {
        final bCmp = a.building.compareTo(b.building);
        if (bCmp != 0) return bCmp;
        final fCmp = a.floor.compareTo(b.floor);
        if (fCmp != 0) return fCmp;
        return a.unit.compareTo(b.unit);
      });
    return list;
  }

  void _openResident(BuildContext context, AuthProvider auth, MemberProfile r) {
    final mine = auth.profile != null &&
        (r.id == auth.profile!.id || r.name == auth.profile!.name);
    if (mine) {
      ProfileScreen.showAsSheet(context);
    } else {
      _showResident(context, r);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final auth = context.watch<AuthProvider>();
    final all = _mergedList(data, auth);
    final buildingResidents = all.where((r) => r.building == _building).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('寮生名簿')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'units', label: Text('部屋割り')),
                ButtonSegment(value: 'list', label: Text('一覧')),
              ],
              selected: {_rosterTab},
              onSelectionChanged: (s) => setState(() => _rosterTab = s.first),
              style: const ButtonStyle(
                visualDensity: VisualDensity.compact,
                textStyle: WidgetStatePropertyAll(
                  TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _building,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    items: [
                      for (final e in MemberProfile.buildings.entries)
                        DropdownMenuItem(value: e.key, child: Text(e.value)),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _building = v);
                    },
                  ),
                ),
                if (_rosterTab == 'units') ...[
                  const SizedBox(width: 8),
                  for (final fl in [1, 2, 3, 4])
                    Padding(
                      padding: const EdgeInsets.only(left: 4),
                      child: ChoiceChip(
                        label: Text('${fl}F', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        selected: _floor == fl,
                        onSelected: (_) => setState(() => _floor = fl),
                        visualDensity: VisualDensity.compact,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                ],
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => data.refreshMembers(auth),
              child: _rosterTab == 'units'
                  ? _UnitsView(
                      floor: _floor,
                      residents: buildingResidents,
                      onSelect: (r) => _openResident(context, auth, r),
                    )
                  : _ListView(
                      search: _search,
                      residents: buildingResidents,
                      auth: auth,
                      onSearchChanged: () => setState(() {}),
                      onSelect: (r) => _openResident(context, auth, r),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showResident(BuildContext context, MemberProfile r) {
    final data = context.read<AppDataProvider>();
    final history = data.projects
        .where((p) => p.ownerId == r.id || p.ownerName == r.name)
        .toList();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: TnTokens.bgMain,
      builder: (ctx) {
        final maxH = MediaQuery.sizeOf(ctx).height * 0.70;
        return SizedBox(
          width: double.infinity,
          height: maxH,
          child: _ResidentProfileSheet(resident: r, history: history),
        );
      },
    );
  }
}

/// Full-width resident sheet — mirrors web RosterArchiveViews S28 (read-only).
class _ResidentProfileSheet extends StatelessWidget {
  const _ResidentProfileSheet({required this.resident, required this.history});

  final MemberProfile resident;
  final List<ProjectItem> history;

  @override
  Widget build(BuildContext context) {
    final badge = roleBadgeInfo(resident.role);
    final roleTitle =
        dormRoles.where((role) => role.key == resident.role).map((role) => role.title).firstOrNull ??
            (resident.role.isEmpty ? '一般寮生' : resident.role);
    final roleDisplay = badge.badge.isNotEmpty ? badge.badge : roleTitle;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Text(
            'プロフィール',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        Expanded(
          child: ListView(
            padding: EdgeInsets.fromLTRB(16, 0, 16, bottom + 20),
            children: [
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: badge.isLeadership
                                    ? const Color(0xFFEA580C)
                                    : Colors.black.withValues(alpha: 0.08),
                                width: 2,
                              ),
                            ),
                            child: CircleAvatar(
                              radius: 32,
                              backgroundColor: TnTokens.bgTint,
                              backgroundImage: resident.avatarUrl != null
                                  ? NetworkImage(resident.avatarUrl!)
                                  : null,
                              child: resident.avatarUrl == null
                                  ? Text(
                                      resident.name.isNotEmpty
                                          ? resident.name.characters.first
                                          : '?',
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w700,
                                        color: TnTokens.textMuted,
                                      ),
                                    )
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Text(
                                      resident.name.isEmpty ? '寮生' : resident.name,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      roleDisplay,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: badge.isLeadership
                                            ? const Color(0xFFEA580C)
                                            : TnTokens.textMuted,
                                        letterSpacing: 0.02,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${resident.buildingLabel}棟 ${resident.unit}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: TnTokens.textMuted,
                                  ),
                                ),
                                if (resident.floor >= 1)
                                  Text(
                                    '${resident.floor}階',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: TnTokens.textMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      const Text(
                        '自己紹介',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: TnTokens.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        resident.bio.isEmpty ? '自己紹介が未設定です。' : resident.bio,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.6,
                          color: resident.bio.isEmpty ? TnTokens.textMuted : TnTokens.textMain,
                          fontStyle: resident.bio.isEmpty ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Text(
                            '役職',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: TnTokens.textMuted,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              roleTitle,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('活動履歴', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      const Text(
                        'スタッフ加入・担当の記録から自動表示',
                        style: TextStyle(fontSize: 12, color: TnTokens.textMuted),
                      ),
                      const SizedBox(height: 12),
                      if (history.isEmpty)
                        const Text(
                          'スタッフとして参加した企画はまだありません。',
                          style: TextStyle(color: TnTokens.textMuted, fontSize: 13),
                        )
                      else
                        for (final item in history)
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: TnTokens.bgTint.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                                const SizedBox(height: 6),
                                Text(
                                  '発起人 · ${item.statusLabel}',
                                  style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                ),
                                Text(
                                  '${item.memberCount}人参加',
                                  style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                ),
                              ],
                            ),
                          ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                margin: EdgeInsets.zero,
                color: TnTokens.bgTint.withValues(alpha: 0.35),
                child: const ListTile(
                  leading: Icon(Icons.visibility_off_outlined, size: 20),
                  title: Text(
                    '関係者のみ閲覧できます',
                    style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _UnitsView extends StatelessWidget {
  const _UnitsView({
    required this.floor,
    required this.residents,
    required this.onSelect,
  });

  final int floor;
  final List<MemberProfile> residents;
  final ValueChanged<MemberProfile> onSelect;

  @override
  Widget build(BuildContext context) {
    // 2×2 unit cards; height grows with occupants (same as web).
    final units = [
      for (final idx in ['1', '2', '3', '4']) '${floor}0$idx',
    ];
    Widget card(String unitNumber) => _UnitCard(
          unitNumber: unitNumber,
          occupants: residents.where((r) => parseUnitNumber(r.unit) == unitNumber).toList(),
          onSelect: onSelect,
        );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: card(units[0])),
            const SizedBox(width: 8),
            Expanded(child: card(units[1])),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: card(units[2])),
            const SizedBox(width: 8),
            Expanded(child: card(units[3])),
          ],
        ),
      ],
    );
  }
}

class _UnitCard extends StatelessWidget {
  const _UnitCard({
    required this.unitNumber,
    required this.occupants,
    required this.onSelect,
  });

  final String unitNumber;
  final List<MemberProfile> occupants;
  final ValueChanged<MemberProfile> onSelect;

  @override
  Widget build(BuildContext context) {
    final capacity = unitCapacity(unitNumber);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 12, 10, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text(
                  unitNumber,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                Text(
                  '${occupants.length} / $capacity',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: TnTokens.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (occupants.isEmpty)
              const SizedBox(height: 60)
            else
              for (var i = 0; i < occupants.length; i++) ...[
                if (i > 0) const SizedBox(height: 6),
                _OccupantChip(occupant: occupants[i], onSelect: onSelect),
              ],
          ],
        ),
      ),
    );
  }
}

class _OccupantChip extends StatelessWidget {
  const _OccupantChip({required this.occupant, required this.onSelect});

  final MemberProfile occupant;
  final ValueChanged<MemberProfile> onSelect;

  @override
  Widget build(BuildContext context) {
    final badge = roleBadgeInfo(occupant.role);
    return Material(
      color: TnTokens.bgTint,
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () => onSelect(occupant),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
          child: Row(
            children: [
              CircleAvatar(
                radius: 11,
                backgroundColor: const Color(0xFFE2E8F0),
                backgroundImage:
                    occupant.avatarUrl != null ? NetworkImage(occupant.avatarUrl!) : null,
                child: occupant.avatarUrl == null
                    ? Text(
                        occupant.name.isNotEmpty ? occupant.name.characters.first : '寮',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: TnTokens.textMuted,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  occupant.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
              if (badge.isLeadership && badge.badge.isNotEmpty)
                Text(
                  badge.badge,
                  style: const TextStyle(
                    color: Color(0xFFEA580C),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.02,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ListView extends StatelessWidget {
  const _ListView({
    required this.search,
    required this.residents,
    required this.auth,
    required this.onSearchChanged,
    required this.onSelect,
  });

  final TextEditingController search;
  final List<MemberProfile> residents;
  final AuthProvider auth;
  final VoidCallback onSearchChanged;
  final ValueChanged<MemberProfile> onSelect;

  @override
  Widget build(BuildContext context) {
    final q = search.text.trim().toLowerCase();
    var list = residents;
    if (q.isNotEmpty) {
      list = list
          .where(
            (r) =>
                r.name.toLowerCase().contains(q) ||
                r.unit.toLowerCase().contains(q) ||
                r.role.toLowerCase().contains(q) ||
                r.buildingLabel.contains(q),
          )
          .toList();
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      children: [
        TextField(
          controller: search,
          onChanged: (_) => onSearchChanged(),
          decoration: const InputDecoration(
            hintText: '氏名・部屋で検索',
            prefixIcon: Icon(Icons.search),
            isDense: true,
          ),
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            '${list.length}名',
            style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
          ),
        ),
        if (list.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 48),
            child: Center(
              child: Text('該当する寮生がいません', style: TextStyle(color: TnTokens.textMuted)),
            ),
          )
        else
          for (final r in list) ...[
            _ResidentListTile(
              resident: r,
              mine: auth.profile != null &&
                  (r.id == auth.profile!.id || r.name == auth.profile!.name),
              onTap: () => onSelect(r),
            ),
            const SizedBox(height: 8),
          ],
      ],
    );
  }
}

class _ResidentListTile extends StatelessWidget {
  const _ResidentListTile({
    required this.resident,
    required this.mine,
    required this.onTap,
  });

  final MemberProfile resident;
  final bool mine;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final badge = roleBadgeInfo(resident.role);
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: TnTokens.bgTint,
          backgroundImage: resident.avatarUrl != null ? NetworkImage(resident.avatarUrl!) : null,
          child: resident.avatarUrl == null
              ? Text(
                  resident.name.isNotEmpty ? resident.name.characters.first : '?',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                )
              : null,
        ),
        title: Row(
          children: [
            Flexible(
              child: Text(
                resident.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ),
            if (badge.isLeadership && badge.badge.isNotEmpty) ...[
              const SizedBox(width: 6),
              Text(
                badge.badge,
                style: const TextStyle(
                  color: Color(0xFFEA580C),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.02,
                ),
              ),
            ],
            if (mine) ...[
              const SizedBox(width: 6),
              const Text('自分', style: TextStyle(fontSize: 11, color: TnTokens.primary)),
            ],
          ],
        ),
        subtitle: Text(
          '${resident.building}棟 ${resident.unit}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
        ),
        trailing: const Icon(Icons.chevron_right, size: 18, color: TnTokens.textMuted),
        onTap: onTap,
      ),
    );
  }
}
