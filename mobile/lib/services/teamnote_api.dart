import 'dart:convert';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../config/environment.dart';
import '../models/models.dart';

class TeamNoteApi {
  TeamNoteApi({SupabaseClient? client}) : _override = client;

  final SupabaseClient? _override;
  final _uuid = const Uuid();

  SupabaseClient? get _c {
    if (_override != null) return _override;
    if (!Environment.isConfigured) return null;
    return Supabase.instance.client;
  }

  String get community => Environment.communityId;

  Future<Map<String, dynamic>?> getBoard() async {
    final c = _c;
    if (c == null) return null;
    final row = await c.rpc('tn_get_board', params: {'p_community': community});
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  Future<Map<String, dynamic>?> join(String invite, MemberProfile profile) async {
    final c = _c;
    if (c == null) throw StateError('Supabase未設定');
    final row = await c.rpc('tn_join_community', params: {
      'p_invite': invite,
      'p_profile': profile.toProfileJson(),
    });
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  Future<Map<String, dynamic>?> updateProfile(MemberProfile profile) async {
    final c = _c;
    if (c == null) return null;
    final row = await c.rpc('tn_update_profile', params: {
      'p_community': community,
      'p_profile': profile.toProfileJson(),
    });
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  Future<void> postIdea(String text) async {
    final c = _c;
    if (c == null) return;
    await c.rpc('tn_post_idea', params: {
      'p_community': community,
      'p_id': _uuid.v4(),
      'p_text': text.trim(),
    });
  }

  Future<void> setLike(String ideaId, bool liked) async {
    final c = _c;
    if (c == null) return;
    await c.rpc('tn_set_like', params: {
      'p_community': community,
      'p_id': ideaId,
      'p_liked': liked,
    });
  }

  Future<List<ProjectItem>> listProjects() async {
    final c = _c;
    if (c == null) return [];
    final row = await c.rpc('tn_list_projects', params: {'p_community': community});
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> createProject(String title, String summary) async {
    final c = _c;
    if (c == null) return [];
    final row = await c.rpc('tn_create_project', params: {
      'p_community': community,
      'p_title': title,
      'p_summary': summary,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<Map<String, dynamic>>> listReports() async {
    final c = _c;
    if (c == null) return [];
    final row = await c.rpc('tn_list_reports', params: {'p_community': community});
    return _asList(row);
  }

  Future<void> saveReport({
    required String title,
    required String category,
    required String body,
    required DateTime date,
    List<Map<String, dynamic>> attachments = const [],
    double? lat,
    double? lng,
    String? locationLabel,
  }) async {
    final c = _c;
    if (c == null) return;
    await c.rpc('tn_save_report', params: {
      'p_community': community,
      'p_title': title,
      'p_category': category,
      'p_body': body,
      'p_date': date.toIso8601String().split('T').first,
      'p_attachments': jsonDecode(jsonEncode(attachments)),
      'p_lat': lat,
      'p_lng': lng,
      'p_location_label': locationLabel,
    });
  }

  Future<List<InventoryItem>> listInventory() async {
    final c = _c;
    if (c == null) return [];
    final row = await c.rpc('tn_list_inventory', params: {'p_community': community});
    return _asList(row).map(InventoryItem.fromJson).toList();
  }

  Future<List<ArchiveDoc>> listArchives() async {
    final c = _c;
    if (c == null) return [];
    final row = await c.rpc('tn_list_archives', params: {'p_community': community});
    return _asList(row).map(ArchiveDoc.fromJson).toList();
  }

  Future<String?> uploadAvatar(String localPath, String userId) async {
    final c = _c;
    if (c == null) return null;
    final bytes = await File(localPath).readAsBytes();
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';
    await c.storage.from('tn-avatars').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(upsert: true, contentType: 'image/jpeg'),
        );
    return c.storage.from('tn-avatars').getPublicUrl(path);
  }

  List<Map<String, dynamic>> _asList(dynamic row) {
    if (row is! List) return [];
    return [
      for (final e in row)
        if (e is Map) Map<String, dynamic>.from(e),
    ];
  }
}
