import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../services/teamnote_api.dart';
import 'auth_provider.dart';

class AppDataProvider extends ChangeNotifier {
  AppDataProvider({TeamNoteApi? api}) : _api = api ?? TeamNoteApi();

  final TeamNoteApi _api;
  final _uuid = const Uuid();

  List<IdeaItem> ideas = [];
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
      if (Environment.demoMode) {
        _seedDemo();
      } else {
        await Future.wait([
          refreshIdeas(auth),
          refreshProjects(),
          refreshInventory(),
          refreshArchives(),
          refreshReports(),
        ]);
      }
    } catch (e) {
      error = '$e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refreshIdeas(AuthProvider auth) async {
    if (Environment.demoMode) return;
    final board = await _api.getBoard();
    if (board == null) return;
    final uid = '${board['userId'] ?? auth.user?.id}';
    final raw = board['ideas'];
    if (raw is! List) {
      ideas = [];
      notifyListeners();
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
            authorName: '${e['authorName'] ?? ''}',
            createdAt: DateTime.tryParse('${e['createdAt'] ?? ''}') ?? DateTime.now(),
          ),
    ];
    notifyListeners();
  }

  Future<void> postIdea(String text, AuthProvider auth) async {
    if (Environment.demoMode) {
      ideas = [
        IdeaItem(id: _uuid.v4(), body: text.trim()),
        ...ideas,
      ].take(12).toList();
      notifyListeners();
      return;
    }
    await _api.postIdea(text);
    await refreshIdeas(auth);
  }

  Future<void> toggleLike(IdeaItem item, AuthProvider auth) async {
    final next = !item.likedByMe;
    if (Environment.demoMode) {
      item.likedByMe = next;
      item.likes += next ? 1 : -1;
      if (item.likes < 0) item.likes = 0;
      notifyListeners();
      return;
    }
    await _api.setLike(item.id, next);
    await refreshIdeas(auth);
  }

  Future<void> refreshProjects() async {
    if (Environment.demoMode) return;
    projects = await _api.listProjects();
    notifyListeners();
  }

  Future<void> createProject(String title, String summary) async {
    if (Environment.demoMode) {
      projects = [
        ProjectItem(
          id: _uuid.v4(),
          title: title,
          summary: summary,
          status: '進行中',
          ownerName: '自分',
        ),
        ...projects,
      ];
      notifyListeners();
      return;
    }
    projects = await _api.createProject(title, summary);
    notifyListeners();
  }

  Future<void> refreshReports() async {
    if (Environment.demoMode) return;
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
    if (Environment.demoMode) {
      reports = [
        {
          'id': _uuid.v4(),
          'title': title,
          'category': category,
          'body': body,
          'reportDate': date.toIso8601String(),
        },
        ...reports,
      ];
      notifyListeners();
      return;
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
    if (Environment.demoMode) return;
    inventory = await _api.listInventory();
    notifyListeners();
  }

  Future<void> refreshArchives() async {
    if (Environment.demoMode) return;
    archives = await _api.listArchives();
    notifyListeners();
  }

  void setProjectFilter(String value) {
    projectFilter = value;
    notifyListeners();
  }

  void _seedDemo() {
    if (projects.isEmpty) {
      projects = const [
        ProjectItem(
          id: '1',
          title: '共有キッチン 布巾の衛生改善',
          summary: '布巾の運用ルールと交換頻度を見直す',
          status: '進行中',
          memberCount: 3,
          ownerName: '岡本 直樹',
        ),
      ];
    }
  }
}
