import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../data/demo_roster.dart';
import '../forms/dorm_roles.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

/// 寮生名簿 — web RosterArchiveViews list (not personal profile).
class RosterScreen extends StatefulWidget {
  const RosterScreen({super.key});

  @override
  State<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends State<RosterScreen> {
  final _search = TextEditingController();
  String _building = 'すべて';

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

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final auth = context.watch<AuthProvider>();
    final q = _search.text.trim().toLowerCase();
    var list = _mergedList(data, auth);
    if (_building != 'すべて') {
      list = list.where((r) => r.building == _building).toList();
    }
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

    return Scaffold(
      appBar: AppBar(title: const Text('寮生名簿')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: '氏名・部屋で検索',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Row(
              children: [
                for (final e in [
                  ('すべて', 'すべて'),
                  ...MemberProfile.buildings.entries.map((x) => (x.key, x.value)),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(e.$2, style: const TextStyle(fontSize: 12)),
                      selected: _building == e.$1,
                      onSelected: (_) => setState(() => _building = e.$1),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${list.length}名',
                style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => data.refreshMembers(auth),
              child: list.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 80),
                        Center(child: Text('該当当する寮生がいません', style: TextStyle(color: TnTokens.textMuted))),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 6),
                      itemBuilder: (context, i) {
                        final r = list[i];
                        final mine = auth.profile != null &&
                            (r.id == auth.profile!.id || r.name == auth.profile!.name);
                        final badge = roleBadgeInfo(r.role);
                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: TnTokens.bgTint,
                              backgroundImage:
                                  r.avatarUrl != null ? NetworkImage(r.avatarUrl!) : null,
                              child: r.avatarUrl == null
                                  ? Text(
                                      r.name.isNotEmpty ? r.name.characters.first : '?',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    )
                                  : null,
                            ),
                            title: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    r.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ),
                                if (badge.badge.isNotEmpty) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: TnTokens.bgTint,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      badge.badge,
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
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
                              '${r.buildingLabel} / ${r.floor}階 / ${r.unit}'
                              '${r.role.isNotEmpty ? ' · ${r.role}' : ''}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              if (mine) {
                                context.push('/profile');
                              } else {
                                _showResident(context, r);
                              }
                            },
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _showResident(BuildContext context, MemberProfile r) {
    final badge = roleBadgeInfo(r.role);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.paddingOf(ctx).bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: TnTokens.bgTint,
                backgroundImage: r.avatarUrl != null ? NetworkImage(r.avatarUrl!) : null,
                child: r.avatarUrl == null
                    ? Text(r.name.characters.first, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700))
                    : null,
              ),
              const SizedBox(height: 12),
              Text(r.name, style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              if (badge.badge.isNotEmpty || r.role.isNotEmpty)
                Text(
                  badge.badge.isNotEmpty ? '${badge.badge} · ${r.role}' : r.role,
                  style: const TextStyle(color: TnTokens.textMuted),
                ),
              const SizedBox(height: 8),
              Text(r.locationLine, textAlign: TextAlign.center),
              if (r.bio.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(r.bio, textAlign: TextAlign.center, style: const TextStyle(height: 1.4)),
              ],
            ],
          ),
        );
      },
    );
  }
}
