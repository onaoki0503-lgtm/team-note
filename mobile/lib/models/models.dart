class IdeaItem {
  IdeaItem({
    required this.id,
    required this.body,
    this.likes = 0,
    this.likedByMe = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  final String id;
  final String body;
  int likes;
  bool likedByMe;
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
  });

  final String id;
  final String title;
  final String summary;
  final String status;
  final int memberCount;
  final String ownerName;
}

class ProfileData {
  ProfileData({
    this.name = '',
    this.role = '',
    this.building = '',
    this.unit = '',
    this.bio = '',
    this.avatarUrl,
  });

  String name;
  String role;
  String building;
  String unit;
  String bio;
  String? avatarUrl;

  String get locationLine {
    final parts = <String>[
      if (building.isNotEmpty) building,
      if (unit.isNotEmpty) unit,
    ];
    return parts.join(' · ');
  }
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
}

enum AttachmentKind { camera, file, location }

class WorkReportDraft {
  WorkReportDraft({
    DateTime? date,
    this.title = '',
    this.category = '役職固有業務',
    this.body = '',
    List<AttachmentPin>? attachments,
  })  : date = date ?? DateTime.now(),
        attachments = attachments ?? [];

  DateTime date;
  String title;
  String category;
  String body;
  List<AttachmentPin> attachments;
}
