import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../config/environment.dart';
import '../models/models.dart';

class IdeasService {
  IdeasService({SupabaseClient? client}) : _client = client;

  final SupabaseClient? _client;
  final _uuid = const Uuid();
  final List<IdeaItem> _local = [];

  SupabaseClient? get client =>
      _client ?? (Environment.isConfigured ? Supabase.instance.client : null);

  Future<List<IdeaItem>> list() async {
    final c = client;
    if (c == null) {
      return List.unmodifiable(_local.take(12));
    }
    try {
      final rows = await c.rpc('tn_list_ideas');
      if (rows is! List) return List.unmodifiable(_local.take(12));
      return [
        for (final raw in rows)
          if (raw is Map)
            IdeaItem(
              id: '${raw['id']}',
              body: '${raw['body'] ?? ''}',
              likes: (raw['like_count'] as num?)?.toInt() ?? 0,
              likedByMe: raw['liked_by_me'] == true,
              createdAt: DateTime.tryParse('${raw['created_at'] ?? ''}') ??
                  DateTime.now(),
            ),
      ];
    } catch (_) {
      return List.unmodifiable(_local.take(12));
    }
  }

  Future<IdeaItem> post(String body) async {
    final text = body.trim();
    if (text.length < 4 || text.length > 140) {
      throw ArgumentError('4〜140文字で入力してください');
    }
    final c = client;
    if (c == null) {
      final item = IdeaItem(id: _uuid.v4(), body: text);
      _local.insert(0, item);
      if (_local.length > 12) _local.removeLast();
      return item;
    }
    final row = await c.rpc('tn_post_idea', params: {'p_body': text});
    Map<String, dynamic> m;
    if (row is Map) {
      m = Map<String, dynamic>.from(row);
    } else if (row is List && row.isNotEmpty && row.first is Map) {
      m = Map<String, dynamic>.from(row.first as Map);
    } else {
      return IdeaItem(id: _uuid.v4(), body: text);
    }
    return IdeaItem(
      id: '${m['id']}',
      body: '${m['body'] ?? text}',
      createdAt:
          DateTime.tryParse('${m['created_at'] ?? ''}') ?? DateTime.now(),
    );
  }

  Future<void> toggleLike(IdeaItem item) async {
    final c = client;
    if (c == null) {
      item.likedByMe = !item.likedByMe;
      item.likes += item.likedByMe ? 1 : -1;
      if (item.likes < 0) item.likes = 0;
      return;
    }
    await c.rpc('tn_toggle_reaction', params: {'p_idea_id': item.id});
  }
}
