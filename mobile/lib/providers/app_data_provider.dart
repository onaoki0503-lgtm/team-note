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

  List<ProjectItem> get filteredProjects {
    switch (projectFilter) {
      case '参加中':
        return projects.where((p) => p.memberCount > 0).toList();
      case '自分の企画':
        return projects;
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
        if (e is Map && e['hiddenAt'] == null)
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

  /// Full 企画書 — stores complete form JSON in cloud summary.
  Future<void> createProjectFull(
    dynamic form, {
    List<AttachmentPin> attachments = const [],
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
    await createProjectFullTitle(title, summary.isEmpty ? '—' : summary, proposalJson: payload);
  }

  Future<void> createProjectFullTitle(
    String title,
    String summary, {
    Map<String, dynamic>? proposalJson,
  }) async {
    _requireCloud();
    projects = await _api.createProject(
      title,
      proposalJson != null ? 'PROPOSAL_JSON:${jsonEncode(proposalJson)}' : summary,
    );
    notifyListeners();
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
  }) async {
    _requireCloud();
    double? lat;
    double? lng;
    String? locLabel;
    final maps = <Map<String, dynamic>>[];
    for (final a in attachments) {
      maps.add(a.toJson());
      if (a.kind == AttachmentKind.location) {
        lat = a.lat;
        lng = a.lng;
        locLabel = a.label;
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
