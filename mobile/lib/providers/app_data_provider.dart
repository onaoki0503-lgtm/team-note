import 'package:flutter/foundation.dart';

import '../models/models.dart';
import '../services/ideas_service.dart';

class AppDataProvider extends ChangeNotifier {
  AppDataProvider({IdeasService? ideas}) : _ideas = ideas ?? IdeasService();

  final IdeasService _ideas;
  List<IdeaItem> ideas = [];
  List<ProjectItem> projects = _seedProjects;
  bool loadingIdeas = false;
  String? ideasError;
  String projectFilter = 'すべて';

  static final _seedProjects = [
    ProjectItem(
      id: '1',
      title: '共有キッチン 布巾の衛生改善',
      summary: '布巾の運用ルールと交換頻度を見直す',
      status: '進行中',
      memberCount: 3,
      ownerName: '岡本 直樹',
    ),
    ProjectItem(
      id: '2',
      title: 'エントランスオートロック共通化',
      summary: '4棟の入館手順を揃える',
      status: '進行中',
      memberCount: 5,
      ownerName: '岡本 直樹',
    ),
  ];

  List<ProjectItem> get filteredProjects {
    switch (projectFilter) {
      case '参加中':
        return projects.where((p) => p.memberCount > 0).toList();
      case '自分の企画':
        return projects.where((p) => p.ownerName.isNotEmpty).toList();
      default:
        return projects;
    }
  }

  Future<void> loadIdeas() async {
    loadingIdeas = true;
    ideasError = null;
    notifyListeners();
    try {
      ideas = await _ideas.list();
    } catch (e) {
      ideasError = '$e';
    } finally {
      loadingIdeas = false;
      notifyListeners();
    }
  }

  Future<void> postIdea(String body) async {
    final item = await _ideas.post(body);
    ideas = [item, ...ideas.where((i) => i.id != item.id)].take(12).toList();
    notifyListeners();
  }

  Future<void> toggleLike(IdeaItem item) async {
    await _ideas.toggleLike(item);
    notifyListeners();
  }

  void setProjectFilter(String value) {
    projectFilter = value;
    notifyListeners();
  }

  void addProject(ProjectItem item) {
    projects = [item, ...projects];
    notifyListeners();
  }
}
