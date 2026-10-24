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

  Map<String, dynamic> toJson() => {
        'residentId': residentId,
        'name': name,
        'avatar': avatar,
        'role': role,
        'building': building,
        'joinedAt': joinedAt,
        if (leftAt.isNotEmpty) 'leftAt': leftAt,
        if (eventRole != null) 'eventRole': eventRole,
        if (groupName != null) 'groupName': groupName,
      };

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

class WorkflowStep {
  const WorkflowStep({
    required this.id,
    required this.step,
    required this.title,
    this.date = '',
    this.active = false,
    this.done = false,
  });

  final String id;
  final String step;
  final String title;
  final String date;
  final bool active;
  final bool done;

  Map<String, dynamic> toJson() => {
        'id': id,
        'step': step,
        'title': title,
        'date': date,
        'active': active,
        'done': done,
      };

  factory WorkflowStep.fromJson(Map<String, dynamic> m) => WorkflowStep(
        id: '${m['id'] ?? ''}',
        step: '${m['step'] ?? ''}',
        title: '${m['title'] ?? ''}',
        date: '${m['date'] ?? ''}',
        active: m['active'] == true,
        done: m['done'] == true,
      );
}

class MeetingNote {
  const MeetingNote({
    this.id = '',
    required this.title,
    required this.date,
    this.attendees = '',
    this.summary = '',
    this.decisions = const [],
    this.nextTodos = const [],
  });

  final String id;
  final String title;
  final String date;
  final String attendees;
  final String summary;
  final List<String> decisions;
  final List<String> nextTodos;

  Map<String, dynamic> toJson() => {
        if (id.isNotEmpty) 'id': id,
        'title': title,
        'date': date,
        'attendees': attendees,
        'summary': summary,
        'decisions': decisions,
        'nextTodos': nextTodos,
      };

  factory MeetingNote.fromJson(Map<String, dynamic> m) {
    List<String> asStringList(dynamic v) {
      if (v is List) return [for (final e in v) '$e'];
      if (v is String && v.trim().isNotEmpty) {
        return v.split(RegExp(r'[,、\n]')).map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
      }
      return const [];
    }

    final attendeesRaw = m['attendees'];
    final attendees = attendeesRaw is List
        ? attendeesRaw.map((e) => '$e').join(' ')
        : '${attendeesRaw ?? ''}';

    return MeetingNote(
      id: '${m['id'] ?? ''}',
      title: '${m['title'] ?? ''}',
      date: '${m['date'] ?? ''}',
      attendees: attendees,
      summary: '${m['summary'] ?? ''}',
      decisions: asStringList(m['decisions']),
      nextTodos: asStringList(m['nextTodos']),
    );
  }
}

class LeaderEvaluation {
  const LeaderEvaluation({
    this.id = '',
    this.targetName = '',
    this.authorName = '',
    this.facilitation = 0,
    this.communication = 0,
    this.safety = 0,
    this.budget = 0,
    this.verdict = '未評価',
    this.good = '',
    this.bad = '',
    this.createdAt = '',
  });

  final String id;
  final String targetName;
  final String authorName;
  final int facilitation;
  final int communication;
  final int safety;
  final int budget;
  final String verdict;
  final String good;
  final String bad;
  final String createdAt;

  Map<String, dynamic> toJson() => {
        if (id.isNotEmpty) 'id': id,
        'targetName': targetName,
        'authorName': authorName,
        'facilitation': facilitation,
        'communication': communication,
        'safety': safety,
        'budget': budget,
        'verdict': verdict,
        'good': good,
        'bad': bad,
        'createdAt': createdAt,
      };

  factory LeaderEvaluation.fromJson(Map<String, dynamic> m) => LeaderEvaluation(
        id: '${m['id'] ?? ''}',
        targetName: '${m['targetName'] ?? m['target'] ?? ''}',
        authorName: '${m['authorName'] ?? m['author'] ?? ''}',
        facilitation: (m['facilitation'] as num?)?.toInt() ?? (m['scoreFacilitation'] as num?)?.toInt() ?? 0,
        communication: (m['communication'] as num?)?.toInt() ?? (m['scoreCommunication'] as num?)?.toInt() ?? 0,
        safety: (m['safety'] as num?)?.toInt() ?? (m['scoreSafety'] as num?)?.toInt() ?? 0,
        budget: (m['budget'] as num?)?.toInt() ?? (m['scoreBudget'] as num?)?.toInt() ?? 0,
        verdict: '${m['verdict'] ?? '未評価'}',
        good: '${m['good'] ?? m['goodPoints'] ?? ''}',
        bad: '${m['bad'] ?? m['improvePoints'] ?? ''}',
        createdAt: '${m['createdAt'] ?? ''}',
      );
}

class ProjectGroup {
  const ProjectGroup({
    required this.id,
    required this.name,
    this.glName = '',
    this.milestoneTitle = '',
    this.milestoneDeadline = '',
  });

  final String id;
  final String name;
  final String glName;
  final String milestoneTitle;
  final String milestoneDeadline;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'glName': glName,
        'milestoneTitle': milestoneTitle,
        if (milestoneDeadline.isNotEmpty) 'milestoneDeadline': milestoneDeadline,
      };

  factory ProjectGroup.fromJson(Map<String, dynamic> m) => ProjectGroup(
        id: '${m['id'] ?? ''}',
        name: '${m['name'] ?? ''}',
        glName: '${m['glName'] ?? ''}',
        milestoneTitle: '${m['milestoneTitle'] ?? ''}',
        milestoneDeadline: '${m['milestoneDeadline'] ?? ''}',
      );
}

List<WorkflowStep> defaultWorkflowSteps(String projectType) {
  if (projectType == 'event') {
    return const [
      WorkflowStep(id: 'ev-1', step: '1', title: 'アイデア', date: 'やりたいことを考える', active: true),
      WorkflowStep(id: 'ev-2', step: '2', title: '企画確認', date: '企画の内容を確認する'),
      WorkflowStep(id: 'ev-3', step: '3', title: '準備', date: '会場や必要なものを準備する'),
      WorkflowStep(id: 'ev-4', step: '4', title: '当日', date: 'イベントを実施する'),
      WorkflowStep(id: 'ev-5', step: '5', title: '振り返り', date: '良かったことをまとめる'),
    ];
  }
  return const [
    WorkflowStep(id: 'op-1', step: '1', title: '課題を調べる', date: '現状を知り、課題を整理する', active: true),
    WorkflowStep(id: 'op-2', step: '2', title: '試す', date: '小さく試してみる'),
    WorkflowStep(id: 'op-3', step: '3', title: '運用を決める', date: 'みんなでルールをつくる'),
    WorkflowStep(id: 'op-4', step: '4', title: '続ける', date: '継続して運用する'),
  ];
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
    this.category = '',
    this.nextAction = '',
    this.description = '',
    this.progress = 40,
    this.storedProjectType,
    this.workflowSteps = const [],
    this.meetingNotes = const [],
    this.evaluations = const [],
    this.groups = const [],
    this.detailsProposalDoc,
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
  final String category;
  final String nextAction;
  final String description;
  final int progress;
  final String? storedProjectType;
  final List<WorkflowStep> workflowSteps;
  final List<MeetingNote> meetingNotes;
  final List<LeaderEvaluation> evaluations;
  final List<ProjectGroup> groups;
  final Map<String, dynamic>? detailsProposalDoc;

  /// Parsed from `PROPOSAL_JSON:…` summary when present.
  Map<String, dynamic>? get summaryProposalDoc {
    if (!summary.startsWith('PROPOSAL_JSON:')) return null;
    try {
      return jsonDecode(summary.substring('PROPOSAL_JSON:'.length)) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Prefer details.proposalDoc (editable), else PROPOSAL_JSON summary.
  Map<String, dynamic>? get proposalDoc => detailsProposalDoc ?? summaryProposalDoc;

  /// event | operation — mirrors web ProjectDetailView / ProjectListView.
  String get projectType {
    if (storedProjectType == 'event' || storedProjectType == 'operation') {
      return storedProjectType!;
    }
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

  bool isJoinedBy(String? userId) {
    if (userId == null || userId.isEmpty) return false;
    return members.any((m) => m.residentId == userId);
  }

  bool isOwnedBy(String? userId) {
    if (userId == null || userId.isEmpty) return false;
    return ownerId == userId;
  }

  List<WorkflowStep> get effectiveWorkflowSteps =>
      workflowSteps.isNotEmpty ? workflowSteps : defaultWorkflowSteps(projectType);

  String get effectiveNextAction {
    if (nextAction.trim().isNotEmpty) return nextAction.trim();
    final doc = proposalDoc;
    final fromDoc = '${doc?['nextAction'] ?? ''}'.trim();
    if (fromDoc.isNotEmpty) return fromDoc;
    return isEvent ? '会場の確認をする' : '試行結果を記録';
  }

  /// Short description for list / hero subtitle (not the raw PROPOSAL_JSON blob).
  String get descriptionPreview {
    if (description.trim().isNotEmpty) return description.trim();
    final doc = proposalDoc;
    if (doc != null) {
      for (final key in ['objective', 'proposalOverview', 'background']) {
        final v = '${doc[key] ?? ''}'.trim();
        if (v.isNotEmpty) return v;
      }
      return '寮生同士のアイデアを形にするプロジェクトです';
    }
    final s = summary.trim();
    if (s.isEmpty || s == '—' || s.startsWith('PROPOSAL_JSON:')) {
      return '寮生同士のアイデアを形にするプロジェクトです';
    }
    return s;
  }

  /// Payload for `tn_update_project_details` — mirrors web `projectDetailsPayload`.
  Map<String, dynamic> detailsPayload() => {
        'projectType': projectType,
        'category': category.isNotEmpty
            ? category
            : (isEvent ? 'イベント' : '施設・日常'),
        'nextAction': effectiveNextAction,
        'description': descriptionPreview == '寮生同士のアイデアを形にするプロジェクトです'
            ? description
            : descriptionPreview,
        'progress': progress,
        'workflowSteps': effectiveWorkflowSteps.map((s) => s.toJson()).toList(),
        'meetingNotes': meetingNotes.map((n) => n.toJson()).toList(),
        'evaluations': evaluations.map((e) => e.toJson()).toList(),
        'groups': groups.map((g) => g.toJson()).toList(),
        'proposalDoc': proposalDoc,
        'staffMembers': members.map((m) => m.toJson()).toList(),
      };

  ProjectItem copyWith({
    String? title,
    String? summary,
    String? status,
    int? memberCount,
    String? ownerName,
    String? ownerId,
    List<ProjectMember>? members,
    List<ProjectMember>? pastMembers,
    String? category,
    String? nextAction,
    String? description,
    int? progress,
    String? storedProjectType,
    List<WorkflowStep>? workflowSteps,
    List<MeetingNote>? meetingNotes,
    List<LeaderEvaluation>? evaluations,
    List<ProjectGroup>? groups,
    Map<String, dynamic>? detailsProposalDoc,
    bool clearDetailsProposal = false,
  }) {
    return ProjectItem(
      id: id,
      title: title ?? this.title,
      summary: summary ?? this.summary,
      status: status ?? this.status,
      memberCount: memberCount ?? this.memberCount,
      ownerName: ownerName ?? this.ownerName,
      ownerId: ownerId ?? this.ownerId,
      members: members ?? this.members,
      pastMembers: pastMembers ?? this.pastMembers,
      category: category ?? this.category,
      nextAction: nextAction ?? this.nextAction,
      description: description ?? this.description,
      progress: progress ?? this.progress,
      storedProjectType: storedProjectType ?? this.storedProjectType,
      workflowSteps: workflowSteps ?? this.workflowSteps,
      meetingNotes: meetingNotes ?? this.meetingNotes,
      evaluations: evaluations ?? this.evaluations,
      groups: groups ?? this.groups,
      detailsProposalDoc:
          clearDetailsProposal ? null : (detailsProposalDoc ?? this.detailsProposalDoc),
    );
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

    List<T> parseList<T>(dynamic raw, T Function(Map<String, dynamic>) map) {
      if (raw is! List) return const [];
      return [
        for (final e in raw)
          if (e is Map) map(Map<String, dynamic>.from(e)),
      ];
    }

    final summary = '${m['summary'] ?? ''}';
    Map<String, dynamic>? summaryDoc;
    if (summary.startsWith('PROPOSAL_JSON:')) {
      try {
        summaryDoc = jsonDecode(summary.substring('PROPOSAL_JSON:'.length)) as Map<String, dynamic>;
      } catch (_) {}
    }

    final detailsProposal = details['proposalDoc'] is Map
        ? Map<String, dynamic>.from(details['proposalDoc'] as Map)
        : null;

    final storedType = '${details['projectType'] ?? summaryDoc?['projectType'] ?? ''}';
    final nextFromDetails = '${details['nextAction'] ?? ''}'.trim();
    final nextFromDoc = '${summaryDoc?['nextAction'] ?? ''}'.trim();
    final descFromDetails = '${details['description'] ?? ''}'.trim();

    return ProjectItem(
      id: id,
      title: '${m['title'] ?? ''}',
      summary: summary,
      status: '${m['status'] ?? '進行中'}',
      memberCount: memberCount,
      ownerName: ownerName,
      ownerId: ownerId,
      members: members,
      pastMembers: past,
      category: '${details['category'] ?? summaryDoc?['category'] ?? ''}',
      nextAction: nextFromDetails.isNotEmpty ? nextFromDetails : nextFromDoc,
      description: descFromDetails,
      progress: (details['progress'] as num?)?.toInt() ??
          ('${m['status']}' == '完了' ? 100 : 40),
      storedProjectType: storedType == 'event' || storedType == 'operation' ? storedType : null,
      workflowSteps: parseList(details['workflowSteps'], WorkflowStep.fromJson),
      meetingNotes: parseList(details['meetingNotes'], MeetingNote.fromJson),
      evaluations: parseList(details['evaluations'], LeaderEvaluation.fromJson),
      groups: parseList(details['groups'], ProjectGroup.fromJson),
      detailsProposalDoc: detailsProposal,
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
