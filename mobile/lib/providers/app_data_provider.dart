import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../services/teamnote_api.dart';
import 'auth_provider.dart';

class AppDataProvider extends ChangeNotifier {
  AppDataProvider({TeamNoteApi? api}) : _api = api ?? TeamNoteApi();

  final TeamNoteApi _api;

  List<IdeaItem> ideas = [];
  List<MemberProfile> members = [];
  List<ProjectItem> projects = [];
  List<InventoryItem> inventory = [];
  List<ArchiveDoc> archives = [];
  List<Map<String, dynamic>> reports = [];
  String projectFilter = 'すべて';
  bool loading = false;
  String? error;

  ProjectItem? projectById(String id) {
    for (final p in projects) {
      if (p.id == id) return p;
    }
    return null;
  }

  List<ProjectItem> filteredProjectsFor(String? userId) {
    switch (projectFilter) {
      case '参加中':
        if (userId == null || userId.isEmpty) return const [];
        return projects.where((p) => p.isJoinedBy(userId) || p.isOwnedBy(userId)).toList();
      case '自分の企画':
        if (userId == null || userId.isEmpty) return const [];
        return projects.where((p) => p.isOwnedBy(userId)).toList();
      default:
        return projects;
    }
  }

  Future<void> refreshAll(AuthProvider auth) async {
    if (auth.gate != AuthGate.ready) return;
    loading = true;
    error = null;
    notifyListeners();
    try {
      _requireCloud();
      await Future.wait([
        refreshIdeas(auth),
        refreshMembers(auth),
        refreshProjects(),
        refreshInventory(),
        refreshArchives(),
        refreshReports(),
      ]);
    } catch (e) {
      error = '$e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void _requireCloud() {
    if (!Environment.isConfigured || Environment.demoMode) {
      throw StateError('クラウド未接続です。ログインしてから操作してください。');
    }
  }

  Future<void> refreshIdeas(AuthProvider auth) async {
    _requireCloud();
    final board = await _api.getBoard();
    if (board == null) return;
    _applyBoardIdeas(board, auth);
    notifyListeners();
  }

  Future<void> refreshMembers(AuthProvider auth) async {
    _requireCloud();
    final board = await _api.getBoard();
    if (board == null) return;
    _applyBoardMembers(board);
    notifyListeners();
  }

  void _applyBoardMembers(Map<String, dynamic> board) {
    final raw = board['members'];
    if (raw is! List) {
      members = [];
      return;
    }
    members = [
      for (final e in raw)
        if (e is Map) MemberProfile.fromJson(Map<String, dynamic>.from(e)),
    ];
  }

  void _applyBoardIdeas(Map<String, dynamic> board, AuthProvider auth) {
    final uid = '${board['userId'] ?? auth.user?.id}';
    final raw = board['ideas'];
    if (raw is! List) {
      ideas = [];
      return;
    }
    ideas = [
      for (final e in raw)
        if (e is Map)
          IdeaItem(
            id: '${e['id']}',
            body: '${e['text'] ?? ''}',
            likes: (e['likes'] as num?)?.toInt() ?? 0,
            likedByMe: (e['likedUserIds'] is List) &&
                (e['likedUserIds'] as List).any((id) => '$id' == uid),
            authorId: '${e['authorId'] ?? ''}',
            authorName: '${e['authorName'] ?? ''}',
            createdAt: DateTime.tryParse('${e['createdAt'] ?? ''}') ?? DateTime.now(),
          ),
    ];
  }

  Future<void> postIdea(String text, AuthProvider auth) async {
    _requireCloud();
    final err = validateIdeaText(text);
    if (err != null) throw StateError(err);
    await _api.postIdea(text.trim());
    await refreshIdeas(auth);
  }

  Future<void> toggleLike(IdeaItem item, AuthProvider auth) async {
    _requireCloud();
    final next = !item.likedByMe;
    await _api.setLike(item.id, next);
    await refreshIdeas(auth);
  }

  Future<void> deleteIdea(IdeaItem item, AuthProvider auth) async {
    _requireCloud();
    await _api.deleteIdea(item.id);
    await refreshIdeas(auth);
  }

  Future<void> refreshProjects() async {
    _requireCloud();
    projects = await _api.listProjects();
    notifyListeners();
  }

  Future<void> createProject(String title, String summary) async {
    await createProjectFullTitle(title, summary);
  }

  /// Full 企画書 — stores complete form JSON in cloud summary + seeds details.
  Future<void> createProjectFull(
    dynamic form, {
    List<AttachmentPin> attachments = const [],
    AuthProvider? auth,
  }) async {
    final map = form is Map<String, dynamic> ? form : (form as dynamic).toJson() as Map<String, dynamic>;
    final title = '${map['title'] ?? ''}'.trim();
    final summary = [
      if ('${map['objective'] ?? ''}'.trim().isNotEmpty) '${map['objective']}'.trim(),
      if ('${map['proposalOverview'] ?? ''}'.trim().isNotEmpty) '${map['proposalOverview']}'.trim(),
    ].join('\n');
    final payload = {
      ...map,
      if (attachments.isNotEmpty) 'attachments': attachments.map((a) => a.toJson()).toList(),
    };
    await createProjectFullTitle(
      title,
      summary.isEmpty ? '—' : summary,
      proposalJson: payload,
      auth: auth,
    );
  }

  Future<void> createProjectFullTitle(
    String title,
    String summary, {
    Map<String, dynamic>? proposalJson,
    AuthProvider? auth,
  }) async {
    _requireCloud();
    final projectType = '${proposalJson?['projectType'] ?? 'operation'}' == 'event' ? 'event' : 'operation';
    final nextAction = projectType == 'event' ? '企画の内容を確認する' : '課題を調べる';
    final enriched = {
      ...?proposalJson,
      'projectType': projectType,
      'nextAction': nextAction,
      'category': projectType == 'event' ? 'イベント' : '施設・日常',
      if (auth?.profile?.name != null) 'ownerName': auth!.profile!.name,
    };
    projects = await _api.createProject(
      title,
      enriched.isNotEmpty ? 'PROPOSAL_JSON:${jsonEncode(enriched)}' : summary,
    );
    notifyListeners();

    // Seed workflow / proposalDoc into details (same shape as web persistCloudProject).
    ProjectItem? created;
    for (final p in projects) {
      if (p.title == title) {
        created = p;
        break;
      }
    }
    created ??= projects.isEmpty ? null : projects.first;
    if (created != null) {
      final seeded = created.copyWith(
        storedProjectType: projectType,
        nextAction: nextAction,
        category: projectType == 'event' ? 'イベント' : '施設・日常',
        description: '${enriched['objective'] ?? enriched['proposalOverview'] ?? ''}',
        workflowSteps: defaultWorkflowSteps(projectType),
        detailsProposalDoc: enriched,
        members: created.members,
      );
      try {
        projects = await _api.updateProjectDetails(created.id, seeded.detailsPayload());
        notifyListeners();
      } catch (_) {
        // Create already succeeded; details seed is best-effort.
      }
    }
  }

  Future<void> toggleJoinProject(String projectId, AuthProvider auth) async {
    _requireCloud();
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    final uid = auth.user?.id;
    if (uid == null) throw StateError('未ログインです');
    final role = auth.profile?.role.trim().isNotEmpty == true ? auth.profile!.role : 'スタッフ';
    final joined = project.isJoinedBy(uid);

    if (joined) {
      var list = await _api.leaveProject(projectId);
      ProjectItem? latest;
      for (final p in list) {
        if (p.id == projectId) {
          latest = p;
          break;
        }
      }
      if (latest != null) {
        final cleaned = latest.copyWith(
          members: latest.members.where((m) => m.residentId != uid).toList(),
        );
        list = await _api.updateProjectDetails(projectId, cleaned.detailsPayload());
      }
      projects = list;
    } else {
      projects = await _api.joinProject(projectId, role: role);
    }
    notifyListeners();
  }

  Future<void> persistProjectDetails(ProjectItem next) async {
    _requireCloud();
    projects = await _api.updateProjectDetails(next.id, next.detailsPayload());
    notifyListeners();
  }

  Future<void> addWorkflowStep(String projectId, String title, String dateRange) async {
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    final steps = [...project.effectiveWorkflowSteps];
    steps.add(WorkflowStep(
      id: 'st-${DateTime.now().millisecondsSinceEpoch}',
      step: '${steps.length + 1}',
      title: title.trim(),
      date: dateRange.trim().isEmpty ? '実施予定' : dateRange.trim(),
    ));
    await persistProjectDetails(project.copyWith(workflowSteps: steps));
  }

  Future<void> addMeetingNote(String projectId, MeetingNote note) async {
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    await persistProjectDetails(
      project.copyWith(meetingNotes: [note, ...project.meetingNotes]),
    );
  }

  Future<void> addEvaluation(String projectId, LeaderEvaluation evaluation) async {
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    await persistProjectDetails(
      project.copyWith(evaluations: [evaluation, ...project.evaluations]),
    );
  }

  Future<void> addGroup(String projectId, ProjectGroup group) async {
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    await persistProjectDetails(
      project.copyWith(groups: [...project.groups, group]),
    );
  }

  Future<void> addStaffMember(String projectId, ProjectMember member, AuthProvider auth) async {
    _requireCloud();
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    final uid = auth.user?.id;
    if (uid != null && member.residentId == uid) {
      if (!project.isJoinedBy(uid)) {
        projects = await _api.joinProject(projectId, role: member.role);
        notifyListeners();
      }
      return;
    }
    if (project.members.any((m) => m.residentId == member.residentId)) return;
    await persistProjectDetails(
      project.copyWith(members: [...project.members, member]),
    );
  }

  Future<void> updateProposalDoc(String projectId, Map<String, dynamic> doc) async {
    _requireCloud();
    final project = projectById(projectId);
    if (project == null) throw StateError('企画が見つかりません');
    final next = project.copyWith(detailsProposalDoc: doc);
    final summaryPayload = {
      'projectType': next.projectType,
      'title': '${doc['title'] ?? next.title}',
      'objective': '${doc['objective'] ?? doc['purpose'] ?? ''}',
      'proposalOverview': '${doc['proposalOverview'] ?? ''}',
      'background': '${doc['background'] ?? ''}',
      'recipient': '${doc['recipient'] ?? ''}',
      'submissionDate': '${doc['submissionDate'] ?? ''}',
      'budget': '${doc['totalBudget'] ?? doc['totalCostEstimate'] ?? ''}',
      'category': next.category,
      'ownerName': next.ownerName,
      'nextAction': next.effectiveNextAction,
    };
    projects = await _api.updateProjectSummary(
      projectId,
      'PROPOSAL_JSON:${jsonEncode(summaryPayload)}',
      status: next.status,
    );
    notifyListeners();
    final refreshed = projectById(projectId) ?? next;
    await persistProjectDetails(refreshed.copyWith(detailsProposalDoc: doc));
  }

  Future<void> refreshReports() async {
    _requireCloud();
    reports = await _api.listReports();
    notifyListeners();
  }

  Future<void> saveReport({
    required String title,
    required String category,
    required String body,
    required DateTime date,
    List<AttachmentPin> attachments = const [],
    String? locationLabel,
  }) async {
    _requireCloud();
    double? lat;
    double? lng;
    String? locLabel = locationLabel;
    final maps = <Map<String, dynamic>>[];
    for (final a in attachments) {
      if (a.kind == AttachmentKind.location) {
        lat = a.lat;
        lng = a.lng;
        locLabel ??= a.label;
        maps.add(a.toJson());
        continue;
      }

      // Upload local camera/file paths to tn-files (web parity). Keep cloud keys as-is.
      final local = a.path;
      final needsUpload = local != null &&
          local.isNotEmpty &&
          !local.startsWith('http') &&
          (local.startsWith('/') || local.startsWith('file:') || local.contains(':\\'));
      if (needsUpload) {
        try {
          final cloudPath = await _api.uploadTeamnoteFile(
            localPath: local,
            fileName: a.label,
            folder: 'reports',
          );
          maps.add(
            AttachmentPin(kind: a.kind, label: a.label, path: cloudPath).toJson(),
          );
        } catch (_) {
          throw StateError('添付のアップロードに失敗しました。通信環境を確認してもう一度保存してください。');
        }
      } else {
        maps.add(a.toJson());
      }
    }
    await _api.saveReport(
      title: title,
      category: category,
      body: body,
      date: date,
      attachments: maps,
      lat: lat,
      lng: lng,
      locationLabel: locLabel,
    );
    await refreshReports();
  }

  Future<void> refreshInventory() async {
    _requireCloud();
    inventory = await _api.listInventory();
    notifyListeners();
  }

  Future<void> refreshArchives() async {
    _requireCloud();
    archives = await _api.listArchives();
    notifyListeners();
  }

  void setProjectFilter(String value) {
    projectFilter = value;
    notifyListeners();
  }
}
