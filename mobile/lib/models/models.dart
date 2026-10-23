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

  Map<String, dynamic> toProfileJson() => {
        'name': name,
        'role': role,
        'building': building,
        'floor': '$floor',
        'unit': unit,
        'bio': bio,
        if (avatarUrl != null) 'avatar': avatarUrl,
      };

  factory MemberProfile.fromJson(Map<String, dynamic> m) => MemberProfile(
        id: '${m['id']}',
        name: '${m['name'] ?? ''}',
        role: '${m['role'] ?? '一般寮生'}',
        building: '${m['building'] ?? 'rosemary'}',
        floor: int.tryParse('${m['floor']}') ?? 1,
        unit: '${m['unit'] ?? ''}',
        bio: '${m['bio'] ?? ''}',
        avatarUrl: m['avatar'] as String? ?? m['avatar_url'] as String?,
      );

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
    this.authorName = '',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  final String id;
  final String body;
  int likes;
  bool likedByMe;
  final String authorName;
  final DateTime createdAt;
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
  });

  final String id;
  final String title;
  final String summary;
  final String status;
  final int memberCount;
  final String ownerName;
  final String ownerId;

  factory ProjectItem.fromJson(Map<String, dynamic> m) => ProjectItem(
        id: '${m['id']}',
        title: '${m['title'] ?? ''}',
        summary: '${m['summary'] ?? ''}',
        status: '${m['status'] ?? '進行中'}',
        memberCount: (m['memberCount'] as num?)?.toInt() ?? 1,
        ownerName: '${m['ownerName'] ?? ''}',
        ownerId: '${m['ownerId'] ?? ''}',
      );
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
