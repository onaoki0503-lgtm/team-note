import 'dart:convert';

import 'package:flutter/material.dart';

class MemberProfile {
  MemberProfile({
    required this.id,
    required this.name,
    required this.role,
    required this.building,
    required this.floor,
    required this.unit,
    this.bio = '',
    this.avatarUrl,
  });

  final String id;
  String name;
  String role;
  String building;
  int floor;
  String unit;
  String bio;
  String? avatarUrl;

  static const buildings = {
    'rosemary': 'ローズマリー',
    'basil': 'バジル',
    'turmeric': 'ターメリック',
    'paprika': 'パプリカ',
  };

  static const roles = ['一般寮生', 'HL', 'EA', 'IA', 'OA', 'FL'];

  String get buildingLabel => buildings[building] ?? building;

  String get locationLine => '$buildingLabel / $floor階 / $unit';

  /// Shape expected by `teamnote_private.validate_profile` / web SharedLogin.
  Map<String, dynamic> toProfileJson() {
    final normalized = normalizedCopy();
    return {
      'name': normalized.name,
      'role': normalized.role,
      'building': normalized.building,
      'floor': normalized.floor, // int 1–4 (same as web); SQL uses ->>
      'unit': normalized.unit,
      'bio': normalized.bio,
      if (normalized.avatarUrl != null && normalized.avatarUrl!.isNotEmpty)
        'avatar': normalized.avatarUrl,
    };
  }

  /// Fills defaults so empty optional fields never trip DB validate_profile.
  /// Name / unit / dorm details are optional in the UI.
  MemberProfile normalizedCopy({String? fallbackName}) {
    final rawName = name.trim();
    final fallback = (fallbackName ?? '').trim();
    final resolvedName = rawName.isNotEmpty
        ? rawName
        : (fallback.isNotEmpty ? fallback : '寮生');
    final roleKey = roles.contains(role.trim())
        ? role.trim()
        : roles.firstWhere(
            (r) => role.contains(r),
            orElse: () => '一般寮生',
          );
    final b = buildings.containsKey(building) ? building : 'rosemary';
    final f = floor.clamp(1, 4).toInt();
    final rawUnit = unit.trim();
    final rawBio = bio.trim();
    return MemberProfile(
      id: id,
      name: resolvedName.length > 60 ? resolvedName.substring(0, 60) : resolvedName,
      role: roleKey,
      building: b,
      floor: f,
      unit: rawUnit.isEmpty
          ? '未設定'
          : (rawUnit.length > 60 ? rawUnit.substring(0, 60) : rawUnit),
      bio: rawBio.length > 500 ? rawBio.substring(0, 500) : rawBio,
      avatarUrl: avatarUrl?.trim(),
    );
  }

  factory MemberProfile.fromJson(Map<String, dynamic> m) {
    final rawFloor = m['floor'];
    final parsedFloor = rawFloor is num
        ? rawFloor.toInt()
        : int.tryParse('${rawFloor ?? ''}') ?? 1;
    return MemberProfile(
      id: '${m['id']}',
      name: '${m['name'] ?? ''}',
      role: '${m['role'] ?? '一般寮生'}',
      building: '${m['building'] ?? 'rosemary'}',
      floor: parsedFloor.clamp(1, 4).toInt(),
      unit: '${m['unit'] ?? ''}',
      bio: '${m['bio'] ?? ''}',
      avatarUrl: m['avatar'] as String? ?? m['avatar_url'] as String?,
    );
  }

  factory MemberProfile.blank({String id = ''}) => MemberProfile(
        id: id,
        name: '',
        role: '一般寮生',
        building: 'rosemary',
        floor: 1,
        unit: '',
      );
}

class IdeaItem {
  IdeaItem({
    required this.id,
    required this.body,
    this.likes = 0,
    this.likedByMe = false,
    this.authorId = '',
    this.authorName = '',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  final String id;
  final String body;
  int likes;
  bool likedByMe;
  final String authorId;
  final String authorName;
  final DateTime createdAt;

  bool isMine(String? userId) =>
      userId != null && userId.isNotEmpty && authorId == userId;
}

/// Same rules as web `checkIdeaSentenceValidity`.
String? validateIdeaText(String raw) {
  final text = raw.trim();
  final units = text.runes.toList();
  if (units.length < 4) return '4文字以上で入力してください';
  if (units.length > 140) return '140文字以内で書いてください';
  if (units.every((u) => u == units.first)) {
    return '同じ文字の繰り返しは投稿できません';
  }
  return null;
}

/// Staff row on a project — mirrors web `ProjectMemberRecord`.
class ProjectMember {
  const ProjectMember({
    required this.residentId,
    required this.name,
    this.avatar = '',
    this.role = 'スタッフ',
    this.building = '',
    this.joinedAt = '',
    this.leftAt = '',
    this.eventRole,
    this.groupName,
  });

  final String residentId;
  final String name;
  final String avatar;
  final String role;
  final String building;
  final String joinedAt;
  final String leftAt;
  final String? eventRole;
  final String? groupName;

  factory ProjectMember.fromJson(Map<String, dynamic> m) {
    final name = '${m['name'] ?? ''}'.trim();
    final role = '${m['role'] ?? m['role_label'] ?? ''}'.trim();
    final eventRole = '${m['eventRole'] ?? ''}'.trim();
    final groupName = '${m['groupName'] ?? ''}'.trim();
    return ProjectMember(
      residentId: '${m['residentId'] ?? m['user_id'] ?? ''}',
      name: name.isEmpty ? 'メンバー' : name,
      avatar: '${m['avatar'] ?? m['avatarUrl'] ?? ''}',
      role: role.isEmpty ? 'スタッフ' : role,
      building: '${m['building'] ?? ''}',
      joinedAt: '${m['joinedAt'] ?? m['joined_at'] ?? ''}',
      leftAt: '${m['leftAt'] ?? m['left_at'] ?? ''}',
      eventRole: eventRole.isEmpty ? null : eventRole,
      groupName: groupName.isEmpty ? null : groupName,
    );
  }
}

class ProjectItem {
  const ProjectItem({
    required this.id,
    required this.title,
    required this.summary,
    required this.status,
    this.memberCount = 1,
    this.ownerName = '',
    this.ownerId = '',
    this.members = const [],
    this.pastMembers = const [],
  });

  final String id;
  final String title;
  final String summary;
  final String status;
  final int memberCount;
  final String ownerName;
  final String ownerId;
  final List<ProjectMember> members;
  final List<ProjectMember> pastMembers;

  /// Parsed from `PROPOSAL_JSON:…` summary when present.
  Map<String, dynamic>? get proposalDoc {
    if (!summary.startsWith('PROPOSAL_JSON:')) return null;
    try {
      return jsonDecode(summary.substring('PROPOSAL_JSON:'.length)) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// event | operation — mirrors web ProjectDetailView / ProjectListView.
  String get projectType {
    final doc = proposalDoc;
    if (doc != null && doc['projectType'] == 'event') return 'event';
    return 'operation';
  }

  bool get isEvent => projectType == 'event';

  Color get accentColor =>
      isEvent ? const Color(0xFFFF6B68) : const Color(0xFF12BDE8);

  String get bannerAsset => isEvent
      ? 'assets/banners/courtyard_monochrome.png'
      : 'assets/banners/commons_monochrome.png';

  String get statusLabel {
    switch (status) {
      case 'planning':
        return '企画中';
      case 'testing':
        return '試行中';
      case '進行中':
      case 'active':
        return '進行中';
      default:
        return status.isEmpty ? '進行中' : status;
    }
  }

  /// Short description for list / hero subtitle (not the raw PROPOSAL_JSON blob).
  String get descriptionPreview {
    final doc = proposalDoc;
    if (doc != null) {
      for (final key in ['objective', 'proposalOverview', 'background']) {
        final v = '${doc[key] ?? ''}'.trim();
        if (v.isNotEmpty) return v;
      }
      return '寮生同士のアイデアを形にするプロジェクトです';
    }
    final s = summary.trim();
    if (s.isEmpty || s == '—') return '寮生同士のアイデアを形にするプロジェクトです';
    return s;
  }

  factory ProjectItem.fromJson(Map<String, dynamic> m) {
    final id = '${m['id']}';
    final ownerId = '${m['ownerId'] ?? ''}';
    final ownerName = '${m['ownerName'] ?? ''}';
    final memberCount = (m['memberCount'] as num?)?.toInt() ?? 1;
    final updatedAt = '${m['updatedAt'] ?? ''}';
    final details = m['details'] is Map
        ? Map<String, dynamic>.from(m['details'] as Map)
        : <String, dynamic>{};

    ProjectMember? parseMember(dynamic e) {
      if (e is! Map) return null;
      final mem = ProjectMember.fromJson(Map<String, dynamic>.from(e));
      return mem.residentId.isEmpty ? null : mem;
    }

    final byId = <String, ProjectMember>{};
    final rawMembers = m['members'];
    if (rawMembers is List) {
      for (final e in rawMembers) {
        final mem = parseMember(e);
        if (mem != null) byId[mem.residentId] = mem;
      }
    }
    final staff = details['staffMembers'];
    if (staff is List) {
      for (final e in staff) {
        final mem = parseMember(e);
        if (mem != null) byId[mem.residentId] = mem;
      }
    }

    var members = byId.values.toList();
    // Match web `mapMembers`: synthesize owner slots when API has no rows yet.
    if (members.isEmpty) {
      final count = memberCount < 1 ? 1 : memberCount;
      final joinFallback =
          updatedAt.length >= 10 ? updatedAt.substring(0, 10) : DateTime.now().toIso8601String().substring(0, 10);
      members = [
        for (var i = 0; i < count; i++)
          ProjectMember(
            residentId: i == 0 && ownerId.isNotEmpty ? ownerId : 'member-$id-$i',
            name: i == 0 ? (ownerName.isEmpty ? 'メンバー' : ownerName) : 'メンバー${i + 1}',
            role: i == 0 ? '発起人' : 'メンバー',
            joinedAt: joinFallback,
          ),
      ];
    }

    final past = <ProjectMember>[];
    final rawPast = m['pastMembers'] ?? details['pastMembers'];
    if (rawPast is List) {
      for (final e in rawPast) {
        final mem = parseMember(e);
        if (mem != null) past.add(mem);
      }
    }

    return ProjectItem(
      id: id,
      title: '${m['title'] ?? ''}',
      summary: '${m['summary'] ?? ''}',
      status: '${m['status'] ?? '進行中'}',
      memberCount: memberCount,
      ownerName: ownerName,
      ownerId: ownerId,
      members: members,
      pastMembers: past,
    );
  }
}

class WorkReportItem {
  const WorkReportItem({
    required this.id,
    required this.title,
    required this.category,
    required this.body,
    required this.reportDate,
    this.attachments = const [],
    this.locationLabel,
  });

  final String id;
  final String title;
  final String category;
  final String body;
  final DateTime reportDate;
  final List<Map<String, dynamic>> attachments;
  final String? locationLabel;
}

class InventoryItem {
  const InventoryItem({
    required this.id,
    required this.name,
    this.location = '',
    this.assetCode = '',
    this.quantity,
    this.unit = '',
    this.status = '在庫',
    this.note = '',
  });

  final String id;
  final String name;
  final String location;
  final String assetCode;
  final num? quantity;
  final String unit;
  final String status;
  final String note;

  factory InventoryItem.fromJson(Map<String, dynamic> m) => InventoryItem(
        id: '${m['id']}',
        name: '${m['name'] ?? ''}',
        location: '${m['location'] ?? ''}',
        assetCode: '${m['assetCode'] ?? ''}',
        quantity: m['quantity'] as num?,
        unit: '${m['unit'] ?? ''}',
        status: '${m['status'] ?? '在庫'}',
        note: '${m['note'] ?? ''}',
      );
}

class ArchiveDoc {
  const ArchiveDoc({
    required this.id,
    required this.title,
    required this.category,
    this.storagePath,
    this.sizeBytes,
  });

  final String id;
  final String title;
  final String category;
  final String? storagePath;
  final int? sizeBytes;

  factory ArchiveDoc.fromJson(Map<String, dynamic> m) => ArchiveDoc(
        id: '${m['id']}',
        title: '${m['title'] ?? ''}',
        category: '${m['category'] ?? '資料'}',
        storagePath: m['storagePath'] as String?,
        sizeBytes: (m['sizeBytes'] as num?)?.toInt(),
      );
}

class AttachmentPin {
  const AttachmentPin({
    required this.kind,
    required this.label,
    this.path,
    this.lat,
    this.lng,
  });

  final AttachmentKind kind;
  final String label;
  final String? path;
  final double? lat;
  final double? lng;

  Map<String, dynamic> toJson() => {
        'kind': kind.name,
        'label': label,
        if (path != null) 'path': path,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      };
}

enum AttachmentKind { camera, file, location }
