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

  Future<void> submitMonthlyReport(String month, String body) async {
    final c = _requireClient();
    final result = await c.rpc('tn_submit_monthly_report', params: {
      'p_community': community,
      'p_month': '$month-01',
      'p_body': body,
    });
    if (result is! Map || result['id'] is! String || result['month'] != month || result['submittedAt'] is! String) {
      throw StateError('月次報告書の提出結果を確認できませんでした');
    }
  }

  Future<Map<String, dynamic>?> getBoard() async {
    final c = _requireClient();
    final row = await c.rpc('tn_get_board', params: {'p_community': community});
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  Future<Map<String, dynamic>?> join(String invite, MemberProfile profile) async {
    final c = _requireClient();
    final row = await c.rpc('tn_join_community', params: {
      'p_invite': invite,
      'p_profile': profile.toProfileJson(),
    });
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  Future<Map<String, dynamic>?> updateProfile(MemberProfile profile) async {
    final c = _requireClient();
    final row = await c.rpc('tn_update_profile', params: {
      'p_community': community,
      'p_profile': profile.toProfileJson(),
    });
    if (row is Map) return Map<String, dynamic>.from(row);
    return null;
  }

  SupabaseClient _requireClient() {
    final c = _c;
    if (c == null) throw StateError('Supabase未設定');
    return c;
  }

  Future<void> postIdea(String text) async {
    final c = _requireClient();
    await c.rpc('tn_post_idea', params: {
      'p_community': community,
      'p_id': _uuid.v4(),
      'p_text': text.trim(),
    });
  }

  Future<void> setLike(String ideaId, bool liked) async {
    final c = _requireClient();
    await c.rpc('tn_set_like', params: {
      'p_community': community,
      'p_id': ideaId,
      'p_liked': liked,
    });
  }

  Future<void> deleteIdea(String ideaId) async {
    final c = _requireClient();
    await c.rpc('tn_delete_idea', params: {
      'p_community': community,
      'p_id': ideaId,
    });
  }

  Future<List<ProjectItem>> listProjects() async {
    final c = _requireClient();
    final row = await c.rpc('tn_list_projects', params: {'p_community': community});
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> createProject(String title, String summary) async {
    final c = _requireClient();
    final row = await c.rpc('tn_create_project', params: {
      'p_community': community,
      'p_title': title,
      'p_summary': summary,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> updateProjectDetails(
    String projectId,
    Map<String, dynamic> details,
  ) async {
    final c = _requireClient();
    final row = await c.rpc('tn_update_project_details', params: {
      'p_community': community,
      'p_id': projectId,
      'p_details': details,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> updateProjectSummary(
    String projectId,
    String summary, {
    String? status,
  }) async {
    final c = _requireClient();
    final row = await c.rpc('tn_update_project_summary', params: {
      'p_community': community,
      'p_id': projectId,
      'p_summary': summary,
      'p_status': status,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> joinProject(String projectId, {String role = 'スタッフ'}) async {
    final c = _requireClient();
    final row = await c.rpc('tn_join_project', params: {
      'p_community': community,
      'p_id': projectId,
      'p_role': role,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<ProjectItem>> leaveProject(String projectId) async {
    final c = _requireClient();
    final row = await c.rpc('tn_leave_project', params: {
      'p_community': community,
      'p_id': projectId,
    });
    return _asList(row).map(ProjectItem.fromJson).toList();
  }

  Future<List<Map<String, dynamic>>> listReports() async {
    final c = _requireClient();
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
    final c = _requireClient();
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
    final c = _requireClient();
    final row = await c.rpc('tn_list_inventory', params: {'p_community': community});
    return _asList(row).map(InventoryItem.fromJson).toList();
  }

  Future<List<ArchiveDoc>> listArchives() async {
    final c = _requireClient();
    final row = await c.rpc('tn_list_archives', params: {'p_community': community});
    return _asList(row).map(ArchiveDoc.fromJson).toList();
  }

  Future<String?> uploadAvatar(String localPath, String userId) async {
    final c = _requireClient();
    final bytes = await File(localPath).readAsBytes();
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';
    await c.storage.from('tn-avatars').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(upsert: true, contentType: 'image/jpeg'),
        );
    return c.storage.from('tn-avatars').getPublicUrl(path);
  }

  /// Upload a local photo/file into `tn-files` (same layout as web).
  /// Returns the storage path (not a public URL).
  Future<String> uploadTeamnoteFile({
    required String localPath,
    required String fileName,
    String folder = 'reports',
  }) async {
    final c = _requireClient();
    final file = File(localPath);
    if (!await file.exists()) {
      throw StateError('添付ファイルが見つかりません。');
    }
    final bytes = await file.readAsBytes();
    final safe = fileName
        .replaceAll(RegExp(r'[^\w.\-]+'), '_')
        .replaceAll(RegExp(r'_+'), '_')
        .trim();
    final clipped = (safe.isEmpty ? 'file' : safe);
    final name = clipped.length > 80 ? clipped.substring(0, 80) : clipped;
    final path = '$community/$folder/${_uuid.v4()}-$name';
    await c.storage.from('tn-files').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            upsert: false,
            contentType: _contentTypeFor(name),
          ),
        );
    return path;
  }

  String _contentTypeFor(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    if (lower.endsWith('.csv')) return 'text/csv';
    return 'application/octet-stream';
  }

  List<Map<String, dynamic>> _asList(dynamic row) {
    if (row is! List) return [];
    return [
      for (final e in row)
        if (e is Map) Map<String, dynamic>.from(e),
    ];
  }
}
